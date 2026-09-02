import { IncidentPriority } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

/**
 * SLA engine — computes deadlines and detects breaches.
 *
 * Deadlines are stored as authoritative timestamps on the incident at creation time.
 * The breach sweep job re-evaluates periodically; frontend timers are cosmetic only.
 */
export class SlaService {
  /** Look up the SLA policy for a priority, falling back to MEDIUM. */
  async getPolicy(priority: IncidentPriority) {
    const policy = await prisma.slaPolicy.findUnique({ where: { priority } });
    if (policy) return policy;
    const fallback = await prisma.slaPolicy.findUnique({ where: { priority: 'MEDIUM' } });
    if (!fallback) throw new Error('No SLA policy configured');
    return fallback;
  }

  /** Compute response + resolution deadlines from a start time. */
  computeDeadlines(priority: IncidentPriority, from: Date) {
    // Fire-and-forget: resolve policy async, but we need it synchronously.
    // Callers that need exact values use computeDeadlinesSync after fetching policy.
    const start = from.getTime();
    return {
      responseDeadline: new Date(start + this.defaultResponse(priority) * 60_000),
      resolutionDeadline: new Date(start + this.defaultResolution(priority) * 60_000),
    };
  }

  /** Synchronous variant when policy is already known. */
  computeDeadlinesFromPolicy(
    responseMinutes: number,
    resolutionMinutes: number,
    from: Date
  ) {
    const start = from.getTime();
    return {
      responseDeadline: new Date(start + responseMinutes * 60_000),
      resolutionDeadline: new Date(start + resolutionMinutes * 60_000),
    };
  }

  /** Mark an incident as breached if its resolution deadline has passed and it's not resolved/closed. */
  async markBreached(incidentId: string) {
    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident || incident.slaBreached) return;
    if (!incident.resolutionDeadline) return;
    if (['RESOLVED', 'CLOSED'].includes(incident.status)) return;

    if (new Date() > incident.resolutionDeadline) {
      await prisma.incident.update({
        where: { id: incidentId },
        data: { slaBreached: true },
      });
      logger.info({ incidentId }, 'SLA breach recorded');
    }
  }

  /** Sweep all open incidents and flag newly-breached ones. Returns count. */
  async sweepBreaches(): Promise<number> {
    const open = await prisma.incident.findMany({
      where: {
        slaBreached: false,
        status: { notIn: ['RESOLVED', 'CLOSED'] },
        resolutionDeadline: { not: null },
      },
      select: { id: true },
    });
    for (const { id } of open) {
      await this.markBreached(id);
    }
    if (open.length) logger.info({ count: open.length }, 'SLA sweep complete');
    return open.length;
  }

  /** Human-readable remaining time, or null if no deadline. */
  static formatRemaining(deadline: Date | null): string | null {
    if (!deadline) return null;
    const diff = deadline.getTime() - Date.now();
    if (diff <= 0) return 'breached';
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m remaining`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m remaining`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }

  private defaultResponse(p: IncidentPriority): number {
    return { CRITICAL: 15, HIGH: 60, MEDIUM: 240, LOW: 480 }[p];
  }

  private defaultResolution(p: IncidentPriority): number {
    return { CRITICAL: 60, HIGH: 240, MEDIUM: 480, LOW: 1440 }[p];
  }
}

export const slaService = new SlaService();
