/**
 * Transcript and speaker mapping types
 */

// Speaker mapping for transcript display
export interface SpeakerMapping {
  speakerLabel: string;
  participantType: 'juror' | 'defense' | 'prosecutor';
  participantId: string;
  displayName: string;
}

