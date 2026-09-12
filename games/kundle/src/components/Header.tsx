import { useEffect, useState } from 'react';
import { Moon, RefreshCw, Sun } from 'lucide-react';

interface HeaderProps {
  onHelpClick: () => void;
  onRefreshClick: () => void;
}

export function Header({ onHelpClick, onRefreshClick }: HeaderProps) {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  const [followSystem, setFollowSystem] = useState(() => {
    try {
      const saved = localStorage.getItem('kundle.theme');
      return saved !== 'light' && saved !== 'dark';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  useEffect(() => {
    if (!followSystem) return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [followSystem]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    setFollowSystem(false);
    try {
      localStorage.setItem('kundle.theme', next ? 'dark' : 'light');
    } catch {
      return;
    }
  }

  const themeLabel = dark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <header className="app-header">
      <div className="app-header__titles">
        <h1 className="app-header__title">KUNDLE</h1>
      </div>
      <button
        type="button"
        className="app-header__help app-header__refresh"
        onClick={onRefreshClick}
        aria-label="New random customer"
        title="New random customer"
      >
        <RefreshCw size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="app-header__help app-header__theme"
        onClick={toggleTheme}
        aria-label={themeLabel}
        title={themeLabel}
      >
        {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      </button>
      <button
        type="button"
        className="app-header__help"
        onClick={onHelpClick}
        aria-label="How to play"
        title="How to play"
      >
        ?
      </button>
    </header>
  );
}
