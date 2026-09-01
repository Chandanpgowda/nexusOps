import type { Request } from 'express';
import { prisma } from '../../lib/prisma';

export interface AuditInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/** Extract client metadata from an Express request (best-effort). */
export function requestMeta(req: Request) {
  return {
    ip:
      req.ip ??
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      null,
    userAgent: req.headers['user-agent'] ?? null,
  };
}

/**
 * Persist an immutable audit record. Audit logs are write-once; no update or
 * delete is ever exposed by the API.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: (input.metadata ?? {}) as object,
      ipAddress: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

/** Bind a request's client metadata into an AuditInput partial. */
export function withReqMeta(req: Request, partial: Omit<AuditInput, 'ip' | 'userAgent'>): AuditInput {
  const meta = requestMeta(req);
  return { ...partial, ip: meta.ip, userAgent: meta.userAgent };
}