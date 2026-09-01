import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';

// Process env BEFORE importing anything that reads config/env.
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  // Ensure Prisma connects (client initialized lazily on first query).
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});