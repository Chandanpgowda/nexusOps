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

interface Problem {
  id: string;
  ref: string;
  title: string;
  status: string;
  priority: string;
  owner?: { fullName: string };
  _count?: { incidents: number };
}

interface Pagination<T> { items: T[]; total: number; page: number; pageSize: number }
interface ApiResp<T> { success: boolean; data: Pagination<T> }

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
  OPEN: 'info', INVESTIGATING: 'warning', KNOWN_ERROR: 'warning', RESOLVED: 'success',
};

const emptyForm = { title: '', description: '', priority: 'MEDIUM' };

export const Problems: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get<ApiResp<Problem>>('/problems');
      setProblems(res.data.items);
    } catch {
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setError('');
    try {
      await api.post('/problems', form);
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Failed to create problem');
    }
  };

  const columns: Column<Problem>[] = [
    { key: 'ref', header: 'ID', width: '120px' },
    { key: 'title', header: 'Title' },
    { key: 'status', header: 'Status', width: '140px', render: (p) => <Badge variant={statusVariant[p.status] || 'default'}>{p.status.replace(/_/g, ' ')}</Badge> },
    { key: 'priority', header: 'Priority', width: '110px', render: (p) => <Badge variant={p.priority === 'CRITICAL' || p.priority === 'HIGH' ? 'danger' : 'info'}>{p.priority}</Badge> },
    { key: 'incidents', header: 'Linked Incidents', width: '150px', render: (p) => p._count?.incidents ?? 0 },
    { key: 'owner', header: 'Owner', width: '160px', render: (p) => p.owner?.fullName || <span className="modules__muted">Unassigned</span> },
  ];

  const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => ({ value: p, label: p }));

  return (
    <div className="modules">
      <div className="modules__header">
        <div>
          <h1>Problems</h1>
          <p className="modules__subtitle">Underlying causes of recurring incidents</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ New Problem</Button>
      </div>
      {loading ? (
        <Card padding="none"><div className="modules__loading">Loading problems…</div></Card>
      ) : problems.length === 0 ? (
        <EmptyState title="No problems recorded" description="Link related incidents together to track their underlying cause." />
      ) : (
        <Card padding="none">
          <Table columns={columns} data={problems} keyExtractor={(p) => p.id} />
        </Card>
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Problem">
        <div className="modules__form">
          {error && <p className="modules__error">{error}</p>}
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="modules__textarea" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select options={priorityOptions} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
          <div className="modules__actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title}>Create Problem</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};