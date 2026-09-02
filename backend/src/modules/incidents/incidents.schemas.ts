import { z } from 'zod';

const incidentStatus = z.enum([
  'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER',
  'WAITING_FOR_VENDOR', 'RESOLVED', 'CLOSED', 'REOPENED',
]);
const incidentPriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const incidentCategory = z.enum([
  'NETWORK', 'HARDWARE', 'SOFTWARE', 'SECURITY', 'ACCOUNT',
  'EMAIL', 'SERVER', 'DATABASE', 'VPN', 'OTHER',
]);

export const createIncidentSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category: incidentCategory,
  priority: incidentPriority.optional(),
  departmentId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
});
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const updateIncidentSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: incidentCategory.optional(),
  priority: incidentPriority.optional(),
  status: incidentStatus.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  assetId: z.string().uuid().nullable().optional(),
  resolution: z.string().max(5000).optional(),
});
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;

export const listIncidentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: incidentStatus.optional(),
  priority: incidentPriority.optional(),
  category: incidentCategory.optional(),
  assigneeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  reporterId: z.string().uuid().optional(),
  slaBreached: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;

export const createCommentSchema = z.object({
  body: z.string().min(1).max(3000),
  isInternal: z.boolean().default(false),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
