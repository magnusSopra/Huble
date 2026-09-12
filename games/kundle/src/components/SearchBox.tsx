import { useMemo, useState } from 'react';
import type { Client } from '../types';

interface SearchBoxProps {
  clients: Client[];
  guessedIds: Set<string>;
  disabled: boolean;
  onGuess: (client: Client) => void;
}

export function SearchBox({ clients, guessedIds, disabled, onGuess }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return clients
      .filter((c) => {
        if (guessedIds.has(c.id)) return false;
        const nameMatch = c.name.toLowerCase().includes(q);
        const industryMatch = c.similarityIndustry.toLowerCase().includes(q);
        const tagMatch = c.tags?.some((t) => t.toLowerCase().includes(q));
        return nameMatch || industryMatch || tagMatch;
      })
      .slice(0, 8);
  }, [query, clients, guessedIds]);

  function selectClient(client: Client) {
    onGuess(client);
    setQuery('');
    setActiveIndex(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectClient(results[activeIndex]);
    }
  }

  return (
    <div className="search-box">
      <input
        type="text"
        className="search-box__input"
        placeholder={disabled ? 'Daily challenge complete' : 'Search for a client, industry, or tag…'}
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        aria-label="Search for a client to guess"
      />
      {results.length > 0 && (
        <ul className="search-box__results">
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className={`search-box__result ${i === activeIndex ? 'search-box__result--active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => selectClient(c)}
              >
                <span className="search-box__result-name">{c.name}</span>
                <span className="search-box__result-sub">
                  {c.similarityIndustry} {c.country ? `· ${c.country}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
