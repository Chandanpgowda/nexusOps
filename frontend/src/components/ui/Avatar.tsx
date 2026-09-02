import React from 'react';
import './Avatar.css';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'away' | 'offline';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', status, className = '' }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`avatar avatar--${size} ${className}`}>
      {src ? (
        <img className="avatar__img" src={src} alt={name} />
      ) : (
        <span className="avatar__initials">{initials}</span>
      )}
      {status && <span className={`avatar__status avatar__status--${status}`} />}
    </div>
  );
};
