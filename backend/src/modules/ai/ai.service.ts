import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { enqueueAiAnalysis } from '../../jobs/ai.queue';
import { ollamaProvider } from '../../ai/ollama.provider';
import type { IncidentAnalysis } from '../../ai/types';

export const aiService = {
  async getAnalysis(incidentId: string, userId: string, roles: string[]) {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      select: { reporterId: true, assigneeId: true },
    });
    if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');

    const involved =
      incident.reporterId === userId ||
      incident.assigneeId === userId ||
      roles.includes('ADMIN') ||
      roles.includes('IT_MANAGER');
    if (!involved) throw new AppError(403, 'FORBIDDEN', 'You do not have access to this incident');

    const interaction = await prisma.aiInteraction.findFirst({
      where: { incidentId, type: 'CLASSIFY' },
      orderBy: { createdAt: 'desc' },
    });

    return interaction
      ? { status: 'DONE', analysis: interaction.output as unknown as IncidentAnalysis, accepted: interaction.accepted, rejected: interaction.rejected, model: interaction.model }
      : { status: 'PENDING', analysis: null, accepted: null, rejected: null, model: null };
  },

  async reanalyze(incidentId: string, userId: string, roles: string[]) {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      select: { reporterId: true },
    });
    if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');
    const canManage =
      incident.reporterId === userId || roles.includes('ADMIN') || roles.includes('IT_MANAGER') || roles.includes('TECHNICIAN');
    if (!canManage) throw new AppError(403, 'FORBIDDEN', 'Not allowed to re-run AI analysis');
    await enqueueAiAnalysis(incidentId);
    return { status: 'QUEUED' };
  },

  async decide(incidentId: string, userId: string, roles: string[], decision: 'accept' | 'reject') {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      select: { assigneeId: true, reporterId: true },
    });
    if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');
    // Only the assignee/technician/manager may decide — reporters get recommendations only.
    const canDecide =
      incident.assigneeId === userId || roles.includes('ADMIN') || roles.includes('IT_MANAGER');
    if (!canDecide) throw new AppError(403, 'FORBIDDEN', 'Only the assigned technician or a manager can decide on AI recommendations');

    const interaction = await prisma.aiInteraction.findFirst({
      where: { incidentId, type: 'CLASSIFY' },
      orderBy: { createdAt: 'desc' },
    });
    if (!interaction) throw new AppError(404, 'AI_ANALYSIS_NOT_FOUND', 'No AI analysis available');

    const updated = await prisma.aiInteraction.update({
      where: { id: interaction.id },
      data: decision === 'accept' ? { accepted: true, rejected: false } : { rejected: true, accepted: false },
    });

    return { accepted: updated.accepted, rejected: updated.rejected };
  },

  async providerStatus() {
    const available = await ollamaProvider.isAvailable();
    return { provider: available ? 'ollama' : 'heuristic-fallback', available };
  },
};
