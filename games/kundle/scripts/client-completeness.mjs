export function hasUnknownData(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return /unknown/i.test(value);
  if (typeof value === 'object') return Object.values(value).some(hasUnknownData);
  return false;
}