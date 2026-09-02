import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, Column } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import './Modules.css';

interface Change {
  id: string;
  ref: string;
  title: string;
  status: string;
  risk: string;
}

interface Pagination<T> { items: T[]; total: number; page: number; pageSize: number }
interface ApiResp<T> { success: boolean; data: Pagination<T> }

const WORKFLOW = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'SCHEDULED', 'IMPLEMENTING', 'COMPLETED'];

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'default' | 'danger'> = {
  DRAFT: 'default', SUBMITTED: 'info', UNDER_REVIEW: 'warning', APPROVED: 'success',
  SCHEDULED: 'info', IMPLEMENTING: 'warning', COMPLETED: 'success', REJECTED: 'danger',
};

const riskVariant: Record<string, 'danger' | 'warning' | 'info'> = {
  HIGH: 'danger', MEDIUM: 'warning', LOW: 'info',
};

const emptyForm = { title: '', description: '', reason: '', risk: 'LOW' };

export const Changes: React.FC = () => {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get<ApiResp<Change>>('/changes');
      setChanges(res.data.items);
    } catch {
      setChanges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setError('');
    try {
      await api.post('/changes', form);
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Failed to create change request');
    }
  };

  const transition = async (id: string, to: string) => {
    setActionError('');
    try {
      await api.post(`/changes/${id}/transition`, { status: to });
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setActionError(msg || 'Transition failed');
    }
  };

  const approve = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setActionError('');
    try {
      await api.post(`/changes/${id}/approve`, { decision });
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setActionError(msg || 'Approval failed');
    }
  };

  const nextStatus = (status: string): string | null => {
    if (status === 'REJECTED') return 'DRAFT';
    const idx = WORKFLOW.indexOf(status);
    if (idx === -1 || idx === WORKFLOW.length - 1) return null;
    return WORKFLOW[idx + 1];
  };

  const columns: Column<Change>[] = [
    { key: 'ref', header: 'ID', width: '120px' },
    { key: 'title', header: 'Title' },
    {
      key: 'workflow', header: 'Workflow', width: '260px',
      render: (c) => {
        const idx = WORKFLOW.indexOf(c.status);
        const progress = c.status === 'REJECTED' ? 0 : ((idx + 1) / WORKFLOW.length) * 100;
        return (
          <div className="modules__stepper" title={WORKFLOW.join(' → ')}>
            <div className="modules__stepper-bar"><div className="modules__stepper-fill" style={{ width: `${progress}%` }} /></div>
          </div>
        );
      },
    },
    { key: 'status', header: 'Status', width: '140px', render: (c) => <Badge variant={statusVariant[c.status] || 'default'}>{c.status.replace(/_/g, ' ')}</Badge> },
    { key: 'risk', header: 'Risk', width: '90px', render: (c) => <Badge variant={riskVariant[c.risk] || 'default'}>{c.risk}</Badge> },
    {
      key: 'actions', header: '', width: '180px',
      render: (c) => {
        if (c.status === 'UNDER_REVIEW') {
          return (
            <div className="modules__row-actions">
              <Button size="sm" onClick={() => approve(c.id, 'APPROVED')}>Approve</Button>
              <Button size="sm" variant="ghost" onClick={() => approve(c.id, 'REJECTED')}>Reject</Button>
            </div>
          );
        }
        const next = nextStatus(c.status);
        return next ? (
          <Button size="sm" variant="ghost" onClick={() => transition(c.id, next)}>→ {next.replace(/_/g, ' ')}</Button>
        ) : null;
      },
    },
  ];

  const riskOptions = ['LOW', 'MEDIUM', 'HIGH'].map((r) => ({ value: r, label: r }));

  return (
    <div className="modules">
      <div className="modules__header">
        <div>
          <h1>Changes</h1>
          <p className="modules__subtitle">Controlled changes to production systems</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ New Change Request</Button>
      </div>
      {actionError && <Card className="modules__banner modules__banner--error">{actionError}</Card>}
      {loading ? (
        <Card padding="none"><div className="modules__loading">Loading changes…</div></Card>
      ) : changes.length === 0 ? (
        <EmptyState title="No change requests" description="Raise a change request to modify production systems safely." />
      ) : (
        <Card padding="none">
          <Table columns={columns} data={changes} keyExtractor={(c) => c.id} />
        </Card>
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Change Request">
        <div className="modules__form">
          {error && <p className="modules__error">{error}</p>}
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="modules__textarea" placeholder="Description of the change" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <textarea className="modules__textarea" placeholder="Reason / justification" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Select options={riskOptions} value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })} />
          <div className="modules__actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.reason}>Create (Draft)</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

