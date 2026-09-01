import type { User } from '@prisma/client';

/**
 * Shape a User (with roles + departments) into a safe public representation.
 * Never expose passwordHash. Returns roles and departments as flat data.
 */
export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  roles: string[];
  departments: { id: string; name: string; isPrimary: boolean }[];
  createdAt: Date;
  updatedAt: Date;
}

type UserWithRelations = User & {
  roles: { role: { name: string } }[];
  departments: { department: { id: string; name: string }; isPrimary: boolean }[];
};

export function toPublicUser(user: UserWithRelations): PublicUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    roles: user.roles.map((r) => r.role.name),
    departments: user.departments.map((d) => ({
      id: d.department.id,
      name: d.department.name,
      isPrimary: d.isPrimary,
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}