/**
 * Central configuration for all clue thresholds and classification rules.
 * Tune these during the hackathon without touching game logic or UI.
 */

/** Total number of guesses a player gets per day. */
export const MAX_GUESSES = 6;

export const SOPRA_STAFF_THRESHOLDS = {
  orangeMaxDifference: 5,
};

export interface SizeBand {
  id: number;
  label: string;
  min: number;
  max: number;
}

/** Company size bands. `max` is inclusive; use `Infinity` for the open-ended top band. */
export const SIZE_BANDS: SizeBand[] = [
  { id: 0, label: '1–49', min: 1, max: 49 },
  { id: 1, label: '50–249', min: 50, max: 249 },
  { id: 2, label: '250–999', min: 250, max: 999 },
  { id: 3, label: '1,000–4,999', min: 1000, max: 4999 },
  { id: 4, label: '5,000–9,999', min: 5000, max: 9999 },
  { id: 5, label: '10,000+', min: 10000, max: Infinity },
];

/** Client-since comparison thresholds, in years. */
export const CLIENT_SINCE_THRESHOLDS = {
  greenMaxYears: 0,
  orangeMaxYears: 6,
};

/** HQ distance comparison thresholds, in kilometres. */
export const LOCATION_THRESHOLDS_KM = {
  greenMaxKm: 0,
  orangeMaxKm: 1000,
};

/** Ordered scale used for the operating footprint clue, smallest to largest. */
export const FOOTPRINT_ORDER = [
  'Local',
  'Regional',
  'National',
  'International',
  'Global',
] as const;

/** Company similarity scoring weights and colour thresholds. */
export const SIMILARITY_CONFIG = {
  industryPoints: 2,
  ownershipPoints: 1,
  orientationPoints: 1,
  regulatoryPoints: 1,
  greenMinScore: 4,
  orangeMinScore: 2,
};

export const SIMILARITY_MAX_SCORE =
  SIMILARITY_CONFIG.industryPoints +
  SIMILARITY_CONFIG.ownershipPoints +
  SIMILARITY_CONFIG.orientationPoints +
  SIMILARITY_CONFIG.regulatoryPoints;
