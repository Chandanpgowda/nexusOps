import { z } from 'zod';

export const createChangeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  reason: z.string().min(10),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  impact: z.string().min(10),
  plannedStart: z.string().datetime(),
  plannedEnd: z.string().datetime(),
  rollbackPlan: z.string().min(10),
});

export const updateChangeSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).optional(),
  reason: z.string().min(10).optional(),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  impact: z.string().min(10).optional(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
  rollbackPlan: z.string().min(10).optional(),
});

export const CHANGE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'SCHEDULED',
  'IMPLEMENTING',
  'COMPLETED',
] as const;

export const transitionChangeSchema = z.object({
  status: z.enum(CHANGE_STATUSES),
});

export const approveChangeSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().max(500).optional(),
});

export const listChangesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(CHANGE_STATUSES).optional(),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'plannedStart']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateChangeInput = z.infer<typeof createChangeSchema>;
export type UpdateChangeInput = z.infer<typeof updateChangeSchema>;
export type ApproveChangeInput = z.infer<typeof approveChangeSchema>;
export type TransitionChangeInput = z.infer<typeof transitionChangeSchema>;
export type ListChangesQuery = z.infer<typeof listChangesQuerySchema>;
export type ChangeStatus = (typeof CHANGE_STATUSES)[number];
