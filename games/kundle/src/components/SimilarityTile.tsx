import { useEffect, useId, useRef, useState } from 'react';
import type { SimilarityResult } from '../types';

interface SimilarityTileProps {
  tile: SimilarityResult;
  index: number;
}

export function SimilarityTile({ tile, index }: SimilarityTileProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const detailsId = useId();

  useEffect(() => {
    if (!expanded) return;
    function dismissOutside(event: Event) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setExpanded(false);
      }
    }
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
    };
  }, [expanded]);

  return (
    <div
      ref={containerRef}
      className={`tile-slot${expanded ? ' tile-slot--expanded' : ''}`}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setExpanded(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') setExpanded(false);
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(':focus-visible')) setExpanded(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
      }}
      role="group"
      aria-label={`Similarity ${tile.guessDisplay}: details`}
      aria-describedby={expanded ? detailsId : undefined}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setExpanded(false);
      }}
    >
      <div className="tile-slot__flipper" style={{ animationDelay: `${index * 500}ms` }}>
        <div className="tile-slot__face tile-slot__face--front" />
        <div className={`tile-slot__face tile-slot__face--back tile tile--${tile.status}`}>
          <span className="tile__label">Similarity</span>
          <span className="tile__value">{tile.guessDisplay}</span>
        </div>
      </div>
      {expanded && (
        <div id={detailsId} role="tooltip" className="similarity-detail">
          <div className="similarity-detail__header">
            <span className="similarity-detail__title">Similarity clues</span>
            <span className={`similarity-detail__badge similarity-detail__badge--${tile.status}`}>
              {tile.score}/{tile.maxScore} pts
            </span>
          </div>
          <ul className="similarity-detail__list">
            {tile.breakdown.map((item) => (
              <li
                key={item.label}
                className={`similarity-detail__item ${item.matched ? 'similarity-detail__item--match' : 'similarity-detail__item--miss'}`}
              >
                <div className="similarity-detail__item-info">
                  <span className="similarity-detail__icon" aria-hidden="true">
                    {item.matched ? '✓' : '✕'}
                  </span>
                  <div className="similarity-detail__text">
                    <span className="similarity-detail__label">{item.label}</span>
                    <span className="similarity-detail__value">{item.value}</span>
                  </div>
                </div>
                <span className="similarity-detail__points">
                  {item.matched ? `+${item.points}` : '+0'}
                </span>
              </li>
            ))}
          </ul>
          {tile.tags && tile.tags.length > 0 && (
            <div className="similarity-detail__tags-section">
              <span className="similarity-detail__tags-title">Tags</span>
              <div className="similarity-detail__tags-list">
                {tile.tags.map((tag) => (
                  <span
                    key={tag.name}
                    className={`similarity-tag ${tag.matched ? 'similarity-tag--match' : ''}`}
                    title={tag.matched ? 'Tag matches target client' : undefined}
                  >
                    {tag.matched ? '✓ ' : ''}#{tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="similarity-detail__footer">
            <span className="similarity-detail__legend-pill">
              <i className="similarity-legend-dot similarity-legend-dot--green" /> Target match
            </span>
            <span className="similarity-detail__legend-pill">
              <i className="similarity-legend-dot similarity-legend-dot--grey" /> No match
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

