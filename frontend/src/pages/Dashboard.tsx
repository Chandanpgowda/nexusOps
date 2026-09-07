import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import './Dashboard.css';

interface DashboardStats {
  open: number;
  inProgress: number;
  resolvedToday: number;
  slaAlerts: number;
}

interface RecentIncident {
  id: string;
  ref: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  slaBreached?: boolean;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ open: 0, inProgress: 0, resolvedToday: 0, slaAlerts: 0 });
  const [recent, setRecent] = useState<RecentIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: incRes } = await api.get('/incidents?pageSize=100');
        const items: RecentIncident[] = incRes.data.items || [];
        const today = new Date().toDateString();
        setStats({
          open: items.filter((i: RecentIncident) => i.status === 'OPEN').length,
          inProgress: items.filter((i: RecentIncident) => ['ASSIGNED', 'IN_PROGRESS'].includes(i.status)).length,
          resolvedToday: items.filter((i: RecentIncident) => i.status === 'RESOLVED' && new Date(i.createdAt).toDateString() === today).length,
          slaAlerts: items.filter((i: RecentIncident) => i.slaBreached).length,
        });
        setRecent(items.slice(0, 5));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { label: 'Open Incidents', value: stats.open, color: 'var(--color-danger)' },
    { label: 'In Progress', value: stats.inProgress, color: 'var(--color-warning)' },
    { label: 'Resolved Today', value: stats.resolvedToday, color: 'var(--color-success)' },
    { label: 'SLA Alerts', value: stats.slaAlerts, color: 'var(--color-brand-600)' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1>Welcome back, {user?.fullName?.split(' ')[0]}</h1>
        <p className="dashboard__subtitle">Here's what's happening with your incidents today.</p>
      </div>
      <div className="dashboard__stats">
        {statCards.map((stat) => (
          <Card key={stat.label} className="stat-card">
            <div className="stat-card__label">{stat.label}</div>
            <div className="stat-card__value" style={{ color: stat.color }}>{loading ? '—' : stat.value}</div>
          </Card>
        ))}
      </div>
      <div className="dashboard__grid">
        <Card className="dashboard__card">
          <h3 className="dashboard__card-title">Recent Incidents</h3>
          {loading ? (
            <div className="dashboard__loading">Loading...</div>
          ) : recent.length === 0 ? (
            <p className="dashboard__empty">No incidents yet.</p>
          ) : (
            <div className="activity-feed">
              {recent.map((inc) => (
                <div key={inc.id} className="activity-item">
                  <div className="activity-item__icon activity-item__icon--info">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                  </div>
                  <div className="activity-item__content">
                    <p>{inc.ref} — {inc.title}</p>
                    <span>{inc.status.replace(/_/g, ' ')} · {inc.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="dashboard__card">
          <h3 className="dashboard__card-title">Quick Actions</h3>
          <div className="dashboard__actions">
            <a href="/incidents" className="dashboard__action-btn">View All Incidents</a>
            <a href="/ai-assistant" className="dashboard__action-btn">Ask AI Assistant</a>
          </div>
        </Card>
      </div>
    </div>
  );
};
