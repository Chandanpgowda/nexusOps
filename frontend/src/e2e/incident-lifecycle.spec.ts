import { test, expect, Page } from '@playwright/test';

// Demo credentials
const EMPLOYEE = { email: 'employee@nexusops.local', password: 'Password123!' };
const TECHNICIAN = { email: 'tech1@nexusops.local', password: 'Password123!' };

async function login(page: Page, creds: typeof EMPLOYEE) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Incident lifecycle', () => {
  test('employee creates incident → technician resolves it', async ({ page, context }) => {
    // 1. Employee creates an incident
    await login(page, EMPLOYEE);
    await page.getByRole('link', { name: /incidents/i }).click();
    await page.getByRole('button', { name: /new incident/i }).click();

    await page.getByLabel('Title').fill('VPN not connecting after update');
    await page.getByLabel('Description').fill('After yesterday Windows update, VPN fails to connect');
    await page.getByLabel('Category').selectOption('NETWORK');
    await page.getByRole('button', { name: /create/i }).click();

    // Redirected to incident detail
    await expect(page).toHaveURL(/\/incidents\//);
    await expect(page.getByText('VPN not connecting after update')).toBeVisible();

    const incidentUrl = page.url();

    // 2. Technician opens same incident in a new browser context
    const techPage = await context.newPage();
    await login(techPage, TECHNICIAN);
    await techPage.goto(incidentUrl);

    // Technician assigns the incident to themselves
    await techPage.getByRole('button', { name: /assign to me/i }).click();
    await expect(techPage.getByText('ASSIGNED')).toBeVisible();

    // Technician moves to IN PROGRESS
    await techPage.getByRole('button', { name: /start progress/i }).click();
    await expect(techPage.getByText('IN_PROGRESS')).toBeVisible();

    // Technician adds a comment
    await techPage.getByPlaceholder(/add a comment/i).fill('Restarting VPN service — please check now.');
    await techPage.getByRole('button', { name: /comment/i }).click();
    await expect(techPage.getByText('Restarting VPN service')).toBeVisible();

    // Technician resolves
    await techPage.getByRole('button', { name: /resolve/i }).click();
    await expect(techPage.getByText('RESOLVED')).toBeVisible();

    // 3. Employee sees real-time update (no refresh)
    await expect(page.getByText('RESOLVED')).toBeVisible({ timeout: 10000 });

    // 4. Employee closes the incident
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByText('CLOSED')).toBeVisible();
  });

  test('AI analysis panel appears for new incident', async ({ page }) => {
    await login(page, EMPLOYEE);
    await page.getByRole('link', { name: /incidents/i }).click();
    await page.getByRole('button', { name: /new incident/i }).click();
    await page.getByLabel('Title').fill('Laptop overheating and shutting down');
    await page.getByLabel('Description').fill('Laptop gets very hot and shuts down randomly');
    await page.getByLabel('Category').selectOption('HARDWARE');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page).toHaveURL(/\/incidents\//);
    await expect(page.getByText(/ai analysis/i)).toBeVisible();
    await expect(page.getByText(/category|priority|hardware/i)).toBeVisible({ timeout: 30000 });
  });

  test('unauthorized employee cannot access admin page', async ({ page }) => {
    await login(page, EMPLOYEE);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
