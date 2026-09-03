# Testing

NexusOps uses a multi-layer testing strategy to ensure reliability and correctness.

## Test Pyramid

```mermaid
graph TB
    E2E["E2E Tests<br/>(Playwright)<br/>Full user flows"]
    INT["Integration Tests<br/>(Supertest)<br/>API + DB"]
    UNIT["Unit Tests<br/>(Vitest)<br/>Pure logic"]

    UNIT --> INT
    INT --> E2E
```

| Layer | Tool | Speed | Count |
|---|---|---|---|
| Unit | Vitest | ~50ms each | 15+ |
| Integration | Vitest + Supertest | ~200ms each | 25+ |
| E2E | Playwright | ~5s each | 5+ (roadmap) |

## Running Tests

```bash
# All tests
npm run test:backend

# Specific file
npx vitest run src/tests/auth.integration.test.ts

# Watch mode
npx vitest

# With coverage
npx vitest run --coverage
```

## Unit Tests

Test pure logic without database or HTTP:

```typescript
// sla.unit.test.ts
describe('SLA calculations', () => {
  it('computes deadline for HIGH priority (4h)', () => {
    const deadline = computeDeadline('HIGH', new Date('2026-09-01T10:00:00Z'));
    expect(deadline).toEqual(new Date('2026-09-01T14:00:00Z'));
  });

  it('formats remaining time correctly', () => {
    expect(formatRemaining(3600000)).toBe('1h 0m');
    expect(formatRemaining(60000)).toBe('1m');
    expect(formatRemaining(-1000)).toBe('Breached');
  });
});

// rbac.unit.test.ts
describe('RBAC permission matrix', () => {
  it('ADMIN holds every permission', () => {
    expect(RolePermissions.ADMIN).toEqual(
      expect.arrayContaining(Object.values(Permissions))
    );
  });

  it('EMPLOYEE cannot manage users', () => {
    expect(RolePermissions.EMPLOYEE).not.toContain(Permissions.USER_MANAGE);
  });
});
```

## Integration Tests

Test API endpoints with a real database:

```typescript
// auth.integration.test.ts
describe('POST /api/auth/login', () => {
  it('returns tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@nexusops.local', password: 'Password123!' });
    
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@nexusops.local', password: 'wrong' });
    
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });
});
```

### Test Database

Integration tests use a **separate test database** to avoid polluting dev data:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['src/tests/setup.ts'],
    env: {
      DATABASE_URL: 'postgresql://nexusops:nexusops@localhost:5432/nexusops_test',
    },
  },
});
```

The setup file runs migrations before tests:

```typescript
// setup.ts
import { execSync } from 'child_process';

execSync('npx prisma migrate deploy', { stdio: 'inherit' });
```

## Test Coverage

| Module | Coverage | Key scenarios |
|---|---|---|
| Auth | 95% | Login, register, refresh, RBAC, password reset |
| Incidents | 90% | CRUD, status transitions, SLA, history |
| Notifications | 85% | Create, read, mark-all, real-time push |
| SLA | 100% | Deadline math, breach detection, formatting |
| RBAC | 100% | Permission matrix for all roles |
| AI | 80% | Heuristic fallback, output parsing, RAG refusal |

## E2E Tests (Playwright)

Full user flow tests:

```typescript
// e2e/incident-lifecycle.spec.ts
test('employee creates incident → technician resolves', async ({ page }) => {
  // Employee logs in
  await page.goto('/login');
  await page.fill('[name=email]', 'employee@nexusops.local');
  await page.fill('[name=password]', 'Password123!');
  await page.click('button[type=submit]');

  // Create incident
  await page.click('text=New Incident');
  await page.fill('[name=title]', 'VPN not connecting');
  await page.fill('[name=description]', 'Cannot connect to VPN after update');
  await page.click('text=Create');

  // Verify incident appears
  await expect(page.locator('text=VPN not connecting')).toBeVisible();

  // Switch to technician
  await page.click('text=Logout');
  await page.fill('[name=email]', 'tech1@nexusops.local');
  // ... technician resolves incident

  // Verify employee sees update
  await page.click('text=Logout');
  await page.fill('[name=email]', 'employee@nexusops.local');
  await expect(page.locator('text=RESOLVED')).toBeVisible();
});
```

## Continuous Integration

Tests run automatically on every push via GitHub Actions:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: { POSTGRES_PASSWORD: test }
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:backend
```

## Writing New Tests

### Checklist for a new feature test:
1. [ ] Unit test for pure logic (calculations, validators)
2. [ ] Integration test for API endpoint (happy path + error cases)
3. [ ] RBAC test (verify role-based access)
4. [ ] Audit log test (verify action is recorded)
5. [ ] E2E test for critical user flows

### Naming convention:
- `*.unit.test.ts` — pure logic, no DB
- `*.integration.test.ts` — API + DB
- `e2e/*.spec.ts` — full browser flows
