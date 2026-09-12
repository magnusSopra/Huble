interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>How to play</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p>Guess the target client. Each guess reveals six clues comparing your guess to today's client.</p>

        <ul className="modal__legend">
          <li><span className="legend-swatch legend-swatch--green" /> Match</li>
          <li><span className="legend-swatch legend-swatch--orange" /> Close, with a direction</li>
          <li><span className="legend-swatch legend-swatch--grey" /> Far away</li>
        </ul>

        <dl className="modal__clues">
          <dt>Employees</dt>
          <dd>Total company headcount from the supplied data, which includes estimates. Exact counts are green, different counts in the same or adjacent size bands orange, and farther bands grey. Up means the target is larger, down means smaller.</dd>
          <dt>Sopra staff</dt>
          <dd>Sopra Steria consultants currently assigned to the client. Exact counts are green, within five is orange, otherwise grey. Arrows show whether the target has more or fewer consultants. Zero is a valid count.</dd>
          <dt>Client since</dt>
          <dd>Year of the earliest recorded project in the supplied data. Green means the exact year. On orange and grey tiles, up means later and down means earlier. Missing dates cannot be compared.</dd>
          <dt>HQ</dt>
          <dd>Approximate distance between HQ city centres; a sourced office or registered-office city is used for some missing HQs. Zero km is green, up to 1,000 km orange with a direction, and farther grey. Unresolved locations show Unknown. Coordinates from <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>, under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.</dd>
          <dt>Similarity</dt>
          <dd>Matching industry scores 2 points. Matching ownership structure, a shared customer focus, and matching regulatory character each score 1 (maximum 5 points). Hover or focus to inspect the company's industry, ownership, regulation, customer orientation, tags, and colour-coded match indicators.</dd>
          <dt>Footprint</dt>
          <dd>Local → Regional → National → International → Global. Arrow shows bigger or smaller.</dd>
        </dl>
      </div>
    </div>
  );
}
