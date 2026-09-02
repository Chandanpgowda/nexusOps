import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';

const UNIQUE = `int${Date.now()}`;
const API = request(createApp());

describe('Auth integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  it('registers a new employee and returns tokens', async () => {
    const res = await API.post('/api/auth/register').send({
      email: UNIQUE + '@example.com',
      password: 'SecurePass123!',
      fullName: 'Test Employee',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(res.body.data.user.roles).toEqual(['EMPLOYEE']);
  });

  it('rejects a duplicate email', async () => {
    const res = await API.post('/api/auth/register').send({
      email: 'admin@nexusops.local',
      password: 'SecurePass123!',
      fullName: 'Dup',
    });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('logs in with valid credentials', async () => {
    const res = await API.post('/api/auth/login').send({
      email: 'employee@nexusops.local',
      password: 'Password123!',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('employee@nexusops.local');
  });

  it('rejects a bad password', async () => {
    const res = await API.post('/api/auth/login').send({
      email: 'employee@nexusops.local',
      password: 'wrong',
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('registers then respects account-disable', async () => {
    const email = UNIQUE + '_inactive@example.com';
    await API.post('/api/auth/register').send({ email: email, password: 'SecurePass123!', fullName: 'Inactive' });
    await prisma.user.updateMany({ where: { email: email }, data: { isActive: false } });
    const res = await API.post('/api/auth/login').send({ email: email, password: 'SecurePass123!' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_DISABLED');
  });

  it('rotates a refresh token', async () => {
    const login = await API.post('/api/auth/login').send({
      email: 'employee@nexusops.local',
      password: 'Password123!',
    });
    const oldRT = login.body.data.refreshToken;
    const res = await API.post('/api/auth/refresh').send({ refreshToken: oldRT });
    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).not.toBe(oldRT);
    const replay = await API.post('/api/auth/refresh').send({ refreshToken: oldRT });
    expect(replay.status).toBe(401);
  });

  it('rejects an invalid refresh token', async () => {
    const res = await API.post('/api/auth/refresh').send({ refreshToken: 'bogus' });
    expect(res.status).toBe(401);
    expect(res.body.code).toMatch(/INVALID_TOKEN|TOKEN_EXPIRED/);
  });

  it('requires auth on /me', async () => {
    const res = await API.get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('403 for employee on admin-only users list', async () => {
    const login = await API.post('/api/auth/login').send({ email: 'employee@nexusops.local', password: 'Password123!' });
    const res = await API.get('/api/users').set('Authorization', 'Bearer ' + login.body.data.accessToken);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('admin can list users and create a user', async () => {
    const login = await API.post('/api/auth/login').send({ email: 'admin@nexusops.local', password: 'Password123!' });
    const token = 'Bearer ' + login.body.data.accessToken;
    const list = await API.get('/api/users').set('Authorization', token);
    expect(list.status).toBe(200);
    expect(list.body.data.data.length).toBeGreaterThanOrEqual(6);
    const created = await API.post('/api/users').set('Authorization', token)
      .send({ email: UNIQUE + '_custom@example.com', password: 'SecurePass123!', fullName: 'Custom', roles: ['TECHNICIAN'] });
    expect(created.status).toBe(201);
    expect(created.body.data.roles.some((r: string) => r === 'TECHNICIAN')).toBe(true);
  });

  it('password reset allows login with new password', async () => {
    const email = UNIQUE + '_reset@example.com';
    await API.post('/api/auth/register').send({ email: email, password: 'SecurePass123!', fullName: 'Reset' });
    const fp = await API.post('/api/auth/forgot-password').send({ email: email });
    const token = fp.body.data.resetToken;
    const reset = await API.post('/api/auth/reset-password').send({ token: token, password: 'NewPass456!' });
    expect(reset.status).toBe(200);
    const login = await API.post('/api/auth/login').send({ email: email, password: 'NewPass456!' });
    expect(login.status).toBe(200);
    const oldLogin = await API.post('/api/auth/login').send({ email: email, password: 'SecurePass123!' });
    expect(oldLogin.status).toBe(401);
  });
});
