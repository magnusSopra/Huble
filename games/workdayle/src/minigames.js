import { OFFICE_GAMES, createOfficeMiniGame, NEW_TYPES } from './office-minigames.js';
import { MULTITASK_GAMES, MULTITASK_TYPES, createMultitaskMiniGame } from './multitask-minigames.js';
import './multitask-minigames.css';

export { NEW_TYPES } from './office-minigames.js';
export { MULTITASK_TYPES } from './multitask-minigames.js';

const GAMES = {
  coffee: { label: 'Espresso protocol', duration: 16, total: 3, instructions: 'Press Pour when the needle is in the lime zone. Land three good pours. One pour per pass.', keys: 'Space to pour' },
  repair: { label: 'Reboot protocol', duration: 18, total: 4, instructions: 'Bring the computer back online. Select the four actions in the order on the service note.', keys: '1–4 to choose' },
  email: { label: 'Inbox diplomacy', duration: 20, total: 3, instructions: 'Answer three messages. Read the green hint and choose the most useful response.', keys: '1–3 to reply' },
  client: { label: 'Expectation management', duration: 20, total: 3, instructions: 'Handle three client requests. Read the green hint and choose a constructive answer.', keys: '1–3 to reply' },
  help: { label: 'Human support', duration: 20, total: 3, instructions: 'Help a colleague through three problems. The green hints tell you what matters.', keys: '1–3 to reply' },
  docs: { label: 'Instructions for humans', duration: 18, total: 4, instructions: 'Build a useful guide. Select each checklist item in the order shown on the sticky note.', keys: '1–4 to choose' },
  deploy: { label: 'Friday release checklist', duration: 18, total: 4, instructions: 'Ship without the incident report. Follow the release note, one checklist item at a time.', keys: '1–4 to choose' },
  jira: { label: 'The ticket journey', duration: 16, total: 4, instructions: 'Move the ticket through all four statuses. The workflow below is your answer key.', keys: '1–4 to choose' },
  sql: { label: 'A very small query', duration: 18, total: 3, instructions: 'Build a query by choosing three pieces. Follow the plain-English hints. No SQL knowledge needed.', keys: '1–3 to choose' },
  password: { label: 'Temporary access code', duration: 18, total: 4, instructions: 'Remember the four-digit code, then enter it on the keypad. You can peek again if you need to.', keys: '1–4 to type · Backspace to erase' },
  deadline: { label: 'Urgent, apparently', duration: 14, total: 8, instructions: 'Resolve eight incoming requests before time runs out. Each new request takes a moment to arrive.', keys: 'Space to resolve' },
};

export const MINI_TYPES = Object.freeze([...Object.keys(GAMES), ...NEW_TYPES, ...MULTITASK_TYPES]);

const DIALOGUES = {
  email: [
    { from: 'Nora · Project manager', message: '“Can someone explain why the deadline moved?”', hint: 'Acknowledge the change and offer an updated plan.', answers: ['Reply all: “Not my problem.”', 'I’ll share an updated plan and the reason for the change.', 'Mark as unread. Forever.'], correct: 1 },
    { from: 'Ingrid · Senior consultant', message: '“The attachment seems to be missing.”', hint: 'Fix the missing attachment, without blaming anyone.', answers: ['Thanks for catching that — here is the attachment.', 'It was attached in spirit.', 'Please check the other 47 replies.'], correct: 0 },
    { from: 'Aksel · Client lead', message: '“Could we get a quick status update?”', hint: 'Give a clear status and a next step.', answers: ['We are leveraging multiple synergies.', 'Let’s schedule a meeting about the update.', 'The draft is ready. Review is next, this afternoon.'], correct: 2 },
  ],
  client: [
    { from: 'The client', message: '“Just one tiny change: rebuild everything.”', hint: 'Clarify the scope before making a promise.', answers: ['Of course. It will take five minutes.', 'Let’s confirm the scope and estimate the work first.', 'I’ve forwarded this to the coffee machine.'], correct: 1 },
    { from: 'The client', message: '“Can it all be ready by tomorrow?”', hint: 'Offer a realistic, smaller first delivery.', answers: ['We can deliver the priority items first. Let’s agree which.', 'Yes, if we stop observing time.', 'I will be on annual leave tomorrow.'], correct: 0 },
    { from: 'The client', message: '“Great. What happens next?”', hint: 'Write down what was agreed and the next update.', answers: ['We circle back into a feedback loop.', 'You will hear from us eventually.', 'I’ll send the agreed scope and our next update time.'], correct: 2 },
  ],
  help: [
    { from: 'Magnus · Colleague', message: '“My screen is completely black.”', hint: 'Start with the simplest check: power.', answers: ['Check that the monitor is plugged in and switched on.', 'Order an entirely new department.', 'Have you tried a more positive outlook?'], correct: 0 },
    { from: 'Magnus · Colleague', message: '“It’s on! But I can’t open the shared file.”', hint: 'Check access permissions. Never ask for a password.', answers: ['Send me your password in the team chat.', 'Let’s check that your account has access.', 'Rename it final_FINAL_v9.'], correct: 1 },
    { from: 'Magnus · Colleague', message: '“That worked. Am I good to go?”', hint: 'Confirm the fix and leave useful instructions.', answers: ['No. We need a retrospective.', 'We shall never speak of this again.', 'Yes — try opening it once more. I’ll note the fix.'], correct: 2 },
  ],
};

const SEQUENCES = {
  repair: { note: 'Save work → Power off → Check cable → Restart', labels: ['Restart', 'Save work', 'Check cable', 'Power off'], order: [1, 3, 2, 0], steps: ['Save the open work first.', 'Power off the computer.', 'Check the power cable.', 'Restart the computer.'], done: ['Work saved', 'Power off', 'Cable secure', 'System online'] },
  docs: { note: 'Name the problem → List requirements → Write steps → Test the guide', labels: ['Write steps', 'Test the guide', 'Name the problem', 'List requirements'], order: [2, 3, 0, 1], steps: ['Start by naming the problem.', 'List what the reader needs.', 'Write the actual instructions.', 'Test the instructions.'], done: ['Problem defined', 'Requirements listed', 'Instructions written', 'Guide tested'] },
  deploy: { note: 'Run tests → Back up → Deploy → Check health', labels: ['Deploy', 'Check health', 'Run tests', 'Back up'], order: [2, 3, 0, 1], steps: ['Run the tests first.', 'Back up before changing anything.', 'Deploy the release.', 'Check that the service is healthy.'], done: ['Tests passed', 'Backup created', 'Release deployed', 'Service healthy'] },
  jira: { note: 'Backlog → In progress → In review → Done', labels: ['Done', 'In review', 'Backlog', 'In progress'], order: [2, 3, 1, 0], steps: ['Start in the Backlog.', 'Move the ticket to In progress.', 'Send the work to In review.', 'Finally, mark it Done.'], done: ['Backlog', 'In progress', 'In review', 'Done'] },
};

const SQL_STEPS = [
  { hint: 'First, choose what to show. “SELECT name” means “show names”.', answers: ['DELETE everything', 'SELECT name', 'PANIC quietly'], correct: 1, code: 'SELECT name' },
  { hint: 'Next, choose where to look. The names are in the employees table.', answers: ['FROM employees', 'FROM the_future', 'FROM coffee'], correct: 0, code: 'FROM employees' },
  { hint: 'Finally, keep active people. Use “WHERE active = true”.', answers: ['WHERE mood = Monday', 'WHERE coffee = empty', 'WHERE active = true'], correct: 2, code: 'WHERE active = true;' },
];

const REQUESTS = [
  ['Approve a timesheet', 'It has been waiting since “yesterday”.'],
  ['Send the latest deck', 'Not the latest-latest one. The actual latest one.'],
  ['Confirm the meeting', 'The meeting is about fewer meetings.'],
  ['Unblock the ticket', 'Its blocker is another blocker.'],
  ['Share the document', 'The link was in the document.'],
  ['Update the estimate', 'This update was not in the estimate.'],
  ['Approve the approval', 'Governance is working beautifully.'],
  ['Send the final update', 'For now. Let’s not get carried away.'],
];

const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const cupGraphic = () => `<div class="mg-coffee-art" aria-hidden="true">
  <svg viewBox="0 0 240 164" class="mg-cup-svg">
    <path d="M83 44c-12-14 12-17 0-31M115 39c-12-14 12-17 0-31M146 44c-12-14 12-17 0-31" class="mg-steam"/>
    <path d="M175 62h14c37 0 37 52 0 52h-20" class="mg-cup-handle"/>
    <path d="M61 57h118l-8 59c-3 24-25 33-51 33s-48-9-51-33Z" class="mg-cup-outline"/>
    <svg x="69" y="67" width="102" height="72" viewBox="0 0 102 72"><rect x="0" y="72" width="102" height="72" class="mg-coffee-fill"/></svg>
    <path d="M50 151h140" class="mg-saucer"/>
    <path d="m103 99 12 12 22-25" class="mg-cup-mark"/>
  </svg>
  <span class="mg-art-caption">FUEL FOR THOUGHT</span>
</div>`;

/**
 * A self-contained task view. Call update(dt) with elapsed seconds; no timers or
 * global listeners are installed. The host owns its modal and Escape handling.
 */
export class MiniGame {
  constructor(container, task, { onComplete = () => {}, onCancel = () => {}, sound = () => {} } = {}) {
    if (new.target === MiniGame && MULTITASK_TYPES.includes(task.type)) {
      return new MultitaskMiniGame(container, task, { onComplete, onCancel, sound });
    }
    if (new.target === MiniGame && NEW_TYPES.includes(task.type)) {
      return new OfficeMiniGame(container, task, { onComplete, onCancel, sound });
    }
    this.container = container;
    this.task = task;
    this.config = GAMES[task.type] || OFFICE_GAMES[task.type] || MULTITASK_GAMES[task.type];
    if (!this.config) throw new Error(`Unsupported mini-game type: ${task.type}`);
    this.onComplete = onComplete;
    this.onCancel = onCancel;
    this.sound = sound;
    this.disposed = false;
    this.settled = false;
    this.state = 'ready';
    this.progress = 0;
    this.remaining = this.config.duration;
    this.elapsed = 0;
    this.cooldown = 0;
    this.root = document.createElement('section');
    this.root.className = `minigame mg-type-${task.type}`;
    this.root.setAttribute('aria-label', this.config.label);
    this.root.tabIndex = -1;
    this.clickListener = (event) => this.handleClick(event);
    this.keyListener = (event) => this.handleKey(event);
    this.root.addEventListener('click', this.clickListener);
    this.root.addEventListener('keydown', this.keyListener);
    container.replaceChildren(this.root);
    this.renderShell();
    this.showReady();
  }

  renderShell() {
    this.root.innerHTML = `
      <div class="mg-heading"><h3 id="modal-title">${escapeHTML(this.config.label)}</h3><span class="mg-task-reward">${this.task.reward ? `+${escapeHTML(this.task.reward)} REP` : '+35 ENERGY'}</span></div>
      <p class="mg-instructions">${escapeHTML(this.config.instructions)}</p>
      <div class="mg-readouts">
        <span class="mg-progress-copy">0 / ${this.config.total} complete</span>
        <span class="mg-clock" role="timer" aria-label="Time remaining"><span class="mg-time">${this.config.duration}</span>s</span>
      </div>
      <div class="mg-progress" role="progressbar" aria-label="Task progress" aria-valuemin="0" aria-valuemax="${this.config.total}" aria-valuenow="0"><span class="mg-progress-fill"></span></div>
      <div class="mg-stage"></div>
      <p class="mg-feedback" role="status" aria-live="polite">The timer starts when you’re ready.</p>
      <div class="mg-footer"><button type="button" class="mg-text-button" data-action="cancel">Leave task</button><span class="mg-key-hint">${escapeHTML(this.config.keys)}</span></div>`;
    this.stage = this.root.querySelector('.mg-stage');
    this.feedback = this.root.querySelector('.mg-feedback');
    this.timeDisplay = this.root.querySelector('.mg-time');
    this.progressDisplay = this.root.querySelector('.mg-progress-copy');
    this.progressBar = this.root.querySelector('.mg-progress');
    this.progressFill = this.root.querySelector('.mg-progress-fill');
  }

  showReady() {
    const type = this.task.type;
    let art = `<div class="mg-ready-symbol" aria-hidden="true">✓</div>`;
    if (type === 'coffee') art = cupGraphic();
    else if (type === 'meeting' || type === 'survive') art = this.meetingGraphic();
    else if (type === 'password') art = '<div class="mg-code-preview" aria-hidden="true"><span>•</span><span>•</span><span>•</span><span>•</span></div>';
    else if (type === 'sql') art = '<div class="mg-ready-query" aria-hidden="true"><span>SELECT</span> a_better_day<span class="mg-editor-cursor">_</span></div>';
    else if (DIALOGUES[type]) art = '<div class="mg-envelope" aria-hidden="true"><span>↗</span></div>';
    this.stage.innerHTML = `<div class="mg-ready">${art}<p class="mg-ready-caption">${escapeHTML(this.task.description)}</p><button type="button" class="mg-button mg-primary" data-action="start">Let’s do this <span aria-hidden="true">→</span></button><span class="mg-ready-duration">${this.config.duration} seconds · ${this.config.total} ${type === 'password' ? 'digits' : 'steps'}</span></div>`;
    this.focus('[data-action="start"]');
  }

  start() {
    if (this.disposed || this.settled || !['ready', 'failed'].includes(this.state)) return;
    this.state = 'playing';
    this.progress = 0;
    this.elapsed = 0;
    this.remaining = this.config.duration;
    this.cooldown = 0;
    this.lastPourPass = -1;
    this.lastNodCycle = -1;
    this.meetingWindow = null;
    this.nodTime = 0;
    this.password = '2413';
    this.entered = '';
    this.memoryUntil = 3.5;
    this.memoryVisible = true;
    this.sequenceDone = [];
    this.root.classList.remove('mg-is-failed', 'mg-is-success');
    this.root.classList.add('mg-is-playing');
    this.root.querySelector('.mg-clock').classList.remove('mg-clock-urgent');
    this.renderGame();
    this.syncReadouts();
    this.playSound('click');
  }

  renderGame() {
    const type = this.task.type;
    if (type === 'coffee') {
      this.stage.innerHTML = `${cupGraphic()}<div class="mg-timing-head"><strong>Find the sweet spot</strong><span>POUR × 3</span></div>${this.timingRail(40, 26)}<div class="mg-rail-labels"><span>Too soon</span><span class="mg-sweet-label">Just right</span><span>Too late</span></div><button type="button" class="mg-button mg-primary mg-wide" data-action="primary">Pour coffee <kbd>Space</kbd></button><div class="mg-stamps" aria-label="Successful pours">${[1, 2, 3].map((n) => `<span class="mg-stamp" data-stamp="${n}">${n}</span>`).join('')}</div>`;
      this.setFeedback('Wait for the needle to enter the lime zone.');
    } else if (SEQUENCES[type]) {
      this.renderSequence();
    } else if (DIALOGUES[type]) {
      this.renderDialogue();
    } else if (type === 'sql') {
      this.renderSQL();
    } else if (type === 'password') {
      this.renderPassword();
    } else if (type === 'deadline') {
      this.renderRequest();
    }
    this.focusGame();
  }

  timingRail(start, width) {
    return `<div class="mg-timing-rail" aria-hidden="true"><span class="mg-target" style="left:${start}%;width:${width}%"></span><span class="mg-needle"></span></div>`;
  }

  meetingGraphic() {
    return `<div class="mg-video" aria-hidden="true"><span class="mg-video-status"><i></i> CONNECTED</span><div class="mg-avatar"><div class="mg-avatar-hair"></div><div class="mg-avatar-face"><i></i><i></i><b></b></div><div class="mg-avatar-body"></div></div><span class="mg-video-name">You · definitely listening</span><span class="mg-mic">•••</span></div>`;
  }

  renderSequence() {
    const type = this.task.type;
    const sequence = SEQUENCES[type];
    let graphic;
    if (type === 'repair' || type === 'deploy') {
      graphic = `<div class="mg-terminal"><div class="mg-terminal-bar"><span class="mg-terminal-dots" aria-hidden="true">● ● ●</span><span>${type === 'repair' ? 'workstation.local' : 'release / production'}</span></div><div class="mg-terminal-body"><p class="mg-terminal-muted">${type === 'repair' ? '> system: having a moment' : '> release: awaiting checklist'}</p>${this.sequenceDone.map((i) => `<p><span class="mg-terminal-check">✓</span> ${escapeHTML(sequence.done[i])}</p>`).join('')}<p class="mg-terminal-next"><span class="mg-editor-cursor">›</span> ${escapeHTML(sequence.steps[this.progress])}</p></div></div>`;
    } else if (type === 'jira') {
      graphic = `<div class="mg-ticket"><div class="mg-ticket-top"><span>WORK-${String(this.task.id).length + 100}</span><span class="mg-ticket-priority">NORMAL-URGENT</span></div><strong>Get this one thing done.</strong><div class="mg-ticket-status">${this.progress ? escapeHTML(sequence.done[this.progress - 1]) : 'Awaiting triage'}</div></div>`;
    } else {
      graphic = `<div class="mg-document"><div class="mg-document-title">The actually useful guide</div>${sequence.done.map((text, i) => `<div class="mg-document-line ${i < this.progress ? 'mg-line-done' : ''}"><span>${i < this.progress ? '✓' : String(i + 1).padStart(2, '0')}</span>${escapeHTML(text)}</div>`).join('')}</div>`;
    }
    this.stage.innerHTML = `${graphic}<p class="mg-note"><span>FOLLOW THIS ORDER</span>${escapeHTML(sequence.note)}</p><div class="mg-choice-grid">${sequence.labels.map((label, i) => `<button type="button" class="mg-choice ${this.sequenceDone.includes(sequence.order.indexOf(i)) ? 'mg-choice-done' : ''}" data-action="choose" data-value="${i}" ${this.sequenceDone.includes(sequence.order.indexOf(i)) ? 'disabled' : ''}><kbd>${i + 1}</kbd><span>${escapeHTML(label)}</span>${this.sequenceDone.includes(sequence.order.indexOf(i)) ? '<span aria-label="Completed">✓</span>' : ''}</button>`).join('')}</div>`;
    this.setFeedback(sequence.steps[this.progress]);
  }

  renderDialogue() {
    const question = DIALOGUES[this.task.type][this.progress];
    this.stage.innerHTML = `<div class="mg-message"><div class="mg-message-heading"><span class="mg-message-avatar" aria-hidden="true">${question.from.charAt(0)}</span><span>${escapeHTML(question.from)}</span><span class="mg-message-count">${this.progress + 1}/3</span></div><blockquote>${escapeHTML(question.message)}</blockquote></div><p class="mg-note"><span>YOUR BEST APPROACH</span>${escapeHTML(question.hint)}</p><div class="mg-answers">${this.answerButtons(question.answers)}</div>`;
    this.setFeedback('Choose a reply. The hint is on your side.');
  }

  answerButtons(answers) {
    return answers.map((answer, i) => `<button type="button" class="mg-choice" data-action="choose" data-value="${i}"><kbd>${i + 1}</kbd><span>${escapeHTML(answer)}</span><span class="mg-choice-arrow" aria-hidden="true">↗</span></button>`).join('');
  }

  renderSQL() {
    const step = SQL_STEPS[this.progress];
    this.stage.innerHTML = `<div class="mg-terminal"><div class="mg-terminal-bar"><span class="mg-terminal-dots" aria-hidden="true">● ● ●</span><span>find_the_humans.sql</span></div><div class="mg-query-lines">${SQL_STEPS.map((item, i) => `<div><span class="mg-line-number">${i + 1}</span><code class="${i > this.progress ? 'mg-terminal-muted' : ''}">${i < this.progress ? escapeHTML(item.code) : i === this.progress ? '<span class="mg-editor-cursor">▍</span> choose the next piece' : '…'}</code></div>`).join('')}</div><div class="mg-query-result"><span>GOAL</span> Show the names of active employees.</div></div><p class="mg-note"><span>PLAIN-ENGLISH HINT</span>${escapeHTML(step.hint)}</p><div class="mg-answers mg-code-answers">${this.answerButtons(step.answers)}</div>`;
    this.setFeedback('Choose the code that matches the hint.');
  }

  renderPassword() {
    if (this.memoryVisible) {
      this.stage.innerHTML = `<div class="mg-memory"><span class="mg-memory-label">MEMORIZE THIS CODE</span><div class="mg-code-preview" aria-label="Code: 2, 4, 1, 3">${this.password.split('').map((digit) => `<span>${digit}</span>`).join('')}</div><p>Read it left to right. You’ve got this.</p><button type="button" class="mg-button mg-primary" data-action="remember">I remember it <span aria-hidden="true">→</span></button></div>`;
      this.setFeedback('Memorize 2, 4, 1, 3. The code hides in a moment.');
    } else {
      this.stage.innerHTML = `<div class="mg-memory"><span class="mg-memory-label">ENTER THE FOUR-DIGIT CODE</span><div class="mg-code-preview mg-code-entry" aria-label="Entered code" aria-live="polite">${[0, 1, 2, 3].map((i) => `<span class="${i === this.entered.length ? 'mg-digit-current' : ''}">${this.entered[i] || '·'}</span>`).join('')}</div><div class="mg-keypad">${[1, 2, 3, 4].map((digit) => `<button type="button" class="mg-key" data-action="digit" data-value="${digit}">${digit}</button>`).join('')}</div><div class="mg-memory-tools"><button type="button" class="mg-text-button" data-action="erase">← Erase</button><button type="button" class="mg-text-button" data-action="peek">Peek again</button></div></div>`;
      this.setFeedback('Type the code in order. The fourth digit checks it.');
    }
  }

  renderRequest() {
    const [title, body] = REQUESTS[this.progress];
    this.stage.innerHTML = `<div class="mg-request-stack"><div class="mg-request"><div class="mg-request-top"><span class="mg-urgent-tag">ASAP</span><span>REQUEST ${String(this.progress + 1).padStart(2, '0')} / 08</span></div><h4>${escapeHTML(title)}</h4><p>${escapeHTML(body)}</p><div class="mg-request-sender"><span aria-hidden="true">↳</span> Someone who just “wanted to check in”</div></div></div><button type="button" class="mg-button mg-primary mg-wide" data-action="primary" ${this.cooldown > 0 ? 'disabled' : ''}>${this.cooldown > 0 ? 'Next request incoming…' : 'Resolve request'} <kbd>Space</kbd></button><div class="mg-queue" aria-label="${this.progress} of 8 requests resolved">${REQUESTS.map((_, i) => `<span class="${i < this.progress ? 'mg-queue-done' : i === this.progress ? 'mg-queue-current' : ''}">${i < this.progress ? '✓' : i + 1}</span>`).join('')}</div>`;
    this.setFeedback(this.progress ? 'Handled. Another “quick one” is on its way.' : 'Eight requests. One very capable you.');
  }

  handleClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || !this.root.contains(button) || button.disabled) return;
    this.act(button.dataset.action, button.dataset.value);
  }

  handleKey(event) {
    if (event.key === 'Escape' || event.altKey || event.ctrlKey || event.metaKey) return;
    const isSpace = event.key === ' ' || event.code === 'Space';
    const isEnter = event.key === 'Enter';
    const digit = /^[1-4]$/.test(event.key);
    const erase = event.key === 'Backspace';
    if (!isSpace && !isEnter && !digit && !erase) return;
    event.stopPropagation();
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    const focusedAction = event.target.closest?.('button[data-action]');
    if ((isEnter || isSpace) && focusedAction && !['primary', 'start', 'retry', 'remember'].includes(focusedAction.dataset.action)) return;
    event.preventDefault();
    if (this.state === 'ready' && (isSpace || isEnter)) return this.act('start');
    if (this.state === 'failed' && (isSpace || isEnter)) return this.act('retry');
    if (this.state !== 'playing') return;
    if (this.task.type === 'password') {
      if (this.memoryVisible && (isSpace || isEnter)) this.act('remember');
      else if (digit) this.act('digit', event.key);
      else if (erase) this.act('erase');
    } else if (digit) {
      this.act('choose', Number(event.key) - 1);
    } else if (isSpace || isEnter) {
      this.act('primary');
    }
  }

  act(action, value) {
    if (this.disposed || this.settled) return;
    if (action === 'cancel') return this.cancel();
    if (action === 'start' || action === 'retry') return this.start();
    if (this.state !== 'playing') return;
    const type = this.task.type;
    if (action === 'primary' && type === 'coffee') {
      if (this.cooldown > 0) return;
      const position = this.coffeePosition();
      const pass = Math.floor(this.elapsed * 2 / Math.PI);
      if (this.lastPourPass === pass) return;
      if (position >= 0.4 && position <= 0.66) {
        this.lastPourPass = pass;
        this.cooldown = 0.7;
        this.advance();
        if (this.state !== 'playing') return;
        this.root.querySelector('.mg-coffee-fill').setAttribute('y', String(72 - this.progress * 24));
        this.root.querySelector(`[data-stamp="${this.progress}"]`).classList.add('mg-stamp-done');
        this.setFeedback(`${this.progress}/3 good pours. Wait for the next pass.`, 'good');
      } else {
        this.cooldown = 0.25;
        this.mistake('A little off. Aim for the lime zone on the next pass.', 0.5);
      }
    } else if (action === 'primary' && type === 'deadline') {
      if (this.cooldown > 0) return;
      this.advance();
      if (this.state === 'playing') {
        this.cooldown = 0.65;
        this.renderRequest();
        this.root.focus({ preventScroll: true });
      }
    } else if (action === 'choose') {
      this.choose(Number(value));
    } else if (type === 'password') {
      this.passwordAction(action, value);
    }
  }

  choose(index) {
    const type = this.task.type;
    const sequence = SEQUENCES[type];
    const question = DIALOGUES[type]?.[this.progress] || (type === 'sql' ? SQL_STEPS[this.progress] : null);
    if (this.cooldown > 0 || !Number.isInteger(index) || index < 0 || index >= (sequence ? 4 : question ? 3 : 0)) return;
    if (sequence && this.sequenceDone.includes(sequence.order.indexOf(index))) return;
    const correct = sequence ? sequence.order[this.progress] : question.correct;
    if (index !== correct) {
      this.cooldown = 0.3;
      this.mistake(sequence ? `Not quite. Next: ${sequence.steps[this.progress]}` : `Try again. ${question.hint}`, 0.75);
      return;
    }
    if (sequence) this.sequenceDone.push(this.progress);
    this.advance();
    if (this.state !== 'playing') return;
    this.cooldown = 0.25;
    this.renderGame();
    this.setFeedback(sequence ? sequence.steps[this.progress] : 'Good call. Read the next message and hint.', 'good');
  }

  passwordAction(action, value) {
    if (action === 'remember' && this.memoryVisible) {
      this.hideMemory();
    } else if (action === 'peek' && !this.memoryVisible) {
      this.entered = '';
      this.progress = 0;
      this.memoryVisible = true;
      this.memoryUntil = this.elapsed + 2.5;
      this.renderPassword();
      this.syncReadouts();
      this.focusGame();
      this.playSound('click');
    } else if (action === 'erase' && !this.memoryVisible) {
      this.entered = this.entered.slice(0, -1);
      this.progress = this.entered.length;
      this.renderPassword();
      this.syncReadouts();
      this.focusGame();
    } else if (action === 'digit' && !this.memoryVisible && /^[1-4]$/.test(String(value))) {
      this.entered += String(value);
      this.playSound('click');
      if (this.entered.length === 4) {
        if (this.entered === this.password) {
          this.progress = 4;
          this.syncReadouts();
          this.complete();
          return;
        }
        this.entered = '';
        this.progress = 0;
        this.renderPassword();
        this.mistake('That code didn’t match. Try again, or use “Peek again”.', 0.75);
      } else {
        this.progress = this.entered.length;
        this.renderPassword();
      }
      this.syncReadouts();
      this.focusGame();
    }
  }

  hideMemory() {
    this.memoryVisible = false;
    this.renderPassword();
    this.focusGame();
  }

  coffeePosition() {
    return (Math.sin(this.elapsed * 2 - Math.PI / 2) + 1) / 2;
  }

  update(dt) {
    if (this.disposed || this.state !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    this.elapsed += dt;
    this.remaining = Math.max(0, this.remaining - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.syncClock();
    if (this.remaining <= 0) {
      this.fail();
      return;
    }
    const type = this.task.type;
    if (type === 'coffee') {
      this.root.querySelector('.mg-needle').style.left = `${this.coffeePosition() * 100}%`;
    } else if (type === 'password' && this.memoryVisible && this.elapsed >= this.memoryUntil) {
      this.hideMemory();
    } else if (type === 'deadline' && this.cooldown === 0) {
      const button = this.root.querySelector('[data-action="primary"]');
      if (button.disabled) {
        button.disabled = false;
        button.innerHTML = 'Resolve request <kbd>Space</kbd>';
        this.setFeedback('New request. You know what to do.');
      }
    }
  }

  advance() {
    this.progress += 1;
    this.syncReadouts();
    if (this.progress >= this.config.total) this.complete();
    else this.playSound('click');
  }

  mistake(message, penalty) {
    this.remaining = Math.max(0, this.remaining - penalty);
    this.syncClock();
    this.playSound('error');
    if (this.remaining <= 0) this.fail();
    else this.setFeedback(message, 'error');
  }

  syncClock() {
    const value = String(Math.ceil(this.remaining));
    if (this.timeDisplay.textContent !== value) this.timeDisplay.textContent = value;
    this.root.querySelector('.mg-clock').classList.toggle('mg-clock-urgent', this.remaining <= 5);
  }

  syncReadouts() {
    this.progressDisplay.textContent = `${this.progress} / ${this.config.total} ${this.task.type === 'password' ? 'digits entered' : 'complete'}`;
    this.progressFill.style.transform = `scaleX(${this.progress / this.config.total})`;
    this.progressBar.setAttribute('aria-valuenow', String(this.progress));
    this.syncClock();
  }

  setFeedback(message, kind = '') {
    if (this.disposed) return;
    this.feedback.textContent = message;
    this.feedback.className = `mg-feedback${kind ? ` mg-feedback-${kind}` : ''}`;
  }

  fail() {
    if (this.state !== 'playing' || this.disposed) return;
    this.state = 'failed';
    this.root.classList.remove('mg-is-playing', 'mg-nod-window');
    this.root.classList.add('mg-is-failed');
    this.stage.innerHTML = `<div class="mg-result"><div class="mg-result-symbol" aria-hidden="true">↻</div><h4>Let’s call that a dry run.</h4><p>Time ran out. No work completed, no judgement passed.</p><button type="button" class="mg-button mg-primary" data-action="retry">Try again <span aria-hidden="true">↻</span></button><span class="mg-ready-duration">Fresh timer · same challenge</span></div>`;
    this.setFeedback('Try again with a fresh timer, or leave the task.', 'error');
    this.playSound('error');
    this.focus('[data-action="retry"]');
  }

  complete() {
    if (this.settled || this.disposed || this.state !== 'playing') return;
    this.settled = true;
    this.state = 'success';
    this.root.classList.remove('mg-is-playing', 'mg-nod-window');
    this.root.classList.add('mg-is-success');
    this.stage.innerHTML = '<div class="mg-result"><div class="mg-result-symbol mg-result-success" aria-hidden="true">✓</div><h4>Consider it handled.</h4><p>A small win for you. A suspiciously large win for productivity.</p></div>';
    this.setFeedback('Task complete. Nice work.', 'good');
    this.root.querySelector('[data-action="cancel"]').disabled = true;
    this.playSound('success');
    this.onComplete();
  }

  cancel() {
    if (this.disposed || this.settled) return;
    this.settled = true;
    this.state = 'cancelled';
    this.playSound('click');
    this.onCancel();
  }

  focus(selector) {
    if (!this.disposed) this.root.querySelector(selector)?.focus({ preventScroll: true });
  }

  focusGame() {
    if (this.task.type === 'password') this.focus(this.memoryVisible ? '[data-action="remember"]' : '[data-action="digit"]');
    else if (SEQUENCES[this.task.type] || DIALOGUES[this.task.type] || this.task.type === 'sql') this.focus('[data-action="choose"]:not(:disabled)');
    else this.focus('[data-action="primary"]');
  }

  playSound(name) {
    this.sound(name);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.state = 'disposed';
    this.root.removeEventListener('click', this.clickListener);
    this.root.removeEventListener('keydown', this.keyListener);
    this.root.remove();
    this.onComplete = () => {};
    this.onCancel = () => {};
    this.sound = () => {};
  }
}

const OfficeMiniGame = createOfficeMiniGame(MiniGame);
const MultitaskMiniGame = createMultitaskMiniGame(MiniGame);
