import { changesRepository } from './changes.repository';
import {
  CreateChangeInput,
  ListChangesQuery,
  UpdateChangeInput,
  ApproveChangeInput,
  TransitionChangeInput,
  ChangeStatus,
} from './changes.schemas';
import { AppError, Errors } from '../../lib/errors';
import { Permissions } from '../../config/permissions';
import { auditService } from '../audit/audit.service';

/** Request shape carrying the authenticated user (set by `authenticate`). */
interface Actor {
  id: string;
  roles: string[];
  permissions: string[];
}

function hasPermission(actor: Actor, permission: string): boolean {
  return actor.permissions.includes(permission);
}

/**
 * Allowed change-status transitions and who may perform them.
 * APPROVED / REJECTED are reached exclusively through the approve endpoint.
 */
const CHANGE_TRANSITIONS: Record<ChangeStatus, { to: ChangeStatus[]; managerOnly?: boolean }[]> = {
  DRAFT: [{ to: ['SUBMITTED'] }],
  SUBMITTED: [{ to: ['UNDER_REVIEW'], managerOnly: true }, { to: ['DRAFT'] }],
  UNDER_REVIEW: [],
  APPROVED: [{ to: ['SCHEDULED'], managerOnly: true }],
  REJECTED: [{ to: ['DRAFT'] }],
  SCHEDULED: [{ to: ['IMPLEMENTING'], managerOnly: true }],
  IMPLEMENTING: [{ to: ['COMPLETED'], managerOnly: true }],
  COMPLETED: [],
};

/** Statuses in which the change record itself may still be edited. */
const EDITABLE_STATUSES: ChangeStatus[] = ['DRAFT', 'REJECTED'];

export class ChangesService {
  async create(data: CreateChangeInput, requestedById: string) {
    const change = await changesRepository.create(data, requestedById);

    await auditService.log({
      actorId: requestedById,
      action: 'CHANGE_CREATED',
      entityType: 'CHANGE',
      entityId: change.id,
      metadata: { title: change.title },
    });

    return change;
  }

  async getById(id: string) {
    const change = await changesRepository.findById(id);
    if (!change) throw new AppError(404, 'CHANGE_NOT_FOUND', 'Change not found');
    return change;
  }

  async list(query: ListChangesQuery) {
    return changesRepository.list(query);
  }

  async update(id: string, data: UpdateChangeInput, actor: Actor) {
    const existing = await changesRepository.findById(id);
    if (!existing) throw new AppError(404, 'CHANGE_NOT_FOUND', 'Change not found');

    if (!EDITABLE_STATUSES.includes(existing.status as ChangeStatus)) {
      throw new AppError(409, 'CHANGE_NOT_EDITABLE', `Changes can only be edited while in ${EDITABLE_STATUSES.join(' or ')} status`);
    }
    if (existing.requestedById !== actor.id && !hasPermission(actor, Permissions.CHANGE_MANAGE)) {
      throw new AppError(403, Errors.FORBIDDEN, 'Only the requester or a change manager can edit this change');
    }

    const change = await changesRepository.update(id, data);

    await auditService.log({
      actorId: actor.id,
      action: 'CHANGE_UPDATED',
      entityType: 'CHANGE',
      entityId: id,
      metadata: { changes: Object.keys(data) },
    });

    return change;
  }

  async transition(id: string, data: TransitionChangeInput, actor: Actor) {
    const existing = await changesRepository.findById(id);
    if (!existing) throw new AppError(404, 'CHANGE_NOT_FOUND', 'Change not found');

    const from = existing.status as ChangeStatus;
    const rule = CHANGE_TRANSITIONS[from].find((r) => r.to.includes(data.status));
    if (!rule) {
      throw new AppError(
        409,
        'INVALID_TRANSITION',
        `Cannot move a change from ${from} to ${data.status}. Allowed transitions from ${from}: ${CHANGE_TRANSITIONS[from].map((r) => r.to.join('/')).join(', ') || 'none'}`,
      );
    }
    if (rule.managerOnly && !hasPermission(actor, Permissions.CHANGE_MANAGE)) {
      throw new AppError(403, Errors.FORBIDDEN, 'Only a change manager can perform this transition');
    }

    const change = await changesRepository.updateStatus(id, data.status);

    await auditService.log({
      actorId: actor.id,
      action: 'CHANGE_STATUS_CHANGED',
      entityType: 'CHANGE',
      entityId: id,
      metadata: { from, to: data.status },
    });

    return change;
  }

  async approve(id: string, data: ApproveChangeInput, actor: Actor) {
    const existing = await changesRepository.findById(id);
    if (!existing) throw new AppError(404, 'CHANGE_NOT_FOUND', 'Change not found');

    if (existing.status !== 'UNDER_REVIEW') {
      throw new AppError(409, 'INVALID_TRANSITION', 'Only changes under review can be approved or rejected');
    }
    if (!hasPermission(actor, Permissions.CHANGE_APPROVE)) {
      throw new AppError(403, Errors.FORBIDDEN, 'You do not have permission to approve changes');
    }

    const change = await changesRepository.approve(id, actor.id, data.decision, data.comment);

    await auditService.log({
      actorId: actor.id,
      action: 'CHANGE_APPROVED',
      entityType: 'CHANGE',
      entityId: id,
      metadata: { decision: data.decision },
    });

    return change;
  }

  async delete(id: string, actorId: string) {
    const existing = await changesRepository.findById(id);
    if (!existing) throw new AppError(404, 'CHANGE_NOT_FOUND', 'Change not found');

    await changesRepository.delete(id);

    await auditService.log({
      actorId,
      action: 'CHANGE_DELETED',
      entityType: 'CHANGE',
      entityId: id,
      metadata: { title: existing.title },
    });
  }
}

export const changesService = new ChangesService();
