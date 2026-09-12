export const TIMED_MODES = new Set(['office', 'dialogue', 'elevator', 'minigame', 'intro', 'combat', 'promotion', 'defeat', 'event', 'cutscene']);
export const BEST_KEY = 'workdayle-best-v2';

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function rateRun(seconds) {
  if (seconds <= 600) return { name: 'Executive Material', line: 'An alarming lack of work-life balance. The board is impressed.' };
  if (seconds <= 1200) return { name: 'Synergy Speedrunner', line: 'You have successfully disrupted the concept of office hours.' };
  if (seconds <= 1800) return { name: 'Billable Legend', line: 'An entire career, delivered before the meeting finished.' };
  return { name: 'Relentlessly Promotable', line: 'You stayed the course. Nobody can find the course documentation.' };
}

export function finalResult(state) {
  return makeResult({
    time: state.elapsed, rep: state.rep.reduce((sum, rep) => sum + rep, 0),
    tasks: state.completed.size, bosses: state.bossesDefeated,
    legacy: state.legacy,
  });
}

export function makeResult({ time, rep, tasks, bosses, legacy = false }) {
  return { time, rep, tasks, bosses, legacy, score: Math.round(1000000 / (1 + time / 300)), rating: rateRun(time) };
}

// Use wall time rather than capped physics deltas: a slow renderer cannot improve a run.
export class RunClock {
  constructor(state, now = () => performance.now()) {
    this.state = state;
    this.now = now;
    this.last = now();
    this.active = false;
  }

  sync() {
    const now = this.now();
    if (this.active && !this.state.complete) this.state.elapsed += Math.max(0, now - this.last) / 1000;
    this.last = now;
  }

  mode(mode) {
    this.sync();
    this.active = TIMED_MODES.has(mode) && !this.state.complete;
  }
}
