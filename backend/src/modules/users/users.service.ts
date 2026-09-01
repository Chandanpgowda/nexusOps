import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { AppError, Errors } from '../../lib/errors';
import { toPublicUser } from './user.serializer';
import { writeAudit, type AuditInput } from '../audit/audit.service';
import type { CreateUserInput, SetUserRolesInput, UpdateUserInput } from './users.schemas';

const USER_INCLUDE = {
  roles: { select: { role: { select: { name: true } } } },
  departments: {
    select: { department: { select: { id: true, name: true } }, isPrimary: true },
  },
} as const;

async function resolveRoleIds(names: string[]): Promise<string[]> {
  const roles = await prisma.role.findMany({ where: { name: { in: names } } });
  if (roles.length !== names.length) {
    const found = new Set(roles.map((r) => r.name));
    const missing = names.filter((n) => !found.has(n));
    throw new AppError(400, Errors.VALIDATION, `Unknown role(s): ${missing.join(', ')}`);
  }
  return roles.map((r) => r.id);
}

export async function listUsers(params: { page: number; limit: number; role?: string; search?: string }) {
  const where: Record<string, unknown> = {};
  if (params.role) {
    where.roles = { some: { role: { name: params.role } } };
  }
  if (params.search) {
    where.OR = [
      { email: { contains: params.search, mode: 'insensitive' } },
      { fullName: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: USER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
    }),
  ]);

  return {
    data: users.map(toPublicUser),
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.ceil(total / params.limit),
  };
}

export async function createUser(input: CreateUserInput, audit: AuditInput) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, Errors.CONFLICT, 'A user with this email already exists');

  const roleIds = await resolveRoleIds(input.roles);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const departmentIds = input.departmentIds ?? [];

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone || null,
      isActive: input.isActive ?? true,
      roles: { create: roleIds.map((roleId) => ({ roleId })) },
      departments: departmentIds.length
        ? { create: departmentIds.map((departmentId, i) => ({ departmentId, isPrimary: i === 0 })) }
        : undefined,
    },
    include: USER_INCLUDE,
  });

  await writeAudit({
    ...audit,
    actorId: audit.actorId,
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: user.id,
    metadata: { email, roles: input.roles },
  });

  return toPublicUser(user);
}

export async function updateUser(id: string, input: UpdateUserInput, audit: AuditInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, Errors.NOT_FOUND, 'User not found');

  const data: Record<string, unknown> = {};
  if (input.fullName !== undefined) data.fullName = input.fullName;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  if (input.departmentIds) {
    await prisma.$transaction([
      prisma.userDepartment.deleteMany({ where: { userId: id } }),
      ...input.departmentIds.map((departmentId, i) =>
        prisma.userDepartment.create({
          data: { userId: id, departmentId, isPrimary: i === 0 },
        })
      ),
    ]);
  }

  const updated = await prisma.user.update({ where: { id }, data, include: USER_INCLUDE });

  await writeAudit({
    ...audit,
    action: 'USER_UPDATED',
    entityType: 'User',
    entityId: id,
    metadata: { fields: Object.keys(input).filter((k) => k !== 'departmentIds') },
  });

  return toPublicUser(updated);
}

export async function setUserRoles(id: string, input: SetUserRolesInput, audit: AuditInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, Errors.NOT_FOUND, 'User not found');

  const roleIds = await resolveRoleIds(input.roles);
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: id } }),
    prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) }),
  ]);
  const updated = await prisma.user.findUniqueOrThrow({ where: { id }, include: USER_INCLUDE });

  await writeAudit({
    ...audit,
    action: 'USER_ROLES_CHANGED',
    entityType: 'User',
    entityId: id,
    metadata: { roles: input.roles },
  });

  return toPublicUser(updated);
}

export async function listRoles() {
  return prisma.role.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, description: true, permissions: true },
  });
}