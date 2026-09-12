export type Industry =
  | 'Financial services'
  | 'Energy & utilities'
  | 'Technology'
  | 'Telecommunications'
  | 'Healthcare & life sciences'
  | 'Retail & consumer'
  | 'Manufacturing'
  | 'Transport & logistics'
  | 'Public sector'
  | 'Professional services'
  | 'Construction & real estate'
  | 'Media & entertainment'
  | 'Agriculture & food'
  | 'Other';

export type Ownership =
  | 'Publicly listed'
  | 'Privately held'
  | 'State-owned enterprise'
  | 'Government agency'
  | 'Nonprofit / NGO';

export type CustomerOrientation =
  | 'B2B'
  | 'B2C / consumer-facing'
  | 'Public / citizen-facing';

export type OperatingScope = 'Domestic-only' | 'Multinational';

export type RegulatoryCharacter =
  | 'Heavily regulated / critical infrastructure'
  | 'Standard commercial / lightly regulated';

export type OperatingFootprint =
  | 'Local'
  | 'Regional'
  | 'National'
  | 'International'
  | 'Global';

export interface Client {
  id: string;
  name: string;
  headcount: number;
  headcountAccuracy: string;
  clientSince: number | null;
  customerSince: string | null;
  headquarters: string;
  latitude: number | null;
  longitude: number | null;
  coordinateAccuracy: 'city-centre' | 'unknown';
  coordinateSource: string | null;
  coordinateLocation?: string;
  coordinateLocationBasis?: 'office' | 'headquarters' | 'registered-office';
  coordinateLocationSource?: string;
  industry: string;
  sector: string;
  country: string;
  tags: string[];
  operatingFootprint: OperatingFootprint;
  consultantsCurrentlyHere: number | null;
  similarityIndustry: Industry;
  ownership: Ownership;
  customerOrientation: CustomerOrientation[];
  regulatoryCharacter: RegulatoryCharacter;
}

export type TileStatus = 'green' | 'orange' | 'grey';

export type Arrow = '↑' | '↗' | '→' | '↘' | '↓' | '↙' | '←' | '↖';

export interface TileResult {
  status: TileStatus;
  arrow?: Arrow;
  guessDisplay: string;
  explanation?: string;
}

export interface SimilarityBreakdownItem {
  label: string;
  value: string;
  matched: boolean;
  points: number;
  maxPoints: number;
}

export interface SimilarityTagItem {
  name: string;
  matched: boolean;
}

export interface SimilarityResult extends TileResult {
  score: number;
  maxScore: number;
  breakdown: SimilarityBreakdownItem[];
  tags: SimilarityTagItem[];
}

export interface GuessResult {
  client: Client;
  size: TileResult;
  sopraStaff: TileResult;
  clientSince: TileResult;
  location: TileResult;
  similarity: SimilarityResult;
  footprint: TileResult;
  isWinner: boolean;
}
