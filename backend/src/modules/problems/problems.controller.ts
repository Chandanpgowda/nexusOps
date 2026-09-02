import { Request, Response } from 'express';
import { problemsService } from './problems.service';
import { asyncHandler } from '../../lib/async-handler';
import { CreateProblemInput, ListProblemsQuery, UpdateProblemInput, LinkIncidentInput } from './problems.schemas';

export const problemsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const problem = await problemsService.create(req.body as CreateProblemInput, req.user!.id);
    res.status(201).json({ success: true, data: problem });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await problemsService.list(req.query as unknown as ListProblemsQuery);
    res.json({ success: true, data: result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const problem = await problemsService.getById(req.params.id!);
    res.json({ success: true, data: problem });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const problem = await problemsService.update(req.params.id!, req.body as UpdateProblemInput, req.user!.id);
    res.json({ success: true, data: problem });
  }),

  linkIncident: asyncHandler(async (req: Request, res: Response) => {
    const { incidentId } = req.body as LinkIncidentInput;
    await problemsService.linkIncident(req.params.id!, incidentId, req.user!.id);
    res.json({ success: true, message: 'Incident linked' });
  }),

  unlinkIncident: asyncHandler(async (req: Request, res: Response) => {
    const { incidentId } = req.body as LinkIncidentInput;
    await problemsService.unlinkIncident(req.params.id!, incidentId);
    res.json({ success: true, message: 'Incident unlinked' });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await problemsService.delete(req.params.id!, req.user!.id);
    res.json({ success: true, message: 'Problem deleted' });
  }),
};
