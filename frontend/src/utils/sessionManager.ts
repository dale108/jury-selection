import { Participant, CourtroomConfig } from '../types';
import { api } from '../services/api';

export interface CreateSessionResult {
  sessionId: string;
  participants: Participant[];
}

/**
 * Creates a session and jurors in the backend, then returns participants with backend IDs
 */
export const createSessionWithJurors = async (
  config: CourtroomConfig,
  caseInfo?: {
    case_number?: string;
    case_name?: string;
    court?: string;
  }
): Promise<CreateSessionResult> => {
  // Create session in backend
  const session = await api.sessions.create({
    case_number: caseInfo?.case_number || `CASE-${Date.now()}`,
    case_name: caseInfo?.case_name || 'Voir Dire Session',
    court: caseInfo?.court || 'King County Superior Court',
  });

  const participants: Participant[] = [];

  // Always include judge (not saved to backend)
  participants.push({
    id: 'judge-1',
    name: 'Hon. Judge',
    role: 'judge',
  });

  // Create defense counsel (not saved to backend for now, but could be extended)
  for (let i = 1; i <= config.defenseCounsel; i++) {
    participants.push({
      id: `defense-${i}`,
      name: `Defense Attorney ${i}`,
      role: 'defense',
      seatNumber: i,
    });
  }

  // Create prosecutors (not saved to backend for now, but could be extended)
  for (let i = 1; i <= config.prosecutors; i++) {
    participants.push({
      id: `prosecutor-${i}`,
      name: `Prosecutor ${i}`,
      role: 'prosecutor',
      seatNumber: i,
    });
  }

  // Create jurors in backend
  const jurorPromises = [];
  for (let i = 1; i <= config.jurors; i++) {
    jurorPromises.push(
      api.jurors.create({
        session_id: session.id,
        seat_number: i,
        first_name: `Juror`,
        last_name: `${i}`,
      })
    );
  }

  const createdJurors = await Promise.all(jurorPromises);

  // Add jurors with backend IDs
  createdJurors.forEach((juror, index) => {
    participants.push({
      id: `juror-${index + 1}`,
      name: `${juror.first_name} ${juror.last_name}`,
      role: 'juror',
      seatNumber: juror.seat_number,
      backendJurorId: juror.id,
      sessionId: session.id,
      notes: juror.notes || undefined,
    });
  });

  return {
    sessionId: session.id,
    participants,
  };
};

/**
 * Loads an existing session and its jurors from the backend
 */
export const loadSessionWithJurors = async (
  sessionId: string
): Promise<CreateSessionResult> => {
  const [session, jurorsResponse] = await Promise.all([
    api.sessions.get(sessionId),
    api.jurors.list(sessionId),
  ]);

  const participants: Participant[] = [];

  // Add judge (not from backend)
  participants.push({
    id: 'judge-1',
    name: 'Hon. Judge',
    role: 'judge',
  });

  // Add defense and prosecutors (placeholder for now - could be extended to load from backend)
  participants.push({
    id: 'defense-1',
    name: 'Defense Attorney 1',
    role: 'defense',
    seatNumber: 1,
  });

  participants.push({
    id: 'prosecutor-1',
    name: 'Prosecutor 1',
    role: 'prosecutor',
    seatNumber: 1,
  });

  // Add jurors from backend
  jurorsResponse.items.forEach((juror) => {
    participants.push({
      id: `juror-${juror.seat_number}`,
      name: `${juror.first_name} ${juror.last_name}`,
      role: 'juror',
      seatNumber: juror.seat_number,
      backendJurorId: juror.id,
      sessionId: session.id,
      notes: juror.notes || undefined,
    });
  });

  return {
    sessionId: session.id,
    participants,
  };
};

