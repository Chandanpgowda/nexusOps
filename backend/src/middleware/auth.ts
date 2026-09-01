import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../lib/jwt';
import { AppError, Errors } from '../lib/errors';

/**
 * Verifies the Bearer access token, loads the user + roles/permissions,
 * and rejects disabled accounts. Attaches `req.user`.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, Errors.UNAUTHORIZED, 'Authentication required');
    }
    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        roles: { select: { role: { select: { name: true, permissions: true } } } },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, Errors.ACCOUNT_DISABLED, 'Account is disabled or no longer exists');
    }

    const roles = user.roles.map((r) => r.role.name);
    const permissions = new Set<string>();
    for (const r of user.roles) {
      for (const p of r.role.permissions as unknown[]) {
        if (typeof p === 'string') permissions.add(p);
      }
    }

    req.user = { id: user.id, email: user.email, roles, permissions: [...permissions] };
    next();
  } catch (err) {
    next(err);
  }
}

/** Require the current user to hold at least one of the given roles. */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new AppError(401, Errors.UNAUTHORIZED, 'Authentication required'));
    if (!user.roles.some((r) => roles.includes(r))) {
      return next(new AppError(403, Errors.FORBIDDEN, 'You do not have permission to perform this action'));
    }
    next();
  };
}

/** Require the current user to hold at least one permission. */
export function requirePermission(...perms: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return next(new AppError(401, Errors.UNAUTHORIZED, 'Authentication required'));
    if (!user.permissions.some((p) => perms.includes(p))) {
      return next(new AppError(403, Errors.FORBIDDEN, 'You do not have permission to perform this action'));
    }
    next();
  };
}