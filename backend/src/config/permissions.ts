/**
 * Fine-grained permission strings used by the RBAC layer.
 * `requirePermission(...)` checks a role's `permissions` (JSON) array.
 * These are declared here so both code and seed data stay in sync.
 */
export const Permissions = {
  // Users & roles (ADMIN)
  USER_MANAGE: 'user:manage',
  ROLE_MANAGE: 'role:manage',
  DEPARTMENT_MANAGE: 'department:manage',
  AUDIT_VIEW: 'audit:view',
  SYSTEM_CONFIGURE: 'system:configure',

  // Incidents
  INCIDENT_CREATE: 'incident:create',
  INCIDENT_VIEW_ALL: 'incident:view_all',
  INCIDENT_ASSIGN: 'incident:assign',
  INCIDENT_UPDATE_ALL: 'incident:update_all',
  INCIDENT_RESOLVE: 'incident:resolve',
  INCIDENT_COMMENT: 'incident:comment',
  INCIDENT_AI_OVERRIDE: 'incident:ai_override',

  // Assets
  ASSET_MANAGE: 'asset:manage',
  ASSET_VIEW_ALL: 'asset:view_all',

  // Knowledge
  KNOWLEDGE_CREATE: 'knowledge:create',
  KNOWLEDGE_APPROVE: 'knowledge:approve',
  KNOWLEDGE_MANAGE: 'knowledge:manage',

  // Problem & change management
  PROBLEM_MANAGE: 'problem:manage',
  CHANGE_MANAGE: 'change:manage',
  CHANGE_APPROVE: 'change:approve',

  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

/** Role → default permission set. */
export const RolePermissions: Record<string, Permission[]> = {
  ADMIN: Object.values(Permissions),
  IT_MANAGER: [
    Permissions.INCIDENT_CREATE,
    Permissions.INCIDENT_VIEW_ALL,
    Permissions.INCIDENT_ASSIGN,
    Permissions.INCIDENT_UPDATE_ALL,
    Permissions.INCIDENT_RESOLVE,
    Permissions.INCIDENT_COMMENT,
    Permissions.INCIDENT_AI_OVERRIDE,
    Permissions.ASSET_VIEW_ALL,
    Permissions.ASSET_MANAGE,
    Permissions.KNOWLEDGE_CREATE,
    Permissions.KNOWLEDGE_APPROVE,
    Permissions.PROBLEM_MANAGE,
    Permissions.CHANGE_MANAGE,
    Permissions.CHANGE_APPROVE,
    Permissions.ANALYTICS_VIEW,
  ],
  TECHNICIAN: [
    Permissions.INCIDENT_CREATE,
    Permissions.INCIDENT_VIEW_ALL,
    Permissions.INCIDENT_UPDATE_ALL,
    Permissions.INCIDENT_RESOLVE,
    Permissions.INCIDENT_COMMENT,
    Permissions.INCIDENT_AI_OVERRIDE,
    Permissions.ASSET_VIEW_ALL,
    Permissions.KNOWLEDGE_CREATE,
  ],
  EMPLOYEE: [
    Permissions.INCIDENT_CREATE,
    Permissions.INCIDENT_COMMENT,
    Permissions.KNOWLEDGE_CREATE,
  ],
};