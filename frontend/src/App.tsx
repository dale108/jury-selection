import { useState, useEffect, useCallback } from 'react';
import { CourtroomLayout } from './components/CourtroomLayout';
import { JurorEditModal } from './components/JurorEditModal';
import { TranscriptPanel } from './components/TranscriptPanel';
import { SpeakerMappingPanel } from './components/SpeakerMappingPanel';
import { ChallengeTracker } from './components/ChallengeTracker';
import { ModeIndicator } from './components/ModeIndicator';
import { JurorImport } from './components/JurorImport';
import { JurorDemographics } from './types';
import { QuickNotes } from './components/QuickNotes';
import { ExportPanel } from './components/ExportPanel';
import { AudioRecorder, TranscriptSegment as LiveSegment } from './components/AudioRecorder';
import { LiveTranscript } from './components/LiveTranscript';
import { Participant, CourtroomConfig, ChallengeConfig, QuickNote } from './types';
import { createSessionWithJurors, loadSessionWithJurors } from './utils/sessionManager';
import { api, JurorResponse } from './services/api';
import './App.css';

// Icons as inline SVG components
const TranscriptIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
  </svg>
);

const MappingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="7" r="4"/>
    <path d="M5.5 21a6.5 6.5 0 0113 0"/>
    <path d="M16 11l2 2 4-4"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const ExportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
  </svg>
);

function App() {
  // Session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionName, setCurrentSessionName] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [jurors, setJurors] = useState<JurorResponse[]>([]);
  
  // Configuration state
  const [config, setConfig] = useState<CourtroomConfig>({
    jurors: 12,
    defenseCounsel: 2,
    prosecutors: 2,
  });
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'transcript' | 'mapping' | null>(null);
  const [transcriptRefreshTrigger, setTranscriptRefreshTrigger] = useState(0);
  
  // Modal state
  const [selectedJuror, setSelectedJuror] = useState<Participant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Load session input
  const [loadSessionId, setLoadSessionId] = useState('');
  
  // New session form
  const [newSessionName, setNewSessionName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedJurors, setImportedJurors] = useState<JurorDemographics[]>([]);
  
  // Challenge tracking
  const [challengeConfig, setChallengeConfig] = useState<ChallengeConfig>({
    peremptoryTotal: 6, // Washington State default for most cases
    peremptoryUsed: 0,
    causeChallenges: [],
  });
  
  // Tags are still editable per-juror, but we removed the global filter bar
  
  // Quick notes
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isClockPaused, setIsClockPaused] = useState(false);
  
  // Export panel
  const [isExportOpen, setIsExportOpen] = useState(false);
  
  // Live recording/transcription
  const [isRecording, setIsRecording] = useState(false);
  const [liveSegments, setLiveSegments] = useState<LiveSegment[]>([]);

  // Load session from URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session');
    if (sessionIdParam) {
      handleLoadSession(sessionIdParam);
    }
  }, []);

  const handleLoadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadSessionWithJurors(sessionId);
      setParticipants(result.participants);
      setCurrentSessionId(result.sessionId);
      setCurrentSessionName(result.sessionName);
      
      // Load jurors for mapping
      const jurorsData = await api.jurors.list(sessionId);
      setJurors(jurorsData.items);
      
      // Update URL
      window.history.replaceState({}, '', `?session=${sessionId}`);
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateSession = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const caseName = newSessionName.trim() || `Session ${new Date().toLocaleDateString()}`;
      
      // Use imported jurors if available, otherwise use config count
      const effectiveConfig = importedJurors.length > 0 
        ? { ...config, jurors: importedJurors.length }
        : config;
      
      const result = await createSessionWithJurors(
        effectiveConfig, 
        { case_name: caseName },
        importedJurors.length > 0 ? importedJurors : undefined
      );
      
      setParticipants(result.participants);
      setCurrentSessionId(result.sessionId);
      setCurrentSessionName(result.sessionName);
      
      // Load jurors for mapping
      const jurorsData = await api.jurors.list(result.sessionId);
      setJurors(jurorsData.items);
      
      // Clear imported jurors
      setImportedJurors([]);
      
      // Update URL
      window.history.replaceState({}, '', `?session=${result.sessionId}`);
    } catch (err: any) {
      console.error('Failed to create session:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleImportComplete = (jurors: JurorDemographics[]) => {
    setImportedJurors(jurors);
    setConfig(c => ({ ...c, jurors: jurors.length }));
    setShowImportModal(false);
  };

  const handleJurorClick = (juror: Participant) => {
    setSelectedJuror(juror);
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
      setParticipants(prev => 
        prev.map(p => p.id === jurorId ? { ...p, notes } : p)
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

  const handleUpdateJurorStatus = async (jurorId: string, status: Participant['status']) => {
    const participant = participants.find(p => p.id === jurorId);
    if (!participant) return;

    // Toggle if same status
    const newStatus = participant.status === status ? undefined : status;
    
    setParticipants(prev => 
      prev.map(p => p.id === jurorId ? { ...p, status: newStatus } : p)
    );
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJuror(null);
    setSaveError(null);
  };

  const handleMappingUpdate = useCallback(async () => {
    if (currentSessionId) {
      const data = await api.jurors.list(currentSessionId);
      setJurors(data.items);
    }
    setTranscriptRefreshTrigger(prev => prev + 1);
  }, [currentSessionId]);

  // Challenge handlers
  const handleChallengeJuror = (jurorId: string, type: 'peremptory' | 'cause', reason?: string) => {
    setParticipants(prev => 
      prev.map(p => p.id === jurorId ? { 
        ...p, 
        challenged: type, 
        challengeReason: reason 
      } : p)
    );
    
    if (type === 'peremptory') {
      setChallengeConfig(prev => ({
        ...prev,
        peremptoryUsed: prev.peremptoryUsed + 1
      }));
    }
  };

  const handleRemoveChallenge = (jurorId: string) => {
    const participant = participants.find(p => p.id === jurorId);
    if (!participant) return;
    
    if (participant.challenged === 'peremptory') {
      setChallengeConfig(prev => ({
        ...prev,
        peremptoryUsed: Math.max(0, prev.peremptoryUsed - 1)
      }));
    }
    
    setParticipants(prev => 
      prev.map(p => p.id === jurorId ? { 
        ...p, 
        challenged: undefined, 
        challengeReason: undefined 
      } : p)
    );
  };

  // Tag handlers
  const handleUpdateJurorTags = async (jurorId: string, tags: string[]) => {
    const participant = participants.find(p => p.id === jurorId);
    if (!participant) return;

    // Optimistic update
    setParticipants(prev => 
      prev.map(p => p.id === jurorId ? { ...p, tags } : p)
    );

    // Persist to backend via flags
    if (participant.backendJurorId) {
      try {
        await api.jurors.update(participant.backendJurorId, { 
          flags: { tags } 
        });
      } catch (err) {
        console.error('Failed to save tags:', err);
      }
    }
  };


  // Quick notes handlers
  const handleAddQuickNote = (note: Omit<QuickNote, 'id' | 'createdAt'>) => {
    const newNote: QuickNote = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setQuickNotes(prev => [...prev, newNote]);
  };

  const handleDeleteQuickNote = (noteId: string) => {
    setQuickNotes(prev => prev.filter(n => n.id !== noteId));
  };

  // Start session timer when session is created/loaded
  useEffect(() => {
    if (currentSessionId && !sessionStartTime) {
      setSessionStartTime(new Date());
    }
  }, [currentSessionId, sessionStartTime]);

  // Live recording handlers
  const handleRecordingStart = () => {
    setIsRecording(true);
    setLiveSegments([]);
    setIsClockPaused(false);
    if (!sessionStartTime) {
      setSessionStartTime(new Date());
    }
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
    // Refresh transcript panel to show new segments
    setTranscriptRefreshTrigger(prev => prev + 1);
  };

  const handleTranscriptUpdate = (segment: LiveSegment) => {
    setLiveSegments(prev => [...prev, segment]);
  };

  // Get stats
  const jurorParticipants = participants.filter(p => p.role === 'juror');
  const favorableCount = jurorParticipants.filter(p => p.status === 'favorable').length;
  const unfavorableCount = jurorParticipants.filter(p => p.status === 'unfavorable').length;
  const notesCount = jurorParticipants.filter(p => p.notes).length;

  // Render welcome screen if no session
  if (!currentSessionId) {
    return (
      <div className="app">
        <nav className="navbar">
          <div className="navbar-brand">
            <div className="navbar-logo">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <div className="navbar-title">Voir Dire</div>
              <div className="navbar-subtitle">Washington State Public Defense</div>
            </div>
            <ModeIndicator />
          </div>
        </nav>

        <main className="main-content">
          <div className="welcome-screen">
            <div className="welcome-container">
              <div className="welcome-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2L1 12h3v9h6v-6h4v6h6v-9h3L12 2z"/>
                </svg>
              </div>
              <h1 className="welcome-title">Jury Selection Assistant</h1>
              <p className="welcome-subtitle">
                Streamline your voir dire process with real-time transcription, 
                juror tracking, and collaborative note-taking.
              </p>

              <div className="setup-section">
                <div className="setup-section-title">New Session</div>
                <div className="form-row" style={{ marginBottom: 'var(--space-md)' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Session Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., State v. Smith"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                    />
                    <span className="form-hint">Case name or description</span>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Jurors</label>
                    <input
                      type="number"
                      className="form-input"
                      value={config.jurors}
                      onChange={(e) => setConfig(c => ({ ...c, jurors: parseInt(e.target.value) || 12 }))}
                      min="1"
                      max="24"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Defense Counsel</label>
                    <input
                      type="number"
                      className="form-input"
                      value={config.defenseCounsel}
                      onChange={(e) => setConfig(c => ({ ...c, defenseCounsel: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="5"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prosecutors</label>
                    <input
                      type="number"
                      className="form-input"
                      value={config.prosecutors}
                      onChange={(e) => setConfig(c => ({ ...c, prosecutors: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="5"
                    />
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: 'var(--space-md)' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Peremptory Strikes</label>
                    <input
                      type="number"
                      className="form-input"
                      value={challengeConfig.peremptoryTotal}
                      onChange={(e) => setChallengeConfig(c => ({ 
                        ...c, 
                        peremptoryTotal: parseInt(e.target.value) || 6 
                      }))}
                      min="1"
                      max="20"
                    />
                    <span className="form-hint">Number of peremptory challenges allowed</span>
                  </div>
                </div>
                {/* Import Status */}
                {importedJurors.length > 0 && (
                  <div className="import-status">
                    <span className="import-status-icon">✓</span>
                    <span className="import-status-text">
                      {importedJurors.length} jurors imported from questionnaire
                    </span>
                    <button 
                      className="import-status-clear"
                      onClick={() => setImportedJurors([])}
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div className="session-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowImportModal(true)}
                    style={{ flex: 1 }}
                  >
                    📄 Import Questionnaires
                  </button>
                  <button 
                    className="btn btn-primary btn-lg" 
                    onClick={handleCreateSession}
                    disabled={isCreating}
                    style={{ flex: 2 }}
                  >
                    {isCreating ? 'Creating Session...' : (
                      importedJurors.length > 0 
                        ? `Start with ${importedJurors.length} Jurors`
                        : 'Start New Session'
                    )}
                  </button>
                </div>
              </div>

              <div className="welcome-divider">
                <span>or</span>
              </div>

              <div className="setup-section">
                <div className="setup-section-title">Resume Existing Session</div>
                <div className="load-session-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter session ID..."
                    value={loadSessionId}
                    onChange={(e) => setLoadSessionId(e.target.value)}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleLoadSession(loadSessionId)}
                    disabled={isLoading || !loadSessionId}
                  >
                    {isLoading ? 'Loading...' : 'Load'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <span>⚠</span> {error}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Import Modal */}
        {showImportModal && (
          <JurorImport
            onImport={handleImportComplete}
            onCancel={() => setShowImportModal(false)}
          />
        )}
      </div>
    );
  }

  // Render main courtroom view
  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <div className="navbar-title">Voir Dire</div>
            <div className="navbar-subtitle">Washington State Public Defense</div>
          </div>
          <ModeIndicator />
        </div>

        <div className="navbar-session">
          <div className="session-badge" title={`Session ID: ${currentSessionId}`}>
            <div className="session-indicator"></div>
            <span className="session-text">{currentSessionName || currentSessionId.slice(0, 8)}</span>
          </div>
        </div>

        <div className="navbar-actions">
          <button 
            className={`btn btn-secondary ${activePanel === 'mapping' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'mapping' ? null : 'mapping')}
          >
            <MappingIcon />
            Speakers
          </button>
          <button 
            className={`btn btn-secondary ${activePanel === 'transcript' ? 'active' : ''}`}
            onClick={() => setActivePanel(activePanel === 'transcript' ? null : 'transcript')}
          >
            <TranscriptIcon />
            Transcript
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setIsExportOpen(true)}
          >
            <ExportIcon />
            Export
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className={`workspace ${activePanel ? 'sidebar-open' : ''}`}>
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="case-info">
                <div className="case-number">Active Voir Dire Session</div>
                <div className="case-details">{jurorParticipants.length} jurors in panel</div>
              </div>
              <div className="toolbar-stats">
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
                onClick={() => {
                  setCurrentSessionId(null);
                  setParticipants([]);
                  setChallengeConfig({
                    peremptoryTotal: 6,
                    peremptoryUsed: 0,
                    causeChallenges: [],
                  });
                  window.history.replaceState({}, '', window.location.pathname);
                }}
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
              {/* Audio Recording */}
              <AudioRecorder
                sessionId={currentSessionId}
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
                onTranscriptUpdate={handleTranscriptUpdate}
                onError={(err) => console.error('Recording error:', err)}
              />
              
              {/* Live Transcript (only during recording) */}
              {isRecording && liveSegments.length > 0 && (
                <div className="live-transcript-container">
                  <h3 className="sidebar-section-title">Live Transcript</h3>
                  <LiveTranscript segments={liveSegments} />
                </div>
              )}
              
              <ChallengeTracker
                participants={participants}
                challengeConfig={challengeConfig}
                onChallengeConfigChange={setChallengeConfig}
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
                onPauseToggle={() => setIsClockPaused(!isClockPaused)}
              />
            </div>
          </div>
        </div>

        {/* Transcript Sidebar */}
        <aside className={`sidebar-panel ${activePanel === 'transcript' ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2 className="sidebar-title">Transcript</h2>
            <button className="sidebar-close" onClick={() => setActivePanel(null)}>
              <CloseIcon />
            </button>
          </div>
          <div className="sidebar-content">
        <TranscriptPanel
          sessionId={currentSessionId}
          isOpen={activePanel === 'transcript'}
          onClose={() => setActivePanel(null)}
          refreshTrigger={transcriptRefreshTrigger}
          embedded={true}
        />
          </div>
        </aside>

        {/* Speaker Mapping Sidebar */}
        <aside className={`sidebar-panel ${activePanel === 'mapping' ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2 className="sidebar-title">Speaker Mapping</h2>
            <button className="sidebar-close" onClick={() => setActivePanel(null)}>
              <CloseIcon />
            </button>
          </div>
          <div className="sidebar-content">
            <SpeakerMappingPanel
              sessionId={currentSessionId}
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
        sessionId={currentSessionId}
        onStatusChange={handleUpdateJurorStatus}
        onTagsChange={handleUpdateJurorTags}
      />

      {currentSessionId && (
        <ExportPanel
          sessionId={currentSessionId}
          participants={participants}
          quickNotes={quickNotes}
          challengeConfig={challengeConfig}
          caseName="Voir Dire Session"
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
