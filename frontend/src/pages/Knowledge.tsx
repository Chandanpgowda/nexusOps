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

interface Article {
  id: string;
  title: string;
  category: string;
  status: string;
  tags: string[];
  author?: { fullName: string };
  updatedAt: string;
}

interface Pagination<T> { items: T[]; total: number; page: number; pageSize: number }
interface ApiResp<T> { success: boolean; data: Pagination<T> }

const statusVariant: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
  DRAFT: 'default', IN_REVIEW: 'warning', PUBLISHED: 'success', ARCHIVED: 'default',
};

export const Knowledge: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', problem: '', solution: '', category: 'SOFTWARE', tags: '' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { pageSize: 50 };
      if (search) params.search = search;
      if (category !== 'ALL') params.category = category;
      const { data: res } = await api.get<ApiResp<Article>>('/knowledge', { params });
      setArticles(res.data.items);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const handleCreate = async () => {
    setError('');
    try {
      await api.post('/knowledge', { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) });
      setShowModal(false);
      setForm({ title: '', description: '', problem: '', solution: '', category: 'SOFTWARE', tags: '' });
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Failed to create article');
    }
  };

  const columns: Column<Article>[] = [
    { key: 'title', header: 'Title' },
    { key: 'category', header: 'Category', width: '130px' },
    { key: 'status', header: 'Status', width: '120px', render: (a) => <Badge variant={statusVariant[a.status] || 'default'}>{a.status.replace(/_/g, ' ')}</Badge> },
    { key: 'tags', header: 'Tags', width: '220px', render: (a) => <div className="modules__tags">{a.tags?.slice(0, 3).map((t) => <Badge key={t} variant="default">{t}</Badge>)}</div> },
    { key: 'author', header: 'Author', width: '160px', render: (a) => a.author?.fullName || <span className="modules__muted">—</span> },
  ];

  const categoryOptions = [
    { value: 'ALL', label: 'All Categories' },
    ...['NETWORK', 'HARDWARE', 'SOFTWARE', 'SECURITY', 'ACCOUNT', 'EMAIL', 'SERVER', 'DATABASE', 'VPN', 'OTHER'].map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="modules">
      <div className="modules__header">
        <div>
          <h1>Knowledge Base</h1>
          <p className="modules__subtitle">Find solutions to common IT issues</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ New Article</Button>
      </div>
      <Card className="modules__filters">
        <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="modules__search" />
        <Select options={categoryOptions} value={category} onChange={(e) => setCategory(e.target.value)} />
      </Card>
      {loading ? (
        <Card padding="none"><div className="modules__loading">Loading articles…</div></Card>
      ) : articles.length === 0 ? (
        <EmptyState title="No articles found" description="Create your first knowledge article to help your team." />
      ) : (
        <Card padding="none">
          <Table columns={columns} data={articles} keyExtractor={(a) => a.id} />
        </Card>
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Knowledge Article">
        <div className="modules__form">
          {error && <p className="modules__error">{error}</p>}
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select options={categoryOptions.slice(1)} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <textarea className="modules__textarea" placeholder="Problem" value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} />
          <textarea className="modules__textarea" placeholder="Solution" value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} />
          <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <div className="modules__actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.solution}>Create Draft</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};