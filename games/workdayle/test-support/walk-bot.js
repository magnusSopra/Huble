import { moveWithCollisions, hasClearPath } from '../src/state.js';

export function walkTo(game, id) {
  const target = game.office.interactables.find(item => item.id === id);
  if (!target) throw new Error(`Missing station ${id}`);
  const blocked = (x, z) => game.office.colliders.some(c =>
    Math.abs(x - c.x) < c.w / 2 + 0.4 && Math.abs(z - c.z) < c.d / 2 + 0.4);
  const start = [Math.round(game.state.position.x * 2), Math.round(game.state.position.z * 2)];
  const key = ([x, z]) => `${x},${z}`;
  const queue = [start], parent = new Map([[key(start), null]]);
  let found;
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (Math.hypot(node[0] / 2 - target.x, node[1] / 2 - target.z) < 0.8
      && hasClearPath({ x: node[0] / 2, z: node[1] / 2 }, target, game.office.colliders)) { found = node; break; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [node[0] + dx, node[1] + dz];
      if (Math.abs(next[0]) > game.office.bounds.x * 2 - 1 || Math.abs(next[1]) > game.office.bounds.z * 2 - 1
        || parent.has(key(next)) || blocked(next[0] / 2, next[1] / 2)) continue;
      parent.set(key(next), node);
      queue.push(next);
    }
  }
  if (!found) throw new Error(`No walkable route to ${id}`);
  const route = [];
  while (found) { route.unshift(found); found = parent.get(key(found)); }
  for (const node of route) {
    moveWithCollisions(game.state.position, node[0] / 2 - game.state.position.x,
      node[1] / 2 - game.state.position.z, game.office.colliders, game.office.bounds);
  }
  game.updateOffice(0.016);
  if (game.nearest?.id !== id) throw new Error(`Cannot interact with ${id}; nearest is ${game.nearest?.id}`);
}
