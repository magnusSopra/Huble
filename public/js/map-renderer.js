// public/js/map-renderer.js
// Shared canvas renderer for the floor plan image + room polygons, used by
// the admin tracer and both game modes.

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

class MapRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{image_path:string, image_width:number, image_height:number}} floor
   * @param {Array} rooms room objects with a `polygon` array of {x,y}
   */
  constructor(canvas, floor, rooms) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.floor = floor;
    this.rooms = rooms || [];
    this.image = new Image();
    this.roomStyles = new Map(); // roomId -> { fill, stroke }
    this.tracePoints = null; // active polygon-in-progress, admin tool only
  }

  load() {
    return new Promise((resolve, reject) => {
      this.image.onload = () => {
        this.canvas.width = this.floor.image_width;
        this.canvas.height = this.floor.image_height;
        resolve();
      };
      this.image.onerror = reject;
      this.image.src = this.floor.image_path;
    });
  }

  setRoomStyle(roomId, style) {
    this.roomStyles.set(roomId, style);
  }

  clearRoomStyles() {
    this.roomStyles.clear();
  }

  /** Convert a mouse/click event to intrinsic image-pixel coordinates. */
  eventToImagePoint(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY,
    };
  }

  getRoomAtPoint(point) {
    for (const room of this.rooms) {
      if (pointInPolygon(point, room.polygon)) return room;
    }
    return null;
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.image, 0, 0, canvas.width, canvas.height);

    for (const room of this.rooms) {
      const style = this.roomStyles.get(room.id) || {};
      ctx.beginPath();
      room.polygon.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle = style.fill || 'rgba(0,0,0,0)';
      ctx.fill();
      ctx.strokeStyle = style.stroke || 'rgba(30,144,255,0.6)';
      ctx.lineWidth = style.lineWidth || 2;
      ctx.stroke();
    }

    if (this.tracePoints && this.tracePoints.length > 0) {
      ctx.beginPath();
      this.tracePoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.stroke();
      this.tracePoints.forEach((p, i) => {
        const isFirst = i === 0;
        const canClose = isFirst && this.tracePoints.length >= 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, canClose ? 7 : 4, 0, Math.PI * 2);
        ctx.fillStyle = canClose ? 'yellow' : 'red';
        ctx.fill();
        if (canClose) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = 'red';
          ctx.stroke();
        }
      });
    }
  }

  /**
   * Distance (in intrinsic image pixels) equivalent to `screenPx` CSS
   * pixels on screen — used for hit-testing "click near this point" at a
   * consistent visual size regardless of how the canvas is scaled.
   */
  screenPxToImagePx(screenPx) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.canvas.width / rect.width;
    return screenPx * scale;
  }
}

window.MapRenderer = MapRenderer;
window.pointInPolygon = pointInPolygon;
