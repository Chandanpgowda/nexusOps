// Test env MUST be configured before any module that reads config/env is imported.
// The rate-limit middleware reads env at module-load, so set these first.
process.env.NODE_ENV = 'test';
process.env.AUTH_RATE_LIMIT_MAX = '100000';
process.env.RATE_LIMIT_MAX = '100000';

import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});