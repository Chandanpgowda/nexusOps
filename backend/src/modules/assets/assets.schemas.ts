import { z } from 'zod';

export const createAssetSchema = z.object({
  assetTag: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  type: z.enum(['LAPTOP', 'DESKTOP', 'MONITOR', 'PRINTER', 'ROUTER', 'SERVER', 'MOBILE_DEVICE', 'NETWORK_DEVICE']),
  serialNumber: z.string().min(2).max(100),
  status: z.enum(['IN_USE', 'IN_STOCK', 'IN_REPAIR', 'RETIRED']).optional(),
  assignedUserId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  purchaseDate: z.string().datetime().optional(),
  warrantyExpiry: z.string().datetime().optional(),
  os: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const listAssetsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['IN_USE', 'IN_STOCK', 'IN_REPAIR', 'RETIRED']).optional(),
  type: z.enum(['LAPTOP', 'DESKTOP', 'MONITOR', 'PRINTER', 'ROUTER', 'SERVER', 'MOBILE_DEVICE', 'NETWORK_DEVICE']).optional(),
  departmentId: z.string().uuid().optional(),
  assignedUserId: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['assetTag', 'name', 'type', 'status', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const assignAssetSchema = z.object({
  assignedUserId: z.string().uuid().nullable(),
  note: z.string().max(500).optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
export type AssignAssetInput = z.infer<typeof assignAssetSchema>;
