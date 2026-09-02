import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';

const API = request(createApp());

let employeeToken: string;
let techToken: string;
let managerToken: string;
let createdIncidentId: string;

beforeAll(async () => {
  await prisma.$connect();

  const emp = await API.post('/api/auth/login').send({ email: 'employee@nexusops.local', password: 'Password123!' });
  employeeToken = emp.body.data.accessToken;

  const tech = await API.post('/api/auth/login').send({ email: 'tech1@nexusops.local', password: 'Password123!' });
  techToken = tech.body.data.accessToken;

  const mgr = await API.post('/api/auth/login').send({ email: 'manager@nexusops.local', password: 'Password123!' });
  managerToken = mgr.body.data.accessToken;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Incident lifecycle', () => {
  it('employee can create an incident with SLA deadlines', async () => {
    const res = await API.post('/api/incidents')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'Monitor flickering in design studio',
        description: 'The Dell monitor in the design studio has been flickering intermittently for two days.',
        category: 'HARDWARE',
        priority: 'HIGH',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.ref).toMatch(/^INC-\d+$/);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.responseDeadline).toBeTruthy();
    expect(res.body.data.resolutionDeadline).toBeTruthy();
    createdIncidentId = res.body.data.id;
  });

  it('employee cannot assign an incident (RBAC)', async () => {
    const res = await API.patch(`/api/incidents/${createdIncidentId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ assigneeId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(403);
  });

  it('technician can assign and auto-transitions OPEN → ASSIGNED', async () => {
    const tech = await API.post('/api/auth/login').send({ email: 'tech1@nexusops.local', password: 'Password123!' });
    const tToken = tech.body.data.accessToken;
    const techId = tech.body.data.user.id;

    const res = await API.patch(`/api/incidents/${createdIncidentId}`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ assigneeId: techId });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ASSIGNED');
    expect(res.body.data.assigneeId).toBe(techId);
  });

  it('blocks invalid status transition ASSIGNED → CLOSED', async () => {
    const res = await API.patch(`/api/incidents/${createdIncidentId}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'CLOSED' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('technician can progress ASSIGNED → IN_PROGRESS and sets firstResponseAt', async () => {
    const res = await API.patch(`/api/incidents/${createdIncidentId}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');
    expect(res.body.data.firstResponseAt).toBeTruthy();
  });

  it('requires resolution text when resolving', async () => {
    const res = await API.patch(`/api/incidents/${createdIncidentId}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'RESOLVED' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('RESOLUTION_REQUIRED');
  });

  it('technician can resolve with resolution text', async () => {
    const res = await API.patch(`/api/incidents/${createdIncidentId}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'RESOLVED', resolution: 'Replaced the DisplayPort cable. Monitor stable.' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('RESOLVED');
    expect(res.body.data.resolvedAt).toBeTruthy();
  });

  it('records full history trail', async () => {
    const res = await API.get(`/api/incidents/${createdIncidentId}/history`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(200);
    const fields = res.body.data.map((h: { field: string }) => h.field);
    expect(fields).toContain('status');
    expect(fields).toContain('assigneeId');
  });

  it('manager can list with filters and pagination', async () => {
    const res = await API.get('/api/incidents?page=1&pageSize=2&status=OPEN')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeLessThanOrEqual(2);
    expect(res.body.data.total).toBeGreaterThanOrEqual(0);
  });

  it('rejects unauthenticated access with 401', async () => {
    const res = await API.get('/api/incidents');
    expect(res.status).toBe(401);
  });
});
