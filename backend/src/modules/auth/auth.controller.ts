import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { withReqMeta } from '../audit/audit.service';
import * as authService from './auth.service';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body, withReqMeta(req, {
      actorId: null,
      action: 'USER_REGISTERED',
      entityType: 'User',
    }));
    res.status(201).json({ success: true, data: result });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body, withReqMeta(req, {
      actorId: null,
      action: 'USER_LOGIN',
      entityType: 'User',
    }));
    res.status(200).json({ success: true, data: result });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refresh(req.body.refreshToken);
    res.status(200).json({ success: true, data: result });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.logout(req.body.refreshToken, withReqMeta(req, {
      actorId: req.user?.id ?? null,
      action: 'USER_LOGOUT',
      entityType: 'User',
    }));
    res.status(200).json({ success: true, data: result });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.me(req.user!.id);
    res.status(200).json({ success: true, data: user });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json({ success: true, data: result });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.resetPassword(req.body, withReqMeta(req, {
      actorId: null,
      action: 'PASSWORD_RESET',
      entityType: 'User',
    }));
    res.status(200).json({ success: true, data: result });
  }),
};