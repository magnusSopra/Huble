// server/routes/game.js
// Handles "mystery room" guessing logic for both the daily challenge and
// unlimited practice Globle mode. The target room id is never sent to the
// client until it is guessed correctly — only derived hints are returned.
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { compassBearing } = require('../geometry');

const router = express.Router();

// In-memory store for practice-mode sessions: sessionId -> { floorId, roomId, createdAt }
// Ephemeral by design (no login/auth); lost on server restart, which is fine
// for a single ongoing game.
const practiceSessions = new Map();

function pickRoomsForFloor(floorId) {
  return db.prepare('SELECT * FROM rooms WHERE floor_id = ?').all(floorId);
}

/** Deterministic pick of a room for a given date + floor, stable across
 * restarts. `table` and `hashSuffix` let this be reused for independent
 * daily variants (e.g. the regular daily vs. the "expert" typing mode)
 * without their picks colliding. */
function pickDailyRoomFrom(table, hashSuffix, floorId, date) {
  const existing = db
    .prepare(`SELECT * FROM ${table} WHERE date = ? AND floor_id = ?`)
    .get(date, floorId);
  if (existing) return existing.room_id;

  const rooms = pickRoomsForFloor(floorId);
  if (rooms.length === 0) return null;
  const hash = crypto.createHash('sha256').update(`${date}:${floorId}${hashSuffix}`).digest();
  const index = hash.readUInt32BE(0) % rooms.length;
  const roomId = rooms[index].id;
  db.prepare(
    `INSERT OR IGNORE INTO ${table} (date, floor_id, room_id) VALUES (?, ?, ?)`
  ).run(date, floorId, roomId);
  return roomId;
}

function pickDailyRoom(floorId, date) {
  return pickDailyRoomFrom('daily_challenges', '', floorId, date);
}

/** Independent daily pick for "Expert Daily" (type-the-name variant). */
function pickExpertDailyRoom(floorId, date) {
  return pickDailyRoomFrom('daily_challenges_expert', ':expert', floorId, date);
}

function buildFeedback(guessRoom, targetRoom) {
  const correct = guessRoom.id === targetRoom.id;
  const direction = correct
    ? null
    : compassBearing(
        { x: guessRoom.centroid_x, y: guessRoom.centroid_y },
        { x: targetRoom.centroid_x, y: targetRoom.centroid_y }
      );
  // Whether the guessed room shares the same category as the secret target
  // (only meaningful when both rooms actually have a category set).
  const categoryMatch =
    correct || !guessRoom.category || !targetRoom.category
      ? null
      : guessRoom.category.trim().toLowerCase() === targetRoom.category.trim().toLowerCase();
  // Relative capacity hint: how the target's capacity compares to the
  // guessed room's capacity (only when both rooms have a capacity set).
  const capacityHint =
    correct || guessRoom.capacity == null || targetRoom.capacity == null
      ? null
      : targetRoom.capacity > guessRoom.capacity
        ? 'higher'
        : targetRoom.capacity < guessRoom.capacity
          ? 'lower'
          : 'equal';
  return {
    correct,
    guessRoomId: guessRoom.id,
    guessRoomName: guessRoom.name,
    // Only the guessed room's own capacity is revealed (never the
    // secret target's), so this can't be used to infer the answer.
    guessRoomCapacity: guessRoom.capacity ?? undefined,
    direction,
    categoryMatch,
    capacityHint,
    // Only reveal the answer once guessed correctly
    targetRoomId: correct ? targetRoom.id : undefined,
    targetRoomName: correct ? targetRoom.name : undefined,
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// --- Daily challenge ---

router.get('/floors/:floorId/daily', (req, res) => {
  const date = req.query.date || todayIso();
  const roomId = pickDailyRoom(req.params.floorId, date);
  if (!roomId) return res.status(404).json({ error: 'No rooms exist for this floor yet' });
  res.json({ date, floorId: Number(req.params.floorId) });
});

router.post('/floors/:floorId/daily/guess', (req, res) => {
  const date = req.body.date || todayIso();
  const { guessRoomId } = req.body;
  const roomId = pickDailyRoom(req.params.floorId, date);
  if (!roomId) return res.status(404).json({ error: 'No rooms exist for this floor yet' });
  const targetRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  const guessRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(guessRoomId);
  if (!guessRoom) return res.status(400).json({ error: 'Invalid guessRoomId' });
  res.json(buildFeedback(guessRoom, targetRoom));
});

// --- Expert Daily (type-the-name variant) ---
// Same mechanics as the regular daily challenge, but its own independent
// daily pick, and its own leaderboard bucket ('daily_expert').

router.get('/floors/:floorId/daily-expert', (req, res) => {
  const date = req.query.date || todayIso();
  const roomId = pickExpertDailyRoom(req.params.floorId, date);
  if (!roomId) return res.status(404).json({ error: 'No rooms exist for this floor yet' });
  res.json({ date, floorId: Number(req.params.floorId) });
});

router.post('/floors/:floorId/daily-expert/guess', (req, res) => {
  const date = req.body.date || todayIso();
  const { guessRoomId } = req.body;
  const roomId = pickExpertDailyRoom(req.params.floorId, date);
  if (!roomId) return res.status(404).json({ error: 'No rooms exist for this floor yet' });
  const targetRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  const guessRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(guessRoomId);
  if (!guessRoom) return res.status(400).json({ error: 'Invalid guessRoomId' });
  res.json(buildFeedback(guessRoom, targetRoom));
});

// --- Practice (unlimited) Globle mode ---

router.post('/floors/:floorId/practice/start', (req, res) => {
  const rooms = pickRoomsForFloor(req.params.floorId);
  if (rooms.length === 0) return res.status(404).json({ error: 'No rooms exist for this floor yet' });
  const room = rooms[Math.floor(Math.random() * rooms.length)];
  const sessionId = crypto.randomUUID();
  practiceSessions.set(sessionId, {
    floorId: Number(req.params.floorId),
    roomId: room.id,
    createdAt: Date.now(),
  });
  res.json({ sessionId });
});

router.post('/floors/:floorId/practice/guess', (req, res) => {
  const { sessionId, guessRoomId } = req.body;
  const session = practiceSessions.get(sessionId);
  if (!session || session.floorId !== Number(req.params.floorId)) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }
  const targetRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(session.roomId);
  const guessRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(guessRoomId);
  if (!guessRoom) return res.status(400).json({ error: 'Invalid guessRoomId' });
  const feedback = buildFeedback(guessRoom, targetRoom);
  if (feedback.correct) practiceSessions.delete(sessionId);
  res.json(feedback);
});

module.exports = router;
