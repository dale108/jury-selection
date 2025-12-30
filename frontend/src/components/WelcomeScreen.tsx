/**
 * WelcomeScreen - Session creation and loading
 * Entry point for new and returning users
 */
import React, { useState, useEffect } from 'react';
import { CourtroomConfig, ChallengeConfig, JurorDemographics } from '../types';
import { ModeIndicator } from './ModeIndicator';
import { JurorImport } from './JurorImport';
import { CheckCircleIcon, HomeIcon } from './icons';
import { SessionListSkeleton } from './Skeleton';
import { api, SessionResponse } from '../services/api';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  config: CourtroomConfig;
  onConfigChange: (config: CourtroomConfig) => void;
  challengeConfig: ChallengeConfig;
  onChallengeConfigChange: (config: ChallengeConfig) => void;
  onCreateSession: (sessionName: string, importedJurors?: JurorDemographics[]) => Promise<void>;
  onLoadSession: (sessionId: string) => Promise<void>;
  isCreating: boolean;
  isLoading: boolean;
  error: string | null;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  config,
  onConfigChange,
  challengeConfig,
  onChallengeConfigChange,
  onCreateSession,
  onLoadSession,
  isCreating,
  isLoading,
  error,
}) => {
  const [newSessionName, setNewSessionName] = useState('');
  const [loadSessionId, setLoadSessionId] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedJurors, setImportedJurors] = useState<JurorDemographics[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionResponse[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Load recent sessions on mount
  useEffect(() => {
    const loadRecentSessions = async () => {
      try {
        const result = await api.sessions.list();
        // Sort by created_at descending and take top 5
        const sorted = result.items
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        setRecentSessions(sorted);
      } catch (err) {
        console.error('Failed to load recent sessions:', err);
      } finally {
        setLoadingRecent(false);
      }
    };
    loadRecentSessions();
  }, []);

  const handleImportComplete = (jurors: JurorDemographics[]) => {
    setImportedJurors(jurors);
    onConfigChange({ ...config, jurors: jurors.length });
    setShowImportModal(false);
  };

  const handleCreateSession = async () => {
    await onCreateSession(newSessionName, importedJurors.length > 0 ? importedJurors : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreateSession();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="app">
      <nav className="navbar" role="navigation" aria-label="Main navigation">
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
      </nav>

      <main className="main-content" role="main">
        <div className="welcome-screen">
          <div className="welcome-container">
            <div className="welcome-icon">
              <HomeIcon size={40} />
            </div>
            <h1 className="welcome-title">Jury Selection Assistant</h1>
            <p className="welcome-subtitle">
              Streamline your voir dire process with real-time transcription, 
              juror tracking, and collaborative note-taking.
            </p>

            {/* New Session Section */}
            <section className="setup-section" aria-labelledby="new-session-title">
              <h2 id="new-session-title" className="setup-section-title">New Session</h2>
              
              <div className="form-row" style={{ marginBottom: 'var(--space-md)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="session-name" className="form-label">Session Name</label>
                  <input
                    id="session-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g., State v. Smith"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    aria-describedby="session-name-hint"
                  />
                  <span id="session-name-hint" className="form-hint">Case name or description</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="juror-count" className="form-label">Jurors</label>
                  <input
                    id="juror-count"
                    type="number"
                    className="form-input"
                    value={config.jurors}
                    onChange={(e) => onConfigChange({ ...config, jurors: parseInt(e.target.value) || 12 })}
                    min="1"
                    max="24"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="defense-count" className="form-label">Defense Counsel</label>
                  <input
                    id="defense-count"
                    type="number"
                    className="form-input"
                    value={config.defenseCounsel}
                    onChange={(e) => onConfigChange({ ...config, defenseCounsel: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="5"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="prosecutor-count" className="form-label">Prosecutors</label>
                  <input
                    id="prosecutor-count"
                    type="number"
                    className="form-input"
                    value={config.prosecutors}
                    onChange={(e) => onConfigChange({ ...config, prosecutors: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="5"
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 'var(--space-md)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="strikes-count" className="form-label">Peremptory Strikes</label>
                  <input
                    id="strikes-count"
                    type="number"
                    className="form-input"
                    value={challengeConfig.peremptoryTotal}
                    onChange={(e) => onChallengeConfigChange({ 
                      ...challengeConfig, 
                      peremptoryTotal: parseInt(e.target.value) || 6 
                    })}
                    min="1"
                    max="20"
                    aria-describedby="strikes-hint"
                  />
                  <span id="strikes-hint" className="form-hint">Number of peremptory challenges allowed</span>
                </div>
              </div>

              {/* Import Status */}
              {importedJurors.length > 0 && (
                <div className="import-status" role="status" aria-live="polite">
                  <span className="import-status-icon" aria-hidden="true">✓</span>
                  <span className="import-status-text">
                    {importedJurors.length} jurors imported from questionnaire
                  </span>
                  <button 
                    className="import-status-clear"
                    onClick={() => setImportedJurors([])}
                    aria-label="Clear imported jurors"
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
                  type="button"
                >
                  📄 Import Questionnaires
                </button>
                <button 
                  className="btn btn-primary btn-lg" 
                  onClick={handleCreateSession}
                  disabled={isCreating}
                  style={{ flex: 2 }}
                  type="button"
                >
                  {isCreating ? 'Creating Session...' : (
                    importedJurors.length > 0 
                      ? `Start with ${importedJurors.length} Jurors`
                      : 'Start New Session'
                  )}
                </button>
              </div>
            </section>

            <div className="welcome-divider" role="separator">
              <span>or</span>
            </div>

            {/* Resume Session Section */}
            <section className="setup-section" aria-labelledby="resume-session-title">
              <h2 id="resume-session-title" className="setup-section-title">Resume Existing Session</h2>
              
              {/* Recent Sessions */}
              {loadingRecent && (
                <div className="recent-sessions">
                  <div className="recent-sessions-label">Recent sessions:</div>
                  <SessionListSkeleton count={3} />
                </div>
              )}
              {!loadingRecent && recentSessions.length > 0 && (
                <div className="recent-sessions">
                  <div className="recent-sessions-label">Recent sessions:</div>
                  <div className="recent-sessions-list">
                    {recentSessions.map((session) => (
                      <button
                        key={session.id}
                        className="recent-session-btn"
                        onClick={() => onLoadSession(session.id)}
                        disabled={isLoading}
                      >
                        <span className="recent-session-name">
                          {session.case_name || 'Unnamed Session'}
                        </span>
                        <span className="recent-session-date">
                          {formatDate(session.created_at)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="load-session-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter session ID..."
                  value={loadSessionId}
                  onChange={(e) => setLoadSessionId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && loadSessionId && !isLoading) {
                      onLoadSession(loadSessionId);
                    }
                  }}
                  aria-label="Session ID"
                />
                <button 
                  className="btn btn-primary"
                  onClick={() => onLoadSession(loadSessionId)}
                  disabled={isLoading || !loadSessionId}
                  type="button"
                >
                  {isLoading ? 'Loading...' : 'Load'}
                </button>
              </div>
            </section>

            {error && (
              <div className="error-message" role="alert">
                <span aria-hidden="true">⚠</span> {error}
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
};

