import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { CreateProblemInput, ListProblemsQuery, UpdateProblemInput } from './problems.schemas';

export class ProblemsRepository {
  async create(data: CreateProblemInput, ownerId: string) {
    const last = await prisma.problem.findFirst({ orderBy: { createdAt: 'desc' }, select: { ref: true } });
    const num = last ? parseInt(last.ref.replace('PRB-', ''), 10) + 1 : 1;
    const ref = `PRB-${String(num).padStart(4, '0')}`;

    return prisma.problem.create({
      data: {
        ref,
        title: data.title,
        description: data.description,
        rootCause: data.rootCause,
        workaround: data.workaround,
        permanentFix: data.permanentFix,
        ownerId,
        status: 'OPEN',
        incidents: data.incidentIds.length
          ? { create: data.incidentIds.map((id) => ({ incidentId: id, linkedBy: ownerId })) }
          : undefined,
      },
      include: {
        owner: { select: { id: true, fullName: true } },
        incidents: { include: { incident: { select: { id: true, ref: true, title: true, status: true } } } },
      },
    });
  }

  async findById(id: string) {
    return prisma.problem.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, fullName: true } },
        incidents: {
          include: { incident: { select: { id: true, ref: true, title: true, status: true, priority: true } } },
        },
      },
    });
  }

  async list(query: ListProblemsQuery) {
    const where: Prisma.ProblemWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          owner: { select: { id: true, fullName: true } },
          _count: { select: { incidents: true } },
        },
      }),
      prisma.problem.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async update(id: string, data: UpdateProblemInput) {
    return prisma.problem.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.rootCause !== undefined && { rootCause: data.rootCause }),
        ...(data.workaround !== undefined && { workaround: data.workaround }),
        ...(data.permanentFix !== undefined && { permanentFix: data.permanentFix }),
        ...(data.status && { status: data.status }),
      },
      include: {
        owner: { select: { id: true, fullName: true } },
        incidents: { include: { incident: { select: { id: true, ref: true, title: true, status: true } } } },
      },
    });
  }

  async linkIncident(problemId: string, incidentId: string, linkedById: string) {
    return prisma.problemIncident.create({
      data: { problemId, incidentId, linkedBy: linkedById },
    });
  }

  async unlinkIncident(problemId: string, incidentId: string) {
    return prisma.problemIncident.delete({
      where: { problemId_incidentId: { problemId, incidentId } },
    });
  }

  async delete(id: string) {
    return prisma.problem.delete({ where: { id } });
  }
}

export const problemsRepository = new ProblemsRepository();
