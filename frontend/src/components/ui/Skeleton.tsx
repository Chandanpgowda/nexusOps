import React from 'react';
import './Skeleton.css';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  variant = 'text',
  className = '',
}) => {
  return (
    <span
      className={`skeleton skeleton--${variant} ${className}`}
      style={{ width, height }}
    />
  );
};

export const SkeletonGroup: React.FC<{ count: number; height?: number; className?: string }> = ({
  count,
  height = 16,
  className = '',
}) => (
  <div className={`skeleton-group ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} height={height} />
    ))}
  </div>
);
