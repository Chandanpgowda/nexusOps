import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, Column } from '../components/ui/Table';
import './Modules.css';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalIncidents: number;
  openIncidents: number;
  criticalIncidents: number;
  totalAssets: number;
  totalArticles: number;
  totalChanges: number;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
  actor: { fullName: string };
}

interface Pagination<T> { items: T[]; total: number; page: number; pageSize: number }

const actionVariant: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'default'> = {
  USER_LOGIN: 'info', USER_LOGIN_FAILED: 'warning', USER_CREATED: 'success',
  INCIDENT_CREATED: 'info', INCIDENT_UPDATED: 'warning', INCIDENT_RESOLVED: 'success',
  ROLE_CHANGED: 'danger', ASSET_REASSIGNED: 'warning', ARTICLE_PUBLISHED: 'success',
  CHANGE_APPROVED: 'success', CHANGE_REJECTED: 'danger',
};

export const Admin: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tab, setTab] = useState<'overview' | 'audit'>('overview');
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [page, setPage] = useState(1);

  const loadStats = useCallback(async () => {
    const { data } = await api.get<{ data: AdminStats }>('/admin/stats');
    setStats(data.data);
  }, []);

  const loadAudit = useCallback(async (p: number) => {
    const { data } = await api.get<Pagination<AuditLog>>('/audit', { params: { page: p, pageSize: 20 } });
    setAudit(data.items);
    setAuditTotal(data.total);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'audit') loadAudit(page); }, [tab, page, loadAudit]);

  const auditColumns: Column<AuditLog>[] = [
    { key: 'actor', header: 'User', width: '160px', render: (r) => <span className="modules__actor">{r.actor.fullName}</span> },
    { key: 'action', header: 'Action', width: '200px', render: (r) => <Badge variant={actionVariant[r.action] || 'default'}>{r.action.replace(/_/g, ' ')}</Badge> },
    { key: 'entityType', header: 'Entity', width: '120px', render: (r) => <span className="modules__entity">{r.entityType}</span> },
    { key: 'entityId', header: 'Entity ID', width: '220px', render: (r) => <code className="modules__code">{r.entityId.substring(0, 8)}…</code> },
    { key: 'ipAddress', header: 'IP', width: '120px', render: (r) => <span className="modules__ip">{r.ipAddress}</span> },
    { key: 'createdAt', header: 'Time', width: '160px', render: (r) => new Date(r.createdAt).toLocaleString() },
  ];

  const pages = Math.ceil(auditTotal / 20);

  return (
    <div className="modules">
      <div className="modules__header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="modules__subtitle">System overview and audit trail</p>
        </div>
      </div>

      <div className="modules__tabs">
        <button className={`modules__tab ${tab === 'overview' ? 'modules__tab--active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`modules__tab ${tab === 'audit' ? 'modules__tab--active' : ''}`} onClick={() => setTab('audit')}>Audit Log</button>
      </div>

      {tab === 'overview' && stats && (
        <div className="admin__grid">
          <Card className="admin__stat"><div className="admin__stat-value">{stats.totalIncidents}</div><div className="admin__stat-label">Total Incidents</div></Card>
          <Card className="admin__stat"><div className="admin__stat-value admin__stat--warning">{stats.openIncidents}</div><div className="admin__stat-label">Open</div></Card>
          <Card className="admin__stat"><div className="admin__stat-value admin__stat--danger">{stats.criticalIncidents}</div><div className="admin__stat-label">Critical</div></Card>
          <Card className="admin__stat"><div className="admin__stat-value">{stats.totalUsers}</div><div className="admin__stat-label">Users ({stats.activeUsers} active)</div></Card>
          <Card className="admin__stat"><div className="admin__stat-value">{stats.totalAssets}</div><div className="admin__stat-label">Assets</div></Card>
          <Card className="admin__stat"><div className="admin__stat-value">{stats.totalArticles}</div><div className="admin__stat-label">KB Articles</div></Card>
          <Card className="admin__stat"><div className="admin__stat-value">{stats.totalChanges}</div><div className="admin__stat-label">Changes</div></Card>
        </div>
      )}

      {tab === 'audit' && (
        <Card padding="none">
          <Table columns={auditColumns} data={audit} keyExtractor={(r) => r.id} />
          {pages > 1 && (
            <div className="modules__pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span>Page {page} of {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
