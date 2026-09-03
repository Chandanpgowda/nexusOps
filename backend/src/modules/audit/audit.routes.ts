import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/async-handler';
import { authenticate, requireRole } from '../../middleware/auth';
import { z } from 'zod';

export const auditRoutes = Router();

auditRoutes.use(authenticate, requireRole('ADMIN'));

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorId: z.string().optional(),
});

auditRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = querySchema.parse(req.query);
    const where = {
      ...(q.action ? { action: q.action } : {}),
      ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.actorId ? { actorId: q.actorId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { actor: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items, total, page: q.page, pageSize: q.limit, totalPages: Math.ceil(total / q.limit) },
    });
  }),
);
