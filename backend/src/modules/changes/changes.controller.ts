import { Request, Response } from 'express';
import { changesService } from './changes.service';
import { asyncHandler } from '../../lib/async-handler';
import { CreateChangeInput, ListChangesQuery, UpdateChangeInput, ApproveChangeInput, TransitionChangeInput } from './changes.schemas';

export const changesController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const change = await changesService.create(req.body as CreateChangeInput, req.user!.id);
    res.status(201).json({ success: true, data: change });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await changesService.list(req.query as unknown as ListChangesQuery);
    res.json({ success: true, data: result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const change = await changesService.getById(req.params.id!);
    res.json({ success: true, data: change });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const change = await changesService.update(req.params.id!, req.body as UpdateChangeInput, req.user!);
    res.json({ success: true, data: change });
  }),

  transition: asyncHandler(async (req: Request, res: Response) => {
    const change = await changesService.transition(req.params.id!, req.body as TransitionChangeInput, req.user!);
    res.json({ success: true, data: change });
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const change = await changesService.approve(req.params.id!, req.body as ApproveChangeInput, req.user!);
    res.json({ success: true, data: change });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await changesService.delete(req.params.id!, req.user!.id);
    res.json({ success: true, message: 'Change deleted' });
  }),
};
