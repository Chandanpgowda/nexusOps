import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { withReqMeta } from '../audit/audit.service';
import { listUsersSchema } from './users.schemas';
import * as userService from './users.service';
import * as deptService from './departments.service';

export const usersController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const q = listUsersSchema.parse(req.query);
    const result = await userService.listUsers(q);
    res.json({ success: true, data: result });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.createUser(req.body, withReqMeta(req, {
      actorId: req.user!.id,
      action: 'USER_CREATED',
      entityType: 'User',
    }));
    res.status(201).json({ success: true, data: user });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateUser(req.params.id!, req.body, withReqMeta(req, {
      actorId: req.user!.id,
      action: 'USER_UPDATED',
      entityType: 'User',
    }));
    res.json({ success: true, data: user });
  }),

  setRoles: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.setUserRoles(req.params.id!, req.body, withReqMeta(req, {
      actorId: req.user!.id,
      action: 'USER_ROLES_CHANGED',
      entityType: 'User',
    }));
    res.json({ success: true, data: user });
  }),

  roles: asyncHandler(async (_req: Request, res: Response) => {
    const roles = await userService.listRoles();
    res.json({ success: true, data: roles });
  }),

  listDepartments: asyncHandler(async (_req: Request, res: Response) => {
    const departments = await deptService.listDepartments();
    res.json({ success: true, data: departments });
  }),

  createDepartment: asyncHandler(async (req: Request, res: Response) => {
    const dept = await deptService.createDepartment(req.body, withReqMeta(req, {
      actorId: req.user!.id,
      action: 'DEPARTMENT_CREATED',
      entityType: 'Department',
    }));
    res.status(201).json({ success: true, data: dept });
  }),

  updateDepartment: asyncHandler(async (req: Request, res: Response) => {
    const dept = await deptService.updateDepartment(req.params.id!, req.body, withReqMeta(req, {
      actorId: req.user!.id,
      action: 'DEPARTMENT_UPDATED',
      entityType: 'Department',
    }));
    res.json({ success: true, data: dept });
  }),
};