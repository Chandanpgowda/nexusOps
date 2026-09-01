import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { signAccessToken } from '../../lib/jwt';
import { randomToken, hashToken } from '../../lib/tokens';
import { env } from '../../config/env';
import { AppError, Errors } from '../../lib/errors';
import { toPublicUser } from '../users/user.serializer';
import { writeAudit, type AuditInput } from '../audit/audit.service';
import type { LoginInput, RegisterInput, ResetPasswordInput } from './auth.schemas';

const USER_INCLUDE = {
  roles: { select: { role: { select: { name: true } } } },
  departments: {
    select: { department: { select: { id: true, name: true } }, isPrimary: true },
  },
} as const;

interface SessionResult {
  accessToken: string;
  refreshToken: string;
}

const DAY_MS = 86_400_000;

async function createSession(userId: string): Promise<SessionResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) throw new AppError(404, Errors.NOT_FOUND, 'User not found');

  const refreshToken = randomToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * DAY_MS),
    },
  });
  return { accessToken: signAccessToken(userId, user.email), refreshToken };
}

export async function register(input: RegisterInput, audit: AuditInput) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, Errors.CONFLICT, 'An account with this email already exists');

  const employeeRole = await prisma.role.findUnique({ where: { name: 'EMPLOYEE' } });
  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone || null,
      roles: employeeRole ? { create: [{ roleId: employeeRole.id }] } : undefined,
    },
  });

  const session = await createSession(user.id);
  await writeAudit({
    ...audit,
    actorId: user.id,
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: user.id,
  });

  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: USER_INCLUDE });
  return { user: toPublicUser(full), ...session };
}

export async function login(input: LoginInput, audit: AuditInput) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email }, include: USER_INCLUDE });
  if (!user) throw new AppError(401, Errors.INVALID_CREDENTIALS, 'Invalid email or password');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new AppError(401, Errors.INVALID_CREDENTIALS, 'Invalid email or password');
  if (!user.isActive) throw new AppError(403, Errors.ACCOUNT_DISABLED, 'This account is disabled');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const session = await createSession(user.id);

  await writeAudit({
    ...audit,
    actorId: user.id,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user.id,
    metadata: { method: 'password' },
  });

  return { user: toPublicUser(user), ...session };
}

export async function refresh(refreshToken: string) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: { select: { id: true, email: true, isActive: true } } },
  });
  if (!record || record.revokedAt) {
    throw new AppError(401, Errors.INVALID_TOKEN, 'Invalid refresh token');
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, Errors.TOKEN_EXPIRED, 'Refresh token has expired');
  }
  if (!record.user.isActive) throw new AppError(403, Errors.ACCOUNT_DISABLED, 'Account is disabled');

  // Rotation: revoke the presented token, issue a fresh pair.
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });

  return createSession(record.user.id);
}

export async function logout(refreshToken: string | undefined, audit: AuditInput) {
  let userId: string | null = null;
  if (refreshToken) {
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      select: { id: true, userId: true },
    });
    if (record) {
      userId = record.userId;
      await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    }
  }
  await writeAudit({ ...audit, actorId: userId, action: 'USER_LOGOUT', entityType: 'User', entityId: userId });
  return { success: true };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: USER_INCLUDE });
  if (!user) throw new AppError(404, Errors.NOT_FOUND, 'User not found');
  return toPublicUser(user);
}

export async function forgotPassword(email: string) {
  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  // Respond identically whether or not the account exists (prevents enumeration).
  if (!user) return { resetTokenSent: true };

  // Revoke any previous unused reset tokens for this user.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const raw = randomToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  // NOTE: In production this token is delivered by email. In this local build we
  // return it directly so the flow is demonstrable end-to-end without an SMTP server.
  return { resetTokenSent: true, resetToken: raw, expiresInMinutes: 60 };
}

export async function resetPassword(input: ResetPasswordInput, audit: AuditInput) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
    include: { user: { select: { id: true } } },
  });
  if (!record || record.usedAt) throw new AppError(400, Errors.INVALID_TOKEN, 'Invalid reset token');
  if (record.expiresAt.getTime() < Date.now()) throw new AppError(400, Errors.TOKEN_EXPIRED, 'Reset token has expired');

  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  // Rotate all outstanding sessions so old tokens are invalidated.
  await prisma.refreshToken.updateMany({
    where: { userId: record.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await writeAudit({
    ...audit,
    actorId: record.userId,
    action: 'PASSWORD_RESET',
    entityType: 'User',
    entityId: record.userId,
  });
  return { success: true };
}