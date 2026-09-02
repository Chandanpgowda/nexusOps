import { Request, Response } from 'express';
import { assetsService } from './assets.service';
import { asyncHandler } from '../../lib/async-handler';
import { CreateAssetInput, ListAssetsQuery, UpdateAssetInput } from './assets.schemas';

export const assetsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const asset = await assetsService.create(req.body as CreateAssetInput, req.user!.id);
    res.status(201).json({ success: true, data: asset });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await assetsService.list(req.query as unknown as ListAssetsQuery);
    res.json({ success: true, data: result });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const asset = await assetsService.getById(req.params.id!);
    res.json({ success: true, data: asset });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const asset = await assetsService.update(req.params.id!, req.body as UpdateAssetInput, req.user!.id);
    res.json({ success: true, data: asset });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await assetsService.delete(req.params.id!, req.user!.id);
    res.json({ success: true, message: 'Asset deleted' });
  }),

  assign: asyncHandler(async (req: Request, res: Response) => {
    const { toUserId, note } = req.body;
    const asset = await assetsService.assign(req.params.id!, toUserId, note, req.user!.id);
    res.json({ success: true, data: asset });
  }),

  getHistory: asyncHandler(async (req: Request, res: Response) => {
    const history = await assetsService.getAssignmentHistory(req.params.id!);
    res.json({ success: true, data: history });
  }),
};
