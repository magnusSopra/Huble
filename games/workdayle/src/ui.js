import { FLOORS, TITLES } from './content.js';
import { formatTime } from './run.js';

export const icons = {
  heart: '<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 4 1 9 8 14 7-5 12-10 8-14Z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
  cup: '<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm12 1h2a3 3 0 1 1 0 6h-2M7 2v3m5-3v3"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5ZM16 8a6 6 0 0 1 0 8m3-12a11 11 0 0 1 0 16"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V3h8v4M3 12c6 4 12 4 18 0m-9 0v5"/>',
  bath: '<path d="M5 3h5v7H5Zm-2 9h18a7 7 0 0 1-7 7v3H8v-4a7 7 0 0 1-5-6Z"/>',
};
export const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.star}</svg>`;

export class UI {
  constructor(app, actions) {
    this.actions = actions;
    app.innerHTML = `
      <header class="topbar">
        <a class="brand" href="#" aria-label="Workdayle home"><span class="brand-symbol">w.</span>workdayle<span class="brand-dot"></span></a>
        <div class="location"><span class="live-dot"></span> SOPRA STERIA <span class="location-divider">/</span> STAVANGER <span class="location-tag">OFFICE HOURS</span></div>
        <div class="run-clock" aria-label="Career completion timer"><span id="timer-label">TIME</span><strong id="run-time">00:00</strong><small id="best-time">PB --:--</small></div>
        <div class="top-actions"><a id="exit-huble" class="secondary compact-button" href="/" title="Back to Huble">Huble</a><button id="stats-toggle" class="secondary compact-button" aria-controls="sidebar" aria-expanded="true" title="Tab in the office / M anywhere">Hide stats</button><button id="test-menu" class="secondary compact-button" title="F2: developer test mode">Test mode</button><button id="sound" class="icon-button" aria-label="Mute audio">${icon('sound')}</button><button id="pause" class="icon-button" aria-label="Pause game">${icon('pause')}</button></div>
      </header>
      <aside id="sidebar" class="sidebar">
        <div class="eyebrow">EMPLOYEE DASHBOARD <span>01</span></div>
        <section class="employee">
          <div class="avatar"><span class="avatar-head"></span><span class="avatar-body"></span><span class="avatar-badge"></span></div>
          <div><span class="micro">PROBABLY BILLABLE</span><h2 id="job-title">Consultant</h2><span class="employee-id">Employee #0001 &nbsp; / &nbsp; You</span></div>
        </section>
        <section class="stats">
          ${this.stat('health', 'Health', 'heart')}
          ${this.stat('energy', 'Energy', 'bolt')}
          ${this.stat('bathroom', 'Bathroom need', 'bath')}
          <p id="bathroom-note" class="stat-note">All systems nominal. Suspicious.</p>
        </section>
        <section class="rep-card"><div class="rep-heading">${icon('star')} <span>YOUR REPUTATION</span></div><div class="rep-number"><strong id="rep-value">0</strong><span id="rep-goal">/ 100 REP</span></div><div class="rep-track"><i id="rep-bar"></i></div><p id="rep-hint">A little effort. A lot of visibility.</p></section>
        <div id="collection-count" class="micro">COLLECTIBLES: 0 / 24</div>
        <section class="career"><div class="eyebrow">THE CORPORATE LADDER</div>${TITLES.map((title, i) => `<div class="career-step" data-rank="${i}"><span class="step-dot">${i === TITLES.length - 1 ? icon('star') : String(i + 1).padStart(2, '0')}</span><span>${title}</span><span class="step-status"></span></div>`).join('')}</section>
        <div class="sidebar-bottom"><span class="live-dot"></span><span id="save-status">Progress saved locally</span><p>A career is just a side quest with rent.</p></div>
      </aside>
      <main class="game-ui">
        <div class="floor-heading"><span id="floor-number" class="floor-number">FLOOR 01</span><h1 id="floor-title">The delivery floor<span>.</span></h1><p id="floor-subtitle">Where the actual work happens.</p></div>
        <section id="objective" class="objective-card"><div class="objective-icon">${icon('briefcase')}</div><div><span class="micro">TODAY'S AMBITION</span><h3 id="objective-title">Make yourself useful.</h3><p id="objective-text">Find a colleague with a green marker.</p></div><span class="objective-index">01</span></section>
        <div id="hint" class="interaction-hint" hidden></div>
        <div class="office-directory">${icon('briefcase')}<strong>STAVANGER HQ</strong><span>FIND YOUR WAY. FOLLOW THE ROOM SIGNS.</span></div>
        <div class="office-bottom"><div class="controls"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>Move</span><kbd>E</kbd><span>Interact</span><kbd>SHIFT</kbd><span>Sprint</span></div><div class="floor-legend"><i></i> AVAILABLE TASK <span id="task-count">0 / 7 DONE</span></div></div>
      </main>
      <section id="combat-hud" hidden><div class="combat-top"><span id="review-label" class="micro">MANDATORY PERFORMANCE REVIEW</span><h2 id="boss-name"></h2><div class="boss-health"><i id="boss-bar"></i></div><span id="boss-hp"></span><div id="boss-phase" class="boss-phase"></div><div id="attack-callout" hidden></div></div><div id="hazard-warning" hidden></div><div class="crosshair">+</div><div class="combat-bottom"><div class="combat-player">${icon('heart')} <strong id="combat-hp">100</strong><span>HEALTH</span></div><div class="dodge-meter"><span id="dodge-label">DODGE READY</span><div><i id="dodge-bar"></i></div></div></div><div id="lock-hint">Click the arena to look with your mouse. Q / R also turn.</div></section>
      <div id="arena-radar-wrap" hidden><span>FLOOR SAFETY / YOU: GREEN</span><canvas id="arena-radar" width="160" height="160" aria-label="Arena map showing your position, boss and lethal floor hazards"></canvas></div>
      <div id="damage-overlay"></div><div id="transition-overlay"></div>
      <div id="bathroom-vignette" class="emergency-vignette" hidden></div>
      <div id="bathroom-emergency" class="emergency-banner" role="alert" hidden>BATHROOM EMERGENCY<strong id="emergency-count">20 SECONDS</strong><small id="emergency-line">GET TO THE BATHROOM.</small></div>
      <div id="test-mode-badge" class="test-mode-badge" hidden>TEST MODE / NO SAVES / NO PERSONAL BEST / F2 TOOLS</div>
      <section id="cinematic-layer" class="cinematic-layer" aria-label="Career cutscene" hidden><h1 id="cinematic-title"></h1><p id="cinematic-line" role="status"></p><nav><button id="pause-cinematic" class="secondary">Pause</button><button id="skip-cinematic" class="secondary">Skip cutscene</button></nav></section>
      <div id="toast" class="toast" role="status" hidden></div>
      <div id="modal-backdrop" class="modal-backdrop" hidden><section id="modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"></section></div>
      <div id="ending-layer" hidden></div>
      <section id="parade-layer" hidden aria-label="CEO celebration">
        <div class="parade-heading"><span class="micro">THE CORPORATE LADDER / TOP FLOOR</span><h1 id="parade-title"></h1></div>
        <p id="parade-line" role="status" aria-live="polite"></p>
        <small id="parade-audio" role="status"></small>
        <nav id="parade-controls" aria-label="Cinematic controls"><button id="parade-sound" class="secondary">Mute music</button><button id="parade-pause" class="secondary">Pause</button><button id="skip-parade" class="secondary">Enter my office</button></nav>
      </section>
    `;
    this.elements = Object.fromEntries([...app.querySelectorAll('[id]')].map(el => [el.id, el]));
    this.elements.sound.onclick = actions.sound;
    this.elements.pause.onclick = actions.pause;
    this.elements['parade-pause'].onclick = actions.pause;
    this.elements['parade-sound'].onclick = actions.sound;
    this.elements['stats-toggle'].onclick = actions.stats;
    this.elements['test-menu'].onclick = actions.testMode;
    this.elements['pause-cinematic'].onclick = actions.pause;
    app.querySelector('.brand').onclick = (event) => { event.preventDefault(); actions.pause(); };
    this.toastTime = 0;
    this.previousFocus = null;
    this.focusTrap = (event) => {
      const layer = !this.elements['ending-layer'].hidden ? this.elements['ending-layer']
        : !this.elements['modal-backdrop'].hidden ? this.elements.modal : null;
      if (event.key !== 'Tab' || !layer) return;
      const buttons = [...layer.querySelectorAll('button:not(:disabled), a, input, [tabindex="0"]')];
      if (!buttons.length) return;
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || !layer.contains(document.activeElement))) {
        last.focus(); event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === last) {
        first.focus(); event.preventDefault();
      }
    };
    document.addEventListener('keydown', this.focusTrap);
  }

  stat(id, label, symbol) {
    return `<div class="stat stat-${id}"><div class="stat-label">${icon(symbol)}<span>${label}</span><strong id="${id}-value">100</strong></div><div class="stat-track"><i id="${id}-bar"></i></div></div>`;
  }
  text(id, text) { if (this.elements[id].textContent !== String(text)) this.elements[id].textContent = text; }
  bar(id, percent) { this.elements[id].style.width = `${Math.max(0, Math.min(100, percent))}%`; }
  show(id, visible) { this.elements[id].hidden = !visible; }

  update(state, mode, dt) {
    this.text('run-time', formatTime(state.result?.time ?? state.elapsed));
    this.text('timer-label', state.complete ? 'FINAL TIME' : mode === 'paused' ? 'PAUSED' : 'TIME');
    this.text('job-title', state.title);
    this.text('collection-count', `COLLECTIBLES: ${state.collectibles?.size ?? 0} / 24`);
    for (const key of ['health', 'energy', 'bathroom']) {
      this.text(`${key}-value`, Math.round(state[key]));
      this.bar(`${key}-bar`, state[key]);
    }
    this.text('bathroom-note', state.bathroom > 75 ? 'An urgent internal matter. Find the WC.' : state.bathroom > 45 ? 'Your next meeting should be with a toilet.' : 'All systems nominal. Suspicious.');
    const floor = FLOORS[state.floor];
    this.text('rep-value', state.rep[state.floor]);
    this.text('rep-goal', `/ ${floor.threshold || '--'} REP`);
    this.bar('rep-bar', floor.threshold ? state.rep[state.floor] / floor.threshold * 100 : 100);
    this.text('rep-hint', state.bossReady ? 'Your performance review is unlocked.' : state.floor < state.rank ? 'This floor is under your management.' : 'A little effort. A lot of visibility.');
    this.text('task-count', `${floor.tasks.filter(t => state.isDone(t)).length} / ${floor.tasks.length} DONE`);
    document.querySelectorAll('.career-step').forEach(el => {
      const rank = Number(el.dataset.rank);
      el.classList.toggle('current', rank === state.rank);
      el.classList.toggle('done', rank < state.rank);
      el.querySelector('.step-status').textContent = rank === state.rank ? 'YOU' : rank < state.rank ? 'OK' : '';
    });
    if (this.toastTime > 0) {
      this.toastTime -= dt;
      if (this.toastTime <= 0) this.show('toast', false);
    }
    const combat = mode === 'combat' || mode === 'intro';
    document.body.classList.toggle('in-combat', combat);
    document.body.classList.toggle('in-ending', mode === 'ending' || mode === 'results');
    document.body.classList.toggle('in-parade', mode === 'parade' || mode === 'reveal');
    document.body.classList.toggle('in-cutscene', mode === 'cutscene');
    this.show('parade-layer', mode === 'parade' || mode === 'reveal');
    this.show('combat-hud', combat);
    this.show('arena-radar-wrap', combat);
  }

  floor(index) {
    this.text('floor-number', `FLOOR ${String(index + 1).padStart(2, '0')}`);
    this.elements['floor-title'].innerHTML = `${FLOORS[index].name}<span>.</span>`;
    this.text('floor-subtitle', FLOORS[index].subtitle);
  }

  radar(combat) {
    const context = this.elements['arena-radar'].getContext('2d');
    const point = value => 80 + value * 9;
    context.clearRect(0, 0, 160, 160);
    context.fillStyle = '#1a2c23';
    context.fillRect(10, 10, 140, 140);
    context.strokeStyle = '#7b8864';
    context.strokeRect(10, 10, 140, 140);
    for (const hazard of combat.hazards) {
      context.beginPath();
      context.arc(point(hazard.x), point(hazard.z), hazard.radius * 9 + 2, 0, Math.PI * 2);
      context.fillStyle = hazard.state === 'warning' ? '#cda35f' : '#050708';
      context.fill();
      context.strokeStyle = '#ffc56e';
      context.lineWidth = 2;
      context.stroke();
    }
    context.fillStyle = '#e1a178';
    context.fillRect(point(combat.boss.x) - 3, point(combat.boss.z) - 3, 6, 6);
    context.save();
    context.translate(point(combat.player.x), point(combat.player.z));
    context.rotate(-combat.player.yaw);
    context.beginPath();
    context.moveTo(0, -6);
    context.lineTo(4, 5);
    context.lineTo(-4, 5);
    context.closePath();
    context.fillStyle = '#d7f29d';
    context.fill();
    context.restore();
  }

  objective(title, description) {
    this.text('objective-title', title);
    this.text('objective-text', description);
  }

  hint(text) {
    this.show('hint', Boolean(text));
    if (text) this.elements.hint.innerHTML = `<kbd>E</kbd><span>${text}</span>`;
  }

  toast(message) {
    this.text('toast', message);
    this.show('toast', true);
    this.toastTime = 4;
  }

  modal(html, className = '') {
    if (this.elements['modal-backdrop'].hidden) this.previousFocus = document.activeElement;
    this.elements.modal.className = `modal ${className}`;
    this.elements.modal.innerHTML = html;
    this.show('modal-backdrop', true);
    this.elements.modal.querySelector('button')?.focus({ preventScroll: true });
    return this.elements.modal;
  }

  closeModal() {
    this.show('modal-backdrop', false);
    this.previousFocus?.focus({ preventScroll: true });
  }
}
