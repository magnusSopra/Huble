import { MAX_GUESSES } from './config';

export interface LeaderboardEntry {
  id: string;
  date: string;
  name: string;
  guesses: number;
  won: boolean;
}

export const LEADERBOARD_KEY = 'kundle.leaderboard.v1';
export const MAX_NAME_LENGTH = 40;

function isEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<LeaderboardEntry>;
  return typeof entry.id === 'string' && entry.id.length > 0 &&
    typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
    typeof entry.name === 'string' && entry.name.trim().length > 0 &&
    entry.name.length <= MAX_NAME_LENGTH &&
    typeof entry.guesses === 'number' && Number.isInteger(entry.guesses) &&
    entry.guesses >= 1 && entry.guesses <= MAX_GUESSES &&
    typeof entry.won === 'boolean' && (entry.won || entry.guesses === MAX_GUESSES);
}

export function readLeaderboard(storage: Pick<Storage, 'getItem'>): LeaderboardEntry[] {
  const raw = storage.getItem(LEADERBOARD_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

export function saveLeaderboardEntry(storage: Pick<Storage, 'getItem' | 'setItem'>, entry: LeaderboardEntry) {
  const normalized = { ...entry, name: entry.name.trim() };
  if (!isEntry(normalized)) throw new Error('Invalid leaderboard entry');
  const entries = readLeaderboard(storage).filter(existing => existing.id !== entry.id);
  entries.push(normalized);
  storage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  return entries;
}

export function rankLeaderboard(entries: LeaderboardEntry[], date: string) {
  const ordered = entries.filter(entry => entry.date === date).sort((first, second) =>
    Number(second.won) - Number(first.won) || first.guesses - second.guesses ||
    first.name.localeCompare(second.name),
  );
  return ordered.map(entry => ({
    ...entry,
    rank: entry.won ? 1 + ordered.filter(other => other.won && other.guesses < entry.guesses).length : null,
  }));
}