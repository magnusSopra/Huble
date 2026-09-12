// server/geometry.js
// Shared geometry helpers: polygon centroid/area, point-in-polygon,
// distance, and compass bearing between two points.

/**
 * Computes the signed area and centroid of a polygon using the standard
 * shoelace-based centroid formula. Falls back to a simple average of
 * vertices for degenerate (near-zero-area) polygons, e.g. a single click.
 * @param {{x:number,y:number}[]} points
 */
function polygonCentroidArea(points) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % n];
    const cross = p0.x * p1.y - p1.x * p0.y;
    area += cross;
    cx += (p0.x + p1.x) * cross;
    cy += (p0.y + p1.y) * cross;
  }
  area = area / 2;
  if (Math.abs(area) < 1e-6) {
    const avg = points.reduce(
      (acc, p) => ({ x: acc.x + p.x / n, y: acc.y + p.y / n }),
      { x: 0, y: 0 }
    );
    return { cx: avg.x, cy: avg.y, area: 0 };
  }
  cx = cx / (6 * area);
  cy = cy / (6 * area);
  return { cx, cy, area: Math.abs(area) };
}

/** Ray-casting point-in-polygon test. */
function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/**
 * Compass direction pointing from `from` to `to`, treating image "up"
 * (smaller y) as North.
 */
function compassBearing(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return null; // same point
  let angle = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 = N, clockwise
  if (angle < 0) angle += 360;
  const index = Math.round(angle / 45) % 8;
  return COMPASS[index];
}

module.exports = {
  polygonCentroidArea,
  pointInPolygon,
  distance,
  compassBearing,
};
