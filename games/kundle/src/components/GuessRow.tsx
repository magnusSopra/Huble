import type { GuessResult } from '../types';
import { Tile } from './Tile';
import { SimilarityTile } from './SimilarityTile';

interface GuessRowProps {
  guess: GuessResult;
}

export function GuessRow({ guess }: GuessRowProps) {
  return (
    <div className="guess-row">
      <div className="guess-row__name">{guess.client.name}</div>
      <div className="guess-row__tiles">
        <Tile label="Employees" tile={guess.size} index={0} />
        <Tile label="Sopra staff" tile={guess.sopraStaff} index={1} />
        <Tile label="Client since" tile={guess.clientSince} index={2} />
        <Tile label="HQ" tile={guess.location} index={3} location={guess.client.coordinateLocation ?? guess.client.headquarters} />
        <SimilarityTile tile={guess.similarity} index={4} />
        <Tile label="Footprint" tile={guess.footprint} index={5} />
      </div>
    </div>
  );
}
