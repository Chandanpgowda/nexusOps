import React from 'react';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Open Incidents', value: 12, change: '+3 today', color: 'var(--color-danger)' },
    { label: 'In Progress', value: 8, change: '2 assigned to you', color: 'var(--color-warning)' },
    { label: 'Resolved Today', value: 5, change: 'Avg 2.4h', color: 'var(--color-success)' },
    { label: 'SLA Alerts', value: 2, change: '1 critical', color: 'var(--color-brand-600)' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1>Welcome back, {user?.fullName?.split(' ')[0]}</h1>
        <p className="dashboard__subtitle">Here's what's happening with your incidents today.</p>
      </div>
      <div className="dashboard__stats">
        {stats.map((stat) => (
          <Card key={stat.label} className="stat-card">
            <div className="stat-card__label">{stat.label}</div>
            <div className="stat-card__value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="stat-card__change">{stat.change}</div>
          </Card>
        ))}
      </div>
      <div className="dashboard__grid">
        <Card className="dashboard__card">
          <h3 className="dashboard__card-title">Recent Activity</h3>
          <div className="activity-feed">
            <div className="activity-item">
              <div className="activity-item__icon activity-item__icon--success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,6 9,17 4,12" /></svg>
              </div>
              <div className="activity-item__content">
                <p>INC-1010 resolved by Ravi Kumar</p>
                <span>12 minutes ago</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-item__icon activity-item__icon--info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
              </div>
              <div className="activity-item__content">
                <p>New incident INC-1011 created by Priya Sharma</p>
                <span>34 minutes ago</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-item__icon activity-item__icon--warning">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </div>
              <div className="activity-item__content">
                <p>SLA breach warning on INC-1008 (High priority)</p>
                <span>1 hour ago</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-item__icon activity-item__icon--default">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              </div>
              <div className="activity-item__content">
                <p>Comment added on INC-1005 by Amit Patel</p>
                <span>2 hours ago</span>
              </div>
            </div>
          </div>
        </Card>
        <Card className="dashboard__card">
          <h3 className="dashboard__card-title">Incidents by Category</h3>
          <div className="category-list">
            <div className="category-item">
              <span className="category-item__name">Network</span>
              <div className="category-item__bar">
                <div className="category-item__fill" style={{ width: '75%' }} />
              </div>
              <span className="category-item__count">18</span>
            </div>
            <div className="category-item">
              <span className="category-item__name">Software</span>
              <div className="category-item__bar">
                <div className="category-item__fill" style={{ width: '55%' }} />
              </div>
              <span className="category-item__count">12</span>
            </div>
            <div className="category-item">
              <span className="category-item__name">Hardware</span>
              <div className="category-item__bar">
                <div className="category-item__fill" style={{ width: '40%' }} />
              </div>
              <span className="category-item__count">9</span>
            </div>
            <div className="category-item">
              <span className="category-item__name">Security</span>
              <div className="category-item__bar">
                <div className="category-item__fill" style={{ width: '25%' }} />
              </div>
              <span className="category-item__count">5</span>
            </div>
            <div className="category-item">
              <span className="category-item__name">Account</span>
              <div className="category-item__bar">
                <div className="category-item__fill" style={{ width: '15%' }} />
              </div>
              <span className="category-item__count">3</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
