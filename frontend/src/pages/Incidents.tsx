import React, { useState } from 'react';
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
  assignee?: { name: string; avatarUrl?: string };
  reporter: { name: string };
  createdAt: string;
  slaBreached: boolean;
}

const mockIncidents: Incident[] = [
  { id: '1', ref: 'INC-1011', title: 'VPN connection failing after Windows update', status: 'OPEN', priority: 'HIGH', category: 'NETWORK', reporter: { name: 'Priya Sharma' }, createdAt: '2026-09-01T10:30:00Z', slaBreached: false },
  { id: '2', ref: 'INC-1010', title: 'Email not syncing on mobile device', status: 'IN_PROGRESS', priority: 'MEDIUM', category: 'EMAIL', assignee: { name: 'Ravi Kumar' }, reporter: { name: 'Amit Patel' }, createdAt: '2026-09-01T09:15:00Z', slaBreached: false },
  { id: '3', ref: 'INC-1009', title: 'Laptop screen flickering intermittently', status: 'ASSIGNED', priority: 'LOW', category: 'HARDWARE', assignee: { name: 'Sneha Reddy' }, reporter: { name: 'Karthik Nair' }, createdAt: '2026-09-01T08:45:00Z', slaBreached: false },
  { id: '4', ref: 'INC-1008', title: 'Cannot access shared drive', status: 'WAITING_FOR_USER', priority: 'HIGH', category: 'NETWORK', assignee: { name: 'Ravi Kumar' }, reporter: { name: 'Deepa Menon' }, createdAt: '2026-08-31T16:20:00Z', slaBreached: true },
  { id: '5', ref: 'INC-1007', title: 'Printer not responding on floor 3', status: 'RESOLVED', priority: 'MEDIUM', category: 'HARDWARE', assignee: { name: 'Sneha Reddy' }, reporter: { name: 'Arjun Das' }, createdAt: '2026-08-31T14:00:00Z', slaBreached: false },
];

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const columns: Column<Incident>[] = [
    { key: 'ref', header: 'ID', width: '100px' },
    { key: 'title', header: 'Title' },
    { key: 'status', header: 'Status', width: '140px', render: (item) => <Badge variant={statusVariant[item.status] || 'default'}>{item.status.replace(/_/g, ' ')}</Badge> },
    { key: 'priority', header: 'Priority', width: '110px', render: (item) => <Badge variant={priorityVariant[item.priority] || 'default'}>{item.priority}</Badge> },
    { key: 'assignee', header: 'Assignee', width: '160px', render: (item) => item.assignee ? (
      <div className="incidents__assignee">
        <Avatar name={item.assignee.name} size="sm" />
        <span>{item.assignee.name}</span>
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
      {mockIncidents.length === 0 ? (
        <EmptyState title="No incidents found" description="Create your first incident to get started." />
      ) : (
        <Card padding="none">
          <Table
            columns={columns}
            data={mockIncidents}
            keyExtractor={(item) => item.id}
            onRowClick={(row) => console.log('navigate to', row.id)}
          />
        </Card>
      )}
    </div>
  );
};
