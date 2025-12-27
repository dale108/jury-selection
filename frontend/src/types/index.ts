// Predefined juror tags
export const JUROR_TAGS = {
  'law-enforcement': { label: 'Law Enforcement', icon: '🚔', color: '#dc2626' },
  'legal-background': { label: 'Legal Background', icon: '⚖️', color: '#7c3aed' },
  'prior-jury': { label: 'Prior Jury', icon: '👨‍⚖️', color: '#2563eb' },
  'victim-similar': { label: 'Victim of Similar Crime', icon: '⚠️', color: '#d97706' },
  'knows-parties': { label: 'Knows Parties', icon: '👥', color: '#dc2626' },
  'military': { label: 'Military/Veteran', icon: '🎖️', color: '#059669' },
  'medical': { label: 'Medical Background', icon: '🏥', color: '#0891b2' },
  'educator': { label: 'Educator', icon: '📚', color: '#4f46e5' },
  'business-owner': { label: 'Business Owner', icon: '💼', color: '#78716c' },
  'young-children': { label: 'Young Children', icon: '👶', color: '#ec4899' },
} as const;

export type JurorTagKey = keyof typeof JUROR_TAGS;

// Custom tags are stored as strings with a 'custom:' prefix
export type TagValue = JurorTagKey | `custom:${string}`;

export interface Participant {
  id: string;
  name: string;
  role: 'judge' | 'juror' | 'defense' | 'prosecutor';
  seatNumber?: number;
  position?: { row: number; col: number };
  notes?: string;
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

export interface Juror {
  id: string;
  session_id: string;
  seat_number: number;
  first_name: string;
  last_name: string;
  occupation?: string;
  neighborhood?: string;
  notes?: string;
}

// Speaker mapping for transcript display
export interface SpeakerMapping {
  speakerLabel: string;
  participantType: 'juror' | 'defense' | 'prosecutor';
  participantId: string;
  displayName: string;
}

// Quick timestamped notes
export interface QuickNote {
  id: string;
  timestamp: number; // seconds from session start
  content: string;
  jurorId?: string; // optional association with a juror
  createdAt: string;
}

// Challenge tracking
export interface ChallengeConfig {
  peremptoryTotal: number;
  peremptoryUsed: number;
  causeChallenges: CauseChallenge[];
}

export interface CauseChallenge {
  jurorId: string;
  jurorName: string;
  seatNumber: number;
  reason: string;
  granted: boolean;
  timestamp: string;
}

export interface PeremptoryChallenge {
  jurorId: string;
  jurorName: string;
  seatNumber: number;
  timestamp: string;
}
