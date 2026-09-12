// server/db.js
// SQLite database setup + schema initialization for Kontorle.
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'office-globle.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS floors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  image_path TEXT NOT NULL,
  image_width INTEGER NOT NULL,
  image_height INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  capacity INTEGER,
  polygon_json TEXT NOT NULL,
  centroid_x REAL NOT NULL,
  centroid_y REAL NOT NULL,
  area REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_challenges (
  date TEXT NOT NULL,
  floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  PRIMARY KEY (date, floor_id)
);

-- Independent daily pick for "Expert Daily" mode (type-the-name variant).
-- Kept as its own table (rather than adding a column to daily_challenges)
-- so the two modes' target rooms never have to collide on the same
-- (date, floor_id) primary key.
CREATE TABLE IF NOT EXISTS daily_challenges_expert (
  date TEXT NOT NULL,
  floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  PRIMARY KEY (date, floor_id)
);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mode TEXT NOT NULL CHECK (mode IN ('daily', 'globle', 'name_to_location', 'daily_expert')),
  player_name TEXT NOT NULL,
  floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  room_id INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  challenge_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Migration: existing DB files predate the `capacity` column, and
// `CREATE TABLE IF NOT EXISTS` above won't retroactively add it.
try {
  db.exec('ALTER TABLE rooms ADD COLUMN capacity INTEGER');
} catch (err) {
  if (!/duplicate column/i.test(err.message)) throw err;
}

// Migration: existing DB files predate the 'daily_expert' score mode, and
// SQLite can't ALTER a CHECK constraint in place — recreate the table with
// the updated constraint, preserving existing rows.
const scoresTable = db
  .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'scores'")
  .get();
if (scoresTable && !/daily_expert/.test(scoresTable.sql)) {
  db.exec(`
    BEGIN;
    ALTER TABLE scores RENAME TO scores_old;
    CREATE TABLE scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL CHECK (mode IN ('daily', 'globle', 'name_to_location', 'daily_expert')),
      player_name TEXT NOT NULL,
      floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
      room_id INTEGER,
      attempts INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      challenge_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO scores SELECT * FROM scores_old;
    DROP TABLE scores_old;
    COMMIT;
  `);
}

module.exports = db;
