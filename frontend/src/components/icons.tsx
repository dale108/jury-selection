/**
 * Shared SVG Icon Components
 * Centralized icon library for consistent styling across the application
 */
import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

// Navigation & UI Icons
export const TranscriptIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
  </svg>
);

export const MappingIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="7" r="4"/>
    <path d="M5.5 21a6.5 6.5 0 0113 0"/>
    <path d="M16 11l2 2 4-4"/>
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

export const ExportIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

export const HomeIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2L1 12h3v9h6v-6h4v6h6v-9h3L12 2z"/>
  </svg>
);

export const WarningIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

export const MinusIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M5 12h14"/>
  </svg>
);

// Status Icons
export const FavorableIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

export const UnfavorableIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
  </svg>
);

export const FlagIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
  </svg>
);

export const NeutralIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-12h2v8h-2V5z"/>
  </svg>
);

// Courtroom Icons
export const JudgeIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2L1 12h3v9h6v-6h4v6h6v-9h3L12 2z"/>
  </svg>
);

export const ShieldIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
  </svg>
);

export const NotesIcon: React.FC<IconProps> = ({ size = 14, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
  </svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M9 18l6-6-6-6"/>
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M23 4v6h-6M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v6l4 2"/>
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export const TagIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
);

