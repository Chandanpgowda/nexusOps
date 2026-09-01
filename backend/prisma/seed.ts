/**
 * NEXUSOPS seed — realistic demo data.
 * Demo credentials (documented in README): password for all accounts: Password123!
 */
import { PrismaClient, IncidentCategory, IncidentPriority, IncidentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { seedContent } from './seed-content';
import { RolePermissions } from '../src/config/permissions';

export const prisma = new PrismaClient();

export async function seedIdentityAndAssets() {
  console.log('🌱 Seeding NexusOps demo data...');

  // ── Roles ──
  const roles = await Promise.all(
    (
      [
        ['ADMIN', 'Full system administration'],
        ['IT_MANAGER', 'Team management, approvals, analytics'],
        ['TECHNICIAN', 'Ticket resolution and technical work'],
        ['EMPLOYEE', 'Self-service, reporting, knowledge search'],
      ] as const
    ).map(([name, description]) =>
      prisma.role.upsert({
        where: { name },
        update: { description, permissions: RolePermissions[name] ?? [] },
        create: { name, description, permissions: RolePermissions[name] ?? [] },
      })
    )
  );
  const roleByName = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  // ── Departments ──
  const deptData = [
    ['IT Operations', 'Core infrastructure, servers and networks'],
    ['Engineering', 'Product development and internal tooling'],
    ['Human Resources', 'People operations'],
    ['Finance', 'Accounting and procurement'],
    ['Sales', 'Customer-facing sales teams'],
  ] as const;
  const departments = await Promise.all(
    deptData.map(([name, description]) =>
      prisma.department.upsert({ where: { name }, update: {}, create: { name, description } })
    )
  );
  const deptByName = Object.fromEntries(departments.map((d) => [d.name, d.id]));

  // ── SLA policies: Critical 1h/4h, High 4h/8h, Medium 8h/24h, Low 24h/72h ──
  const slaData = [
    [IncidentPriority.CRITICAL, 60, 240],
    [IncidentPriority.HIGH, 240, 480],
    [IncidentPriority.MEDIUM, 480, 1440],
    [IncidentPriority.LOW, 1440, 4320],
  ] as const;
  const slaPolicies = await Promise.all(
    slaData.map(([priority, responseMinutes, resolutionMinutes]) =>
      prisma.slaPolicy.upsert({
        where: { priority },
        update: { responseMinutes, resolutionMinutes },
        create: { priority, responseMinutes, resolutionMinutes },
      })
    )
  );
  const slaByPriority = Object.fromEntries(
    slaPolicies.map((p) => [p.priority, { id: p.id, resolutionMinutes: p.resolutionMinutes }])
  );

  // ── Users ──
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const userData = [
    { email: 'admin@nexusops.local', fullName: 'Priya Sharma', role: 'ADMIN', dept: 'IT Operations' },
    { email: 'manager@nexusops.local', fullName: 'Arjun Mehta', role: 'IT_MANAGER', dept: 'IT Operations' },
    { email: 'tech1@nexusops.local', fullName: 'Ravi Kumar', role: 'TECHNICIAN', dept: 'IT Operations' },
    { email: 'tech2@nexusops.local', fullName: 'Sana Iqbal', role: 'TECHNICIAN', dept: 'IT Operations' },
    { email: 'employee@nexusops.local', fullName: 'Neha Patel', role: 'EMPLOYEE', dept: 'Finance' },
    { email: 'employee2@nexusops.local', fullName: 'Vikram Singh', role: 'EMPLOYEE', dept: 'Sales' },
  ] as const;

  const users: Record<string, string> = {};
  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        roles: { create: [{ roleId: roleByName[u.role] }] },
        departments: { create: [{ departmentId: deptByName[u.dept] }] },
      },
    });
    users[u.email] = user.id;
  }
  console.log(`  ✓ ${userData.length} users, departments, roles, SLA policies`);

  // ── Assets ──
  const assetData = [
    ['LAP-1001', 'Dell Latitude 5540', 'DL5540-88123', 'LAPTOP', 'employee@nexusops.local', 'IN_USE', 'Windows 11 Pro', 'HQ / Floor 3'],
    ['LAP-1002', 'MacBook Pro 14 M3', 'MBP14-45521', 'LAPTOP', 'employee2@nexusops.local', 'IN_USE', 'macOS Sonoma', 'HQ / Floor 4'],
    ['LAP-1024', 'HP EliteBook 840', 'HP840-73310', 'LAPTOP', null, 'IN_REPAIR', 'Windows 11 Pro', 'IT Storage'],
    ['DST-2001', 'Dell OptiPlex 7010', 'DOP7010-11455', 'DESKTOP', 'tech1@nexusops.local', 'IN_USE', 'Windows 11 Pro', 'IT Office'],
    ['SRV-3001', 'Dell PowerEdge R750', 'R750-99820', 'SERVER', null, 'IN_USE', 'Ubuntu Server 24.04', 'Data Center A'],
    ['NET-4001', 'Cisco Catalyst 9300', 'C9300-22144', 'NETWORK_DEVICE', null, 'IN_USE', 'IOS-XE 17', 'Data Center A'],
    ['NET-4002', 'TP-Link Omada EAP653', 'EAP653-00913', 'ROUTER', null, 'IN_STOCK', null, 'IT Storage'],
    ['MON-5001', 'Dell UltraSharp 27', 'U2723-31002', 'MONITOR', 'employee@nexusops.local', 'IN_USE', null, 'HQ / Floor 3'],
  ] as const;
  const assets: Record<string, string> = {};
  for (const [tag, name, serial, type, assignee, status, os, location] of assetData) {
    const asset = await prisma.asset.upsert({
      where: { assetTag: tag },
      update: {},
      create: {
        assetTag: tag,
        name,
        serialNumber: serial,
        type: type as never,
        status: status as never,
        os,
        location,
        assignedUserId: assignee ? users[assignee] : null,
        departmentId: deptByName['IT Operations'],
        purchaseDate: new Date('2023-06-15'),
        warrantyExpiry: new Date('2026-06-15'),
      },
    });
    assets[tag] = asset.id;
  }
  console.log(`  ✓ ${assetData.length} assets`);

  return { users, assets, deptByName, slaByPriority };
}

export async function main() {
  const ctx = await seedIdentityAndAssets();
  await seedContent(prisma, ctx);
  console.log('\n✅ Seed complete. Demo credentials (password for all: Password123!):');
  console.log('   admin@nexusops.local     (ADMIN)');
  console.log('   manager@nexusops.local   (IT_MANAGER)');
  console.log('   tech1@nexusops.local     (TECHNICIAN)');
  console.log('   employee@nexusops.local  (EMPLOYEE)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
