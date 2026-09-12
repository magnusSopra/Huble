export function EmptyGuessRow() {
  return (
    <div className="guess-row guess-row--empty">
      <div className="guess-row__name" />
      <div className="guess-row__tiles">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="tile-slot tile-slot--empty" />
        ))}
      </div>
    </div>
  );
}
