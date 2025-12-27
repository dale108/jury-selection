import { Participant, CourtroomConfig } from '../types';

export const generateParticipants = (config: CourtroomConfig): Participant[] => {
  const participants: Participant[] = [];

  // Always include judge
  participants.push({
    id: 'judge-1',
    name: 'Hon. Judge',
    role: 'judge',
  });

  // Generate defense counsel
  for (let i = 1; i <= config.defenseCounsel; i++) {
    participants.push({
      id: `defense-${i}`,
      name: `Defense Attorney ${i}`,
      role: 'defense',
      seatNumber: i,
    });
  }

  // Generate prosecutors
  for (let i = 1; i <= config.prosecutors; i++) {
    participants.push({
      id: `prosecutor-${i}`,
      name: `Prosecutor ${i}`,
      role: 'prosecutor',
      seatNumber: i,
    });
  }

  // Generate jurors
  for (let i = 1; i <= config.jurors; i++) {
    participants.push({
      id: `juror-${i}`,
      name: `Juror ${i}`,
      role: 'juror',
      seatNumber: i,
    });
  }

  return participants;
};

