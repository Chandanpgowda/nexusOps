import type { PrismaClient } from '@prisma/client';

type Ctx = {
  users: Record<string, string>;
  assets: Record<string, string>;
  deptByName: Record<string, string>;
  slaByPriority: Record<string, { id: string; resolutionMinutes: number } | undefined>;
};

const DAY = 24 * 3600 * 1000;

export async function seedContent(prisma: PrismaClient, { users, assets, deptByName, slaByPriority }: Ctx) {
  await prisma.incident.deleteMany({});

  const incData = [
    {
      ref: 'INC-1001', title: 'VPN stopped connecting after Windows update',
      description: "Since installing yesterday's Windows update, the corporate VPN client fails authentication with error 809. Tried restarting multiple times.",
      status: 'IN_PROGRESS' as const, priority: 'HIGH' as const, category: 'VPN' as const,
      reporter: 'employee@nexusops.local', assignee: 'tech1@nexusops.local', asset: 'LAP-1001',
    },
    {
      ref: 'INC-1002', title: 'Cannot log in to email â€” account locked',
      description: 'Outlook says my account is locked after entering the correct password twice.',
      status: 'ASSIGNED' as const, priority: 'MEDIUM' as const, category: 'ACCOUNT' as const,
      reporter: 'employee2@nexusops.local', assignee: 'tech2@nexusops.local', asset: null as string | null,
    },
    {
      ref: 'INC-1003', title: 'Printer on Floor 3 not responding',
      description: 'The shared HP LaserJet on floor 3 shows offline for everyone. Jobs are stuck in the queue.',
      status: 'OPEN' as const, priority: 'LOW' as const, category: 'HARDWARE' as const,
      reporter: 'employee@nexusops.local', assignee: null, asset: null,
    },
    {
      ref: 'INC-1004', title: 'File server unreachable from Finance department',
      description: 'Multiple users report that the \\\\filesrv01 share is inaccessible. Ping times out. Started ~09:20.',
      status: 'IN_PROGRESS' as const, priority: 'CRITICAL' as const, category: 'NETWORK' as const,
      reporter: 'manager@nexusops.local', assignee: 'tech1@nexusops.local', asset: 'SRV-3001',
    },
    {
      ref: 'INC-1005', title: 'Laptop extremely slow after startup',
      description: 'HP EliteBook takes 10+ minutes to become usable. Disk usage pegged at 100%.',
      status: 'RESOLVED' as const, priority: 'MEDIUM' as const, category: 'HARDWARE' as const,
      reporter: 'employee2@nexusops.local', assignee: 'tech2@nexusops.local', asset: 'LAP-1024',
      resolution: 'Failing SSD replaced under warranty. OEM image reinstalled.',
    },
    {
      ref: 'INC-1006', title: 'Wi-Fi drops every few minutes in meeting room B',
      description: 'Wireless connection in meeting room B disconnects roughly every 5 minutes on all devices.',
      status: 'OPEN' as const, priority: 'HIGH' as const, category: 'NETWORK' as const,
      reporter: 'employee@nexusops.local', assignee: null, asset: null,
    },
  ];

  for (const i of incData) {
    const sla = slaByPriority[i.priority];
    const created = new Date(Date.now() - 2 * DAY);
    await prisma.incident.create({
      data: {
        ref: i.ref,
        title: i.title,
        description: i.description,
        status: i.status,
        priority: i.priority,
        category: i.category,
        reporterId: users[i.reporter],
        assigneeId: i.assignee ? users[i.assignee] : null,
        departmentId: deptByName['IT Operations'],
        assetId: i.asset ? assets[i.asset] : null,
        slaPolicyId: sla?.id ?? null,
        resolutionDeadline: sla ? new Date(created.getTime() + sla.resolutionMinutes * 60 * 1000) : null,
        resolution: 'resolution' in i ? i.resolution : null,
        resolvedAt: i.status === 'RESOLVED' ? new Date() : null,
        createdAt: created,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`  âœ“ ${incData.length} incidents`);

  await prisma.problem.deleteMany({});
  await prisma.change.deleteMany({});

  await prisma.problem.create({
    data: {
      ref: 'PRB-0001',
      title: 'Recurring Wi-Fi instability on Floor 2/3 access points',
      description: 'Multiple intermittent Wi-Fi drop reports concentrated around floors 2 and 3.',
      status: 'INVESTIGATING',
      ownerId: users['tech1@nexusops.local'],
      incidents: {
        create: [
          { incidentId: (await prisma.incident.findUniqueOrThrow({ where: { ref: 'INC-1006' } })).id },
        ],
      },
    },
  });

  await prisma.change.create({
    data: {
      ref: 'CHG-0001',
      title: 'Replace firmware on Floor 3 access points',
      description: 'Upgrade Omada EAP653 firmware to latest stable to address roaming instability.',
      reason: 'Recurring Wi-Fi incidents on Floor 3 (PRB-0001).',
      risk: 'MEDIUM',
      impact: 'Brief wireless outage on Floor 3 (~10 min) outside business hours.',
      plannedStart: new Date(Date.now() + 3 * DAY),
      plannedEnd: new Date(Date.now() + 3 * DAY + 3600 * 1000),
      rollbackPlan: 'Revert to previous firmware image stored on controller.',
      status: 'SUBMITTED',
      requestedById: users['tech1@nexusops.local'],
    },
  });
  console.log('  âœ“ 1 problem, 1 change request');

  await prisma.knowledgeArticle.deleteMany({});
  const articles = [
    {
      slug: 'vpn-error-809-after-windows-update',
      title: 'Fixing VPN Error 809 after a Windows Update',
      description: 'Resolve VPN authentication failures (error 809) caused by Windows security updates resetting adapter settings.',
      problem: 'VPN client fails authentication with error 809 after a Windows update.',
      solution: '1. Update the VPN client to the latest version.\n2. Restart the IKEv2/IPsec service (services.msc > IKE and AuthIP IPsec Keying Modules > Restart).\n3. Re-register credentials in the VPN client.\n4. If unresolved, uninstall the latest Windows network update (Settings > Update history > Uninstall updates).',
      category: 'VPN' as const,
      tags: ['vpn', 'windows', 'error-809'],
    },
    {
      slug: 'unlock-locked-domain-account',
      title: 'How to unlock a locked domain account',
      description: 'Standard procedure for unlocking user accounts locked by repeated failed logins.',
      problem: 'User sees "account is locked" when signing in.',
      solution: '1. Verify the user identity in person or via video call.\n2. Admins: Active Directory > find user > Unlock account.\n3. Ask the user to sign in with the correct password; force a password reset after 3 lockouts in 30 days.',
      category: 'ACCOUNT' as const,
      tags: ['account', 'active-directory', 'lockout'],
    },
    {
      slug: 'shared-printer-offline-troubleshooting',
      title: 'Troubleshooting a shared printer that shows offline',
      description: 'Checklist to restore a network printer that appears offline to all users.',
      problem: 'Network printer shows offline; print jobs queue but never print.',
      solution: '1. Confirm the printer is powered on and connected to the network.\n2. Print the self-test/config page to get its IP.\n3. Ping the IP from the print server.\n4. Restart the Print Spooler service on the print server.\n5. Re-add the printer port if the IP changed (DHCP lease).',
      category: 'HARDWARE' as const,
      tags: ['printer', 'offline', 'spooler'],
    },
  ];
  for (const a of articles) {
    await prisma.knowledgeArticle.create({
      data: {
        ...a,
        status: 'PUBLISHED',
        authorId: users['tech1@nexusops.local'],
        approvedById: users['admin@nexusops.local'],
        publishedAt: new Date(),
      },
    });
  }
  console.log(`  âœ“ ${articles.length} knowledge articles`);
}
