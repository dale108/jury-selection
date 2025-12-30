import React, { useState, useEffect, useMemo } from 'react';
import { api, TranscriptSegment } from '../services/api';
import './TranscriptPanel.css';

interface TranscriptPanelProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  refreshTrigger?: number;
  embedded?: boolean; // When true, renders without modal wrapper
}

interface SpeakerMapping {
  speaker_label: string;
  juror_id?: string;
  juror_name?: string;
  seat_number?: number;
  participant_type?: 'juror' | 'defense' | 'prosecutor';
  participant_name?: string;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  sessionId,
  isOpen,
  onClose,
  refreshTrigger,
  embedded = false,
}) => {
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [speakerMappings, setSpeakerMappings] = useState<Map<string, SpeakerMapping>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [timeRangeMin, setTimeRangeMin] = useState<string>('');
  const [timeRangeMax, setTimeRangeMax] = useState<string>('');
  const [maxDuration, setMaxDuration] = useState<number>(0);

  useEffect(() => {
    if (sessionId && isOpen) {
      loadTranscripts();
    }
  }, [sessionId, isOpen, refreshTrigger]);

  const loadTranscripts = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [transcriptData, speakerData] = await Promise.all([
        api.transcripts.list({
          session_id: sessionId,
          limit: 500,
        }),
        api.transcripts.getBySpeaker(sessionId),
      ]);
      
      setTranscripts(transcriptData.items);
      
      // Calculate max duration from transcripts
      if (transcriptData.items.length > 0) {
        const maxEnd = Math.max(...transcriptData.items.map(t => t.end_time));
        setMaxDuration(maxEnd);
      }
      
      const jurorsData = await api.jurors.list(sessionId);
      const jurorMap = new Map(jurorsData.items.map(j => [j.id, j]));
      
      let participantMappings: Map<string, any> = new Map();
      try {
        const session = await api.sessions.get(sessionId);
        const mappings = session.metadata?.speaker_mappings;
        if (Array.isArray(mappings)) {
          mappings.forEach((m: any) => {
            participantMappings.set(m.speaker_label, m);
          });
        }
      } catch (err) {
        console.error('Failed to load participant mappings:', err);
      }
      
      const mappings = new Map<string, SpeakerMapping>();
      speakerData.forEach((group) => {
        if (group.juror_id) {
          const juror = jurorMap.get(group.juror_id);
          mappings.set(group.speaker_label, {
            speaker_label: group.speaker_label,
            juror_id: group.juror_id,
            juror_name: group.juror_name || (juror ? `${juror.first_name} ${juror.last_name}` : undefined),
            seat_number: juror?.seat_number,
            participant_type: 'juror',
          });
        } else if (participantMappings.has(group.speaker_label)) {
          const pm = participantMappings.get(group.speaker_label);
          mappings.set(group.speaker_label, {
            speaker_label: group.speaker_label,
            participant_type: pm.participant_type,
            participant_name: pm.participant_name,
            seat_number: pm.seat_number,
          });
        } else {
          mappings.set(group.speaker_label, {
            speaker_label: group.speaker_label,
          });
        }
      });
      setSpeakerMappings(mappings);
    } catch (err: any) {
      console.error('Failed to load transcripts:', err);
      
      let errorMessage = 'Failed to load transcripts';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((e: any) => {
              if (typeof e === 'string') return e;
              if (e && typeof e === 'object' && e.msg) return e.msg;
              if (e && typeof e === 'object' && e.message) return e.message;
              return String(e);
            })
            .join(', ');
        } else if (errorData.detail && typeof errorData.detail === 'object') {
          errorMessage = errorData.detail.msg || errorData.detail.message || 'Validation error';
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(String(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const speakers = useMemo(() => {
    const uniqueSpeakers = new Set(transcripts.map(t => t.speaker_label));
    return Array.from(uniqueSpeakers).sort();
  }, [transcripts]);

  const getSpeakerDisplayName = (speakerLabel: string): string => {
    const mapping = speakerMappings.get(speakerLabel);
    if (mapping) {
      if (mapping.participant_type === 'juror' && mapping.seat_number) {
        return `Juror ${mapping.seat_number}`;
      }
      if (mapping.participant_type === 'defense' && mapping.participant_name) {
        return mapping.participant_name;
      }
      if (mapping.participant_type === 'prosecutor' && mapping.participant_name) {
        return mapping.participant_name;
      }
    }
    return speakerLabel;
  };

  // Parse time input (supports "MM:SS" or just seconds)
  const parseTimeInput = (input: string): number | null => {
    if (!input.trim()) return null;
    if (input.includes(':')) {
      const parts = input.split(':');
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      return mins * 60 + secs;
    }
    const num = parseFloat(input);
    return isNaN(num) ? null : num;
  };

  const filteredTranscripts = useMemo(() => {
    let filtered = transcripts;

    if (selectedSpeaker) {
      filtered = filtered.filter(t => t.speaker_label === selectedSpeaker);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        const contentMatch = t.content.toLowerCase().includes(query);
        const speakerLabelMatch = t.speaker_label.toLowerCase().includes(query);
        const displayNameMatch = getSpeakerDisplayName(t.speaker_label).toLowerCase().includes(query);
        return contentMatch || speakerLabelMatch || displayNameMatch;
      });
    }

    // Time range filtering
    const minTime = parseTimeInput(timeRangeMin);
    const maxTime = parseTimeInput(timeRangeMax);
    
    if (minTime !== null) {
      filtered = filtered.filter(t => t.start_time >= minTime);
    }
    if (maxTime !== null) {
      filtered = filtered.filter(t => t.start_time <= maxTime);
    }

    return filtered;
  }, [transcripts, selectedSpeaker, searchQuery, speakerMappings, timeRangeMin, timeRangeMax]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i}>{part}</mark>
      ) : (
        part
      )
    );
  };

  if (!isOpen && !embedded) return null;

  // Embedded mode - render without modal wrapper
  if (embedded) {
    return (
      <div className="transcript-embedded">
        {/* Search */}
        <div className="transcript-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Speaker Filter */}
        <div className="transcript-filter">
          <select
            value={selectedSpeaker || ''}
            onChange={(e) => setSelectedSpeaker(e.target.value || null)}
          >
            <option value="">All Speakers ({speakers.length})</option>
            {speakers.map(speaker => (
              <option key={speaker} value={speaker}>
                {getSpeakerDisplayName(speaker)}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range Filter */}
        <div className="transcript-time-filter">
          <div className="time-inputs">
            <input
              type="text"
              placeholder="From (0:00)"
              value={timeRangeMin}
              onChange={(e) => setTimeRangeMin(e.target.value)}
              className="time-input"
            />
            <span className="time-separator">–</span>
            <input
              type="text"
              placeholder={`To (${formatTime(maxDuration)})`}
              value={timeRangeMax}
              onChange={(e) => setTimeRangeMax(e.target.value)}
              className="time-input"
            />
          </div>
          {(timeRangeMin || timeRangeMax) && (
            <button 
              className="clear-time-btn"
              onClick={() => { setTimeRangeMin(''); setTimeRangeMax(''); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Stats */}
        {transcripts.length > 0 && (
          <div className="transcript-stats-bar">
            <span className="stat">
              {filteredTranscripts.length === transcripts.length 
                ? `${transcripts.length} segments`
                : `${filteredTranscripts.length} of ${transcripts.length}`}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="transcript-list-container">
          {isLoading && (
            <div className="transcript-loading">
              <div className="loading-spinner"></div>
              <span>Loading transcript...</span>
            </div>
          )}

          {error && (
            <div className="transcript-error">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && filteredTranscripts.length === 0 && (
            <div className="transcript-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
              <p>
                {transcripts.length === 0 
                  ? 'No transcripts available'
                  : 'No matching segments'}
              </p>
            </div>
          )}

          {!isLoading && !error && filteredTranscripts.length > 0 && (
            <div className="transcript-items">
              {filteredTranscripts.map((segment) => {
                const displayName = getSpeakerDisplayName(segment.speaker_label);
                const mapping = speakerMappings.get(segment.speaker_label);
                const mappingType = mapping?.participant_type;
                
                return (
                  <div key={segment.id} className="transcript-item">
                    <div className="item-header">
                      <span className={`speaker-tag ${mappingType || ''}`}>
                        {displayName}
                      </span>
                      <span className="timestamp">
                        {formatTime(segment.start_time)}
                      </span>
                    </div>
                    <div className="item-content">
                      {highlightText(segment.content, searchQuery)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Modal mode (legacy support)
  return (
    <div className="transcript-panel-overlay" onClick={onClose}>
      <div className="transcript-panel" onClick={(e) => e.stopPropagation()}>
        <div className="transcript-header">
          <h2>Transcript</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        {/* ... existing modal content ... */}
      </div>
    </div>
  );
};
