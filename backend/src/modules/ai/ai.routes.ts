import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../lib/async-handler';
import { aiService } from './ai.service';

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
