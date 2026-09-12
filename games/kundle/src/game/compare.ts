import type {
  Arrow,
  Client,
  SimilarityBreakdownItem,
  SimilarityResult,
  SimilarityTagItem,
  TileResult,
} from '../types';
import {
  CLIENT_SINCE_THRESHOLDS,
  FOOTPRINT_ORDER,
  LOCATION_THRESHOLDS_KM,
  SIMILARITY_CONFIG,
  SIMILARITY_MAX_SCORE,
  SIZE_BANDS,
  SOPRA_STAFF_THRESHOLDS,
} from './config';

/** Pure, side-effect-free game logic. Every function takes (guess, target) and returns a clue result. */

export function getSizeBandIndex(headcount: number): number {
  const band = SIZE_BANDS.find((b) => headcount >= b.min && headcount <= b.max);
  return band ? band.id : SIZE_BANDS[SIZE_BANDS.length - 1].id;
}

export function compareCompanySize(guess: Client, target: Client): TileResult {
  const guessBand = getSizeBandIndex(guess.headcount);
  const targetBand = getSizeBandIndex(target.headcount);
  const diff = Math.abs(guessBand - targetBand);
  const guessDisplay = guess.headcount.toLocaleString('en-US');

  if (guess.headcount === target.headcount) return { status: 'green', guessDisplay };
  return {
    status: diff <= 1 ? 'orange' : 'grey',
    arrow: target.headcount > guess.headcount ? '↑' : '↓',
    guessDisplay,
  };
}

export function compareSopraStaff(guess: Client, target: Client): TileResult {
  const guessCount = guess.consultantsCurrentlyHere;
  const targetCount = target.consultantsCurrentlyHere;
  const guessDisplay = guessCount === null ? 'Unknown' : guessCount.toLocaleString('en-US');
  if (guessCount === null || targetCount === null) {
    return { status: 'grey', guessDisplay, explanation: 'Sopra Steria staffing is unavailable for one of these clients.' };
  }
  const difference = Math.abs(guessCount - targetCount);
  if (difference === 0) return { status: 'green', guessDisplay };
  return {
    status: difference <= SOPRA_STAFF_THRESHOLDS.orangeMaxDifference ? 'orange' : 'grey',
    arrow: targetCount > guessCount ? '↑' : '↓',
    guessDisplay,
  };
}

export function compareClientSince(guess: Client, target: Client): TileResult {
  if (guess.clientSince === null || target.clientSince === null) {
    return {
      status: 'grey',
      guessDisplay: guess.clientSince === null ? 'Unknown' : String(guess.clientSince),
      explanation: 'A client-start date is missing, so this clue cannot be compared.',
    };
  }
  const diff = Math.abs(guess.clientSince - target.clientSince);
  const guessDisplay = String(guess.clientSince);

  if (diff <= CLIENT_SINCE_THRESHOLDS.greenMaxYears) return { status: 'green', guessDisplay };
  if (diff <= CLIENT_SINCE_THRESHOLDS.orangeMaxYears) {
    return { status: 'orange', arrow: target.clientSince > guess.clientSince ? '↑' : '↓', guessDisplay };
  }
  return { status: 'grey', arrow: target.clientSince > guess.clientSince ? '↑' : '↓', guessDisplay };
}

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const COMPASS_ARROWS: Arrow[] = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

/** Compass arrow pointing from (lat1, lon1) toward (lat2, lon2). */
export function bearingArrow(lat1: number, lon1: number, lat2: number, lon2: number): Arrow {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const bearingDeg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const index = Math.round(bearingDeg / 45) % 8;
  return COMPASS_ARROWS[index];
}

export function compareLocation(guess: Client, target: Client): TileResult {
  if (guess.latitude === null || guess.longitude === null || target.latitude === null || target.longitude === null) {
    return {
      status: 'grey',
      guessDisplay: 'Unknown',
      explanation: 'Coordinates are unresolved for one of these headquarters. Distance and direction cannot be compared.',
    };
  }
  const distanceKm = haversineDistanceKm(
    guess.latitude,
    guess.longitude,
    target.latitude,
    target.longitude,
  );
  const guessDisplay = distanceKm > 0 && distanceKm < 1 ? '<1 km' : `${Math.round(distanceKm)} km`;
  const usesOfficeLocation = [guess, target].some(client =>
    client.coordinateLocationBasis === 'office' || client.coordinateLocationBasis === 'registered-office',
  );
  const explanation = usesOfficeLocation
    ? 'Approximate city-centre distance. A sourced office or registered-office location substitutes for an unknown HQ. Coordinates: GeoNames (CC BY 4.0).'
    : 'Approximate distance between HQ city centres, not office addresses. Coordinates: GeoNames (CC BY 4.0).';

  if (distanceKm <= LOCATION_THRESHOLDS_KM.greenMaxKm) return { status: 'green', guessDisplay, explanation };
  if (distanceKm <= LOCATION_THRESHOLDS_KM.orangeMaxKm) {
    const arrow = bearingArrow(guess.latitude, guess.longitude, target.latitude, target.longitude);
    return { status: 'orange', arrow, guessDisplay, explanation };
  }
  return { status: 'grey', guessDisplay, explanation };
}

export function compareSimilarity(guess: Client, target: Client): SimilarityResult {
  const breakdown: SimilarityBreakdownItem[] = [];

  const industryMatch = guess.similarityIndustry === target.similarityIndustry;
  breakdown.push({
    label: 'Industry',
    value: guess.similarityIndustry,
    matched: industryMatch,
    points: industryMatch ? SIMILARITY_CONFIG.industryPoints : 0,
    maxPoints: SIMILARITY_CONFIG.industryPoints,
  });

  const ownershipMatch = guess.ownership === target.ownership;
  breakdown.push({
    label: 'Ownership',
    value: guess.ownership,
    matched: ownershipMatch,
    points: ownershipMatch ? SIMILARITY_CONFIG.ownershipPoints : 0,
    maxPoints: SIMILARITY_CONFIG.ownershipPoints,
  });

  const orientationMatch = guess.customerOrientation.some((orientation) =>
    target.customerOrientation.includes(orientation),
  );
  breakdown.push({
    label: 'Customer focus',
    value: guess.customerOrientation.join(', '),
    matched: orientationMatch,
    points: orientationMatch ? SIMILARITY_CONFIG.orientationPoints : 0,
    maxPoints: SIMILARITY_CONFIG.orientationPoints,
  });

  const regulatoryMatch = guess.regulatoryCharacter === target.regulatoryCharacter;
  breakdown.push({
    label: 'Regulation',
    value: guess.regulatoryCharacter,
    matched: regulatoryMatch,
    points: regulatoryMatch ? SIMILARITY_CONFIG.regulatoryPoints : 0,
    maxPoints: SIMILARITY_CONFIG.regulatoryPoints,
  });

  const targetTagSet = new Set((target.tags ?? []).map((t) => t.toLowerCase().trim()));
  const tags: SimilarityTagItem[] = (guess.tags ?? []).map((t) => ({
    name: t,
    matched: targetTagSet.has(t.toLowerCase().trim()),
  }));

  const score = breakdown.reduce((sum, item) => sum + item.points, 0);

  let status: TileResult['status'] = 'grey';
  if (score >= SIMILARITY_CONFIG.greenMinScore) status = 'green';
  else if (score >= SIMILARITY_CONFIG.orangeMinScore) status = 'orange';

  return {
    status,
    score,
    maxScore: SIMILARITY_MAX_SCORE,
    breakdown,
    tags,
    guessDisplay: `${score}/${SIMILARITY_MAX_SCORE}`,
  };
}

export function compareOperatingFootprint(guess: Client, target: Client): TileResult {
  const guessIndex = FOOTPRINT_ORDER.indexOf(guess.operatingFootprint);
  const targetIndex = FOOTPRINT_ORDER.indexOf(target.operatingFootprint);
  const diff = Math.abs(guessIndex - targetIndex);
  const guessDisplay = guess.operatingFootprint;

  if (diff === 0) return { status: 'green', guessDisplay };
  if (diff === 1) {
    return { status: 'orange', arrow: targetIndex > guessIndex ? '↑' : '↓', guessDisplay };
  }
  return { status: 'grey', arrow: targetIndex > guessIndex ? '↑' : '↓', guessDisplay };
}

export function compareGuess(guess: Client, target: Client) {
  return {
    client: guess,
    size: compareCompanySize(guess, target),
    sopraStaff: compareSopraStaff(guess, target),
    clientSince: compareClientSince(guess, target),
    location: compareLocation(guess, target),
    similarity: compareSimilarity(guess, target),
    footprint: compareOperatingFootprint(guess, target),
    isWinner: guess.id === target.id,
  };
}
