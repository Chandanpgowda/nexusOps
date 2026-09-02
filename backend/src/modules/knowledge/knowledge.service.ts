import { knowledgeRepository } from './knowledge.repository';
import { CreateArticleInput, ListKnowledgeQuery, UpdateArticleInput } from './knowledge.schemas';
import { AppError } from '../../lib/errors';
import { auditService } from '../audit/audit.service';

export class KnowledgeService {
  async create(data: CreateArticleInput, authorId: string) {
    const article = await knowledgeRepository.create(data, authorId);

    await auditService.log({
      actorId: authorId,
      action: 'ARTICLE_CREATED',
      entityType: 'KNOWLEDGE_ARTICLE',
      entityId: article.id,
      metadata: { title: article.title },
    });

    return article;
  }

  async getById(id: string, incrementView = false) {
    const article = await knowledgeRepository.findById(id);
    if (!article) throw new AppError(404, 'ARTICLE_NOT_FOUND', 'Article not found');
    if (incrementView && article.status === 'PUBLISHED') {
      await knowledgeRepository.incrementViews(id);
    }
    return article;
  }

  async list(query: ListKnowledgeQuery) {
    return knowledgeRepository.list(query);
  }

  async update(id: string, data: UpdateArticleInput, actorId: string) {
    const existing = await knowledgeRepository.findById(id);
    if (!existing) throw new AppError(404, 'ARTICLE_NOT_FOUND', 'Article not found');

    const article = await knowledgeRepository.update(id, data);

    await auditService.log({
      actorId,
      action: 'ARTICLE_UPDATED',
      entityType: 'KNOWLEDGE_ARTICLE',
      entityId: id,
      metadata: { changes: Object.keys(data) },
    });

    return article;
  }

  async publish(id: string, approverId: string) {
    const existing = await knowledgeRepository.findById(id);
    if (!existing) throw new AppError(404, 'ARTICLE_NOT_FOUND', 'Article not found');
    if (existing.status === 'PUBLISHED') throw new AppError(400, 'ALREADY_PUBLISHED', 'Article is already published');

    return knowledgeRepository.publish(id, approverId);
  }

  async delete(id: string, actorId: string) {
    const existing = await knowledgeRepository.findById(id);
    if (!existing) throw new AppError(404, 'ARTICLE_NOT_FOUND', 'Article not found');

    await knowledgeRepository.delete(id);

    await auditService.log({
      actorId,
      action: 'ARTICLE_DELETED',
      entityType: 'KNOWLEDGE_ARTICLE',
      entityId: id,
      metadata: { title: existing.title },
    });
  }
}

export const knowledgeService = new KnowledgeService();
