import { Participant, CourtroomConfig, JurorDemographics } from '../types';
import { api } from '../services/api';

/**
 * Build demographic notes from imported juror data
 */
const buildDemographicNotes = (juror: JurorDemographics): string => {
  const lines: string[] = [];
  
  if (juror.badgeNumber) lines.push(`Badge #: ${juror.badgeNumber}`);
  if (juror.age) lines.push(`Age: ${juror.age}`);
  if (juror.education) lines.push(`Education: ${juror.education}`);
  if (juror.gender) lines.push(`Gender: ${juror.gender}`);
  if (juror.ethnicity) lines.push(`Ethnicity: ${juror.ethnicity}`);
  if (juror.phone) lines.push(`Phone: ${juror.phone}`);
  if (juror.email) lines.push(`Email: ${juror.email}`);
  if (juror.priorJuryService) {
    lines.push(`Prior Jury Service: Yes`);
    if (juror.priorJuryDetails) lines.push(`  Details: ${juror.priorJuryDetails}`);
  }
  if (juror.criminalConviction) {
    lines.push(`Criminal Conviction: Yes`);
    if (juror.criminalConvictionDetails) lines.push(`  Details: ${juror.criminalConvictionDetails}`);
  }
  if (juror.hardship) {
    lines.push(`Hardship Claim: Yes`);
    if (juror.hardshipDetails) lines.push(`  Details: ${juror.hardshipDetails}`);
  }
  
  return lines.join('\n');
};

export interface CreateSessionResult {
  sessionId: string;
  sessionName: string;
  participants: Participant[];
}

/**
 * Creates a session and jurors in the backend, then returns participants with backend IDs
 * If importedJurors is provided, uses that data instead of generic juror names
 */
export const createSessionWithJurors = async (
  config: CourtroomConfig,
  caseInfo?: {
    case_number?: string;
    case_name?: string;
    court?: string;
  },
  importedJurors?: JurorDemographics[]
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

  // Determine juror count - use imported jurors if available, otherwise config
  const jurorCount = importedJurors?.length || config.jurors;

  // Create jurors in backend
  const jurorPromises = [];
  for (let i = 1; i <= jurorCount; i++) {
    const imported = importedJurors?.[i - 1];
    
    // Build notes from demographic data
    const demographicNotes = imported ? buildDemographicNotes(imported) : '';
    
    // Build demographics object for backend storage
    const demographics = imported ? {
      badgeNumber: imported.badgeNumber,
      age: imported.age,
      education: imported.education,
      gender: imported.gender,
      ethnicity: imported.ethnicity,
      phone: imported.phone,
      email: imported.email,
      priorJuryService: imported.priorJuryService,
      priorJuryDetails: imported.priorJuryDetails,
      criminalConviction: imported.criminalConviction,
      criminalConvictionDetails: imported.criminalConvictionDetails,
      hardship: imported.hardship,
      hardshipDetails: imported.hardshipDetails,
    } : undefined;
    
    jurorPromises.push(
      api.jurors.create({
        session_id: session.id,
        seat_number: imported?.seatNumber || i,
        first_name: imported?.firstName || `Juror`,
        last_name: imported?.lastName || `${i}`,
        occupation: imported?.occupation,
        neighborhood: imported?.city,
        notes: demographicNotes || undefined,
        demographics,
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
      occupation: juror.occupation || undefined,
      neighborhood: juror.neighborhood || undefined,
    });
  });

  return {
    sessionId: session.id,
    sessionName: session.case_name || 'Unnamed Session',
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
      occupation: juror.occupation || undefined,
      neighborhood: juror.neighborhood || undefined,
    });
  });

  return {
    sessionId: session.id,
    sessionName: session.case_name || 'Unnamed Session',
    participants,
  };
};

