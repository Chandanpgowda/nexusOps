import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, Column } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import './Modules.css';

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  type: string;
  status: string;
  serialNumber?: string;
  assignedUser?: { fullName: string } | null;
  location?: string;
}

interface Pagination<T> { items: T[]; total: number; page: number; pageSize: number }
interface ApiResp<T> { success: boolean; data: Pagination<T> }

const typeVariant: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
  IN_USE: 'success', IN_STOCK: 'info', IN_REPAIR: 'warning', RETIRED: 'default',
};

const emptyForm = { assetTag: '', name: '', type: 'LAPTOP', serialNumber: '', location: '' };

export const Assets: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize: 10 };
      if (search) params.search = search;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      const { data: res } = await api.get<ApiResp<Asset>>('/assets', { params });
      setAssets(res.data.items);
      setTotal(res.data.total);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const handleCreate = async () => {
    setError('');
    try {
      await api.post('/assets', form);
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Failed to create asset');
    }
  };

  const columns: Column<Asset>[] = [
    { key: 'assetTag', header: 'Asset ID', width: '120px' },
    { key: 'name', header: 'Name' },
    { key: 'type', header: 'Type', width: '120px' },
    { key: 'status', header: 'Status', width: '120px', render: (a) => <Badge variant={typeVariant[a.status] || 'default'}>{a.status.replace(/_/g, ' ')}</Badge> },
    { key: 'assignedTo', header: 'Assigned To', width: '170px', render: (a) => a.assignedUser?.fullName || <span className="modules__muted">Unassigned</span> },
    { key: 'location', header: 'Location', width: '140px', render: (a) => a.location || <span className="modules__muted">—</span> },
  ];

  const typeOptions = [
    { value: 'ALL', label: 'All Types' },
    ...['LAPTOP', 'DESKTOP', 'MONITOR', 'PRINTER', 'ROUTER', 'SERVER', 'MOBILE_DEVICE', 'NETWORK_DEVICE'].map((t) => ({ value: t, label: t.replace(/_/g, ' ') })),
  ];
  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="modules">
      <div className="modules__header">
        <div>
          <h1>Assets</h1>
          <p className="modules__subtitle">{total} assets in inventory</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Asset</Button>
      </div>
      <Card className="modules__filters">
        <Input placeholder="Search assets..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="modules__search" />
        <Select options={typeOptions} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} />
      </Card>
      {loading ? (
        <Card padding="none"><div className="modules__loading">Loading assets…</div></Card>
      ) : assets.length === 0 ? (
        <EmptyState title="No assets found" description="Add your first asset to start tracking inventory." />
      ) : (
        <Card padding="none">
          <Table columns={columns} data={assets} keyExtractor={(a) => a.id} />
        </Card>
      )}
      {totalPages > 1 && (
        <div className="modules__pagination">
          <Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page} of {totalPages}</span>
          <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Asset">
        <div className="modules__form">
          {error && <p className="modules__error">{error}</p>}
          <Input placeholder="Asset Tag (e.g. LAP-1001)" value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} />
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select options={typeOptions.slice(1)} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <Input placeholder="Serial Number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
          <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="modules__actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.assetTag || !form.name}>Create Asset</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};