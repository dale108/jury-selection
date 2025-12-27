import React, { useState, useEffect, useRef } from 'react';
import { QuickNote, Participant } from '../types';
import './QuickNotes.css';

interface QuickNotesProps {
  notes: QuickNote[];
  onAddNote: (note: Omit<QuickNote, 'id' | 'createdAt'>) => void;
  onDeleteNote: (noteId: string) => void;
  participants: Participant[];
  sessionStartTime?: Date;
  isRecording?: boolean;
  isPaused?: boolean;
  onPauseToggle?: () => void;
}

export const QuickNotes: React.FC<QuickNotesProps> = ({
  notes,
  onAddNote,
  onDeleteNote,
  participants,
  sessionStartTime,
  isRecording = false,
  isPaused = false,
  onPauseToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [selectedJurorId, setSelectedJurorId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update current time every second when not paused
  useEffect(() => {
    if (!sessionStartTime || isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sessionStartTime, isPaused]);

  // Initialize time on session start
  useEffect(() => {
    if (sessionStartTime && currentTime === 0) {
      const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      setCurrentTime(elapsed);
    }
  }, [sessionStartTime, currentTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    
    onAddNote({
      timestamp: currentTime,
      content: noteText.trim(),
      jurorId: selectedJurorId || undefined,
    });
    
    setNoteText('');
    setSelectedJurorId('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const getJurorName = (jurorId: string): string => {
    const juror = participants.find(p => p.id === jurorId);
    return juror ? `Juror #${juror.seatNumber}` : '';
  };

  const jurors = participants.filter(p => p.role === 'juror');

  return (
    <div className={`quick-notes ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="quick-notes-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="header-left">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
            <path d="M7 9h10v2H7zM7 5h10v2H7z"/>
          </svg>
          <span>Quick Notes</span>
          {notes.length > 0 && (
            <span className="notes-count">{notes.length}</span>
          )}
        </div>
        <div className="header-right">
          {sessionStartTime && (
            <>
              <button 
                className={`pause-btn ${isPaused ? 'paused' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPauseToggle?.();
                }}
                title={isPaused ? 'Resume clock' : 'Pause clock'}
              >
                {isPaused ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                )}
              </button>
              <span className={`time-badge ${isRecording ? 'recording' : ''} ${isPaused ? 'paused' : ''}`}>
                {isRecording && !isPaused && <span className="recording-dot"></span>}
                {isPaused && <span className="paused-indicator">⏸</span>}
                {formatTime(currentTime)}
              </span>
            </>
          )}
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={`chevron ${isExpanded ? 'up' : ''}`}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="quick-notes-content">
          {/* Note Input */}
          <div className="note-input-section">
            <div className="note-input-row">
              <div className="timestamp-display">
                [{formatTime(currentTime)}]
              </div>
              <input
                ref={inputRef}
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Quick note..."
                className="note-input"
              />
              <button 
                className="add-note-btn"
                onClick={handleAddNote}
                disabled={!noteText.trim()}
              >
                +
              </button>
            </div>
            <div className="note-options">
              <select
                value={selectedJurorId}
                onChange={(e) => setSelectedJurorId(e.target.value)}
                className="juror-select"
              >
                <option value="">No juror</option>
                {jurors.map(juror => (
                  <option key={juror.id} value={juror.id}>
                    #{juror.seatNumber} - {juror.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes List */}
          <div className="notes-list">
            {notes.length === 0 ? (
              <div className="empty-notes">
                <p>No notes yet</p>
                <span>Type a quick note above and press Enter</span>
              </div>
            ) : (
              notes
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(note => (
                  <div key={note.id} className="note-item">
                    <div className="note-timestamp">[{formatTime(note.timestamp)}]</div>
                    <div className="note-content">
                      {note.jurorId && (
                        <span className="note-juror">{getJurorName(note.jurorId)}</span>
                      )}
                      {note.content}
                    </div>
                    <button 
                      className="delete-note-btn"
                      onClick={() => onDeleteNote(note.id)}
                      title="Delete note"
                    >
                      ×
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

