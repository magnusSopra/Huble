import { shuffleArray } from './rng.js';

export function shuffled(items, rng = Math.random) {
  return shuffleArray(items, rng);
}

// The conservative grid is built once; NPCs only search when choosing a destination.
export function createOfficeNavigation(colliders, bounds, {
  step = 0.5, radius = 0.44, spawn = { x: 0, z: 16 }, restricted = [],
} = {}) {
  const width = Math.floor(bounds.x * 2 / step) + 1;
  const height = Math.floor(bounds.z * 2 / step) + 1;
  const cells = new Uint8Array(width * height);
  const obstacles = [...colliders, ...restricted];
  const isWalkable = ({ x, z }) => Number.isFinite(x) && Number.isFinite(z)
    && Math.abs(x) <= bounds.x - radius && Math.abs(z) <= bounds.z - radius
    && !obstacles.some(c => Math.abs(x - c.x) < c.w / 2 + radius
      && Math.abs(z - c.z) < c.d / 2 + radius);
  const point = cell => ({ x: (cell % width) * step - bounds.x, z: Math.floor(cell / width) * step - bounds.z });
  const cellAt = p => Math.round((p.z + bounds.z) / step) * width + Math.round((p.x + bounds.x) / step);
  for (let i = 0; i < cells.length; i++) cells[i] = isWalkable(point(i)) ? 1 : 0;
  const neighbors = cell => {
    const x = cell % width, z = Math.floor(cell / width), next = [];
    if (x > 0) next.push(cell - 1);
    if (x + 1 < width) next.push(cell + 1);
    if (z > 0) next.push(cell - width);
    if (z + 1 < height) next.push(cell + width);
    return next;
  };
  const start = cellAt(spawn), queue = [];
  if (cells[start]) { queue.push(start); cells[start] = 2; }
  for (let i = 0; i < queue.length; i++) for (const next of neighbors(queue[i])) {
    if (cells[next] !== 1) continue;
    cells[next] = 2;
    queue.push(next);
  }
  const points = queue.map(point);
  const nearest = p => {
    let best = null, distance = Infinity;
    for (const candidate of points) {
      const d = (candidate.x - p.x) ** 2 + (candidate.z - p.z) ** 2;
      if (d < distance) { distance = d; best = candidate; }
    }
    return best;
  };
  const route = (from, to) => {
    if (!isWalkable(from) || !isWalkable(to)) return [];
    const first = cellAt(from), last = cellAt(to);
    if (cells[first] !== 2 || cells[last] !== 2) return [];
    const parents = new Int32Array(cells.length).fill(-1), open = [first];
    parents[first] = first;
    for (let i = 0; i < open.length && parents[last] === -1; i++) {
      for (const next of neighbors(open[i])) {
        if (cells[next] !== 2 || parents[next] !== -1) continue;
        parents[next] = open[i];
        open.push(next);
      }
    }
    if (parents[last] === -1) return [];
    const result = [];
    for (let cell = last; cell !== first; cell = parents[cell]) result.push(point(cell));
    result.push(point(first));
    return result.reverse();
  };
  return { points, isWalkable, nearest, route };
}
