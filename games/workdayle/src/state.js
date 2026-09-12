import { FLOORS, TITLES } from './content.js';
import { OFFICE_BOUNDS, OFFICE_SPAWN, ELEVATOR_SPAWN } from './layout.js';
import { finalResult, makeResult } from './run.js';
import { createOfficeEventState, validateOfficeEventState } from './office-events.js';

export const SAVE_KEY = 'workdayle-save-v1';
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class GameState {
  constructor(saved = null) {
    this.rank = saved?.rank ?? 0;
    this.floor = saved?.floor ?? 0;
    this.rep = saved ? [...saved.rep] : FLOORS.map(() => 0);
    this.completed = new Set(saved?.completed ?? []);
    this.collectibles = new Set(saved?.collectibles ?? []);
    this.officeLife = saved?.officeLife ? structuredClone(saved.officeLife) : createOfficeEventState();
    this.energy = saved?.energy ?? 100;
    this.bathroom = saved?.bathroom ?? 0;
    this.health = 100;
    this.position = { ...(saved?.position ?? OFFICE_SPAWN) };
    this.elapsed = saved?.elapsed ?? 0;
    this.bossesDefeated = saved?.bossesDefeated ?? 0;
    this.legacy = saved?.legacy ?? false;
    this.introSeen = saved?.introSeen ?? Boolean(saved);
    this.complete = this.rank === TITLES.length - 1;
    this.result = saved?.result ? makeResult(saved.result) : this.complete ? finalResult(this) : null;
  }

  get title() { return TITLES[this.rank]; }
  get bossReady() {
    return this.floor === this.rank && !this.complete
      && this.rep[this.floor] >= FLOORS[this.floor].threshold;
  }

  taskKey(task) { return `${this.floor}:${task.id}`; }
  isDone(task) { return this.completed.has(this.taskKey(task)); }

  completeTask(task) {
    const definition = FLOORS[this.floor].tasks.find(t => t.id === task.id);
    if (!definition || this.isDone(task)) return false;
    this.completed.add(this.taskKey(task));
    this.rep[this.floor] += definition.reward;
    this.energy = clamp(this.energy - definition.energyCost, 0, 100);
    if (definition.type === 'coffee') this.drinkCoffee();
    return true;
  }

  drinkCoffee() {
    this.energy = clamp(this.energy + 35, 0, 100);
    this.bathroom = clamp(this.bathroom + 25, 0, 100);
  }

  promote() {
    if (!this.bossReady) return false;
    this.rank += 1;
    this.bossesDefeated += 1;
    this.complete = this.rank === TITLES.length - 1;
    if (this.complete) this.result = finalResult(this);
    this.health = 100;
    this.energy = 100;
    return true;
  }

  changeFloor(index) {
    if (!Number.isInteger(index) || index < 0 || index > this.rank) return false;
    this.floor = index;
    this.position = { ...ELEVATOR_SPAWN };
    return true;
  }

  serialize() {
    return {
      version: 2, rank: this.rank, floor: this.floor, rep: [...this.rep],
      completed: [...this.completed], energy: this.energy, bathroom: this.bathroom,
      position: { ...this.position }, elapsed: this.elapsed,
      bossesDefeated: this.bossesDefeated, legacy: this.legacy, result: this.result,
      introSeen: this.introSeen,
      collectibles: [...this.collectibles], officeLife: structuredClone(this.officeLife),
    };
  }
}

export function parseSave(text) {
  const saved = JSON.parse(text);
  const numberIn = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
  const old = saved?.version === 1;
  const lastRank = old ? 3 : TITLES.length - 1;
  if (!saved || ![1, 2].includes(saved.version)
    || !Number.isInteger(saved.rank) || !numberIn(saved.rank, 0, lastRank)
    || !Number.isInteger(saved.floor) || !numberIn(saved.floor, 0, saved.rank)
    || !Array.isArray(saved.rep) || saved.rep.length !== (old ? 4 : FLOORS.length)
    || !saved.rep.every(n => numberIn(n, 0, 10000))
    || !Array.isArray(saved.completed) || !saved.completed.every(s => typeof s === 'string')
    || !numberIn(saved.energy, 0, 100) || !numberIn(saved.bathroom, 0, 100)
    || !numberIn(saved.position?.x, -OFFICE_BOUNDS.x, OFFICE_BOUNDS.x)
    || !numberIn(saved.position?.z, -OFFICE_BOUNDS.z, OFFICE_BOUNDS.z)
    || !numberIn(saved.elapsed, 0, Number.MAX_SAFE_INTEGER)) {
    throw new Error('This save is not compatible with Workdayle.');
  }
  if (old) {
    return {
      ...saved, version: 2, rank: saved.rank === 3 ? 4 : saved.rank,
      floor: saved.floor === 3 ? 4 : saved.floor, position: { ...OFFICE_SPAWN },
      rep: [...saved.rep.slice(0, 3), 0, saved.rep[3]], bossesDefeated: saved.rank,
      legacy: true, result: null,
    };
  }
  if (!Number.isInteger(saved.bossesDefeated) || !numberIn(saved.bossesDefeated, 0, lastRank)
    || typeof saved.legacy !== 'boolean') throw new Error('Invalid career record.');
  if (saved.introSeen !== undefined && typeof saved.introSeen !== 'boolean') throw new Error('Invalid intro state.');
  if (saved.bossesDefeated !== saved.rank && !(saved.legacy && saved.rank === 4 && saved.bossesDefeated === 3)) {
    throw new Error('The promotion history does not match this career.');
  }
  if (saved.result !== null && saved.result !== undefined) {
    const result = saved.result;
    if (saved.rank !== lastRank || !result || !numberIn(result.time, 0, Number.MAX_SAFE_INTEGER)
      || !numberIn(result.rep, 0, 50000) || !Number.isInteger(result.tasks)
      || !numberIn(result.tasks, 0, 10000) || !Number.isInteger(result.bosses)
      || !numberIn(result.bosses, 0, lastRank)) throw new Error('Invalid final career result.');
    saved.result = makeResult({ ...result, legacy: saved.legacy });
  }
  if (saved.collectibles !== undefined && (!Array.isArray(saved.collectibles)
    || saved.collectibles.length > 100 || !saved.collectibles.every(id => typeof id === 'string' && id.length < 100))) {
    throw new Error('Invalid collection record.');
  }
  if (saved.officeLife !== undefined && !validateOfficeEventState(saved.officeLife)) throw new Error('Invalid office event state.');
  return saved;
}

export function moveWithCollisions(position, dx, dz, colliders, bounds = OFFICE_BOUNDS) {
  const blocked = (x, z) => colliders.some(c =>
    Math.abs(x - c.x) < c.w / 2 + 0.34 && Math.abs(z - c.z) < c.d / 2 + 0.34);
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
  for (let i = 0; i < steps; i++) {
    const x = clamp(position.x + dx / steps, -bounds.x, bounds.x);
    if (!blocked(x, position.z)) position.x = x;
    const z = clamp(position.z + dz / steps, -bounds.z, bounds.z);
    if (!blocked(position.x, z)) position.z = z;
  }
}

export function hasClearPath(from, to, colliders) {
  return !colliders.some(c => {
    let near = 0, far = 1;
    for (const [axis, size] of [['x', 'w'], ['z', 'd']]) {
      const delta = to[axis] - from[axis];
      const min = c[axis] - c[size] / 2, max = c[axis] + c[size] / 2;
      if (Math.abs(delta) < 0.00001) {
        if (from[axis] < min || from[axis] > max) return false;
      } else {
        const a = (min - from[axis]) / delta, b = (max - from[axis]) / delta;
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
        if (near > far) return false;
      }
    }
    return true;
  });
}
