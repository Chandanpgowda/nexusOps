import { z } from 'zod';

export const createArticleSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  problem: z.string().min(10),
  solution: z.string().min(10),
  category: z.string().min(1).max(50),
  tags: z.array(z.string()).default([]),
});

export const updateArticleSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(500).optional(),
  problem: z.string().min(10).optional(),
  solution: z.string().min(10).optional(),
  category: z.string().min(1).max(50).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export const listKnowledgeQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'viewCount']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type ListKnowledgeQuery = z.infer<typeof listKnowledgeQuerySchema>;
