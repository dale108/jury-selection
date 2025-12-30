/**
 * Voir Dire - Main Application
 * Professional jury selection assistant for Washington State public defense
 */
import { useState, useEffect, useCallback } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MainSessionView } from './components/MainSessionView';
import { Participant, CourtroomConfig, ChallengeConfig, QuickNote, JurorDemographics } from './types';
import { createSessionWithJurors, loadSessionWithJurors } from './utils/sessionManager';
import { api, JurorResponse } from './services/api';
import './App.css';

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
  
  // Challenge tracking
  const [challengeConfig, setChallengeConfig] = useState<ChallengeConfig>({
    peremptoryTotal: 6,
    peremptoryUsed: 0,
    causeChallenges: [],
  });
  
  // Quick notes
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isClockPaused, setIsClockPaused] = useState(false);

  // Load session from URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session');
    if (sessionIdParam) {
      handleLoadSession(sessionIdParam);
    }
  }, []);

  // Start session timer when session is created/loaded
  useEffect(() => {
    if (currentSessionId && !sessionStartTime) {
      setSessionStartTime(new Date());
    }
  }, [currentSessionId, sessionStartTime]);

  const handleLoadSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadSessionWithJurors(sessionId);
      setParticipants(result.participants);
      setCurrentSessionId(result.sessionId);
      setCurrentSessionName(result.sessionName);
      
      const jurorsData = await api.jurors.list(sessionId);
      setJurors(jurorsData.items);
      
      window.history.replaceState({}, '', `?session=${sessionId}`);
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateSession = async (sessionName: string, importedJurors?: JurorDemographics[]) => {
    setIsCreating(true);
    setError(null);

    try {
      const caseName = sessionName.trim() || `Session ${new Date().toLocaleDateString()}`;
      
      const effectiveConfig = importedJurors?.length 
        ? { ...config, jurors: importedJurors.length }
        : config;
      
      const result = await createSessionWithJurors(
        effectiveConfig, 
        { case_name: caseName },
        importedJurors
      );
      
      setParticipants(result.participants);
      setCurrentSessionId(result.sessionId);
      setCurrentSessionName(result.sessionName);
      
      const jurorsData = await api.jurors.list(result.sessionId);
      setJurors(jurorsData.items);
      
      window.history.replaceState({}, '', `?session=${result.sessionId}`);
    } catch (err: any) {
      console.error('Failed to create session:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEndSession = () => {
    setCurrentSessionId(null);
    setCurrentSessionName('');
    setParticipants([]);
    setJurors([]);
    setQuickNotes([]);
    setSessionStartTime(null);
    setChallengeConfig({
      peremptoryTotal: 6,
      peremptoryUsed: 0,
      causeChallenges: [],
    });
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Render welcome screen if no session
  if (!currentSessionId) {
    return (
      <WelcomeScreen
        config={config}
        onConfigChange={setConfig}
        challengeConfig={challengeConfig}
        onChallengeConfigChange={setChallengeConfig}
        onCreateSession={handleCreateSession}
        onLoadSession={handleLoadSession}
        isCreating={isCreating}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  // Render main session view
  return (
    <MainSessionView
      sessionId={currentSessionId}
      sessionName={currentSessionName}
      participants={participants}
      jurors={jurors}
      challengeConfig={challengeConfig}
      quickNotes={quickNotes}
      sessionStartTime={sessionStartTime}
      isClockPaused={isClockPaused}
      onParticipantsChange={setParticipants}
      onJurorsChange={setJurors}
      onChallengeConfigChange={setChallengeConfig}
      onQuickNotesChange={setQuickNotes}
      onClockPauseToggle={() => setIsClockPaused(!isClockPaused)}
      onEndSession={handleEndSession}
    />
  );
}

export default App;
