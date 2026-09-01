import { prisma } from '../../lib/prisma';
import { AppError, Errors } from '../../lib/errors';
import { writeAudit, type AuditInput } from '../audit/audit.service';
import type { CreateDepartmentInput, UpdateDepartmentInput } from './users.schemas';

export async function listDepartments() {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { users: { select: { userId: true } }, assets: { select: { id: true } } },
  });
  return departments.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    userCount: d.users.length,
    assetCount: d.assets.length,
  }));
}

export async function createDepartment(input: CreateDepartmentInput, audit: AuditInput) {
  const existing = await prisma.department.findUnique({ where: { name: input.name } });
  if (existing) throw new AppError(409, Errors.CONFLICT, 'A department with this name already exists');
  const dept = await prisma.department.create({ data: { name: input.name, description: input.description } });
  await writeAudit({ ...audit, action: 'DEPARTMENT_CREATED', entityType: 'Department', entityId: dept.id });
  return dept;
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput, audit: AuditInput) {
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) throw new AppError(404, Errors.NOT_FOUND, 'Department not found');
  if (input.name) {
    const dup = await prisma.department.findUnique({ where: { name: input.name } });
    if (dup && dup.id !== id) throw new AppError(409, Errors.CONFLICT, 'A department with this name already exists');
  }
  const updated = await prisma.department.update({ where: { id }, data: input });
  await writeAudit({ ...audit, action: 'DEPARTMENT_UPDATED', entityType: 'Department', entityId: id });
  return updated;
}