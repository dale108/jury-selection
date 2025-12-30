/**
 * useSession - Session state management hook
 * Centralizes session-related state and actions
 */
import { useState, useEffect, useCallback } from 'react';
import { Participant, CourtroomConfig, ChallengeConfig, QuickNote, JurorDemographics } from '../types';
import { createSessionWithJurors, loadSessionWithJurors } from '../utils/sessionManager';
import { api, JurorResponse } from '../services/api';

export interface SessionState {
  sessionId: string | null;
  sessionName: string;
  participants: Participant[];
  jurors: JurorResponse[];
  challengeConfig: ChallengeConfig;
  quickNotes: QuickNote[];
  sessionStartTime: Date | null;
  isClockPaused: boolean;
}

export interface SessionActions {
  createSession: (name: string, importedJurors?: JurorDemographics[]) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  endSession: () => void;
  updateParticipants: (participants: Participant[]) => void;
  updateJurors: (jurors: JurorResponse[]) => void;
  updateChallengeConfig: (config: ChallengeConfig) => void;
  updateQuickNotes: (notes: QuickNote[]) => void;
  toggleClockPause: () => void;
  updateConfig: (config: CourtroomConfig) => void;
}

export interface SessionStatus {
  isCreating: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UseSessionReturn {
  state: SessionState;
  config: CourtroomConfig;
  status: SessionStatus;
  actions: SessionActions;
}

const DEFAULT_CHALLENGE_CONFIG: ChallengeConfig = {
  peremptoryTotal: 6,
  peremptoryUsed: 0,
  causeChallenges: [],
};

const DEFAULT_CONFIG: CourtroomConfig = {
  jurors: 12,
  defenseCounsel: 2,
  prosecutors: 2,
};

export const useSession = (): UseSessionReturn => {
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [jurors, setJurors] = useState<JurorResponse[]>([]);
  
  // Configuration
  const [config, setConfig] = useState<CourtroomConfig>(DEFAULT_CONFIG);
  const [challengeConfig, setChallengeConfig] = useState<ChallengeConfig>(DEFAULT_CHALLENGE_CONFIG);
  
  // Session data
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isClockPaused, setIsClockPaused] = useState(false);
  
  // Status
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load session from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session');
    if (sessionIdParam) {
      loadSession(sessionIdParam);
    }
  }, []);

  // Start timer when session loads
  useEffect(() => {
    if (sessionId && !sessionStartTime) {
      setSessionStartTime(new Date());
    }
  }, [sessionId, sessionStartTime]);

  const loadSession = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadSessionWithJurors(id);
      setParticipants(result.participants);
      setSessionId(result.sessionId);
      setSessionName(result.sessionName);
      
      const jurorsData = await api.jurors.list(id);
      setJurors(jurorsData.items);
      
      window.history.replaceState({}, '', `?session=${id}`);
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSession = useCallback(async (name: string, importedJurors?: JurorDemographics[]) => {
    setIsCreating(true);
    setError(null);

    try {
      const caseName = name.trim() || `Session ${new Date().toLocaleDateString()}`;
      
      const effectiveConfig = importedJurors?.length 
        ? { ...config, jurors: importedJurors.length }
        : config;
      
      const result = await createSessionWithJurors(
        effectiveConfig, 
        { case_name: caseName },
        importedJurors
      );
      
      setParticipants(result.participants);
      setSessionId(result.sessionId);
      setSessionName(result.sessionName);
      
      const jurorsData = await api.jurors.list(result.sessionId);
      setJurors(jurorsData.items);
      
      window.history.replaceState({}, '', `?session=${result.sessionId}`);
    } catch (err: any) {
      console.error('Failed to create session:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  }, [config]);

  const endSession = useCallback(() => {
    setSessionId(null);
    setSessionName('');
    setParticipants([]);
    setJurors([]);
    setQuickNotes([]);
    setSessionStartTime(null);
    setIsClockPaused(false);
    setChallengeConfig(DEFAULT_CHALLENGE_CONFIG);
    setError(null);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const toggleClockPause = useCallback(() => {
    setIsClockPaused(prev => !prev);
  }, []);

  return {
    state: {
      sessionId,
      sessionName,
      participants,
      jurors,
      challengeConfig,
      quickNotes,
      sessionStartTime,
      isClockPaused,
    },
    config,
    status: {
      isCreating,
      isLoading,
      error,
    },
    actions: {
      createSession,
      loadSession,
      endSession,
      updateParticipants: setParticipants,
      updateJurors: setJurors,
      updateChallengeConfig: setChallengeConfig,
      updateQuickNotes: setQuickNotes,
      toggleClockPause,
      updateConfig: setConfig,
    },
  };
};

