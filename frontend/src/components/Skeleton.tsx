/**
 * Skeleton - Loading placeholder components
 */
import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1em',
  variant = 'text',
  animation = 'pulse',
  className = '',
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <span
      className={`skeleton skeleton-${variant} skeleton-${animation} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

// Juror card skeleton for courtroom layout
export const JurorCardSkeleton: React.FC = () => (
  <div className="juror-card-skeleton">
    <div className="skeleton-header">
      <Skeleton width={40} height={20} variant="rounded" />
      <Skeleton width={24} height={24} variant="circular" />
    </div>
    <Skeleton width="80%" height={16} />
    <Skeleton width="60%" height={12} />
    <div className="skeleton-actions">
      <Skeleton width={28} height={28} variant="rounded" />
      <Skeleton width={28} height={28} variant="rounded" />
      <Skeleton width={28} height={28} variant="rounded" />
      <Skeleton width={28} height={28} variant="rounded" />
    </div>
  </div>
);

// Transcript segment skeleton
export const TranscriptSkeleton: React.FC = () => (
  <div className="transcript-skeleton">
    <Skeleton width={60} height={16} variant="rounded" />
    <Skeleton width="100%" height={14} />
    <Skeleton width="70%" height={14} />
  </div>
);

// Session list skeleton for welcome screen
export const SessionListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="session-list-skeleton">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="session-item-skeleton">
        <Skeleton width="60%" height={16} />
        <Skeleton width="30%" height={12} />
      </div>
    ))}
  </div>
);

