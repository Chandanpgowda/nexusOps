import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().trim().min(1).max(150),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  roles: z.array(z.string()).min(1, 'At least one role is required').default(['EMPLOYEE']),
  departmentIds: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(150).optional(),
    phone: z.string().trim().max(30).optional().nullable(),
    isActive: z.boolean().optional(),
    departmentIds: z.array(z.string()).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

export const setUserRolesSchema = z.object({
  roles: z.array(z.string()).min(1, 'At least one role is required'),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  role: z.string().optional(),
  search: z.string().optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(300).optional().nullable(),
});

export const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(300).optional().nullable(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SetUserRolesInput = z.infer<typeof setUserRolesSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;