/**
 * MainSessionView - Active voir dire session view
 * Displays courtroom layout, sidebar tools, and session management
 */
import React, { useState, useCallback } from 'react';
import { Participant, ChallengeConfig, QuickNote } from '../types';
import { CourtroomLayout } from './CourtroomLayout';
import { JurorEditModal } from './JurorEditModal';
import { TranscriptPanel } from './TranscriptPanel';
import { SpeakerMappingPanel } from './SpeakerMappingPanel';
import { ChallengeTracker } from './ChallengeTracker';
import { QuickNotes } from './QuickNotes';
import { ExportPanel } from './ExportPanel';
import { AudioRecorder, TranscriptSegment as LiveSegment } from './AudioRecorder';
import { LiveTranscript } from './LiveTranscript';
import { ModeIndicator } from './ModeIndicator';
import { ConfirmDialog } from './ConfirmDialog';
import { TranscriptIcon, MappingIcon, CloseIcon, ExportIcon, CheckCircleIcon } from './icons';
import { api, JurorResponse } from '../services/api';
import './MainSessionView.css';

interface MainSessionViewProps {
  sessionId: string;
  sessionName: string;
  participants: Participant[];
  jurors: JurorResponse[];
  challengeConfig: ChallengeConfig;
  quickNotes: QuickNote[];
  sessionStartTime: Date | null;
  isClockPaused: boolean;
  onParticipantsChange: (participants: Participant[]) => void;
  onJurorsChange: (jurors: JurorResponse[]) => void;
  onChallengeConfigChange: (config: ChallengeConfig) => void;
  onQuickNotesChange: (notes: QuickNote[]) => void;
  onClockPauseToggle: () => void;
  onEndSession: () => void;
}

export const MainSessionView: React.FC<MainSessionViewProps> = ({
  sessionId,
  sessionName,
  participants,
  jurors,
  challengeConfig,
  quickNotes,
  sessionStartTime,
  isClockPaused,
  onParticipantsChange,
  onJurorsChange,
  onChallengeConfigChange,
  onQuickNotesChange,
  onClockPauseToggle,
  onEndSession,
}) => {
  // UI state
  const [activePanel, setActivePanel] = useState<'transcript' | 'mapping' | null>(null);
  const [transcriptRefreshTrigger, setTranscriptRefreshTrigger] = useState(0);
  
  // Modal state
  const [selectedJuror, setSelectedJuror] = useState<Participant | null>(null);
  const [selectedJurorIndex, setSelectedJurorIndex] = useState<number>(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Export panel
  const [isExportOpen, setIsExportOpen] = useState(false);
  
  // Live recording/transcription
  const [isRecording, setIsRecording] = useState(false);
  const [liveSegments, setLiveSegments] = useState<LiveSegment[]>([]);
  
  // Strike confirmation
  const [pendingStrike, setPendingStrike] = useState<{ jurorId: string; jurorName: string } | null>(null);

  // Get juror participants for navigation
  const jurorParticipants = participants.filter(p => p.role === 'juror');
  const favorableCount = jurorParticipants.filter(p => p.status === 'favorable').length;
  const unfavorableCount = jurorParticipants.filter(p => p.status === 'unfavorable').length;
  const notesCount = jurorParticipants.filter(p => p.notes).length;

  const handleJurorClick = (juror: Participant) => {
    const index = jurorParticipants.findIndex(p => p.id === juror.id);
    setSelectedJuror(juror);
    setSelectedJurorIndex(index);
    setIsModalOpen(true);
    setSaveError(null);
  };

  const handleSaveNotes = async (jurorId: string, notes: string) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const participant = participants.find(p => p.id === jurorId);
      if (!participant) throw new Error('Participant not found');

      // Optimistic update
      onParticipantsChange(
        participants.map(p => p.id === jurorId ? { ...p, notes } : p)
      );

      if (participant.backendJurorId) {
        await api.jurors.update(participant.backendJurorId, { notes });
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || err.message || 'Failed to save');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateJurorStatus = (jurorId: string, status: Participant['status']) => {
    const participant = participants.find(p => p.id === jurorId);
    if (!participant) return;

    const newStatus = participant.status === status ? undefined : status;
    onParticipantsChange(
      participants.map(p => p.id === jurorId ? { ...p, status: newStatus } : p)
    );
  };

  const handleUpdateJurorTags = async (jurorId: string, tags: string[]) => {
    const participant = participants.find(p => p.id === jurorId);
    if (!participant) return;

    onParticipantsChange(
      participants.map(p => p.id === jurorId ? { ...p, tags } : p)
    );

    if (participant.backendJurorId) {
      try {
        await api.jurors.update(participant.backendJurorId, { flags: { tags } });
      } catch (err) {
        console.error('Failed to save tags:', err);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJuror(null);
    setSelectedJurorIndex(-1);
    setSaveError(null);
  };

  // Navigation between jurors in modal
  const handleNavigateJuror = (direction: 'prev' | 'next') => {
    if (selectedJurorIndex < 0) return;
    
    const newIndex = direction === 'prev' 
      ? Math.max(0, selectedJurorIndex - 1)
      : Math.min(jurorParticipants.length - 1, selectedJurorIndex + 1);
    
    if (newIndex !== selectedJurorIndex) {
      setSelectedJuror(jurorParticipants[newIndex]);
      setSelectedJurorIndex(newIndex);
    }
  };

  const handleMappingUpdate = useCallback(async () => {
    const data = await api.jurors.list(sessionId);
    onJurorsChange(data.items);
    setTranscriptRefreshTrigger(prev => prev + 1);
  }, [sessionId, onJurorsChange]);

  // Challenge handlers
  const handleChallengeJuror = (jurorId: string, type: 'peremptory' | 'cause', reason?: string) => {
    // For peremptory strikes from courtroom, show confirmation
    if (type === 'peremptory' && !reason) {
      const juror = participants.find(p => p.id === jurorId);
      if (juror) {
        setPendingStrike({ jurorId, jurorName: juror.name });
        return;
      }
    }
    
    // Execute the challenge
    executeChallenge(jurorId, type, reason);
  };

  const executeChallenge = (jurorId: string, type: 'peremptory' | 'cause', reason?: string) => {
    onParticipantsChange(
      participants.map(p => p.id === jurorId ? { 
        ...p, 
        challenged: type, 
        challengeReason: reason 
      } : p)
    );
    
    if (type === 'peremptory') {
      onChallengeConfigChange({
        ...challengeConfig,
        peremptoryUsed: challengeConfig.peremptoryUsed + 1
      });
    }
  };

  const handleConfirmStrike = () => {
    if (pendingStrike) {
      executeChallenge(pendingStrike.jurorId, 'peremptory');
      setPendingStrike(null);
    }
  };

  const handleCancelStrike = () => {
    setPendingStrike(null);
  };

  const handleRemoveChallenge = (jurorId: string) => {
    const participant = participants.find(p => p.id === jurorId);
    if (!participant) return;
    
    if (participant.challenged === 'peremptory') {
      onChallengeConfigChange({
        ...challengeConfig,
        peremptoryUsed: Math.max(0, challengeConfig.peremptoryUsed - 1)
      });
    }
    
    onParticipantsChange(
      participants.map(p => p.id === jurorId ? { 
        ...p, 
        challenged: undefined, 
        challengeReason: undefined 
      } : p)
    );
  };

  // Quick notes handlers
  const handleAddQuickNote = (note: Omit<QuickNote, 'id' | 'createdAt'>) => {
    const newNote: QuickNote = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    onQuickNotesChange([...quickNotes, newNote]);
  };

  const handleDeleteQuickNote = (noteId: string) => {
    onQuickNotesChange(quickNotes.filter(n => n.id !== noteId));
  };

  // Live recording handlers
  const handleRecordingStart = () => {
    setIsRecording(true);
    setLiveSegments([]);
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
    setTranscriptRefreshTrigger(prev => prev + 1);
  };

  const handleTranscriptUpdate = (segment: LiveSegment) => {
    setLiveSegments(prev => [...prev, segment]);
  };

  return (
    <div className="app">
      <nav className="navbar" role="navigation" aria-label="Session navigation">
        <div className="navbar-brand">
          <div className="navbar-logo">
            <CheckCircleIcon size={32} />
          </div>
          <div>
            <div className="navbar-title">Voir Dire</div>
            <div className="navbar-subtitle">Washington State Public Defense</div>
          </div>
          <ModeIndicator />
        </div>

        <div className="navbar-session">
          <div className="session-badge" title={`Session ID: ${sessionId}`}>
            <div className="session-indicator" aria-hidden="true"></div>
            <span className="session-text">{sessionName || sessionId.slice(0, 8)}</span>
          </div>
        </div>

        <div className="navbar-actions">
          <button 
            className={`btn btn-secondary ${activePanel === 'mapping' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'mapping' ? null : 'mapping')}
            aria-pressed={activePanel === 'mapping'}
            aria-label="Toggle speaker mapping panel"
          >
            <MappingIcon size={18} />
            Speakers
          </button>
          <button 
            className={`btn btn-secondary ${activePanel === 'transcript' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'transcript' ? null : 'transcript')}
            aria-pressed={activePanel === 'transcript'}
            aria-label="Toggle transcript panel"
          >
            <TranscriptIcon size={18} />
            Transcript
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setIsExportOpen(true)}
            aria-label="Open export options"
          >
            <ExportIcon size={18} />
            Export
          </button>
        </div>
      </nav>

      <main className="main-content" role="main">
        <div className={`workspace ${activePanel ? 'sidebar-open' : ''}`}>
          <div className="toolbar" role="toolbar" aria-label="Session toolbar">
            <div className="toolbar-left">
              <div className="case-info">
                <div className="case-number">{sessionName || 'Active Session'}</div>
                <div className="case-details">{jurorParticipants.length} jurors in panel</div>
              </div>
              <div className="toolbar-stats" aria-label="Session statistics">
                <div className="stat-item">
                  <span className="stat-value" style={{ color: 'var(--color-favorable)' }}>{favorableCount}</span>
                  <span>favorable</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value" style={{ color: 'var(--color-unfavorable)' }}>{unfavorableCount}</span>
                  <span>unfavorable</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{notesCount}</span>
                  <span>with notes</span>
                </div>
              </div>
            </div>
            <div className="toolbar-right">
              <button 
                className="toolbar-btn"
                onClick={onEndSession}
                aria-label="End current session and return to home"
              >
                New Session
              </button>
            </div>
          </div>

          <div className="workspace-layout">
            <div className="workspace-main">
              <CourtroomLayout 
                participants={participants}
                jurorsPerRow={6}
                onJurorClick={handleJurorClick}
                onJurorStatusChange={handleUpdateJurorStatus}
                onTagsChange={handleUpdateJurorTags}
                onChallengeJuror={handleChallengeJuror}
                onRemoveChallenge={handleRemoveChallenge}
              />
            </div>
            <div className="workspace-sidebar">
              <AudioRecorder
                sessionId={sessionId}
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
                onTranscriptUpdate={handleTranscriptUpdate}
                onError={(err) => console.error('Recording error:', err)}
              />
              
              {isRecording && liveSegments.length > 0 && (
                <div className="live-transcript-container">
                  <h3 className="sidebar-section-title">Live Transcript</h3>
                  <LiveTranscript segments={liveSegments} />
                </div>
              )}
              
              <ChallengeTracker
                participants={participants}
                challengeConfig={challengeConfig}
                onChallengeConfigChange={onChallengeConfigChange}
                onChallengeJuror={handleChallengeJuror}
                onRemoveChallenge={handleRemoveChallenge}
              />
              <QuickNotes
                notes={quickNotes}
                onAddNote={handleAddQuickNote}
                onDeleteNote={handleDeleteQuickNote}
                participants={participants}
                sessionStartTime={sessionStartTime || undefined}
                isPaused={isClockPaused}
                onPauseToggle={onClockPauseToggle}
              />
            </div>
          </div>
        </div>

        {/* Transcript Sidebar */}
        <aside 
          className={`sidebar-panel ${activePanel === 'transcript' ? 'open' : ''}`}
          aria-label="Transcript panel"
          aria-hidden={activePanel !== 'transcript'}
        >
          <div className="sidebar-header">
            <h2 className="sidebar-title">Transcript</h2>
            <button 
              className="sidebar-close" 
              onClick={() => setActivePanel(null)}
              aria-label="Close transcript panel"
            >
              <CloseIcon size={20} />
            </button>
          </div>
          <div className="sidebar-content">
            <TranscriptPanel
              sessionId={sessionId}
              isOpen={activePanel === 'transcript'}
              onClose={() => setActivePanel(null)}
              refreshTrigger={transcriptRefreshTrigger}
              embedded={true}
            />
          </div>
        </aside>

        {/* Speaker Mapping Sidebar */}
        <aside 
          className={`sidebar-panel ${activePanel === 'mapping' ? 'open' : ''}`}
          aria-label="Speaker mapping panel"
          aria-hidden={activePanel !== 'mapping'}
        >
          <div className="sidebar-header">
            <h2 className="sidebar-title">Speaker Mapping</h2>
            <button 
              className="sidebar-close" 
              onClick={() => setActivePanel(null)}
              aria-label="Close speaker mapping panel"
            >
              <CloseIcon size={20} />
            </button>
          </div>
          <div className="sidebar-content">
            <SpeakerMappingPanel
              sessionId={sessionId}
              jurors={jurors}
              participants={participants}
              isOpen={activePanel === 'mapping'}
              onClose={() => setActivePanel(null)}
              onMappingUpdate={handleMappingUpdate}
              embedded={true}
            />
          </div>
        </aside>
      </main>

      <JurorEditModal
        juror={selectedJuror}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveNotes}
        isSaving={isSaving}
        error={saveError}
        sessionId={sessionId}
        onStatusChange={handleUpdateJurorStatus}
        onTagsChange={handleUpdateJurorTags}
        onNavigate={handleNavigateJuror}
        canNavigatePrev={selectedJurorIndex > 0}
        canNavigateNext={selectedJurorIndex < jurorParticipants.length - 1}
        currentIndex={selectedJurorIndex}
        totalJurors={jurorParticipants.length}
      />

      <ExportPanel
        sessionId={sessionId}
        participants={participants}
        quickNotes={quickNotes}
        challengeConfig={challengeConfig}
        caseName={sessionName || 'Voir Dire Session'}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Strike Confirmation Dialog */}
      <ConfirmDialog
        isOpen={pendingStrike !== null}
        title="Confirm Peremptory Strike"
        message={`Are you sure you want to use a peremptory strike on ${pendingStrike?.jurorName || 'this juror'}? You have ${challengeConfig.peremptoryTotal - challengeConfig.peremptoryUsed} strikes remaining.`}
        confirmLabel="Strike Juror"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleConfirmStrike}
        onCancel={handleCancelStrike}
      />
    </div>
  );
};

