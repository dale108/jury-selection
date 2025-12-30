/**
 * Challenge tracking types
 */

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

