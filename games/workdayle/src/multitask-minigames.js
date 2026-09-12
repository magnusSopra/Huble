import { randomInt, shuffleArray, shuffleChoiceTexts, shuffleChoices } from './rng.js';

const meeting = (label) => ({
  label, duration: 30, total: 8,
  instructions: 'Scroll DOWN on the reel cue and nod at “Any thoughts?” in the SAME round, three times. Twice, an NPC asks you a direct question: STOP scrolling and choose the reply matching the green hint within 4 seconds. Wrong or late replies cost time; try again. Then resume both tabs.',
  keys: 'Space / N: nod · ↓ / wheel: reel · 1–3: answer question · Tab + Enter: buttons',
});

export const MULTITASK_GAMES = Object.freeze({
  meeting: meeting('Active listening. In two tabs.'),
  survive: meeting('The weekly daily distraction'),
  phone: {
    label: 'Strictly professional scrolling', duration: 30, total: 3,
    instructions: 'Read and scroll three fictional memes. One new post arrives each round. Watch the employee physically walk toward your desk: hide your phone before they arrive, then reopen it once they leave. Getting caught loses a saved meme and 1.5 seconds. A hidden phone earns nothing.',
    keys: 'H / Space: hide or show phone · ↓ / wheel down: next meme',
  },
  delegate: {
    label: 'Delegate work. Not blame.', duration: 20, total: 2,
    instructions: 'Read the job, choose the employee whose expertise fits, then press DELEGATE. A bad match complains and costs 1.5 seconds. Watch the right colleague head off to do the work.',
    keys: '1–3: choose colleague · D: delegate · Tab + Enter: buttons',
  },
  ai: {
    label: 'Artificially productive', duration: 12, total: 1,
    instructions: 'Press ASK AI for an entirely local, entirely fictional assistant. Read its questionable output, then file it as a draft for human review. This is not a production-ready strategy.',
    keys: 'A: ask AI · F: file draft · Tab + Enter: buttons',
  },
  'dodge-meeting': {
    label: 'Decline with plausible deniability', duration: 20, total: 3,
    instructions: 'Mark yourself unavailable, choose a believable excuse using the green hint, then SEND. An implausible send gets you dragged into a fictional 47-minute meeting with 0% productivity. Retry with a fresh timer — no actual meeting required.',
    keys: 'U: unavailable · 1–2: excuse · S: send · Tab + Space: native controls',
  },
  'cv-ai': {
    label: 'Your CV, now with extra synergy', duration: 16, total: 1,
    instructions: 'Choose ChatGPT, Claude or Sonnet, then ASK AI TO FIX IT. Read the fictional before/after and explicitly file the draft to finish. Everything is local: no account, upload, or external service.',
    keys: 'Tab / arrows: choose assistant · A: ask AI · F: file CV draft',
  },
});

export const MULTITASK_TYPES = Object.freeze(Object.keys(MULTITASK_GAMES));
export const ORIGINAL_TYPES = Object.freeze(['coffee', 'repair', 'email', 'client', 'help', 'docs', 'deploy', 'jira', 'sql', 'password', 'deadline']);

const REELS = [
  ['@pivot_pigeon', 'A pigeon joins the steering committee. Its only contribution: “coo-sign.”', '◇ BOARDROOM BIRDWATCH'],
  ['@spreadsheet_sprout', 'I watered the growth forecast. Now the cells have roots.', '♧ ORGANIC QUARTERLY GROWTH'],
  ['@standup_snail', 'Daily standup speedrun: yesterday I moved. Today: also moving.', '◎ AGILE, AT MY OWN PACE'],
  ['@printer_poet', 'Roses are red. The toner is blue. PAPER JAM. That is the poem.', '▤ PRINTED WITH FEELING'],
  ['@cloud_cabbage', 'Migrated lunch to the cloud. Forecast: scattered croutons.', '☁ SOFTWARE AS A SALAD'],
];
const REEL_ART = [
  '<ellipse cx="90" cy="55" rx="31" ry="23" fill="#819dad"/><circle cx="117" cy="34" r="16" fill="#9fb5bf"/><path d="m132 32 16 6-16 5" fill="#ddb45b"/><circle cx="122" cy="31" r="3" fill="#263f49"/><path class="mg-reel-wing" d="M83 38q-45 6-23 34l37-11Z" fill="#526d85"/><path d="m97 74-3 13m12-13 5 13" stroke="#bb8253" stroke-width="4"/>',
  '<path d="M45 20h90v65H45Z" fill="#faf9de"/><path d="M45 42h90M45 63h90M75 20v65M105 20v65" stroke="#6b947d" stroke-width="2"/><path d="M92 77V24" stroke="#466d43" stroke-width="5"/><ellipse class="mg-reel-wing" cx="78" cy="32" rx="19" ry="9" fill="#81ad67"/><ellipse cx="106" cy="45" rx="16" ry="8" fill="#5b9257"/>',
  '<path d="M40 79h108q17-9 7-26" fill="none" stroke="#a8b17c" stroke-width="14" stroke-linecap="round"/><circle cx="81" cy="58" r="25" fill="#ba9470"/><path d="M84 42q-25-3-20 22t27-3q-1-12-13-7" fill="none" stroke="#806955" stroke-width="4"/><path d="m147 53 1-21m8 23 12-20" stroke="#667346" stroke-width="3"/><circle cx="148" cy="30" r="4" fill="#263d31"/>',
  '<rect x="51" y="35" width="81" height="45" rx="8" fill="#81969b"/><rect x="63" y="15" width="56" height="29" fill="#fdf8e6"/><path d="M68 24h45M68 31h34" stroke="#7a9b93" stroke-width="3"/><path class="mg-reel-wing" d="m67 66 55-7 5 27-58 4Z" fill="#fcf5d4"/><circle cx="119" cy="48" r="4" fill="#dd977a"/>',
  '<path d="M45 49a19 19 0 0 1 22-18 26 26 0 0 1 48-2 23 23 0 0 1 13 45H53a14 14 0 0 1-8-25" fill="#edf7ed"/><circle class="mg-reel-wing" cx="82" cy="49" r="14" fill="#8daf70"/><circle cx="103" cy="55" r="14" fill="#a4c482"/><path d="m83 78-3 10m28-10 4 10" stroke="#799a9d" stroke-width="4"/>',
];
const STAFF = [
  { name: 'Mira', skill: 'Spreadsheets & formulas', complaint: '“I fix cells, not cell towers. Ask our network expert.”' },
  { name: 'Omar', skill: 'Networks & Wi-Fi', complaint: '“Have you tried turning the spreadsheet off? No? Ask Mira.”' },
  { name: 'Liv', skill: 'Writing & editing', complaint: '“I can proofread the error message. That is not the same as fixing it.”' },
];
const JOBS = [
  { title: 'Repair the broken budget formula', hint: 'Expertise needed: spreadsheets & formulas.', expert: 0 },
  { title: 'Restore the meeting room Wi-Fi', hint: 'Expertise needed: networks & Wi-Fi.', expert: 1 },
];
const QUESTIONS = [
  { speaker: 'Nora', prompt: 'Magnus, what do you think?', hint: 'Name an owner and a next step.', answers: ['The pigeon should chair this.', 'I’ll own the draft and share it today.', 'Sorry, the reel was buffering.'], correct: 1 },
  { speaker: 'Aksel', prompt: 'Magnus, can we promise everything by tomorrow?', hint: 'Agree the priority before promising a delivery.', answers: ['Let’s agree the priority and deliver that first.', 'Absolutely. Time is a mindset.', 'Can you ask the motivational cabbage?'], correct: 0 },
];
const AI_PROVIDERS = ['ChatGPT', 'Claude', 'Sonnet'];
const html = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const primary = (action, text, extra = '') => `<button type="button" class="mg-button mg-primary mg-wide" data-action="${action}" ${extra}>${text}</button>`;
const person = '<span class="mg-walker-head"></span><span class="mg-walker-body"></span><span class="mg-walker-leg mg-leg-left"></span><span class="mg-walker-leg mg-leg-right"></span>';
const shufflePrompt = (item) => {
  return { ...item, choices: shuffleChoiceTexts(item.answers, item.correct) };
};
export function buildDelegationStaffChoices(staff = STAFF, rng = Math.random) {
  return shuffleChoices(staff.map((member, staffId) => ({ ...member, staffId })), rng);
}

// Like the office extension, this shares the host's timer, retries and reward lifecycle.
export function createMultitaskMiniGame(BaseMiniGame) {
  return class MultitaskMiniGame extends BaseMiniGame {
    constructor(container, task, callbacks) {
      super(container, task, callbacks);
      this.wheelListener = event => {
        if (!event.target.closest('[data-reel]') || !event.deltaY) return;
        event.preventDefault();
        event.stopPropagation();
        this.act(event.deltaY > 0 ? 'scroll' : 'scroll-up');
      };
      this.root.addEventListener('wheel', this.wheelListener, { passive: false });
      this.changeListener = () => {
        if (this.disposed || this.settled || this.state !== 'playing' || !this.root.isConnected) return;
        if (this.task.type === 'dodge-meeting') this.paintDodge();
        else if (this.task.type === 'cv-ai' && this.aiPhase === 'ready') {
          this.provider = this.root.querySelector('[data-input="ai-provider"]').value;
          this.root.querySelector('[data-action="ask-cv"]').disabled = !this.aiProviders.includes(this.provider);
        }
      };
      this.root.addEventListener('change', this.changeListener);
    }

    showReady() {
      this.root.classList.add('mg-multitask');
      this.stage.innerHTML = `<div class="mg-ready"><div class="mg-ready-symbol" aria-hidden="true">${{ meeting: '↕', survive: '↕', phone: '▣', delegate: '→', ai: 'AI?', 'dodge-meeting': '↗', 'cv-ai': 'CV↑' }[this.task.type]}</div><p class="mg-ready-caption">${html(this.task.description || this.config.instructions)}</p>${primary('start', 'Ready when you are →')}<span class="mg-ready-duration">${this.config.duration} seconds · timer starts when you do</span></div>`;
      this.focus('[data-action="start"]');
    }

    start() {
      if (this.disposed || this.settled || !['ready', 'failed'].includes(this.state)) return;
      this.questions = shuffleArray(QUESTIONS.map(shufflePrompt));
      this.jobs = shuffleArray(JOBS.map(job => ({ ...job })));
      this.reelOffset = randomInt(0, REELS.length - 1);
      this.aiProviders = shuffleArray(AI_PROVIDERS);
      this.staffChoices = buildDelegationStaffChoices();
      this.excuses = shuffleArray([
        { value: 'client', label: 'Client deadline today. I’ll send written input.', hotkey: 1 },
        { value: 'moon', label: 'The moon has booked my calendar for cheese research.', hotkey: 2 },
      ]).map((item, index) => ({ ...item, hotkey: index + 1 }));
      this.nodded = new Set();
      this.scrolled = new Set();
      this.missed = new Set();
      this.suspicion = 0;
      this.scrollCooldown = 0;
      this.phoneHidden = false;
      this.readSeconds = 0;
      this.phoneCycle = 0;
      this.caught = new Set();
      this.reactionUntil = 0;
      this.selected = null;
      this.departure = null;
      this.aiPhase = 'ready';
      this.provider = '';
      this.meetingTime = 0;
      this.questionIndex = 0;
      this.questionActive = false;
      this.questionRemaining = 4;
      this.root.classList.remove('mg-caught', 'mg-phone-hidden', 'mg-nod-window', 'mg-question-active');
      super.start();
    }

    renderGame() {
      if (['meeting', 'survive'].includes(this.task.type)) this.renderMeeting();
      else if (this.task.type === 'phone') this.renderPhone();
      else if (this.task.type === 'delegate') this.renderDelegation();
      else if (this.task.type === 'dodge-meeting') this.renderDodge();
      else if (this.task.type === 'cv-ai') this.renderCVAi();
      else this.renderAI();
      this.focusGame();
    }

    focusGame() {
      this.focus('.mg-stage input:not(:disabled), .mg-stage select:not(:disabled), .mg-stage button:not(:disabled)');
    }

    reel() {
      return '<section class="mg-reel" data-reel tabindex="0" aria-label="Fictional reels. Read the cue, then scroll down."><span class="mg-reel-network">LOOPHOLE · ORIGINAL FICTIONAL REELS</span><strong class="mg-reel-author"></strong><div class="mg-reel-picture" aria-hidden="true"></div><span class="mg-reel-art" aria-hidden="true"></span><p class="mg-reel-caption"></p><span class="mg-reel-cue" role="status"></span></section>';
    }

    paintReel(index, cue) {
      const reel = REELS[(index + this.reelOffset) % REELS.length];
      const picture = this.root.querySelector('.mg-reel-picture');
      if (picture.dataset.index !== String((index + this.reelOffset) % REELS.length)) {
        picture.dataset.index = String((index + this.reelOffset) % REELS.length);
        picture.innerHTML = `<svg viewBox="0 0 180 100">${REEL_ART[(index + this.reelOffset) % REELS.length]}</svg>`;
      }
      picture.style.setProperty('--reel-bob', `${Math.sin(this.elapsed * 5) * 3}px`);
      picture.style.setProperty('--reel-flap', `${Math.sin(this.elapsed * 7) * 8}deg`);
      for (const [selector, text] of [['.mg-reel-author', reel[0]], ['.mg-reel-caption', reel[1]], ['.mg-reel-art', reel[2]], ['.mg-reel-cue', cue]]) {
        const element = this.root.querySelector(selector);
        if (element.textContent !== text) element.textContent = text;
      }
    }

    renderMeeting() {
      this.stage.innerHTML = `<div class="mg-attention-grid"><section class="mg-call-panel" aria-label="Meeting">${this.meetingGraphic()}<div class="mg-meeting-prompt"><strong class="mg-meeting-line"></strong><span class="mg-meeting-cue" role="status"></span></div>${this.timingRail(50, 29.17)}${primary('primary', 'Nod thoughtfully <kbd>Space</kbd>')}</section><div>${this.reel()}${primary('scroll', 'Next reel ↓')}</div></div><section class="mg-direct-question" aria-label="Answer the colleague" hidden></section><p class="mg-attention-score"></p>`;
      this.setFeedback('Read the reel first. Watch both cues — each has a generous window.');
      this.paintMeeting();
    }

    paintMeeting() {
      const cycle = Math.floor(this.meetingTime / 4.8), phase = this.meetingTime % 4.8;
      const nod = phase >= 2.4 && phase <= 3.8, scroll = phase >= 1.2 && phase <= 2.8;
      const nodded = this.nodded.has(cycle), scrolled = this.scrolled.has(cycle);
      this.root.querySelector('.mg-meeting-line').textContent = this.questionActive ? '“That question was for you.”' : nodded ? '“Excellent contribution.”' : nod ? '“Any thoughts?”' : '“Let’s align on the alignment…”';
      this.root.querySelector('.mg-meeting-cue').textContent = this.questionActive ? 'STOP SCROLLING · ANSWER BELOW' : nodded ? 'NOD RECORDED ✓' : nod ? 'NOD NOW ↓' : 'LISTEN…';
      this.root.querySelector('.mg-needle').style.left = `${phase / 4.8 * 100}%`;
      this.root.classList.toggle('mg-nod-window', nod && !nodded && !this.questionActive);
      this.root.classList.toggle('mg-question-active', this.questionActive);
      this.root.querySelector('[data-action="scroll"]').disabled = this.questionActive;
      this.root.querySelector('[data-action="primary"]').disabled = this.questionActive;
      this.root.querySelector('.mg-avatar').classList.toggle('mg-is-nodding', this.elapsed < this.nodTime);
      this.paintReel(cycle + Number(scrolled), this.questionActive ? 'PAUSED · answer your colleague first' : scrolled ? 'REEL SAVED ✓ · next round soon' : scroll ? 'SCROLL DOWN NOW ↓' : phase < 1.2 ? 'READ FIRST · scroll cue coming…' : 'WAIT · next reel window soon');
      const rounds = [...this.nodded].filter(round => this.scrolled.has(round)).length;
      this.root.querySelector('.mg-attention-score').textContent = `Multitasked rounds ${rounds}/3 · This round: ${nodded ? 'nod ✓' : 'nod —'} / ${scrolled ? 'reel ✓' : 'reel —'} · Questions ${this.questionIndex}/${this.questions.length} · Suspicion ${this.suspicion}`;
      if (this.questionActive) this.root.querySelector('.mg-question-time').textContent = `${Math.ceil(this.questionRemaining)}s to reply · hints below`;
    }

    showQuestion() {
      this.questionActive = true;
      this.questionRemaining = 4;
      const question = this.questions[this.questionIndex];
      const panel = this.root.querySelector('.mg-direct-question');
      panel.hidden = false;
      panel.innerHTML = `<h4>${question.speaker}: “${question.prompt}”</h4><span class="mg-question-time" role="status"></span><p class="mg-note"><span>STOP SCROLLING · YOUR REPLY SHOULD</span>${question.hint}</p><div class="mg-answers">${question.choices.map((choice, index) => `<button type="button" class="mg-choice" data-action="answer-question" data-value="${index}"><kbd>${index + 1}</kbd><span>${html(choice.text)}</span></button>`).join('')}</div>`;
      this.setFeedback('Direct question! Reels and nod timing pause, but your task timer keeps running.');
      this.paintMeeting();
      this.focus('[data-action="answer-question"]');
    }

    suspicious(message) {
      this.suspicion++;
      this.mistake(message, .6);
    }

    meetingAction(action, value) {
      const cycle = Math.floor(this.meetingTime / 4.8), phase = this.meetingTime % 4.8;
      if (this.questionActive) {
        if (action === 'answer-question' && this.cooldown === 0 && /^[0-2]$/.test(String(value))) {
          this.cooldown = .35;
          const question = this.questions[this.questionIndex];
          if (!question.choices[Number(value)]?.isCorrect) return this.mistake(`Try again: ${question.hint} −0.75s`, .75);
          this.questionIndex++;
          this.questionActive = false;
          this.root.querySelector('.mg-direct-question').hidden = true;
          this.setFeedback('Useful answer. Back to reels AND timed nods.', 'good');
        } else {
          if (['scroll', 'scroll-up'].includes(action) && this.scrollCooldown === 0) {
            this.scrollCooldown = .4;
            this.suspicious('Stop scrolling! Answer the question using the green hint first.');
          }
          return;
        }
      } else if (action === 'answer-question') return;
      if (action === 'primary') {
        if (this.nodded.has(cycle) || this.cooldown > 0) return;
        this.cooldown = .35;
        if (phase < 2.4 || phase > 3.8) this.suspicious('Suspicious nod. They were asking who broke the printer. Wait for “Any thoughts?”');
        else { this.nodded.add(cycle); this.nodTime = this.elapsed + .6; this.setFeedback('Convincing nod. Remember the other screen.', 'good'); }
      } else if (action === 'scroll' || action === 'scroll-up') {
        if (this.scrollCooldown > 0) return;
        this.scrollCooldown = .4;
        if (action === 'scroll' && this.scrolled.has(cycle)) return;
        if (action === 'scroll-up' || phase < 1.2 || phase > 2.8) this.suspicious('Suspicious scrolling. Read first, then scroll DOWN when the reel cue invites you.');
        else { this.scrolled.add(cycle); this.setFeedback('Reel saved. Keep an eye on the meeting.', 'good'); }
      } else if (action !== 'answer-question') return;
      if (this.state !== 'playing') return;
      const rounds = [...this.nodded].filter(round => this.scrolled.has(round)).length;
      this.progress = Math.min(3, rounds) * 2 + this.questionIndex + (rounds < 3 && this.nodded.has(cycle) !== this.scrolled.has(cycle) ? 1 : 0);
      this.syncReadouts();
      if (this.progress === this.config.total) this.complete();
      else {
        this.paintMeeting();
        if (action === 'answer-question') this.focus('[data-action="primary"]');
      }
    }

    renderPhone() {
      this.stage.innerHTML = `<div class="mg-approach-scene" aria-label="Office corridor. An employee walks toward your desk."><span class="mg-hall-label">OFFICE CORRIDOR</span><div class="mg-walker" role="img" aria-label="Approaching employee">${person}</div><div class="mg-player-desk">YOUR<br>DESK</div><span class="mg-approach-status" role="status"></span></div><div class="mg-phone-frame">${this.reel()}<div class="mg-phone-cover">PHONE HIDDEN<br><small>Very interested in this spreadsheet.</small></div></div><div class="mg-phone-controls">${primary('toggle-phone', 'Hide phone <kbd>H</kbd>', 'aria-pressed="false"')}${primary('scroll', 'Save meme / next ↓')}</div>`;
      this.setFeedback('Read a post, then scroll. Watch the corridor — that colleague really is coming over.');
      this.paintPhone();
    }

    paintPhone() {
      const phase = this.elapsed % 7;
      const walking = phase >= 2.4 && phase < 6;
      const distance = phase < 2.4 ? 0 : phase < 4 ? (phase - 2.4) / 1.6 : phase < 5 ? 1 : phase < 6 ? 6 - phase : 0;
      this.paintWalker(distance, walking);
      const status = phase < 2.4 || phase >= 6 ? 'At their desk · safe to read' : phase < 4 ? 'WALKING TOWARD YOU · hide now!' : phase < 5 ? 'AT YOUR DESK · keep phone hidden' : 'Walking away · wait until clear';
      this.root.querySelector('.mg-approach-status').textContent = status;
      this.root.classList.toggle('mg-caught', this.elapsed < this.reactionUntil);
      this.root.classList.toggle('mg-phone-hidden', this.phoneHidden);
      const toggle = this.root.querySelector('[data-action="toggle-phone"]');
      toggle.innerHTML = `${this.phoneHidden ? 'Show' : 'Hide'} phone <kbd>H</kbd>`;
      toggle.setAttribute('aria-pressed', String(this.phoneHidden));
      this.root.querySelector('[data-reel]').setAttribute('aria-hidden', String(this.phoneHidden));
      this.root.querySelector('[data-reel]').tabIndex = this.phoneHidden ? -1 : 0;
      this.root.querySelector('[data-action="scroll"]').disabled = this.phoneHidden;
      const saved = this.scrolled.has(this.phoneCycle);
      this.paintReel(this.phoneCycle, saved ? 'SAVED ✓ · new post next round' : this.phoneHidden ? 'PHONE HIDDEN · no reading progress' : this.readSeconds >= 1.2 ? 'READ ✓ · SCROLL DOWN TO SAVE' : 'READ FIRST · take a moment…');
    }

    paintWalker(distance, walking = true) {
      const walker = this.root.querySelector('.mg-walker');
      walker.style.left = `${8 + distance * 61}%`;
      walker.style.setProperty('--stride', `${walking ? Math.sin(this.elapsed * 13) * 24 : 0}deg`);
    }

    detectPhone(cycle) {
      if (this.caught.has(cycle)) return;
      this.caught.add(cycle);
      this.progress = Math.max(0, this.progress - 1);
      this.readSeconds = 0;
      this.reactionUntil = this.elapsed + 1.8;
      this.syncReadouts();
      this.mistake('“Is that pigeon our new consultant?!” Caught: one saved meme lost, 1.5s spent explaining the bird.', 1.5);
    }

    phoneAction(action) {
      if (action === 'toggle-phone' || action === 'primary') {
        this.phoneHidden = !this.phoneHidden;
        if (!this.phoneHidden && this.elapsed % 7 >= 4 && this.elapsed % 7 < 5) this.detectPhone(this.phoneCycle);
        if (this.state === 'playing') this.paintPhone();
      } else if ((action === 'scroll' || action === 'scroll-up') && !this.phoneHidden && this.scrollCooldown === 0) {
        this.scrollCooldown = .4;
        if (action === 'scroll' && this.scrolled.has(this.phoneCycle)) return;
        if (action === 'scroll-up' || this.readSeconds < 1.2) this.mistake('Read the post first, then scroll DOWN. Even the algorithm has standards.', .4);
        else {
          this.scrolled.add(this.phoneCycle);
          this.advance();
          if (this.state === 'playing') this.setFeedback('Meme saved. A new post arrives next round. Watch for your colleague.', 'good');
        }
        if (this.state === 'playing') this.paintPhone();
      }
    }

    renderDelegation() {
      const job = this.jobs[this.progress];
      this.stage.innerHTML = `<div class="mg-job-brief"><span>JOB ${this.progress + 1}/2</span><h4>${job.title}</h4><p>${job.hint}</p></div><div class="mg-staff-list">${this.staffChoices.map((staff, index) => `<button type="button" class="mg-choice" data-action="employee" data-value="${staff.staffId}" aria-pressed="${this.selected === staff.staffId}"><kbd>${index + 1}</kbd><span><strong>${staff.name}</strong><small>${staff.skill}</small></span></button>`).join('')}</div>${primary('delegate-work', 'DELEGATE → <kbd>D</kbd>')}<p class="mg-delegate-status" role="status">Select expertise, not whoever looks least busy.</p><div class="mg-departure-scene" aria-label="Selected employee heading off to work" hidden><div class="mg-walker" role="img" aria-label="Employee walking to the job">${person}</div><span class="mg-job-door">TO WORK →</span></div>`;
      this.setFeedback('Pick the right expertise, then explicitly delegate the job.');
    }

    delegationAction(action, value) {
      if (this.departure) return;
      if (action === 'employee' && STAFF[Number(value)]) {
        this.selected = Number(value);
        this.root.querySelectorAll('[data-action="employee"]').forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.value) === this.selected)));
        this.root.querySelector('.mg-delegate-status').textContent = `${STAFF[this.selected].name} selected. Press DELEGATE to assign.`;
      } else if (action === 'delegate-work') {
        if (this.selected === null) return this.setFeedback('Choose an employee first. “Everyone” is not an employee.');
        if (this.selected !== this.jobs[this.progress].expert) {
          const complaint = STAFF[this.selected].complaint;
          this.root.querySelector('.mg-delegate-status').textContent = complaint;
          return this.mistake(`${complaint} Reassign the job. −1.5s`, 1.5);
        }
        this.departure = { start: this.elapsed, employee: this.selected };
        this.root.querySelectorAll('.mg-stage button').forEach(el => { el.disabled = true; });
        this.root.querySelector('.mg-departure-scene').hidden = false;
        this.root.querySelector('.mg-delegate-status').textContent = `${STAFF[this.selected].name}: “On it. Please don’t schedule a check-in before I get there.”`;
        this.paintWalker(0);
        this.root.focus({ preventScroll: true });
      }
    }

    renderAI() {
      const output = Array.from(String(this.task.id)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 === 0
        ? 'Strategy: reduce meetings by combining them into one permanent meeting. Estimated time saved: negative Tuesday.'
        : 'Draft plan: name an owner, agree a deadline, measure the result. Also appoint a motivational cabbage. Confidence: 104%.';
      this.stage.innerHTML = `<div class="mg-ai-console"><span>OFFLINE ASSISTANT · NO EXTERNAL API</span><h4>“Draft a plan to improve office productivity.”</h4>${this.aiPhase === 'ready' ? '<p>One large button. Several small doubts.</p>' : this.aiPhase === 'processing' ? '<p class="mg-ai-processing" role="status">Processing… consulting the imaginary synergy engine.</p><div class="mg-ai-processing-meter"><span></span></div>' : `<blockquote class="mg-ai-output">${output}</blockquote><p class="mg-ai-warning">Unverified draft. Human review required. Please do not deploy the cabbage.</p>`}</div>${this.aiPhase === 'output' ? primary('file-ai', 'File draft for human review <kbd>F</kbd>') : primary('ask-ai', this.aiPhase === 'processing' ? 'ASKING…' : 'ASK AI <kbd>A</kbd>', this.aiPhase === 'processing' ? 'disabled' : '')}`;
      this.setFeedback(this.aiPhase === 'output' ? 'Artificial confidence is not accuracy. Save this as a draft, not a fact.' : 'No accounts, network calls, or actual intelligence required.');
    }

    renderDodge() {
      this.stage.innerHTML = `<div class="mg-job-brief"><span>CALENDAR INVITE · 47 MINUTES</span><h4>Pre-alignment alignment catch-up</h4><p>Agenda: decide the agenda for the next meeting.</p></div><p class="mg-note"><span>PLAUSIBLE ESCAPE ROUTE</span>You have a client deadline today. Mark unavailable and offer written input instead.</p><label class="mg-native-option"><input type="checkbox" data-input="unavailable"> Mark me unavailable <kbd>U</kbd></label><fieldset class="mg-excuses"><legend>Choose your excuse</legend>${this.excuses.map(item => `<label class="mg-native-option"><input type="radio" name="meeting-excuse" value="${item.value}" data-input="excuse"><span><kbd>${item.hotkey}</kbd> ${item.label}</span></label>`).join('')}</fieldset>${primary('send-excuse', 'SEND polite decline <kbd>S</kbd>')}<p class="mg-dodge-status" role="status">Set your availability, then select a believable excuse.</p>`;
      this.setFeedback('Avoid 47 minutes of saying “you’re on mute”. Read the green hint.');
    }

    paintDodge() {
      const unavailable = this.root.querySelector('[data-input="unavailable"]').checked;
      const excuse = this.root.querySelector('[data-input="excuse"]:checked');
      this.progress = Number(unavailable) + Number(Boolean(excuse));
      this.syncReadouts();
      this.root.querySelector('.mg-dodge-status').textContent = `${unavailable ? 'Unavailable ✓' : 'Still available'} · ${excuse ? 'Excuse selected' : 'Choose an excuse'} · Nothing sent yet`;
    }

    dodgeAction(action, value) {
      if (action === 'unavailable') this.root.querySelector('[data-input="unavailable"]').click();
      else if (action === 'excuse' && [0, 1].includes(Number(value))) this.root.querySelectorAll('[data-input="excuse"]')[Number(value)].click();
      else if (action === 'send-excuse') {
        const unavailable = this.root.querySelector('[data-input="unavailable"]').checked;
        const excuse = this.root.querySelector('[data-input="excuse"]:checked')?.value;
        if (!unavailable || excuse !== 'client') {
          this.remaining = Math.max(0, this.remaining - 2);
          this.syncClock();
          this.fail();
          this.stage.querySelector('h4').textContent = 'Dragged into a 47-minute meeting.';
          this.stage.querySelector('.mg-result > p').textContent = 'Productivity: 0%. The minutes have minutes. Only 2 virtual seconds lost — retry, mark unavailable and cite your client deadline.';
          this.setFeedback('Decline rejected. No reward. The green hint gives you a believable retry.', 'error');
        } else {
          this.progress = 2;
          this.advance();
        }
      }
    }

    renderCVAi() {
      const ready = this.aiPhase === 'ready', output = this.aiPhase === 'output';
      this.stage.innerHTML = `<div class="mg-ai-console"><span>LOCAL CV DRAFT · NO UPLOAD OR API</span><h4>Turn “did some work” into executive potential.</h4>${ready ? `<label class="mg-provider">Choose your fictional assistant<select data-input="ai-provider"><option value="">Choose an assistant…</option>${this.aiProviders.map(provider => `<option>${provider}</option>`).join('')}</select></label>` : `<p>Assistant: <strong>${html(this.provider)}</strong> · fictional demo</p>`}<div class="mg-cv-comparison"><section><h4>BEFORE</h4><p>Made a spreadsheet. Helped with meetings. Occasionally found the printer.</p></section>${output ? '<section class="mg-cv-after"><h4>AFTER</h4><p>Architected a cell-based decision ecosystem. Orchestrated cross-functional nodding. Pioneered toner-location intelligence.</p></section>' : ''}</div>${this.aiPhase === 'processing' ? '<p class="mg-ai-processing" role="status">Processing… inflating three bullet points into a leadership journey.</p><div class="mg-ai-processing-meter"><span></span></div>' : output ? '<p class="mg-cv-status" role="status">CV POLISHED ✓ · buzzword density +400%</p><p class="mg-ai-warning">Fictional draft, not verified experience. Review the facts before sharing.</p>' : ''}</div>${output ? primary('file-cv', 'File CV draft for human review <kbd>F</kbd>') : primary('ask-cv', ready ? 'ASK AI TO FIX IT <kbd>A</kbd>' : 'FIXING…', 'disabled')}`;
      this.setFeedback(output ? 'Green status is not a qualification. Explicitly file the draft to finish.' : 'Select an assistant. No real CV, service, or account is used.');
    }

    cvAction(action) {
      if (action === 'ask-cv' && this.aiPhase === 'ready') {
        this.provider = this.root.querySelector('[data-input="ai-provider"]').value;
        if (!this.aiProviders.includes(this.provider)) return this.setFeedback('Choose ChatGPT, Claude or Sonnet first.');
        this.aiPhase = 'processing';
        this.aiStarted = this.elapsed;
        this.renderCVAi();
        this.root.focus({ preventScroll: true });
      } else if (action === 'file-cv' && this.aiPhase === 'output') this.advance();
    }

    act(action, value) {
      if (this.disposed || this.settled || !this.root.isConnected) return;
      if (['start', 'retry', 'cancel'].includes(action)) return super.act(action, value);
      if (this.state !== 'playing') return;
      if (['meeting', 'survive'].includes(this.task.type)) this.meetingAction(action, value);
      else if (this.task.type === 'phone') this.phoneAction(action);
      else if (this.task.type === 'delegate') this.delegationAction(action, value);
      else if (this.task.type === 'dodge-meeting') this.dodgeAction(action, value);
      else if (this.task.type === 'cv-ai') this.cvAction(action);
      else if (action === 'ask-ai' && this.aiPhase === 'ready') {
        this.aiPhase = 'processing';
        this.aiStarted = this.elapsed;
        this.renderAI();
        this.root.focus({ preventScroll: true });
      } else if (action === 'file-ai' && this.aiPhase === 'output') this.advance();
    }

    handleKey(event) {
      if (event.key === 'Escape' || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target.closest?.('input, select, textarea')) {
        event.stopPropagation();
        return;
      }
      const key = event.key.toLowerCase(), focused = event.target.closest?.('button[data-action]');
      const shortcut = this.task.type === 'delegate' ? (/^[1-3]$/.test(key) ? 'employee' : key === 'd' ? 'delegate-work' : null)
        : this.task.type === 'ai' ? (key === 'a' ? 'ask-ai' : key === 'f' ? 'file-ai' : null)
        : this.task.type === 'cv-ai' ? (key === 'a' ? 'ask-cv' : key === 'f' ? 'file-cv' : null)
        : this.task.type === 'dodge-meeting' ? (/^[1-2]$/.test(key) ? 'excuse' : key === 'u' ? 'unavailable' : key === 's' ? 'send-excuse' : null)
        : this.questionActive && /^[1-3]$/.test(key) ? 'answer-question'
        : key === 'arrowdown' ? 'scroll' : key === 'arrowup' ? 'scroll-up' : this.task.type === 'phone' && key === 'h' ? 'toggle-phone'
          : ['meeting', 'survive'].includes(this.task.type) && key === 'n' ? 'primary' : null;
      const spaceAction = key === ' ' && this.state === 'playing' && (!focused || !['cancel', 'start', 'retry'].includes(focused.dataset.action))
        && ['meeting', 'survive', 'phone'].includes(this.task.type) && !this.questionActive;
      if (shortcut || spaceAction) {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat && this.state === 'playing') {
          const value = this.task.type === 'delegate' && shortcut === 'employee'
            ? this.staffChoices[Number(key) - 1]?.staffId
            : Number(key) - 1;
          this.act(shortcut || 'primary', value);
        }
        return;
      }
      if (key === ' ' || key === 'enter') {
        event.stopPropagation();
        if (event.repeat) { event.preventDefault(); return; }
        if (!focused) {
          event.preventDefault();
          if (this.state === 'ready' || this.state === 'failed') this.act(this.state === 'ready' ? 'start' : 'retry');
        }
      }
    }

    update(dt) {
      if (this.disposed || this.state !== 'playing' || !this.root.isConnected || !Number.isFinite(dt) || dt <= 0) return;
      const before = this.elapsed;
      super.update(dt);
      if (this.state !== 'playing' || this.disposed) return;
      this.scrollCooldown = Math.max(0, this.scrollCooldown - dt);
      const type = this.task.type;
      if (type === 'meeting' || type === 'survive') {
        if (this.questionActive) {
          this.questionRemaining -= dt;
          if (this.questionRemaining <= 0) {
            this.questionRemaining = 4;
            this.suspicion++;
            this.mistake(`Reply overdue. −1.5s. Try now: ${this.questions[this.questionIndex].hint}`, 1.5);
            if (this.state !== 'playing') return;
          }
          this.paintMeeting();
          return;
        }
        const meetingBefore = this.meetingTime;
        const questionAt = (this.questionIndex + 1) * 4.8;
        this.meetingTime = this.questionIndex < this.questions.length ? Math.min(this.meetingTime + dt, questionAt) : this.meetingTime + dt;
        for (let cycle = Math.floor(meetingBefore / 4.8); cycle * 4.8 + 3.8 < this.meetingTime; cycle++) {
          if (!this.missed.has(cycle) && !this.nodded.has(cycle)) {
            this.missed.add(cycle);
            this.suspicious('“Still with us?” Missed nod: your very active listening is under review.');
            if (this.state !== 'playing') return;
          }
        }
        if (this.questionIndex < this.questions.length && this.meetingTime >= questionAt) this.showQuestion();
        else this.paintMeeting();
      } else if (type === 'phone') {
        const cycle = Math.floor(this.elapsed / 7);
        if (cycle !== this.phoneCycle) { this.phoneCycle = cycle; this.readSeconds = 0; }
        if (!this.phoneHidden) {
          for (let check = Math.floor(before / 7); check <= cycle; check++) {
            if (before < check * 7 + 5 && this.elapsed >= check * 7 + 4) this.detectPhone(check);
            if (this.state !== 'playing') return;
          }
          if (this.elapsed % 7 < 4 || this.elapsed % 7 >= 5) this.readSeconds = Math.min(1.2, this.readSeconds + Math.min(dt, this.elapsed - cycle * 7));
        }
        this.paintPhone();
      } else if (type === 'delegate' && this.departure) {
        const travel = (this.elapsed - this.departure.start) / 1.3;
        this.paintWalker(Math.min(1, travel));
        if (travel >= 1) {
          this.departure = null;
          this.selected = null;
          this.advance();
          if (this.state === 'playing') this.renderGame();
        }
      } else if (['ai', 'cv-ai'].includes(type) && this.aiPhase === 'processing') {
        const progress = Math.min(1, (this.elapsed - this.aiStarted) / 1.4);
        this.root.querySelector('.mg-ai-processing-meter span').style.transform = `scaleX(${progress})`;
        if (progress >= 1) {
          this.aiPhase = 'output';
          if (type === 'cv-ai') this.renderCVAi();
          else this.renderAI();
          this.focusGame();
        }
      }
    }

    suspend() {
      // The host pauses update() and detaches this modal; there are no held inputs or wall-clock animations.
    }

    dispose() {
      if (this.disposed) return;
      this.root.removeEventListener('wheel', this.wheelListener);
      this.root.removeEventListener('change', this.changeListener);
      super.dispose();
    }
  };
}
