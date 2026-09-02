import { z } from 'zod';

export const createProblemSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  rootCause: z.string().min(10).optional(),
  workaround: z.string().min(10).optional(),
  permanentFix: z.string().min(10).optional(),
  incidentIds: z.array(z.string().uuid()).default([]),
});

export const updateProblemSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).optional(),
  rootCause: z.string().min(10).optional(),
  workaround: z.string().min(10).optional(),
  permanentFix: z.string().min(10).optional(),
  status: z.enum(['OPEN', 'INVESTIGATING', 'KNOWN_ERROR', 'RESOLVED']).optional(),
});

export const listProblemsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(['OPEN', 'INVESTIGATING', 'KNOWN_ERROR', 'RESOLVED']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const linkIncidentSchema = z.object({
  incidentId: z.string().uuid(),
});

export type LinkIncidentInput = z.infer<typeof linkIncidentSchema>;
export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;
export type ListProblemsQuery = z.infer<typeof listProblemsQuerySchema>;

