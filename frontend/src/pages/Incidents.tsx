import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, Column } from '../components/ui/Table';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import './Incidents.css';

interface Incident {
  id: string;
  ref: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  assignee?: { fullName: string } | null;
  reporter?: { fullName: string } | null;
  createdAt: string;
  slaBreached: boolean;
}

interface ApiResp<T> { success: boolean; data: { items: T[]; total: number } }

const priorityVariant: Record<string, 'danger' | 'warning' | 'info' | 'default'> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'default',
};

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
  OPEN: 'info',
  ASSIGNED: 'info',
  IN_PROGRESS: 'warning',
  WAITING_FOR_USER: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
};

export const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      const { data: res } = await api.get<ApiResp<Incident>>('/incidents', { params });
      setIncidents(res.data.items);
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const columns: Column<Incident>[] = [
    { key: 'ref', header: 'ID', width: '100px' },
    { key: 'title', header: 'Title' },
    { key: 'status', header: 'Status', width: '140px', render: (item) => <Badge variant={statusVariant[item.status] || 'default'}>{item.status.replace(/_/g, ' ')}</Badge> },
    { key: 'priority', header: 'Priority', width: '110px', render: (item) => <Badge variant={priorityVariant[item.priority] || 'default'}>{item.priority}</Badge> },
    { key: 'assignee', header: 'Assignee', width: '160px', render: (item) => item.assignee ? (
      <div className="incidents__assignee">
        <Avatar name={item.assignee.fullName} size="sm" />
        <span>{item.assignee.fullName}</span>
      </div>
    ) : <span className="incidents__unassigned">Unassigned</span> },
    { key: 'createdAt', header: 'Created', width: '120px', render: (item) => new Date(item.createdAt).toLocaleDateString() },
  ];

  const statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'OPEN', label: 'Open' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'WAITING_FOR_USER', label: 'Waiting for User' },
    { value: 'RESOLVED', label: 'Resolved' },
  ];

  const priorityOptions = [
    { value: 'ALL', label: 'All Priorities' },
    { value: 'CRITICAL', label: 'Critical' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' },
  ];

  return (
    <div className="incidents">
      <div className="incidents__header">
        <div>
          <h1>Incidents</h1>
          <p className="incidents__subtitle">Manage and track all IT incidents</p>
        </div>
        <Button>+ New Incident</Button>
      </div>
      <Card className="incidents__filters">
        <Input placeholder="Search incidents..." value={search} onChange={(e) => setSearch(e.target.value)} className="incidents__search" />
        <Select options={statusOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
        <Select options={priorityOptions} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} />
      </Card>
      {loading ? (
        <Card padding="none"><div className="incidents__loading">Loading incidents…</div></Card>
      ) : incidents.length === 0 ? (
        <EmptyState title="No incidents found" description="Create your first incident to get started." />
      ) : (
        <Card padding="none">
          <Table
            columns={columns}
            data={incidents}
            keyExtractor={(item) => item.id}
            onRowClick={(row) => console.log('navigate to', row.id)}
          />
        </Card>
      )}
    </div>
  );
};
