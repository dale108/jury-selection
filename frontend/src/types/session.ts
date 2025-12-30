/**
 * Session and courtroom configuration types
 */
import type { JurorTagKey } from './juror';

export interface Participant {
  id: string;
  name: string;
  role: 'judge' | 'juror' | 'defense' | 'prosecutor';
  seatNumber?: number;
  position?: { row: number; col: number };
  notes?: string;
  occupation?: string;
  neighborhood?: string;
  backendJurorId?: string; // UUID of the juror in the backend database
  sessionId?: string; // UUID of the session in the backend database
  // Assessment flags for voir dire
  status?: 'favorable' | 'unfavorable' | 'neutral' | 'flagged';
  // Tags for categorizing jurors (includes predefined and custom tags)
  tags?: (JurorTagKey | string)[];
  // Challenge status
  challenged?: 'peremptory' | 'cause' | null;
  challengeReason?: string;
}

export interface CourtroomConfig {
  jurors: number;
  defenseCounsel: number;
  prosecutors: number;
}

export interface Session {
  id: string;
  case_number: string;
  case_name: string;
  court: string;
  status: string;
  created_at: string;
}

// Quick timestamped notes
export interface QuickNote {
  id: string;
  timestamp: number; // seconds from session start
  content: string;
  jurorId?: string; // optional association with a juror
  createdAt: string;
}

