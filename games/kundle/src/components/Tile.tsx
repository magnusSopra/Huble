import { ArrowUp } from 'lucide-react';
import type { Arrow, TileResult } from '../types';

const ARROW_DIRECTIONS: Record<Arrow, { rotation: number; label: string }> = {
  '↑': { rotation: 0, label: 'Up' },
  '↗': { rotation: 45, label: 'Northeast' },
  '→': { rotation: 90, label: 'East' },
  '↘': { rotation: 135, label: 'Southeast' },
  '↓': { rotation: 180, label: 'Down' },
  '↙': { rotation: 225, label: 'Southwest' },
  '←': { rotation: 270, label: 'West' },
  '↖': { rotation: 315, label: 'Northwest' },
};

interface TileProps {
  label: string;
  tile: TileResult;
  index: number;
  location?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function Tile({ label, tile, index, location, children, onClick }: TileProps) {
  return (
    <div
      className={`tile-slot ${onClick ? 'tile-slot--clickable' : ''}`}
      title={location ? `${location}. ${tile.explanation ?? ''}` : tile.explanation}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="tile-slot__flipper" style={{ animationDelay: `${index * 500}ms` }}>
        <div className="tile-slot__face tile-slot__face--front" />
        <div className={`tile-slot__face tile-slot__face--back tile tile--${tile.status}${location ? ' tile--location' : ''}`}>
          <span className="tile__label">{label}</span>
          {location && <span className="tile__location-name" title={location}>{location.split(',')[0]}</span>}
          <span className={`tile__value${label === 'HQ' ? ' tile__value--location' : ''}`}>
            {tile.guessDisplay}
            {tile.arrow && (
              <ArrowUp
                className="tile__arrow"
                size={18}
                strokeWidth={2.5}
                style={{ transform: `rotate(${ARROW_DIRECTIONS[tile.arrow].rotation}deg)` }}
                role="img"
                aria-label={ARROW_DIRECTIONS[tile.arrow].label}
              />
            )}
          </span>
          {children}
        </div>
      </div>
    </div>
  );
}

