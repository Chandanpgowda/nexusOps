import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { CreateChangeInput, ListChangesQuery, UpdateChangeInput } from './changes.schemas';

export class ChangesRepository {
  async create(data: CreateChangeInput, requestedById: string) {
    const last = await prisma.change.findFirst({ orderBy: { createdAt: 'desc' }, select: { ref: true } });
    const num = last ? parseInt(last.ref.replace('CHG-', ''), 10) + 1 : 1;
    const ref = `CHG-${String(num).padStart(4, '0')}`;

    return prisma.change.create({
      data: {
        ref,
        title: data.title,
        description: data.description,
        reason: data.reason,
        risk: data.risk,
        impact: data.impact,
        plannedStart: new Date(data.plannedStart),
        plannedEnd: new Date(data.plannedEnd),
        rollbackPlan: data.rollbackPlan,
        requestedById,
        status: 'DRAFT',
      },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.change.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
        approvals: {
          orderBy: { decidedAt: 'desc' },
          include: { approver: { select: { fullName: true } } },
        },
      },
    });
  }

  async list(query: ListChangesQuery) {
    const where: Prisma.ChangeWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.risk) where.risk = query.risk;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.change.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          requestedBy: { select: { id: true, fullName: true } },
          approver: { select: { id: true, fullName: true } },
        },
      }),
      prisma.change.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async update(id: string, data: UpdateChangeInput) {
    return prisma.change.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.reason && { reason: data.reason }),
        ...(data.risk && { risk: data.risk }),
        ...(data.impact && { impact: data.impact }),
        ...(data.plannedStart && { plannedStart: new Date(data.plannedStart) }),
        ...(data.plannedEnd && { plannedEnd: new Date(data.plannedEnd) }),
        ...(data.rollbackPlan && { rollbackPlan: data.rollbackPlan }),
      },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return prisma.change.update({
      where: { id },
      data: { status: status as never },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
      },
    });
  }

  async approve(id: string, approverId: string, decision: 'APPROVED' | 'REJECTED', comment?: string) {
    return prisma.$transaction(async (tx) => {
      await tx.changeApproval.create({
        data: { changeId: id, approverId, decision, comment },
      });

      return tx.change.update({
        where: { id },
        data: {
          status: decision,
          approverId,
          decidedAt: new Date(),
        },
        include: {
          requestedBy: { select: { id: true, fullName: true } },
          approver: { select: { id: true, fullName: true } },
        },
      });
    });
  }

  async delete(id: string) {
    return prisma.change.delete({ where: { id } });
  }
}

export const changesRepository = new ChangesRepository();
