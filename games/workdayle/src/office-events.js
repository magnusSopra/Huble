export const EVENT_DEFINITIONS = Object.freeze([
  { id: 'recruitment', title: 'CAREER OPPORTUNITY', description: 'A fictional rival recruiter wants to poach your calendar.', probability: 0.4, cooldown: 150, choices: ['Stay loyal', 'Accept offer'], consequence: 'REP or game over', eligible: state => !state.cvPending },
  { id: 'cv-warning', title: 'CV STATUS: YELLOW', description: 'Your CV has been flagged for insufficient buzzwords.', probability: 0.35, cooldown: 180, choices: ['Find a workstation'], consequence: 'Repair CV for REP', eligible: state => !state.cvPending },
  { id: 'meeting-invite', title: 'ANOTHER MEETING', description: 'You have been invited to align on the alignment.', probability: 0.25, cooldown: 120, choices: ['Dodge meeting', 'Not now'], consequence: 'Avoid attendance for REP', eligible: () => true },
]);

export function createOfficeEventState() {
  return { wait: 65, clock: 0, cooldowns: {}, active: null, outcomes: {}, cvPending: null, emergency: null, gameOver: null };
}

export function advanceOfficeEvents(state, dt, { eligible, ticking, bathroom }, random = Math.random) {
  if (!Number.isFinite(dt) || dt < 0 || state.gameOver) return null;
  if (state.emergency !== null) {
    if (!ticking) return null;
    state.emergency = Math.max(0, state.emergency - dt);
    if (state.emergency === 0) {
      state.gameOver = 'bathroom';
      state.outcomes.bathroom = 'failed';
      return { id: 'bathroom-failure' };
    }
    return null;
  }
  if (ticking && bathroom >= 100) {
    state.emergency = 20;
    state.active = null;
    return { id: 'bathroom-emergency' };
  }
  if (!eligible || state.active || !ticking) return null;
  state.clock += dt;
  state.wait = Math.max(0, state.wait - dt);
  if (state.wait > 0) return null;
  state.wait = 15;
  if (random() > 0.42) return null;
  const available = EVENT_DEFINITIONS.filter(event => event.eligible(state) && (state.cooldowns[event.id] ?? 0) <= state.clock);
  const total = available.reduce((sum, event) => sum + event.probability, 0);
  let pick = random() * total;
  const chosen = available.find(event => (pick -= event.probability) < 0);
  if (!chosen) return null;
  state.active = chosen.id;
  state.cooldowns[chosen.id] = state.clock + chosen.cooldown;
  state.wait = 95 + random() * 50;
  return chosen;
}

export function resolveOfficeEvent(state, outcome) {
  if (state.active) state.outcomes[state.active] = outcome;
  state.active = null;
}

export function relieveBathroom(state) {
  const emergency = state.emergency !== null;
  state.emergency = null;
  if (emergency) {
    state.outcomes.bathroom = 'completed';
    state.wait = Math.max(state.wait, 45);
  }
  return emergency;
}

export function validateOfficeEventState(state) {
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  const number = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
  const ids = EVENT_DEFINITIONS.map(event => event.id);
  return record(state) && number(state.wait, -1, 300) && number(state.clock, 0, Number.MAX_SAFE_INTEGER)
    && record(state.cooldowns) && Object.entries(state.cooldowns).every(([key, value]) => ids.includes(key) && number(value, 0, Number.MAX_SAFE_INTEGER))
    && record(state.outcomes) && Object.entries(state.outcomes).every(([key, value]) => [...ids, 'bathroom'].includes(key) && ['completed', 'failed', 'declined', 'pending'].includes(value))
    && (state.active === null || ids.includes(state.active))
    && (state.cvPending === null || Number.isInteger(state.cvPending) && number(state.cvPending, 0, 3))
    && (state.emergency === null || number(state.emergency, 0, 20))
    && (state.gameOver === null || ['recruitment', 'bathroom'].includes(state.gameOver));
}
