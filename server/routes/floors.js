// server/routes/floors.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only PNG/JPEG/WEBP images are allowed'));
  },
});

// List all floors
router.get('/', (req, res) => {
  const floors = db.prepare('SELECT * FROM floors ORDER BY created_at DESC').all();
  res.json(floors);
});

// Get one floor
router.get('/:id', (req, res) => {
  const floor = db.prepare('SELECT * FROM floors WHERE id = ?').get(req.params.id);
  if (!floor) return res.status(404).json({ error: 'Floor not found' });
  res.json(floor);
});

// Upload a new floor plan image. Expects multipart form with fields:
// image (file), name (string), width (number), height (number) — width/height
// are the image's natural pixel dimensions, measured client-side.
router.post('/', upload.single('image'), (req, res) => {
  const { name, width, height } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Image file is required' });
  if (!name || !width || !height) {
    return res.status(400).json({ error: 'name, width, and height are required' });
  }
  const imagePath = `/uploads/${req.file.filename}`;
  const info = db
    .prepare(
      'INSERT INTO floors (name, image_path, image_width, image_height) VALUES (?, ?, ?, ?)'
    )
    .run(name, imagePath, Number(width), Number(height));
  const floor = db.prepare('SELECT * FROM floors WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(floor);
});

router.delete('/:id', (req, res) => {
  const floor = db.prepare('SELECT * FROM floors WHERE id = ?').get(req.params.id);
  if (!floor) return res.status(404).json({ error: 'Floor not found' });
  db.prepare('DELETE FROM floors WHERE id = ?').run(req.params.id);
  const filePath = path.join(__dirname, '..', '..', 'public', floor.image_path);
  fs.unlink(filePath, () => {});
  res.status(204).end();
});

module.exports = router;
