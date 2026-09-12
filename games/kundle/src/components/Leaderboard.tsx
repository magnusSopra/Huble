import { useState } from 'react';
import { rankLeaderboard, type LeaderboardEntry } from '../game/leaderboard';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  today: string;
  currentEntryId: string;
  storageUnavailable: boolean;
}

export function Leaderboard({ entries, today, currentEntryId, storageUnavailable }: LeaderboardProps) {
  const [date, setDate] = useState(today);
  const dates = [...new Set([today, ...entries.map(entry => entry.date)])].sort().reverse();
  const ranked = rankLeaderboard(entries, date);

  return (
    <>
      <div className="leaderboard__heading">
        <div>
          <h2>Leaderboard</h2>
          <p>On this browser</p>
        </div>
        <label className="leaderboard__date">
          Puzzle date (UTC)
          <select value={date} onChange={(event) => setDate(event.target.value)}>
            {dates.map(value => <option key={value} value={value}>{value === today ? `Today - ${value}` : value}</option>)}
          </select>
        </label>
      </div>
      {storageUnavailable && <p role="alert">Browser storage is unavailable. Saved results cannot be loaded.</p>}
      {ranked.length === 0 ? (
        <div className="leaderboard__empty">
          <h3>No results yet</h3>
          <p>No names have been added for this puzzle.</p>
        </div>
      ) : (
        <div className="leaderboard__table-wrap" tabIndex={0} role="region" aria-label="Leaderboard results">
          <table className="leaderboard__table">
            <caption className="tile__label">Results for {date}, ranked by fewest guesses</caption>
            <thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Result</th></tr></thead>
            <tbody>
              {ranked.map(entry => (
                <tr key={entry.id} className={entry.id === currentEntryId ? 'leaderboard__current' : undefined}>
                  <td>{entry.rank ?? '-'}</td>
                  <th scope="row">{entry.name}{entry.id === currentEntryId && <span className="leaderboard__you">You</span>}</th>
                  <td>{entry.won ? `${entry.guesses} ${entry.guesses === 1 ? 'guess' : 'guesses'}` : 'Not solved'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}