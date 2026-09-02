import { Request, Response } from 'express';
import { knowledgeService } from './knowledge.service';
import { asyncHandler } from '../../lib/async-handler';
import { CreateArticleInput, ListKnowledgeQuery, UpdateArticleInput } from './knowledge.schemas';

export const knowledgeController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const article = await knowledgeService.create(req.body as CreateArticleInput, req.user!.id);
    res.status(201).json({ success: true, data: article });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await knowledgeService.list(req.query as unknown as ListKnowledgeQuery);
    res.json({ success: true, data: result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const increment = req.query.view === 'true';
    const article = await knowledgeService.getById(req.params.id!, increment);
    res.json({ success: true, data: article });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const article = await knowledgeService.update(req.params.id!, req.body as UpdateArticleInput, req.user!.id);
    res.json({ success: true, data: article });
  }),

  publish: asyncHandler(async (req: Request, res: Response) => {
    const article = await knowledgeService.publish(req.params.id!, req.user!.id);
    res.json({ success: true, data: article });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await knowledgeService.delete(req.params.id!, req.user!.id);
    res.json({ success: true, message: 'Article deleted' });
  }),
};
