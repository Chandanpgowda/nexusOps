import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ListIncidentsQuery } from './incidents.schemas';

const incidentInclude = {
  reporter: { select: { id: true, fullName: true, email: true } },
  assignee: { select: { id: true, fullName: true, email: true } },
  department: { select: { id: true, name: true } },
  asset: { select: { id: true, assetTag: true, name: true } },
  slaPolicy: { select: { responseMinutes: true, resolutionMinutes: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.IncidentInclude;

export type IncidentWithRelations = Prisma.IncidentGetPayload<{ include: typeof incidentInclude }>;

export class IncidentsRepository {
  async create(data: Prisma.IncidentUncheckedCreateInput) {
    return prisma.incident.create({ data, include: incidentInclude });
  }

  async findById(id: string) {
    return prisma.incident.findUnique({ where: { id }, include: incidentInclude });
  }

  async findByRef(ref: string) {
    return prisma.incident.findUnique({ where: { ref }, include: incidentInclude });
  }

  async update(id: string, data: Prisma.IncidentUncheckedUpdateInput) {
    return prisma.incident.update({ where: { id }, data, include: incidentInclude });
  }

  async list(query: ListIncidentsQuery) {
    const where: Prisma.IncidentWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = query.category;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.reporterId) where.reporterId = query.reporterId;
    if (query.slaBreached !== undefined) where.slaBreached = query.slaBreached;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { ref: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: incidentInclude,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.incident.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async generateRef(): Promise<string> {
    const last = await prisma.incident.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { ref: true },
    });
    const num = last ? parseInt(last.ref.replace('INC-', ''), 10) + 1 : 1001;
    return `INC-${num}`;
  }

  async addComment(data: Prisma.IncidentCommentUncheckedCreateInput) {
    return prisma.incidentComment.create({
      data,
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async getComments(incidentId: string) {
    return prisma.incidentComment.findMany({
      where: { incidentId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async addHistory(data: Prisma.IncidentHistoryUncheckedCreateInput) {
    return prisma.incidentHistory.create({ data });
  }

  async getHistory(incidentId: string) {
    return prisma.incidentHistory.findMany({
      where: { incidentId },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, fullName: true } } },
    });
  }
}

export const incidentsRepository = new IncidentsRepository();
