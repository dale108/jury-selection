import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './ModeIndicator.css';

interface ModeIndicatorProps {
  className?: string;
}

export const ModeIndicator: React.FC<ModeIndicatorProps> = ({ className = '' }) => {
  const [mode, setMode] = useState<'demo' | 'live' | 'loading'>('loading');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const result = await api.system.getMode();
        setMode(result.mode);
        setDescription(result.description);
      } catch (error) {
        console.error('Failed to fetch mode:', error);
        setMode('live'); // Default to live if we can't determine
        setDescription('Mode unknown');
      }
    };

    fetchMode();
  }, []);

  if (mode === 'loading') {
    return null;
  }

  return (
    <div className={`mode-indicator ${mode} ${className}`} title={description}>
      <span className="mode-dot"></span>
      <span className="mode-label">
        {mode === 'demo' ? 'Demo Mode' : 'Live Mode'}
      </span>
    </div>
  );
};

