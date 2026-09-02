import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './AppLayout.css';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();

  const handleToggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__main">
        <Topbar
          user={user ? { fullName: user.fullName, email: user.email, role: user.role } : { fullName: 'User', email: '', role: '' }}
          unreadCount={0}
          onToggleTheme={handleToggleTheme}
          onLogout={logout}
        />
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
