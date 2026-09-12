export function randomInt(min, max, rng = Math.random) {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return low + Math.floor(rng() * Math.max(1, high - low + 1));
}

export function randomFloat(min, max, rng = Math.random) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low + (high - low) * rng();
}

export function randomChoice(items, rng = Math.random) {
  if (!Array.isArray(items) || !items.length) return undefined;
  return items[randomInt(0, items.length - 1, rng)];
}

export function shuffleArray(items, rng = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i, rng);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function sampleSize(items, count, rng = Math.random) {
  return shuffleArray(items, rng).slice(0, Math.max(0, count));
}
