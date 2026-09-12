// server/routes/rooms.js
const express = require('express');
const db = require('../db');
const { polygonCentroidArea } = require('../geometry');

const router = express.Router();

// List rooms for a floor
router.get('/floors/:floorId/rooms', (req, res) => {
  const rooms = db
    .prepare('SELECT * FROM rooms WHERE floor_id = ? ORDER BY name')
    .all(req.params.floorId);
  res.json(
    rooms.map((r) => ({ ...r, polygon: JSON.parse(r.polygon_json), polygon_json: undefined }))
  );
});

// Create a room (polygon traced in the admin tool)
router.post('/floors/:floorId/rooms', (req, res) => {
  const { name, category, polygon } = req.body;
  const capacity = Number.isInteger(req.body.capacity) ? req.body.capacity : null;
  const floor = db.prepare('SELECT * FROM floors WHERE id = ?').get(req.params.floorId);
  if (!floor) return res.status(404).json({ error: 'Floor not found' });
  if (!name || !Array.isArray(polygon) || polygon.length < 3) {
    return res
      .status(400)
      .json({ error: 'name and a polygon with at least 3 points are required' });
  }
  const { cx, cy, area } = polygonCentroidArea(polygon);
  const info = db
    .prepare(
      `INSERT INTO rooms (floor_id, name, category, capacity, polygon_json, centroid_x, centroid_y, area)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.params.floorId, name, category || null, capacity, JSON.stringify(polygon), cx, cy, area);
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ ...room, polygon: JSON.parse(room.polygon_json), polygon_json: undefined });
});

// Update a room
router.put('/rooms/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Room not found' });
  const name = req.body.name ?? existing.name;
  const category = req.body.category ?? existing.category;
  const capacity = req.body.capacity === undefined
    ? existing.capacity
    : (Number.isInteger(req.body.capacity) ? req.body.capacity : null);
  const polygon = req.body.polygon ?? JSON.parse(existing.polygon_json);
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return res.status(400).json({ error: 'polygon must have at least 3 points' });
  }
  const { cx, cy, area } = polygonCentroidArea(polygon);
  db.prepare(
    `UPDATE rooms SET name = ?, category = ?, capacity = ?, polygon_json = ?, centroid_x = ?, centroid_y = ?, area = ?
     WHERE id = ?`
  ).run(name, category, capacity, JSON.stringify(polygon), cx, cy, area, req.params.id);
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  res.json({ ...room, polygon: JSON.parse(room.polygon_json), polygon_json: undefined });
});

router.delete('/rooms/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Room not found' });
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
