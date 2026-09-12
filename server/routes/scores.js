// server/routes/scores.js
const express = require('express');
const db = require('../db');

const router = express.Router();

const VALID_MODES = ['daily', 'globle', 'name_to_location', 'daily_expert'];

// Submit a score
router.post('/', (req, res) => {
  const { mode, player_name, floor_id, room_id, attempts, duration_ms, challenge_date } =
    req.body;
  if (!VALID_MODES.includes(mode)) {
    return res.status(400).json({ error: `mode must be one of ${VALID_MODES.join(', ')}` });
  }
  if (!player_name || typeof player_name !== 'string' || !player_name.trim()) {
    return res.status(400).json({ error: 'player_name is required' });
  }
  if (!floor_id) return res.status(400).json({ error: 'floor_id is required' });

  const info = db
    .prepare(
      `INSERT INTO scores (mode, player_name, floor_id, room_id, attempts, duration_ms, challenge_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      mode,
      player_name.trim().slice(0, 40),
      floor_id,
      room_id || null,
      Number(attempts) || 0,
      Number(duration_ms) || 0,
      challenge_date || null
    );
  const score = db.prepare('SELECT * FROM scores WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(score);
});

// Leaderboard: filter by mode, floor_id, and optionally challenge_date.
// Ranked by fewest attempts, then fastest duration.
router.get('/', (req, res) => {
  const { mode, floor_id, challenge_date, limit } = req.query;
  const clauses = [];
  const params = [];
  if (mode) {
    clauses.push('mode = ?');
    params.push(mode);
  }
  if (floor_id) {
    clauses.push('floor_id = ?');
    params.push(floor_id);
  }
  if (challenge_date) {
    clauses.push('challenge_date = ?');
    params.push(challenge_date);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT * FROM scores ${where} ORDER BY attempts ASC, duration_ms ASC, created_at ASC LIMIT ?`
    )
    .all(...params, Number(limit) || 20);
  res.json(rows);
});

module.exports = router;
