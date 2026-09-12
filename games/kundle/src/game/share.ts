import type { GuessResult, TileResult } from '../types';

function tileEmoji(tile: TileResult): string {
  const base = tile.status === 'green' ? '🟩' : tile.status === 'orange' ? '🟧' : '⬜';
  return tile.arrow ? `${base}${tile.arrow}` : base;
}

/** Builds the copy-to-clipboard share text. Never reveals the target's identity. */
export function buildShareText(guesses: GuessResult[], won: boolean): string {
  const lines = guesses.map((g) =>
    [tileEmoji(g.size), tileEmoji(g.sopraStaff), tileEmoji(g.clientSince), tileEmoji(g.location), tileEmoji(g.similarity), tileEmoji(g.footprint)].join(' '),
  );

  const header = won ? `Kundle\nSolved in ${guesses.length} guess${guesses.length === 1 ? '' : 'es'}` : `Kundle\n${guesses.length} guesses`;

  return `${header}\n\n${lines.join('\n')}\n\n#Kundle`;
}
