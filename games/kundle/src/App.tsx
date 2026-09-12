import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_CLIENTS, ELIGIBLE_TARGET_CLIENTS } from './data/clients';
import { getDailyTarget, getRandomTarget } from './game/dailyTarget';
import { compareGuess } from './game/compare';
import { MAX_GUESSES } from './game/config';
import type { Client, GuessResult } from './types';
import { Header } from './components/Header';
import { SearchBox } from './components/SearchBox';
import { GuessGrid } from './components/GuessGrid';
import { WinBanner } from './components/WinBanner';
import { LoseBanner } from './components/LoseBanner';
import { HelpModal } from './components/HelpModal';
import { Leaderboard } from './components/Leaderboard';
import { NamePrompt } from './components/NamePrompt';
import { readLeaderboard, saveLeaderboardEntry } from './game/leaderboard';
import './App.css';

function App() {
  const [gameDate] = useState(() => new Date());
  const dateKey = gameDate.toISOString().slice(0, 10);
  const [target, setTarget] = useState<Client>(() => getDailyTarget(ELIGIBLE_TARGET_CLIENTS, gameDate));
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [view, setView] = useState<'puzzle' | 'leaderboard'>('puzzle');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [entryId, setEntryId] = useState(() => crypto.randomUUID());
  const puzzleButtonRef = useRef<HTMLButtonElement>(null);
  const [leaderboard, setLeaderboard] = useState(() => {
    try {
      return { entries: readLeaderboard(localStorage), unavailable: false };
    } catch {
      return { entries: [], unavailable: true };
    }
  });

  const [demoAnswer, setDemoAnswer] = useState<string | null>(null);

  const won = guesses.some((g) => g.isWinner);
  const lost = !won && guesses.length >= MAX_GUESSES;
  const gameOver = won || lost;
  const guessedIds = useMemo(() => new Set(guesses.map((g) => g.client.id)), [guesses]);

  useEffect(() => {
    if (!gameOver) return;
    const timer = setTimeout(() => {
      setResultReady(true);
      setShowNamePrompt(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [gameOver]);

  useEffect(() => {
    if (!demoAnswer) return;
    const timer = setTimeout(() => {
      setDemoAnswer(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [demoAnswer]);

  function dismissNamePrompt() {
    setShowNamePrompt(false);
    requestAnimationFrame(() => puzzleButtonRef.current?.focus());
  }

  function saveName(name: string) {
    if (!gameOver || saved) return;
    const entries = saveLeaderboardEntry(localStorage, {
      id: entryId, date: dateKey, name, guesses: guesses.length, won,
    });
    setLeaderboard({ entries, unavailable: false });
    setSaved(true);
    dismissNamePrompt();
  }

  function handleRefresh() {
    const nextTarget = getRandomTarget(ELIGIBLE_TARGET_CLIENTS, target);
    setTarget(nextTarget);
    setDemoAnswer(nextTarget.name);
    console.info(`[Demo Answer]: ${nextTarget.name}`);
    setGuesses([]);
    setResultReady(false);
    setSaved(false);
    setShowNamePrompt(false);
    setEntryId(crypto.randomUUID());
    setView('puzzle');
  }

  function handleGuess(client: Client) {
    if (gameOver || guessedIds.has(client.id)) return;
    const result = compareGuess(client, target);
    setGuesses((prev) => [...prev, result]);
  }

  return (
    <div className="app">
      <Header onHelpClick={() => setShowHelp(true)} onRefreshClick={handleRefresh} />

      <nav className="app-nav" aria-label="Main navigation">
        <button ref={puzzleButtonRef} type="button" aria-current={view === 'puzzle' ? 'page' : undefined} onClick={() => setView('puzzle')}>Puzzle</button>
        <button type="button" aria-current={view === 'leaderboard' ? 'page' : undefined} onClick={() => setView('leaderboard')}>Leaderboard</button>
      </nav>

      <main className="app-main" hidden={view !== 'puzzle'}>
        {demoAnswer && (
          <div className="demo-banner" role="status">
            <span className="demo-banner__label">Demo Mode:</span> Next answer is <strong>{demoAnswer}</strong>
          </div>
        )}

        {!gameOver && (
          <SearchBox
            clients={ALL_CLIENTS}
            guessedIds={guessedIds}
            disabled={false}
            onGuess={handleGuess}
          />
        )}

        {won && <WinBanner targetName={target.name} />}
        {lost && <LoseBanner targetName={target.name} />}
        {resultReady && (
          <div className="result-registration">
            {saved ? <span role="status">Added to leaderboard</span> : (
              <button type="button" className="text-button" onClick={() => setShowNamePrompt(true)}>Add name to leaderboard</button>
            )}
          </div>
        )}

        <GuessGrid guesses={guesses} maxGuesses={MAX_GUESSES} />

        <div className="legend">
          <span><i className="legend-swatch legend-swatch--green" /> Match</span>
          <span><i className="legend-swatch legend-swatch--orange" /> Close + direction</span>
          <span><i className="legend-swatch legend-swatch--grey" /> Far</span>
        </div>
      </main>

      <main className="app-main leaderboard" hidden={view !== 'leaderboard'}>
        <Leaderboard entries={leaderboard.entries} today={dateKey} currentEntryId={entryId} storageUnavailable={leaderboard.unavailable} />
      </main>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showNamePrompt && view === 'puzzle' && <NamePrompt onDismiss={dismissNamePrompt} onSave={saveName} />}
    </div>
  );
}

export default App;

