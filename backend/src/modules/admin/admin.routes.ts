import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../lib/async-handler';
import { authenticate, requireRole } from '../../middleware/auth';

export const adminRoutes = Router();

adminRoutes.use(authenticate, requireRole('ADMIN'));

// System dashboard stats
adminRoutes.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [
      totalUsers,
      activeUsers,
      totalIncidents,
      openIncidents,
      criticalIncidents,
      totalAssets,
      totalArticles,
      totalChanges,
      recentAudit,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.incident.count(),
      prisma.incident.count({ where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      prisma.incident.count({ where: { priority: 'CRITICAL', status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      prisma.asset.count(),
      prisma.knowledgeArticle.count({ where: { status: 'PUBLISHED' } }),
      prisma.change.count(),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { fullName: true } } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalIncidents,
        openIncidents,
        criticalIncidents,
        totalAssets,
        totalArticles,
        totalChanges,
        recentAudit,
      },
    });
  }),
);

// List all roles
adminRoutes.get(
  '/roles',
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: roles });
  }),
);
