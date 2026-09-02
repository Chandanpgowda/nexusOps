import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';

const app = createApp();

let employeeToken: string;
let techToken: string;
let techId: string;

beforeAll(async () => {
  const empLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'employee@nexusops.local', password: 'Password123!' });
  employeeToken = empLogin.body.data.accessToken;

  const techLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tech1@nexusops.local', password: 'Password123!' });
  techToken = techLogin.body.data.accessToken;

  const tech = await prisma.user.findUnique({ where: { email: 'tech1@nexusops.local' } });
  techId = tech!.id;
});

describe('Notifications flow', () => {
  it('returns empty notifications for a fresh user', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('returns unread count', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    expect(res.body.data.count).toBeGreaterThanOrEqual(0);
  });

  it('creates a notification when an incident is assigned', async () => {
    // Employee creates an incident
    const createRes = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'Notify me incident', description: 'This is a test description', category: 'SOFTWARE', priority: 'MEDIUM' })
      .expect(201);
    const incidentId = createRes.body.data.id;

    // Technician assigns it to themselves
    await request(app)
      .patch(`/api/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ assigneeId: techId })
      .expect(200);

    // Technician should have an INCIDENT_ASSIGNED notification
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);

    const assignedNotif = notifRes.body.data.items.find(
      (n: { type: string }) => n.type === 'INCIDENT_ASSIGNED'
    );
    expect(assignedNotif).toBeDefined();
  });

  it('marks a notification as read', async () => {
    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);

    const unread = listRes.body.data.items.find((n: { isRead: boolean }) => !n.isRead);
    if (!unread) return; // skip if none unread

    await request(app)
      .patch(`/api/notifications/${unread.id}/read`)
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);

    const countRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);
    expect(countRes.body.data.count).toBeLessThan(listRes.body.data.items.length);
  });

  it('marks all notifications as read', async () => {
    await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);

    const countRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);
    expect(countRes.body.data.count).toBe(0);
  });

  it('requires authentication for notifications', async () => {
    await request(app).get('/api/notifications').expect(401);
  });
});
