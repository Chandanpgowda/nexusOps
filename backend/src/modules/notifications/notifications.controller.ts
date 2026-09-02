import { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { notificationsService } from './notifications.service';
import { listNotificationsQuerySchema } from './notifications.schemas';

export const notificationsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = listNotificationsQuerySchema.parse(req.query);
    const result = await notificationsService.listForUser(
      req.user!.id,
      query.page,
      query.pageSize
    );
    res.json({ success: true, data: result });
  }),

  unreadCount: asyncHandler(async (req: Request, res: Response) => {
    const count = await notificationsService.getUnreadCount(req.user!.id);
    res.json({ success: true, data: { count } });
  }),

  markAsRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationsService.markAsRead(req.params.id!, req.user!.id);
    res.json({ success: true, message: 'Marked as read' });
  }),

  markAllAsRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationsService.markAllAsRead(req.user!.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  }),
};
