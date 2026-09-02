import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { CreateAssetInput, ListAssetsQuery } from './assets.schemas';

export class AssetsRepository {
  async create(data: CreateAssetInput) {
    return prisma.asset.create({
      data: {
        assetTag: data.assetTag,
        name: data.name,
        type: data.type,
        serialNumber: data.serialNumber,
        status: data.status ?? 'IN_STOCK',
        assignedUserId: data.assignedUserId,
        departmentId: data.departmentId,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        os: data.os,
        location: data.location,
        notes: data.notes,
      },
      include: {
        assignedUser: { select: { id: true, fullName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.asset.findUnique({
      where: { id },
      include: {
        assignedUser: { select: { id: true, fullName: true, email: true } },
        department: { select: { id: true, name: true } },
        incidents: { select: { id: true, ref: true, title: true, status: true }, orderBy: { createdAt: 'desc' }, take: 5 },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          take: 10,
          include: { actor: { select: { fullName: true } } },
        },
      },
    });
  }

  async findByTag(assetTag: string) {
    return prisma.asset.findUnique({ where: { assetTag } });
  }

  async findBySerial(serialNumber: string) {
    return prisma.asset.findUnique({ where: { serialNumber } });
  }

  async list(query: ListAssetsQuery) {
    const where: Prisma.AssetWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.assignedUserId) where.assignedUserId = query.assignedUserId;
    if (query.search) {
      where.OR = [
        { assetTag: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { serialNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          assignedUser: { select: { id: true, fullName: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async update(id: string, data: Partial<CreateAssetInput> & { assignedUserId?: string | null }) {
    return prisma.asset.update({
      where: { id },
      data: {
        ...(data.assetTag && { assetTag: data.assetTag }),
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.serialNumber && { serialNumber: data.serialNumber }),
        ...(data.status && { status: data.status }),
        ...(data.assignedUserId !== undefined && { assignedUserId: data.assignedUserId }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.purchaseDate && { purchaseDate: new Date(data.purchaseDate) }),
        ...(data.warrantyExpiry && { warrantyExpiry: new Date(data.warrantyExpiry) }),
        ...(data.os !== undefined && { os: data.os }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        assignedUser: { select: { id: true, fullName: true, email: true } },
        department: { select: { id: true, name: true } },
      },
    });
  }

  async delete(id: string) {
    return prisma.asset.delete({ where: { id } });
  }

  async addAssignment(assetId: string, fromUserId: string | null, toUserId: string | null, note?: string) {
    return prisma.assetAssignment.create({
      data: { assetId, fromUserId, toUserId, note },
    });
  }

  async getAssignmentHistory(assetId: string) {
    return prisma.assetAssignment.findMany({
      where: { assetId },
      orderBy: { assignedAt: 'desc' },
      include: { actor: { select: { fullName: true } } },
    });
  }
}

export const assetsRepository = new AssetsRepository();
