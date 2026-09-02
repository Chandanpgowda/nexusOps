import React, { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import './Topbar.css';

interface TopbarProps {
  user: { fullName: string; email: string; role: string };
  unreadCount: number;
  onSearch?: (query: string) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ user, unreadCount, onSearch, onToggleTheme, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar__search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search incidents, assets, articles..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); onSearch?.(e.target.value); }}
        />
        <kbd className="topbar__search-shortcut">⌘K</kbd>
      </div>
      <div className="topbar__actions">
        <button className="topbar__btn" onClick={onToggleTheme} title="Toggle theme">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </button>
        <button className="topbar__btn topbar__btn--notification" title="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {unreadCount > 0 && <span className="topbar__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        <div className="topbar__user">
          <button className="topbar__user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
            <Avatar name={user.fullName} size="sm" />
            <span className="topbar__user-name">{user.fullName}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </button>
          {showUserMenu && (
            <div className="topbar__dropdown">
              <div className="topbar__dropdown-header">
                <p className="topbar__dropdown-name">{user.fullName}</p>
                <p className="topbar__dropdown-email">{user.email}</p>
                <span className="topbar__dropdown-role">{user.role}</span>
              </div>
              <div className="topbar__dropdown-divider" />
              <button className="topbar__dropdown-item" onClick={onLogout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
