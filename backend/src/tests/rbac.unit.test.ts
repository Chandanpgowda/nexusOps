import { describe, it, expect } from 'vitest';
import { RolePermissions, Permissions } from '../config/permissions';

describe('RBAC permission matrix', () => {
  it('ADMIN holds every permission', () => {
    expect(RolePermissions.ADMIN).toEqual(expect.arrayContaining(Object.values(Permissions)));
  });

  it('EMPLOYEE limits', () => {
    expect(RolePermissions.EMPLOYEE).toContain(Permissions.INCIDENT_CREATE);
    expect(RolePermissions.EMPLOYEE).not.toContain(Permissions.USER_MANAGE);
  });

  it('TECHNICIAN limits', () => {
    expect(RolePermissions.TECHNICIAN).toContain(Permissions.INCIDENT_RESOLVE);
    expect(RolePermissions.TECHNICIAN).not.toContain(Permissions.CHANGE_APPROVE);
  });

  it('IT_MANAGER limits', () => {
    expect(RolePermissions.IT_MANAGER).toContain(Permissions.INCIDENT_ASSIGN);
    expect(RolePermissions.IT_MANAGER).toContain(Permissions.CHANGE_APPROVE);
    expect(RolePermissions.IT_MANAGER).not.toContain(Permissions.USER_MANAGE);
  });
});