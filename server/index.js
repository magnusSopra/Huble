// server/index.js
const express = require('express');
const path = require('path');

require('./db'); // ensure schema is initialized on boot

const floorsRouter = require('./routes/floors');
const roomsRouter = require('./routes/rooms');
const gameRouter = require('./routes/game');
const scoresRouter = require('./routes/scores');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/floors', floorsRouter);
app.use('/api', roomsRouter); // /api/floors/:floorId/rooms, /api/rooms/:id
app.use('/api', gameRouter); // /api/floors/:floorId/daily, /practice/...
app.use('/api/scores', scoresRouter);

// Basic error handler (e.g. multer file-type rejections)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Unexpected error' });
});

app.listen(PORT, () => {
  console.log(`Kontorle running at http://localhost:${PORT}`);
});
