import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';

// Deterministic unique user for this run (so re-runs never collide).
const UNIQUE = `int_${Date.now()}`;
const API = request(createApp());

describe('Auth & RBAC integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  describe('register', () => {
    it('registers a new employee and returns tokens', async () => {
      const res = await API.post('/api/auth/register').send({
        email: `${UNIQUE}@example.com`,
        password: 'SecurePass123!',
        fullName: 'Test Employee',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeTypeOf('string');
      expect(res.body.data.refreshToken).toBeTypeOf('string');
      expect(res.body.data.user.roles).toEqual(['EMPLOYEE']);
    });

    it('rejects a duplicate email', async () => {
      const res = await API.post('/api/auth/register').send({
        email: 'admin@nexusops.local',
        password: 'SecurePass123!',
        fullName: 'Dup Admin',
      });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
    });

    it('rejects missing fields', async () => {
      const res = await API.post('/api/auth/register').send({ email: 'x@y.com' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('login', () => {
    it('logs in with valid credentials and returns tokens', async () => {
      const res = await API.post('/api/auth/login').send({
        email: 'employee@nexusops.local',
        password: 'Password123!',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('employee@nexusops.local');
    });

    it('rejects a bad password', async () => {
      const res = await API.post('/api/auth/login').send({
        email: 'employee@nexusops.local',
        password: 'wrong-password',
      });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects an inactive account', async () => {
      const email = `${UNIQUE}_inactive@example.com`;
      await API.post('/api/auth/register').send({ email, password: 'SecurePass123!', fullName: 'Inactive' });
      await prisma.user.updateMany({ where: { email }, data: { isActive: false } } });
      const res = await API.post('/api/auth/login').send({ email, password: 'SecurePass123!' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_DISABLED');
    });
  });

  describe('refresh', () => {
    it('rotates a refresh token and issues a new pair', async () => {
      const login = await API.post('/api/auth/login').send({
        email: 'employee@nexusops.local',
        password: 'Password123!',
      });
      const oldRefresh = login.body.data.refreshToken;
      const res = await API.post('/api/auth/refresh').send({ refreshToken: oldRefresh });
      expect(res.status).toBe(200);
      expect(res.body.data.refreshToken).not.toBe(oldRefresh);
      // Old token now revoked.

      const replay = await API.post('/api/auth/refresh').send({ refreshToken: oldRefresh });
      expect(replay.status).toBe(401);
    });

    it('rejects an invalid refresh token', async () => {
      const res = await API.post('/api/auth/refresh').send({ refreshToken: 'bogus' });
      expect(res.status).toBe(401);
      expect(res.body.code).toMatch(/INVALID_TOKEN|TOKEN_EXPIRED/);
    });
  });

  describe('me & RBAC', () => {
    let employeeToken: string;
    let adminToken: string;
    let techToken: string;
    let managerToken: string;

    beforeAll(async () => {
      const employee = await API.post('/api/auth/login').send({ email: 'employee@nexusops.local', password: 'Password123!' });
      const admin = await API.post('/api/auth/login').send({ email: 'admin@nexusops.local', password: 'Password123!' });
      const tech = await API.post('/api/auth/login').send({ email: 'tech1@nexusops.local', password: 'Password123!' });
      const manager = await API.post('/api/auth/login').send({ email: 'manager@nexusops.local', password: 'Password123!' });
      employeeToken = employee.body.data.accessToken;
      adminToken = admin.body.data.accessToken;
      techToken = tech.body.data.accessToken;
      managerToken = manager.body.data.accessToken;
    });

    it('/me returns the authenticated user', async () => {
      const res = await API.get('/api/auth/me').set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('employee@nexusops.local';
    });

    it('401 when no token provided', async () => {
      const res = await API.get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED';
    });

    it('403 when an employee hits an admin-only endpoint', async () => {
      const res = await API.get('/api/users').set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN';
    });

    it('200 when an admin lists users', async () => {
      const res = await API.get('/api/users').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.data].length).toBeGreaterThanOrEqual(6;
    });

    it('admin can create a user with a custom role', async () => {
      const res = await API.post('/api/users').set('Authorization', `Bearer ${adminToken}`)
        .send({ email: `${UNIQUE}_custom@example.com`, password: 'SecurePass123!', fullName: 'Custom', roles: ['TECHNICIAN'] });
      expect(res.status).toBe(201);
      expect(res.body.data.roles].some((r: string) => r === 'TECHNICIAN')).toBe(true;
    });

    it('403 when a technician tries to set another users role', async () => {
      const res = await API.patch(`/api/users/${UNIQUE}_custom@example.com/roles`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ roles: ['EMPLOYEE'] });
      expect(res.status).toBe(403);
    });

    it('manager can list departments (open to all authed users)', async () => {
      const res = await API.get('/api/departments').set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0;
    });
  });

  describe('password reset flow', () => {
    it('requests a reset token for a known user (non-enumerating)', async () => {
      const res = await API.post('/api/auth/forgot-password').send({ email: 'employee@nexusops.local' });
      expect(res.status).toBe(200);
      expect(res.body.data.resetTokenSent].toBe(true;
      expect(res.body.data.resetToken].toBeDefined();
    });

    it('does not leak whether an email exists', async () => {
      const res = await API.post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.data.resetTokenSent].toBe(true;
      expect(res.body.data.resetToken].toBeUndefined();
    });

    it('resets the password then allows login with the new password', async () => {
      const email = `${UNIQUE}_reset@example.com`;
      await API.post('/api/auth/register').send({ email, password: 'SecurePass123!', fullName: 'Reset' });
      const fp = await API.post('/api/auth/forgot-password').send({ email });
      const token = fp.body.data.resetToken;
      const res = await API.post('/api/auth/reset-password').send({ token, password: 'NewPass456!' });
      expect(res.status).toBe(200);
      const login = await API.post('/api/auth/login').send({ email, password: 'NewPass456!' });
      expect(login.status).toBe(200);
      const oldLogin = await API.post('/api/auth/login').send({ email, password: 'SecurePass123!' });
      expect(oldLogin.status).toBe(401);
    });
  });
});
