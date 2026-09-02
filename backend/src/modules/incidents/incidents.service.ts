import { IncidentStatus } from '@prisma/client';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { socketManager } from '../../lib/socket';
import { incidentsRepository } from './incidents.repository';
import { slaService } from './sla.service';
import { writeAudit } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import {
  CreateIncidentInput,
  UpdateIncidentInput,
  ListIncidentsQuery,
  CreateCommentInput,
} from './incidents.schemas';

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ['ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'WAITING_FOR_VENDOR', 'RESOLVED', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'WAITING_FOR_USER', 'WAITING_FOR_VENDOR', 'RESOLVED', 'OPEN'],
  IN_PROGRESS: ['WAITING_FOR_USER', 'WAITING_FOR_VENDOR', 'RESOLVED', 'CLOSED', 'ASSIGNED'],
  WAITING_FOR_USER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  WAITING_FOR_VENDOR: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'WAITING_FOR_VENDOR', 'RESOLVED', 'CLOSED'],
};

export class IncidentsService {
  async create(input: CreateIncidentInput, reporterId: string, actorIp?: string) {
    const policy = await slaService.getPolicy(input.priority ?? 'MEDIUM');
    const ref = await incidentsRepository.generateRef();
    const now = new Date();
    const deadlines = slaService.computeDeadlinesFromPolicy(
      policy.responseMinutes,
      policy.resolutionMinutes,
      now
    );

    const incident = await incidentsRepository.create({
      ref,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority ?? 'MEDIUM',
      status: 'OPEN',
      reporterId,
      departmentId: input.departmentId,
      assetId: input.assetId,
      slaPolicyId: policy.id,
      responseDeadline: deadlines.responseDeadline,
      resolutionDeadline: deadlines.resolutionDeadline,
    });

    await incidentsRepository.addHistory({
      incidentId: incident.id,
      actorId: reporterId,
      field: 'status',
      oldValue: null,
      newValue: 'OPEN',
    });

    await writeAudit({
      actorId: reporterId,
      action: 'INCIDENT_CREATED',
      entityType: 'incident',
      entityId: incident.id,
      metadata: { ref, title: incident.title },
      ip: actorIp,
    });

    // Real-time: notify relevant roles and broadcast to ticket room
    socketManager.emitToTicket(incident.id, 'ticket:created', {
      id: incident.id,
      ref: incident.ref,
      title: incident.title,
      priority: incident.priority,
      status: incident.status,
      reporterId,
    });
    socketManager.emitToRole('IT_MANAGER', 'ticket:new', { id: incident.id, ref });
    socketManager.emitToRole('ADMIN', 'ticket:new', { id: incident.id, ref });

    logger.info({ incidentId: incident.id, ref }, 'Incident created');
    return incident;
  }

  async getById(id: string) {
    const incident = await incidentsRepository.findById(id);
    if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');
    return incident;
  }

  async list(query: ListIncidentsQuery) {
    return incidentsRepository.list(query);
  }

  async update(
    id: string,
    input: UpdateIncidentInput,
    actorId: string,
    _actorRoles: string[],
    actorIp?: string
  ) {
    const existing = await incidentsRepository.findById(id);
    if (!existing) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');

    const data: Record<string, unknown> = {};
    const historyEntries: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

    if (input.status && input.status !== existing.status) {
      const allowed = VALID_TRANSITIONS[existing.status];
      if (!allowed.includes(input.status)) {
        throw new AppError(
          400,
          'INVALID_STATUS_TRANSITION',
          `Cannot transition from ${existing.status} to ${input.status}`
        );
      }
      data.status = input.status;
      historyEntries.push({ field: 'status', oldValue: existing.status, newValue: input.status });

      if (input.status === 'IN_PROGRESS' && !existing.firstResponseAt) {
        data.firstResponseAt = new Date();
      }
      if (input.status === 'RESOLVED') {
        data.resolvedAt = new Date();
        if (!input.resolution) throw new AppError(400, 'RESOLUTION_REQUIRED', 'Resolution required');
      }
      if (input.status === 'CLOSED') {
        data.closedAt = new Date();
      }
      if (input.status === 'REOPENED') {
        data.resolvedAt = null;
        data.closedAt = null;
        data.slaBreached = false;
      }
    }

    if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
      data.assigneeId = input.assigneeId;
      historyEntries.push({
        field: 'assigneeId',
        oldValue: existing.assigneeId ?? null,
        newValue: input.assigneeId ?? null,
      });
      if (existing.status === 'OPEN' && input.assigneeId) {
        data.status = 'ASSIGNED';
        historyEntries.push({ field: 'status', oldValue: 'OPEN', newValue: 'ASSIGNED' });
      }
    }

    for (const field of ['title', 'description', 'category', 'priority', 'departmentId', 'assetId', 'resolution'] as const) {
      if (input[field] !== undefined && input[field] !== existing[field]) {
        data[field] = input[field];
        historyEntries.push({
          field,
          oldValue: existing[field] != null ? String(existing[field]) : null,
          newValue: input[field] != null ? String(input[field]) : null,
        });
      }
    }

    if (Object.keys(data).length === 0) return existing;

    const updated = await incidentsRepository.update(id, data);

    for (const h of historyEntries) {
      await incidentsRepository.addHistory({
        incidentId: id,
        actorId,
        field: h.field,
        oldValue: h.oldValue,
        newValue: h.newValue,
      });
    }

    await writeAudit({
      actorId,
      action: 'INCIDENT_UPDATED',
      entityType: 'incident',
      entityId: id,
      metadata: { fields: historyEntries.map((h) => h.field) },
      ip: actorIp,
    });

    // Real-time: emit ticket update to subscribers
    socketManager.emitToTicket(id, 'ticket:updated', {
      id,
      changes: historyEntries,
      status: updated.status,
      assigneeId: updated.assigneeId,
      priority: updated.priority,
    });

    // Notify reporter of status changes
    if (updated.reporterId && updated.reporterId !== actorId) {
      await notificationsService.create({
        userId: updated.reporterId,
        type: 'INCIDENT_STATUS_CHANGED',
        title: `${updated.ref} status changed`,
        body: `Status changed to ${updated.status.replace(/_/g, ' ')}`,
        entityType: 'incident',
        entityId: id,
      });
    }

    // Notify assignee when assigned
    if (input.assigneeId && input.assigneeId !== existing.assigneeId) {
      await notificationsService.create({
        userId: input.assigneeId,
        type: 'INCIDENT_ASSIGNED',
        title: `New incident assigned: ${updated.ref}`,
        body: updated.title,
        entityType: 'incident',
        entityId: id,
      });
    }

    return updated;
  }

  async addComment(incidentId: string, input: CreateCommentInput, authorId: string, actorIp?: string) {
    const incident = await incidentsRepository.findById(incidentId);
    if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');

    const comment = await incidentsRepository.addComment({
      incidentId,
      authorId,
      body: input.body,
      isInternal: input.isInternal,
    });

    await writeAudit({
      actorId: authorId,
      action: 'COMMENT_ADDED',
      entityType: 'incident_comment',
      entityId: comment.id,
      metadata: { incidentId },
      ip: actorIp,
    });

    // Real-time: emit comment to ticket subscribers
    socketManager.emitToTicket(incidentId, 'ticket:comment', {
      id: comment.id,
      incidentId,
      authorId,
      body: comment.body,
      isInternal: comment.isInternal,
      createdAt: comment.createdAt,
    });

    // Notify relevant users (reporter & assignee) about the comment
    const fullIncident = await incidentsRepository.findById(incidentId);
    if (fullIncident) {
      const notifyUsers = new Set<string>();
      if (fullIncident.reporterId !== authorId) notifyUsers.add(fullIncident.reporterId);
      if (fullIncident.assigneeId && fullIncident.assigneeId !== authorId) notifyUsers.add(fullIncident.assigneeId);
      for (const uid of notifyUsers) {
        await notificationsService.create({
          userId: uid,
          type: 'COMMENT_ADDED',
          title: `New comment on ${fullIncident.ref}`,
          body: input.body.slice(0, 100),
          entityType: 'incident',
          entityId: incidentId,
        });
      }
    }

    return comment;
  }

  async getComments(incidentId: string) {
    const incident = await incidentsRepository.findById(incidentId);
    if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');
    return incidentsRepository.getComments(incidentId);
  }

  async getHistory(incidentId: string) {
    const incident = await incidentsRepository.findById(incidentId);
    if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');
    return incidentsRepository.getHistory(incidentId);
  }
}

export const incidentsService = new IncidentsService();
