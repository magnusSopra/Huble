import type { GuessResult } from '../types';
import { GuessRow } from './GuessRow';
import { EmptyGuessRow } from './EmptyGuessRow';

interface GuessGridProps {
  guesses: GuessResult[];
  maxGuesses: number;
}

export function GuessGrid({ guesses, maxGuesses }: GuessGridProps) {
  // First guess stays on top; each new guess is appended below it.
  const remaining = Math.max(0, maxGuesses - guesses.length);

  return (
    <div className="guess-grid">
      <div className="guess-grid__header">
        <span className="guess-grid__header-name">Guess</span>
        <div className="guess-grid__header-tiles">
          <span>Employees</span>
          <span>Sopra staff</span>
          <span>Since</span>
          <span>HQ</span>
          <span>Similarity</span>
          <span>Footprint</span>
        </div>
      </div>
      {guesses.map((g) => (
        <GuessRow key={g.client.id} guess={g} />
      ))}
      {Array.from({ length: remaining }).map((_, i) => (
        <EmptyGuessRow key={`empty-${i}`} />
      ))}
    </div>
  );
}

