/**
 * Juror-related types
 */

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

// Extended juror data from questionnaire import
export interface JurorDemographics {
  badgeNumber?: string;
  firstName: string;
  lastName: string;
  age?: number | string;
  city?: string;
  occupation?: string;
  education?: string;
  gender?: string;
  ethnicity?: string;
  priorJuryService?: boolean;
  priorJuryDetails?: string;
  criminalConviction?: boolean;
  criminalConvictionDetails?: string;
  phone?: string;
  email?: string;
  hardship?: boolean;
  hardshipDetails?: string;
  // Computed/default fields
  seatNumber?: number;
}

// Column mapping for CSV import
export interface ColumnMapping {
  csvColumn: string;
  jurorField: keyof JurorDemographics | 'skip';
}

// Standard fields that can be mapped
export const JUROR_IMPORT_FIELDS: { key: keyof JurorDemographics; label: string; required: boolean }[] = [
  { key: 'badgeNumber', label: 'Badge/Juror Number', required: false },
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'age', label: 'Age', required: false },
  { key: 'city', label: 'City/Neighborhood', required: false },
  { key: 'occupation', label: 'Occupation', required: false },
  { key: 'education', label: 'Education Level', required: false },
  { key: 'gender', label: 'Gender', required: false },
  { key: 'ethnicity', label: 'Race/Ethnicity', required: false },
  { key: 'priorJuryService', label: 'Prior Jury Service', required: false },
  { key: 'criminalConviction', label: 'Criminal Conviction', required: false },
  { key: 'phone', label: 'Phone Number', required: false },
  { key: 'email', label: 'Email', required: false },
];

