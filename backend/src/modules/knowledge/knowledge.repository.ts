import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { CreateArticleInput, ListKnowledgeQuery, UpdateArticleInput } from './knowledge.schemas';

export class KnowledgeRepository {
  async create(data: CreateArticleInput, authorId: string) {
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 80);

    return prisma.knowledgeArticle.create({
      data: {
        slug,
        title: data.title,
        description: data.description ?? '',
        problem: data.problem,
        solution: data.solution,
        category: data.category as Prisma.KnowledgeArticleCreateInput['category'],
        tags: data.tags,
        authorId,
        status: 'DRAFT',
      },
      include: {
        author: { select: { id: true, fullName: true } },
      },
    });
  }

  async findById(id: string) {
    return prisma.knowledgeArticle.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async list(query: ListKnowledgeQuery) {
    const where: Prisma.KnowledgeArticleWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category as Prisma.KnowledgeArticleWhereInput['category'];
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { problem: { contains: query.search, mode: 'insensitive' } },
        { solution: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          author: { select: { id: true, fullName: true } },
        },
      }),
      prisma.knowledgeArticle.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async update(id: string, data: UpdateArticleInput) {
    return prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.problem && { problem: data.problem }),
        ...(data.solution && { solution: data.solution }),
        ...(data.category && { category: data.category as Prisma.KnowledgeArticleUpdateInput['category'] }),
        ...(data.tags && { tags: data.tags }),
        ...(data.status && { status: data.status }),
      },
      include: {
        author: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async publish(id: string, approverId: string) {
    return prisma.knowledgeArticle.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        approvedById: approverId,
        publishedAt: new Date(),
      },
    });
  }

  async delete(id: string) {
    return prisma.knowledgeArticle.delete({ where: { id } });
  }

  async incrementViews(id: string) {
    return prisma.knowledgeArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }
}

export const knowledgeRepository = new KnowledgeRepository();
