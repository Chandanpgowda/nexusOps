import React from 'react';
import './Badge.css';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  return (
    <span className={`badge badge--${variant} badge--${size} ${className}`}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  );
};

/* Convenience components for domain badges */
export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const variant = {
    LOW: 'neutral',
    MEDIUM: 'info',
    HIGH: 'warning',
    CRITICAL: 'danger',
  }[priority] || 'default';
  return <Badge variant={variant as BadgeProps['variant']} dot>{priority}</Badge>;
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const label = status.replace(/_/g, ' ');
  return <Badge variant="default">{label}</Badge>;
};
