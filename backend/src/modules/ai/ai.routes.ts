import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../lib/async-handler';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { aiService } from './ai.service';
import { ragService } from './rag.service';

export const aiRoutes = Router();

aiRoutes.use(authenticate);

aiRoutes.get('/provider-status', asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await aiService.providerStatus() });
}));

aiRoutes.get('/incidents/:id/analysis', asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: { id: string; roles: string[] } }).user;
  res.json({ success: true, data: await aiService.getAnalysis(req.params.id!, user.id, user.roles) });
}));

aiRoutes.post('/incidents/:id/reanalyze', asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: { id: string; roles: string[] } }).user;
  res.json({ success: true, data: await aiService.reanalyze(req.params.id!, user.id, user.roles) });
}));

aiRoutes.post('/incidents/:id/ai-decision', asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: { id: string; roles: string[] } }).user;
  const decision = req.body?.decision === 'reject' ? 'reject' : 'accept';
  res.json({ success: true, data: await aiService.decide(req.params.id!, user.id, user.roles, decision) });
}));

aiRoutes.get('/incidents/:id/duplicates', asyncHandler(async (req: Request, res: Response) => {
  const user = (req as unknown as { user: { id: string; roles: string[] } }).user;
  const roles: string[] = user.roles;
  const incident = await prisma.incident.findUnique({ where: { id: req.params.id! }, select: { reporterId: true } });
  if (!incident) throw new AppError(404, 'INCIDENT_NOT_FOUND', 'Incident not found');
  if (incident.reporterId !== user.id && !roles.includes('ADMIN') && !roles.includes('IT_MANAGER') && !roles.includes('TECHNICIAN')) {
    throw new AppError(403, 'FORBIDDEN', 'Not allowed to view duplicates');
  }
  const dupes = await ragService.findSimilarIncidents(req.params.id!, 5);
  res.json({ success: true, data: dupes.filter((d) => d.similarity >= 0.7) });
}));

const askSchema = z.object({ question: z.string().min(3).max(1000) });

aiRoutes.post('/ask', asyncHandler(async (req: Request, res: Response) => {
  const body = askSchema.parse(req.body);
  const result = await ragService.askQuestion(body.question);
  res.json({ success: true, data: result });
}));
