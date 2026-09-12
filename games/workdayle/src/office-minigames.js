const config = (label, duration, total, instructions, keys = 'Tab to move · Enter to choose') => ({ label, duration, total, instructions, keys });

export const OFFICE_GAMES = Object.freeze({
  cables: config('A connection that works', 20, 4, 'Choose a cable, then its matching socket. Match both the name and the symbol — not just the color.'),
  swipe: config('Access, not excess', 20, 2, 'Swipe left to right in 0.8–1.8 seconds. Get two clean reads. Or hold Space for that long, then release.', 'Drag card · or hold and release Space'),
  upload: config('Please stay connected', 20, 100, 'Keep the upload moving. Reconnect when the link drops; the second drop also needs channel 60.', 'Tab to controls · arrows tune the channel'),
  calibrate: config('Within acceptable margins', 20, 3, 'Stop each of the three gauges inside its lime target. A miss only costs a moment; try that gauge again.'),
  empty: config('A clean digital slate', 15, 100, 'Hold the shred button for five seconds total to empty the trash. Releasing pauses the shredder.', 'Hold button · or hold Space'),
  reset: config('Reset, remember, repeat', 18, 4, 'Remember the four-symbol reset sequence. Then press the matching buttons in order. Peek again if needed.'),
  cv: config('A résumé, not a fantasy', 20, 4, 'Fix all four résumé fields to match the hiring brief. Select a wrong field, then its accurate replacement.'),
  timesheet: config('An honest week’s work', 20, 5, 'Enter the hours from the work notes into all five daily fields. Half-hours use .5. Then submit.'),
  schedule: config('A meeting that fits', 20, 3, 'Invite exactly Nora and Aksel. Choose a time when both are free, and an available room. Read the calendar first.'),
  approve: config('Trust, then check', 20, 3, 'Review three timesheets. Approve only when the claimed total matches the five daily entries. Otherwise reject.'),
  rename: config('Final. Actually final.', 18, 2, 'Choose the filename that exactly matches each brief. Use lowercase names, underscores, and YYYY-MM-DD.'),
  desktop: config('Everything in its place', 20, 4, 'Put four files in the correct folders. Drag a file, or select it and then choose its destination.'),
  sortmail: config('An inbox with boundaries', 20, 4, 'Sort four messages into Important, Spam, Client, or Internal. Drag, or select a message and then its category.'),
  spreadsheet: config('The numbers should add up', 20, 2, 'Fix two spreadsheet formulas. Select the cell named in the audit note, then choose the matching formula.'),
  requirement: config('Make “better” measurable', 20, 3, 'Turn three vague requests into useful requirements. Choose the question that matches the clarification hint.'),
});

export const NEW_TYPES = Object.freeze(Object.keys(OFFICE_GAMES));

const html = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const note = (label, text) => `<p class="mg-note"><span>${html(label)}</span>${html(text)}</p>`;
const button = (action, label, value = '', extra = '') => `<button type="button" class="mg-choice" data-action="${action}" data-value="${html(value)}" ${extra}>${label}</button>`;
const primary = (action, label, extra = '') => `<button type="button" class="mg-button mg-primary mg-wide" data-action="${action}" ${extra}>${label}</button>`;
const WIRES = [
  { name: 'Amber', symbol: '▲', color: 'amber' },
  { name: 'Blue', symbol: '●', color: 'blue' },
  { name: 'Violet', symbol: '◆', color: 'violet' },
  { name: 'Green', symbol: '■', color: 'green' },
];
const SYMBOLS = ['Shield', 'Cloud', 'Key', 'Check'];
const MARKS = ['◇', '☁', '⚿', '✓'];
const RESET_CODE = [2, 0, 3, 1];
const CV = [
  { label: 'Title', wrong: 'Coffee whisperer', right: 'Data analyst', decoy: 'Chief synergy officer' },
  { label: 'Skill', wrong: 'Spreadsheet telepathy', right: 'SQL', decoy: 'Mind reading' },
  { label: 'Dates', wrong: '2028–2025', right: '2023–2025', decoy: '2025–2023' },
  { label: 'Summary', wrong: 'Did some stuff', right: 'Built weekly reports', decoy: 'Was generally around' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const HOURS = [8, 8, 7.5, 8, 6];
const APPROVALS = [
  { name: 'Magnus', hours: HOURS, claimed: 40 },
  { name: 'Ingrid', hours: [8, 8, 8, 8, 6], claimed: 38 },
  { name: 'Eirik', hours: [7, 7, 7, 7, 7], claimed: 35 },
];
const FILES = [
  { label: 'weekly-report.pdf', detail: 'Report · PDF document', destination: 'Reports' },
  { label: 'budget.xlsx', detail: 'Finance · workbook', destination: 'Finance' },
  { label: 'team-photo.png', detail: 'Media · image', destination: 'Media' },
  { label: 'research-notes.pdf', detail: 'Report · PDF document', destination: 'Reports' },
];
const MAIL = [
  { label: 'Service outage — act today', detail: 'Operations · urgent action required', destination: 'Important' },
  { label: 'You won a million free yachts!', detail: 'Unknown sender · unsolicited prize', destination: 'Spam' },
  { label: 'Fjord project feedback', detail: 'Fjord client · external project contact', destination: 'Client' },
  { label: 'Friday lunch in the kitchen', detail: 'People team · internal announcement', destination: 'Internal' },
];
const REQUIREMENTS = [
  { request: '“Make the dashboard faster.”', hint: 'Ask for a measurable speed target.', answers: ['Which load time should we aim for?', 'Would a racing stripe help?', 'Should we call it Turbo Dashboard?'], correct: 0 },
  { request: '“Everyone needs access.”', hint: 'Clarify which users need which permissions.', answers: ['Should we share one password?', 'Which roles need to view or edit it?', 'Shall we make the database public?'], correct: 1 },
  { request: '“We need it ASAP.”', hint: 'Agree a date and the minimum useful scope.', answers: ['Is ASAP before or after lunch?', 'Can we rename tomorrow to yesterday?', 'What date and must-have features should we agree?'], correct: 2 },
];
const RENAMES = [
  { original: 'Report FINAL final2.pdf', brief: 'Client fjord · kind report · date 2026-09-11 · PDF', answers: ['fjord_report_2026-09-11.pdf', 'Fjord_Report_11-09-2026.pdf', 'fjord-report-final.pdf'], correct: 0 },
  { original: 'Budget (copy) USE THIS.xlsx', brief: 'Client nova · kind budget · date 2026-09-12 · XLSX', answers: ['nova_budget_12-09-2026.xlsx', 'nova_budget_2026-09-12.xlsx', 'nova_budget_2026-09-12.pdf'], correct: 1 },
];

// The factory shares the original MiniGame lifecycle without a circular import.
export function createOfficeMiniGame(BaseMiniGame) {
  return class OfficeMiniGame extends BaseMiniGame {
    constructor(container, task, callbacks) {
      super(container, task, callbacks);
      this.inputListeners = [];
      this.holding = false;
      this.pointerId = null;
      this.heldTarget = null;
      this.dragged = null;
      for (const [name, handler] of [
        ['pointerdown', (event) => this.pointerDown(event)],
        ['pointermove', (event) => this.pointerMove(event)],
        ['pointerup', (event) => this.pointerUp(event)],
        ['pointercancel', () => { if (this.holding) this.stopInput(); }],
        ['lostpointercapture', () => { if (this.holding) this.stopInput(); }],
        ['keyup', (event) => this.keyUp(event)],
        ['focusout', (event) => { if (event.target === this.heldTarget) this.stopInput(); }],
        ['input', (event) => this.editInput(event)],
        ['change', (event) => this.editInput(event)],
        ['dragstart', (event) => this.dragStart(event)],
        ['dragend', () => { this.dragged = null; this.root.classList.remove('mg-dragging'); }],
        ['dragover', (event) => { if (this.dragged !== null && event.target.closest('[data-action="destination"]')) event.preventDefault(); }],
        ['drop', (event) => this.drop(event)],
      ]) {
        this.root.addEventListener(name, handler);
        this.inputListeners.push([name, handler]);
      }
    }

    showReady() {
      this.root.classList.add('mg-office');
      const symbols = { cables: '⌁', swipe: '↔', upload: '↑', calibrate: '≋', empty: '▥', reset: '↻', cv: 'Aa', timesheet: '37.5', schedule: '10:00', approve: '✓ / ×', rename: '.pdf', desktop: '▱', sortmail: '✉', spreadsheet: '=Σ', requirement: '?' };
      this.stage.innerHTML = `<div class="mg-ready"><div class="mg-office-emblem mg-emblem-${this.task.type}" aria-hidden="true">${symbols[this.task.type]}</div><p class="mg-ready-caption">${html(this.task.description || this.config.instructions)}</p>${primary('start', 'Ready when you are <span aria-hidden="true">→</span>')}<span class="mg-ready-duration">${this.config.duration} seconds · timer starts after you’re ready</span></div>`;
      this.focus('[data-action="start"]');
    }

    start() {
      if (this.disposed || this.settled || !['ready', 'failed'].includes(this.state)) return;
      this.stopInput();
      this.selected = null;
      this.finished = new Set();
      this.gauges = new Set();
      this.holding = false;
      this.holdSeconds = 0;
      this.swipeDistance = 0;
      this.swipeSeconds = 0;
      this.connected = true;
      this.uploadStops = 0;
      this.channel = 35;
      this.revealed = true;
      this.revealUntil = 3.2;
      this.cvField = null;
      this.hours = ['', '', '', '', ''];
      this.participants = new Set();
      this.slot = null;
      this.room = null;
      this.showTotal = false;
      this.cell = null;
      super.start();
    }

    renderGame() {
      const renders = {
        cables: 'renderCables', swipe: 'renderSwipe', upload: 'renderUpload', calibrate: 'renderGauges',
        empty: 'renderShredder', reset: 'renderReset', cv: 'renderCV', timesheet: 'renderTimesheet',
        schedule: 'renderSchedule', approve: 'renderApproval', rename: 'renderRename',
        desktop: 'renderSorting', sortmail: 'renderSorting', spreadsheet: 'renderSheet', requirement: 'renderRequirement',
      };
      this[renders[this.task.type]]();
      this.focusGame();
    }

    focusGame() {
      this.focus('.mg-stage input:not(:disabled), .mg-stage button:not(:disabled)');
    }

    refresh() {
      if (this.state !== 'playing' || this.disposed) return;
      this.renderGame();
      this.syncReadouts();
    }

    renderCables() {
      const wire = (index, socket) => {
        const item = WIRES[index], done = this.finished.has(index);
        return `<button type="button" class="mg-wire mg-wire-${item.color} ${done ? 'mg-wire-done' : ''}" data-action="${socket ? 'socket' : 'wire'}" data-value="${index}" ${done ? 'disabled' : ''} ${!socket ? `aria-pressed="${this.selected === index}"` : ''}><span class="mg-wire-symbol" aria-hidden="true">${item.symbol}</span><span>${item.name} ${socket ? 'socket' : 'cable'}</span><span class="mg-wire-end" aria-hidden="true">${done ? '✓' : socket ? '○' : '—'}</span></button>`;
      };
      this.stage.innerHTML = `<div class="mg-patchboard"><div class="mg-patch-labels"><span>CABLES</span><span>SOCKETS</span></div><div class="mg-patch-columns"><div>${WIRES.map((_, i) => wire(i, false)).join('')}</div><div>${[2, 0, 3, 1].map(i => wire(i, true)).join('')}</div></div></div>${note('MATCH THE LABELS & SYMBOLS', 'Amber triangle · Blue circle · Violet diamond · Green square')}`;
      this.setFeedback(this.selected === null ? 'Select a cable on the left, then its matching socket.' : `${WIRES[this.selected].name} selected. Find its matching socket.`);
    }

    renderSwipe() {
      this.stage.innerHTML = `<div class="mg-reader"><div class="mg-reader-top"><span>EMPLOYEE ACCESS</span><span>${this.progress} / 2 READS</span></div><div class="mg-reader-track"><span class="mg-reader-guide">START → → → FINISH</span><button type="button" class="mg-access-card" data-action="swipe-hold" aria-label="Access card. Drag right in 0.8 to 1.8 seconds, or hold Space then release."><span class="mg-card-chip" aria-hidden="true"></span><strong>WORKDAYLE</strong><span>AUTHORIZED HUMAN</span></button></div><div class="mg-swipe-meter"><span class="mg-swipe-speed">Ready for a steady swipe</span><output class="mg-swipe-time">0.00s</output></div></div>${note('TARGET: 0.8–1.8 SECONDS', 'Drag all the way to the right. Keyboard: focus the card, hold Space, release when the readout says “Release now”.')}`;
      this.setFeedback('Two clean reads. Quick enough for security, slow enough for technology.');
    }

    renderUpload() {
      this.stage.innerHTML = `<div class="mg-transfer"><div class="mg-transfer-nodes"><span class="mg-transfer-computer">▣<small>YOUR DESK</small></span><span class="mg-transfer-link ${this.connected ? '' : 'mg-link-off'}">${this.connected ? '→ → →' : '× × ×'}</span><span class="mg-transfer-cloud">☁<small>TEAM DRIVE</small></span></div><strong class="mg-transfer-status">${this.connected ? 'Uploading the final_final.zip' : 'Connection lost. Your progress is safe.'}</strong><div class="mg-office-meter"><span class="mg-upload-fill" style="transform:scaleX(${this.progress / 100})"></span></div><output class="mg-upload-percent">${Math.floor(this.progress)}%</output></div>${!this.connected ? `${this.uploadStops === 2 ? `<label class="mg-range-label">Channel <output class="mg-channel-value">${this.channel}</output> <span>Target: 60 (55–65 accepted)</span><input type="range" min="0" max="100" value="${this.channel}" data-input="channel" aria-label="Connection channel; target 60"></label>` : note('RECOVER THE LINK', 'Reconnect to continue where the upload stopped.')}${primary('reconnect', this.uploadStops === 2 ? 'Calibrate & reconnect' : 'Reconnect link')}` : '<p class="mg-upload-note">The link may drop. Stay here to reconnect it.</p>'}`;
      this.setFeedback(this.connected ? 'Transfer running. Keep an eye on the connection.' : this.uploadStops === 2 ? 'Tune the channel to 60, then reconnect.' : 'The link dropped. Press Reconnect link.');
    }

    gaugePosition(index) {
      return (Math.sin(this.elapsed * (1.4 + index * 0.24) - Math.PI / 2 + index * 0.45) + 1) / 2;
    }

    renderGauges() {
      this.stage.innerHTML = `<div class="mg-gauge-bank">${['Signal', 'Voltage', 'Clock'].map((name, index) => `<div class="mg-gauge-row"><div class="mg-gauge-title"><strong>${name}</strong><span>${this.gauges.has(index) ? 'LOCKED ✓' : 'TARGET 40–65'}</span></div>${this.timingRail(40, 25)}${button('stop-gauge', this.gauges.has(index) ? `${name} calibrated ✓` : `Stop ${name.toLowerCase()} gauge`, index, this.gauges.has(index) ? 'disabled' : '')}</div>`).join('')}</div>`;
      this.setFeedback('Each gauge moves differently. Stop them in any order, inside lime.');
      this.paintGauges();
    }

    paintGauges() {
      this.root.querySelectorAll('.mg-gauge-row').forEach((row, index) => {
        if (!this.gauges.has(index)) row.querySelector('.mg-needle').style.left = `${this.gaugePosition(index) * 100}%`;
        else row.querySelector('.mg-needle').style.left = '52%';
      });
    }

    renderShredder() {
      this.stage.innerHTML = `<div class="mg-shredder"><div class="mg-shred-paper" aria-hidden="true"><span>OLD FILES</span><i></i><i></i><i></i></div><div class="mg-shred-slot"></div><div class="mg-shred-bin"><span class="mg-shred-fill" style="transform:scaleY(${this.progress / 100})"></span><span class="mg-shred-percent">${Math.floor(this.progress)}%</span></div></div>${primary('shred-hold', 'Hold to shred <kbd>Space</kbd>')}<p class="mg-upload-note">Release to pause. Five seconds of shredding, total.</p>`;
      this.setFeedback('Hold the button, or hold Space while it is focused.');
    }

    renderReset() {
      this.stage.innerHTML = `<div class="mg-reset-console"><div class="mg-reset-display"><span>${this.revealed ? 'REMEMBER THIS ORDER' : 'REPEAT THE SEQUENCE'}</span><div class="mg-reset-sequence">${RESET_CODE.map((key, i) => `<span class="${!this.revealed && i < this.progress ? 'mg-reset-entered' : ''}">${this.revealed ? `<b aria-hidden="true">${MARKS[key]}</b><small>${SYMBOLS[key]}</small>` : i < this.progress ? '✓' : '?'}</span>`).join('')}</div></div><div class="mg-reset-keys">${SYMBOLS.map((name, index) => button('reset-key', `<span class="mg-reset-mark" aria-hidden="true">${MARKS[index]}</span>${name}`, index, this.revealed ? 'disabled' : '')).join('')}</div>${this.revealed ? primary('hide-reset', 'I remember — hide sequence') : '<button type="button" class="mg-text-button" data-action="peek-reset">Show the sequence again</button>'}</div>`;
      this.setFeedback(this.revealed ? 'Key → Shield → Check → Cloud. The sequence hides after a moment.' : 'Press the symbols in the order you saw.');
    }

    renderCV() {
      this.stage.innerHTML = `${note('HIRING BRIEF — USE THESE EXACT DETAILS', 'Title: Data analyst · Skill: SQL · Dates: 2023–2025 · Summary: Built weekly reports')}<div class="mg-cv"><div class="mg-cv-name">Alex Morgan <span>CURRICULUM VITAE</span></div>${CV.map((field, index) => `<button type="button" class="mg-cv-field ${this.finished.has(index) ? 'mg-cv-fixed' : ''}" data-action="cv-field" data-value="${index}" ${this.finished.has(index) ? 'disabled' : ''}><span>${field.label}</span><strong>${html(this.finished.has(index) ? field.right : field.wrong)}</strong><span aria-label="${this.finished.has(index) ? 'Fixed' : 'Edit'}">${this.finished.has(index) ? '✓' : '↗'}</span></button>`).join('')}</div>${this.cvField !== null ? `<div class="mg-inline-editor"><strong>Replace ${CV[this.cvField].label.toLowerCase()} with:</strong><div class="mg-answers">${[CV[this.cvField].decoy, CV[this.cvField].right].map((answer, i) => button('cv-fix', html(answer), i)).join('')}</div></div>` : ''}`;
      this.setFeedback('Select an inaccurate field. The hiring brief is the source of truth.');
    }

    renderTimesheet() {
      this.stage.innerHTML = `<div class="mg-timesheet"><div class="mg-form-heading"><strong>Your week, accurately</strong><span>HOURS</span></div><div class="mg-hours-grid">${DAYS.map((day, index) => `<label class="mg-hour-field"><strong>${day}</strong><span>Note: ${HOURS[index]}h</span><input type="number" min="0" max="12" step="0.5" inputmode="decimal" data-input="hours" data-index="${index}" value="${html(this.hours[index])}" aria-label="${day} hours" placeholder="0"></label>`).join('')}</div><div class="mg-hours-total">Entered total <output>${this.hours.reduce((sum, n) => sum + (Number(n) || 0), 0)}</output> h <span>Notes total: 37.5h</span></div></div>${note('WORK NOTES', 'Mon 8h · Tue 8h · Wed 7.5h · Thu 8h · Fri 6h')}${primary('submit-hours', 'Submit the week')}`;
      this.setFeedback('Enter the five daily values. Submit when they match the notes.');
    }

    renderSchedule() {
      const calendar = [['Nora', 'Busy', 'Free', 'Free'], ['Aksel', 'Free', 'Free', 'Busy'], ['Fjord room', 'Busy', 'Free', 'Busy'], ['Birch room', 'Free', 'Busy', 'Free']];
      this.stage.innerHTML = `<div class="mg-calendar-wrap"><table class="mg-calendar"><caption>Today · a 30-minute review</caption><thead><tr><th scope="col">Calendar</th><th scope="col">09:00</th><th scope="col">10:00</th><th scope="col">11:00</th></tr></thead><tbody>${calendar.map(row => `<tr><th scope="row">${row[0]}</th>${row.slice(1).map(cell => `<td class="${cell === 'Free' ? 'mg-calendar-free' : 'mg-calendar-busy'}">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div><fieldset class="mg-fieldset"><legend>Invite exactly Nora and Aksel</legend><div class="mg-invite-options">${['Nora', 'Aksel', 'Magnus'].map(name => `<label><input type="checkbox" data-input="participant" value="${name}" ${this.participants.has(name) ? 'checked' : ''}>${name}</label>`).join('')}</div></fieldset><div class="mg-schedule-options"><fieldset class="mg-fieldset"><legend>Time</legend>${['09:00', '10:00', '11:00'].map(time => button('slot', time, time, `aria-pressed="${this.slot === time}"`)).join('')}</fieldset><fieldset class="mg-fieldset"><legend>Room</legend>${['Fjord', 'Birch'].map(room => button('room', room, room, `aria-pressed="${this.room === room}"`)).join('')}</fieldset></div>${primary('book', 'Book the review')}`;
      this.setFeedback('Find a column where Nora, Aksel and one room are all free.');
    }

    renderApproval() {
      const sheet = APPROVALS[this.progress], sum = sheet.hours.reduce((a, b) => a + b, 0);
      this.stage.innerHTML = `<div class="mg-approval"><div class="mg-form-heading"><strong>${sheet.name}’s timesheet</strong><span>${this.progress + 1} / 3</span></div><div class="mg-audit-days">${DAYS.map((day, i) => `<div><span>${day}</span><strong>${sheet.hours[i]}h</strong></div>`).join('')}</div><div class="mg-claimed"><span>Claimed total</span><strong>${sheet.claimed}h</strong></div><div class="mg-calculated">${this.showTotal ? `Daily entries add up to <strong>${sum}h</strong>` : '<button type="button" class="mg-text-button" data-action="total">Add the daily hours for me</button>'}</div></div>${note('APPROVAL RULE', 'Approve if the claimed total equals the sum of daily hours. Reject if they differ.')}<div class="mg-choice-grid">${button('approve', '✓ Approve', 'yes')}${button('approve', '× Reject', 'no')}</div>`;
      this.setFeedback('Read the hours. Use the calculator if you’d like a second opinion.');
    }

    renderRename() {
      const item = RENAMES[this.progress];
      this.stage.innerHTML = `<div class="mg-filename"><span aria-hidden="true">▱</span><div><small>CURRENT FILENAME</small><strong>${html(item.original)}</strong></div></div>${note('FILE BRIEF', item.brief)}${note('CONVENTION', 'client_kind_YYYY-MM-DD.extension')}<div class="mg-answers mg-code-answers">${item.answers.map((answer, i) => button('rename-choice', html(answer), i)).join('')}</div>`;
      this.setFeedback('Match the client, kind, date and extension. Every part matters.');
    }

    sortingItems() { return this.task.type === 'desktop' ? FILES : MAIL; }

    renderSorting() {
      const mail = this.task.type === 'sortmail';
      const destinations = mail ? ['Important', 'Spam', 'Client', 'Internal'] : ['Reports', 'Finance', 'Media'];
      this.stage.innerHTML = `${note(mail ? 'SORTING RULES' : 'FOLDER RULES', mail ? 'Urgent action → Important · unsolicited prizes → Spam · client contact → Client · team news → Internal' : 'Report PDFs → Reports · workbooks → Finance · images → Media')}<div class="mg-sort-sources">${this.sortingItems().map((item, index) => this.finished.has(index) ? '' : `<button type="button" class="mg-sort-card" draggable="true" data-action="select-item" data-value="${index}" aria-pressed="${this.selected === index}"><span class="mg-file-glyph" aria-hidden="true">${mail ? '✉' : '▱'}</span><span><strong>${html(item.label)}</strong><small>${html(item.detail)}</small></span><span aria-hidden="true">${this.selected === index ? '✓' : '⋮⋮'}</span></button>`).join('')}</div><div class="mg-sort-destinations">${destinations.map(destination => `<button type="button" class="mg-folder" data-action="destination" data-value="${destination}"><span aria-hidden="true">${mail ? '▤' : '▱'}</span><strong>${destination}</strong><small>${[...this.finished].filter(i => this.sortingItems()[i].destination === destination).length} filed</small></button>`).join('')}</div>`;
      this.setFeedback(this.selected === null ? 'Drag an item into a destination, or click an item first.' : `Selected: ${this.sortingItems()[this.selected].label}. Choose its destination.`);
    }

    renderSheet() {
      const firstFixed = this.progress > 0;
      const target = firstFixed ? 'D4' : 'D2';
      const options = firstFixed ? ['=SUM(B2:B3)', '=SUM(D2:D3)', '=D2-D3'] : ['=B2+C2', '=B2*C2', '=B2/C2'];
      this.stage.innerHTML = `<div class="mg-sheet-wrap"><table class="mg-sheet"><caption>Stationery budget</caption><thead><tr><th></th><th>A · Item</th><th>B · Qty</th><th>C · Price</th><th>D · Total</th></tr></thead><tbody><tr><th scope="row">2</th><td>Paper</td><td>2</td><td>5</td><td>${button('cell', firstFixed ? '10 ✓' : '7', 'D2', 'aria-label="Cell D2"')}</td></tr><tr><th scope="row">3</th><td>Pens</td><td>3</td><td>2</td><td>${button('cell', '6', 'D3', 'aria-label="Cell D3"')}</td></tr><tr><th scope="row">4</th><td colspan="3">Grand total</td><td>${button('cell', '5', 'D4', 'aria-label="Cell D4"')}</td></tr></tbody></table></div>${note('AUDIT NOTE', firstFixed ? 'Fix D4: add the totals D2 and D3. SUM(D2:D3) means “add those total cells”.' : 'Fix D2: quantity B2 × price C2. The * symbol means multiplication. Expected result: 10.')}${this.cell === target ? `<div class="mg-formula-editor"><span>FORMULA FOR ${target}</span><div class="mg-answers mg-code-answers">${options.map((formula, index) => button('formula', html(formula), index)).join('')}</div></div>` : '<p class="mg-upload-note">Select the cell named in the audit note.</p>'}`;
      this.setFeedback(`Select ${target}, then choose its corrected formula.`);
    }

    renderRequirement() {
      const step = REQUIREMENTS[this.progress];
      this.stage.innerHTML = `<div class="mg-clarification"><span>REQUEST ${this.progress + 1} / 3</span><blockquote>${html(step.request)}</blockquote></div>${note('CLARIFICATION HINT', step.hint)}<div class="mg-answers">${step.answers.map((answer, index) => button('requirement-choice', html(answer), index)).join('')}</div>`;
      this.setFeedback('A good question turns a vague request into something deliverable.');
    }

    act(action, value) {
      if (this.disposed || this.settled) return;
      if (['start', 'retry', 'cancel'].includes(action)) return super.act(action, value);
      if (this.state !== 'playing' || !this.root.isConnected) return;
      const index = Number(value), type = this.task.type;
      if (type === 'cables') {
        if (action === 'wire' && WIRES[index] && !this.finished.has(index)) {
          this.selected = index;
          this.refresh();
          this.focus('[data-action="socket"]:not(:disabled)');
        } else if (action === 'socket' && WIRES[index] && !this.finished.has(index)) {
          if (this.selected === null) return this.setFeedback('Select a cable first.');
          if (index !== this.selected) return this.mistake(`That socket doesn’t match. Choose ${WIRES[this.selected].name}.`, 0.4);
          this.finished.add(index);
          this.selected = null;
          this.next();
        }
      } else if (type === 'upload' && action === 'reconnect' && !this.connected) {
        if (this.uploadStops === 2 && (this.channel < 55 || this.channel > 65)) return this.mistake('Tune the channel to 60 first. The safe range is 55–65.', 0.4);
        this.connected = true;
        this.playSound('click');
        this.refresh();
      } else if (type === 'calibrate' && action === 'stop-gauge' && index >= 0 && index < 3 && !this.gauges.has(index)) {
        const position = this.gaugePosition(index);
        if (position < 0.4 || position > 0.65) return this.mistake('Outside the lime zone. That gauge is still moving — try again.', 0.35);
        this.gauges.add(index);
        this.next();
      } else if (type === 'reset') {
        if (action === 'hide-reset' && this.revealed) { this.revealed = false; this.refresh(); }
        else if (action === 'peek-reset' && !this.revealed) { this.revealed = true; this.progress = 0; this.revealUntil = this.elapsed + 3.2; this.refresh(); }
        else if (action === 'reset-key' && !this.revealed && SYMBOLS[index]) {
          if (index !== RESET_CODE[this.progress]) {
            this.progress = 0;
            this.refresh();
            this.mistake('Sequence reset. Try again, or show the sequence for another look.', 0.5);
          } else this.next();
        }
      } else if (type === 'cv') {
        if (action === 'cv-field' && CV[index] && !this.finished.has(index)) {
          this.cvField = index;
          this.refresh();
          this.focus('[data-action="cv-fix"]');
        } else if (action === 'cv-fix' && this.cvField !== null) {
          if (index !== 1) return this.mistake('That still doesn’t match the hiring brief. Choose the accurate detail.', 0.4);
          this.finished.add(this.cvField);
          this.cvField = null;
          this.next();
        }
      } else if (type === 'timesheet' && action === 'submit-hours') {
        const wrong = HOURS.findIndex((hours, i) => this.hours[i] === '' || Number(this.hours[i]) !== hours);
        this.root.querySelectorAll('[data-input="hours"]').forEach((input, i) => input.setAttribute('aria-invalid', String(this.hours[i] === '' || Number(this.hours[i]) !== HOURS[i])));
        if (wrong >= 0) {
          this.focus(`[data-input="hours"][data-index="${wrong}"]`);
          return this.mistake(`${DAYS[wrong]} should be ${HOURS[wrong]} hours. Check that day’s work note.`, 0.3);
        }
        this.progress = this.config.total;
        this.syncReadouts();
        this.complete();
      } else if (type === 'schedule') {
        if (action === 'slot' && ['09:00', '10:00', '11:00'].includes(value)) { this.slot = value; this.syncSchedule(); this.refresh(); }
        else if (action === 'room' && ['Fjord', 'Birch'].includes(value)) { this.room = value; this.syncSchedule(); this.refresh(); }
        else if (action === 'book') {
          if (this.participants.size !== 2 || !this.participants.has('Nora') || !this.participants.has('Aksel')) return this.mistake('Invite exactly Nora and Aksel. Magnus does not need this meeting.', 0.3);
          if (this.slot !== '10:00') return this.mistake('Nora and Aksel are both free at 10:00. Check that calendar column.', 0.3);
          if (this.room !== 'Fjord') return this.mistake('Fjord is free at 10:00. Birch is already booked.', 0.3);
          this.complete();
        }
      } else if (type === 'approve') {
        if (action === 'total') { this.showTotal = true; this.refresh(); }
        else if (action === 'approve') {
          const sheet = APPROVALS[this.progress], sum = sheet.hours.reduce((a, b) => a + b, 0);
          if ((value === 'yes') !== (sum === sheet.claimed)) return this.mistake(`The entries add to ${sum}h; the claim is ${sheet.claimed}h. ${sum === sheet.claimed ? 'Approve the matching total.' : 'Reject this mismatch.'}`, 0.5);
          this.showTotal = false;
          this.next();
        }
      } else if (type === 'rename' && action === 'rename-choice') {
        if (index !== RENAMES[this.progress].correct) return this.mistake('Check the lowercase names, YYYY-MM-DD date, underscores and extension.', 0.4);
        this.next();
      } else if (type === 'desktop' || type === 'sortmail') {
        if (action === 'select-item' && this.sortingItems()[index] && !this.finished.has(index)) {
          this.selected = index;
          this.root.querySelectorAll('[data-action="select-item"]').forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.value) === index)));
          this.setFeedback(`Selected: ${this.sortingItems()[index].label}. Choose its destination.`);
        } else if (action === 'destination') this.fileSelected(value);
      } else if (type === 'spreadsheet') {
        if (action === 'cell') {
          const target = this.progress ? 'D4' : 'D2';
          if (value !== target) return this.mistake(`The audit note names ${target}. Select that cell.`, 0.3);
          this.cell = value;
          this.refresh();
          this.focus('[data-action="formula"]');
        } else if (action === 'formula' && this.cell === (this.progress ? 'D4' : 'D2')) {
          if (index !== 1) return this.mistake(this.progress ? 'SUM(D2:D3) adds the two line totals.' : 'B2*C2 multiplies quantity by price.', 0.4);
          this.cell = null;
          this.next();
        }
      } else if (type === 'requirement' && action === 'requirement-choice') {
        if (index !== REQUIREMENTS[this.progress].correct) return this.mistake(REQUIREMENTS[this.progress].hint, 0.4);
        this.next();
      }
    }

    next() {
      this.advance();
      if (this.state === 'playing') this.refresh();
    }

    syncReadouts() {
      super.syncReadouts();
      if (['upload', 'empty'].includes(this.task.type)) this.progressDisplay.textContent = `${Math.floor(this.progress)}% ${this.task.type === 'upload' ? 'uploaded' : 'shredded'}`;
    }

    editInput(event) {
      if (this.state !== 'playing' || this.disposed || !this.root.isConnected) return;
      const input = event.target;
      if (input.dataset.input === 'channel') {
        this.channel = Number(input.value);
        this.root.querySelector('.mg-channel-value').textContent = String(this.channel);
      } else if (input.dataset.input === 'hours') {
        this.hours[Number(input.dataset.index)] = input.value;
        input.removeAttribute('aria-invalid');
        this.progress = HOURS.filter((value, i) => this.hours[i] !== '' && Number(this.hours[i]) === value).length;
        this.root.querySelector('.mg-hours-total output').textContent = String(this.hours.reduce((sum, n) => sum + (Number(n) || 0), 0));
        this.syncReadouts();
      } else if (input.dataset.input === 'participant') {
        if (input.checked) this.participants.add(input.value);
        else this.participants.delete(input.value);
        this.syncSchedule();
      }
    }

    syncSchedule() {
      this.progress = Number(this.participants.size === 2 && this.participants.has('Nora') && this.participants.has('Aksel')) + Number(this.slot === '10:00') + Number(this.room === 'Fjord');
      this.syncReadouts();
    }

    handleKey(event) {
      if (event.key === 'Escape') return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target.matches('input, select, textarea')) {
        event.stopPropagation();
        if (event.key === 'Enter' && this.task.type === 'timesheet') { event.preventDefault(); this.act('submit-hours'); }
        return;
      }
      const space = event.key === ' ' || event.code === 'Space';
      const enter = event.key === 'Enter';
      if (space || enter) {
        event.stopPropagation();
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (this.state === 'playing' && ['swipe', 'empty'].includes(this.task.type) && (!action || action === 'swipe-hold' || action === 'shred-hold')) {
          event.preventDefault();
          if (!event.repeat && !this.holding) {
            const target = this.root.querySelector(`[data-action="${this.task.type === 'swipe' ? 'swipe-hold' : 'shred-hold'}"]`);
            target.focus({ preventScroll: true });
            this.beginHold(target, 'keyboard');
          }
          return;
        }
        if (event.repeat) { event.preventDefault(); return; }
        if (event.target === this.root && this.state === 'ready') { event.preventDefault(); this.act('start'); }
        else if (event.target === this.root && this.state === 'failed') { event.preventDefault(); this.act('retry'); }
      }
    }

    keyUp(event) {
      if ((event.key === ' ' || event.code === 'Space' || event.key === 'Enter') && this.holding && this.holdMode === 'keyboard') {
        event.preventDefault();
        event.stopPropagation();
        if (this.task.type === 'swipe') this.finishSwipe();
        else this.stopInput();
      }
    }

    beginHold(target, mode) {
      if (this.state !== 'playing' || this.disposed || !this.root.isConnected) return;
      this.holding = true;
      this.holdMode = mode;
      this.heldTarget = target;
      this.swipeSeconds = 0;
      this.swipeDistance = 0;
      this.root.classList.add('mg-is-holding');
      if (this.task.type === 'swipe') this.paintSwipe();
      else this.setFeedback('Shredding. Keep holding until the bin reaches 100%.');
    }

    pointerDown(event) {
      const target = event.target.closest('[data-action="swipe-hold"], [data-action="shred-hold"]');
      if (!target || this.state !== 'playing' || this.disposed || this.holding || event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault();
      target.focus({ preventScroll: true });
      this.beginHold(target, 'pointer');
      this.pointerId = event.pointerId;
      this.pointerStart = event.clientX;
      if (this.task.type === 'swipe') {
        this.swipeTravel = Math.max(1, this.root.querySelector('.mg-reader-track').clientWidth - target.offsetWidth);
      }
      this.root.setPointerCapture(event.pointerId);
    }

    pointerMove(event) {
      if (!this.holding || event.pointerId !== this.pointerId || this.task.type !== 'swipe') return;
      this.swipeDistance = Math.max(0, Math.min(1, (event.clientX - this.pointerStart) / this.swipeTravel));
      this.paintSwipe();
    }

    pointerUp(event) {
      if (!this.holding || event.pointerId !== this.pointerId) return;
      if (this.task.type === 'swipe') {
        this.pointerMove(event);
        this.finishSwipe();
      } else this.stopInput();
    }

    finishSwipe() {
      if (!this.holding || this.state !== 'playing' || this.disposed) return;
      const seconds = this.swipeSeconds, distance = this.swipeDistance;
      this.stopInput();
      if (seconds >= 0.8 && seconds <= 1.8 && distance >= 0.85) {
        this.next();
        if (this.state === 'playing') this.setFeedback('Clean read. One more steady swipe.', 'good');
      } else {
        this.swipeDistance = 0;
        this.paintSwipe();
        this.mistake(seconds < 0.8 ? 'Too fast. Aim for 0.8–1.8 seconds.' : seconds > 1.8 ? 'Too slow. Aim for 0.8–1.8 seconds.' : 'Swipe all the way to the right before releasing.', 0.35);
      }
    }

    stopInput() {
      this.holding = false;
      this.heldTarget = null;
      this.dragged = null;
      const pointer = this.pointerId;
      this.pointerId = null;
      this.root?.classList.remove('mg-is-holding', 'mg-dragging');
      if (pointer !== null && pointer !== undefined && this.root?.hasPointerCapture(pointer)) this.root.releasePointerCapture(pointer);
    }

    suspend() {
      if (this.disposed) return;
      this.stopInput();
      if (this.task.type === 'swipe' && this.state === 'playing') {
        this.swipeSeconds = 0;
        this.swipeDistance = 0;
        this.paintSwipe();
      }
    }

    paintSwipe() {
      const card = this.root.querySelector('.mg-access-card');
      if (!card) return;
      const track = this.root.querySelector('.mg-reader-track');
      card.style.transform = `translateX(${this.swipeDistance * Math.max(0, track.clientWidth - card.offsetWidth)}px)`;
      const time = this.swipeSeconds;
      this.root.querySelector('.mg-swipe-time').textContent = `${time.toFixed(2)}s`;
      this.root.querySelector('.mg-swipe-speed').textContent = !this.holding ? 'Ready for a steady swipe' : time > 1.8 ? 'Too slow — try again' : time >= 0.8 && this.swipeDistance >= 0.85 ? 'Release now ✓' : 'Keep moving steadily →';
      this.root.classList.toggle('mg-swipe-valid', this.holding && time >= 0.8 && time <= 1.8 && this.swipeDistance >= 0.85);
    }

    dragStart(event) {
      const item = event.target.closest('[data-action="select-item"]');
      if (!item || this.state !== 'playing' || this.disposed) { event.preventDefault(); return; }
      this.dragged = Number(item.dataset.value);
      this.selected = this.dragged;
      event.dataTransfer.setData('text/plain', item.dataset.value);
      event.dataTransfer.effectAllowed = 'move';
      this.root.classList.add('mg-dragging');
      item.setAttribute('aria-pressed', 'true');
    }

    drop(event) {
      const destination = event.target.closest('[data-action="destination"]');
      if (!destination || this.dragged === null || !this.root.contains(destination) || this.state !== 'playing' || this.disposed) return;
      event.preventDefault();
      this.selected = this.dragged;
      this.dragged = null;
      this.root.classList.remove('mg-dragging');
      this.fileSelected(destination.dataset.value);
    }

    fileSelected(destination) {
      if (this.state !== 'playing' || this.disposed || this.selected === null || this.finished.has(this.selected)) return this.setFeedback('Select an item first, then choose its destination.');
      const item = this.sortingItems()[this.selected];
      if (item.destination !== destination) return this.mistake(`This belongs in ${item.destination}. Follow the sorting rules above.`, 0.4);
      this.finished.add(this.selected);
      this.selected = null;
      this.next();
    }

    update(dt) {
      if (this.disposed || this.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
      if (!this.root.isConnected) { this.stopInput(); return; }
      // A paused modal is detached and later focused at its root. Never resume a
      // stale held key or captured pointer after that focus change.
      if (this.holding && (document.activeElement !== this.heldTarget || (this.pointerId !== null && !this.root.hasPointerCapture(this.pointerId)))) this.stopInput();
      super.update(dt);
      if (this.state !== 'playing' || this.disposed) return;
      const type = this.task.type;
      if (type === 'swipe' && this.holding) {
        this.swipeSeconds += dt;
        if (this.holdMode === 'keyboard') this.swipeDistance = Math.min(1, this.swipeSeconds / 1.15);
        this.paintSwipe();
      } else if (type === 'empty' && this.holding) {
        this.progress = Math.min(100, this.progress + dt * 20);
        this.root.querySelector('.mg-shred-fill').style.transform = `scaleY(${this.progress / 100})`;
        this.root.querySelector('.mg-shred-percent').textContent = `${Math.floor(this.progress)}%`;
        this.syncReadouts();
        if (this.progress >= 100) this.complete();
      } else if (type === 'upload' && this.connected) {
        const threshold = [30, 70, 100][this.uploadStops];
        this.progress = Math.min(threshold, this.progress + dt * 16);
        this.root.querySelector('.mg-upload-fill').style.transform = `scaleX(${this.progress / 100})`;
        this.root.querySelector('.mg-upload-percent').textContent = `${Math.floor(this.progress)}%`;
        this.syncReadouts();
        if (this.progress >= 100) this.complete();
        else if (this.progress >= threshold) { this.connected = false; this.uploadStops += 1; this.refresh(); this.playSound('error'); }
      } else if (type === 'calibrate') this.paintGauges();
      else if (type === 'reset' && this.revealed && this.elapsed >= this.revealUntil) { this.revealed = false; this.refresh(); }
    }

    fail() {
      this.stopInput();
      super.fail();
    }

    complete() {
      this.stopInput();
      super.complete();
    }

    cancel() {
      this.stopInput();
      super.cancel();
    }

    dispose() {
      if (this.disposed) return;
      this.stopInput();
      for (const [name, handler] of this.inputListeners) this.root.removeEventListener(name, handler);
      this.inputListeners.length = 0;
      super.dispose();
    }
  };
}
