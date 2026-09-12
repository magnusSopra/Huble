# Huble

Huble is a hub for a small collection of office games. It currently hosts
two games, with more on the way:

- **🏢 [Kontorle](#kontorle)** — a [Globle](https://globle-game.com/)-style
  guessing game built around your office floor plan.
- **🧩 [Kundle](#kundle)** — a daily client/company guessing game.
- More games coming soon.

Open **http://localhost:3000** for the Huble hub (an iPad-style home
screen of app icons); click an icon to launch a game.

## Kontorle

Upload your office floor plan, trace each room, then play:

- **📅 Daily Challenge** — one mystery room per day, shared by the whole
  office. Guess rooms and get direction, category, and capacity hints
  until you find it. Same room for everyone each day (like Wordle).
- **🔁 Practice Globle** — same as above, but unlimited random rounds.
- **📍 Name the Rooms** — a room name is shown; click the matching room on
  the map. Repeat until every room has been found.

Shared leaderboards (ranked by fewest guesses, then fastest time) are kept
per mode in a local SQLite database — no login required, just a display
name.

## Kundle

A daily guessing game for Sopra Steria client companies — guess the
mystery client and get colour-coded clues (employees, Sopra staff count,
client-since year, HQ distance/direction, similarity, operating
footprint). Fully self-contained, static, client-side (no server API):
the daily target and leaderboard are computed/stored in the browser
(`localStorage`).

Source lives in `games/kundle/` (its own Vite + React + TypeScript
project, pulled from
[BhagavathAchani/Kundle](https://github.com/BhagavathAchani/Kundle)) and
is built to static assets that are committed under `public/kundle/`, so
Express serves it at `/kundle/` alongside the rest of the site — no extra
server code needed. To rebuild after pulling upstream changes:

```powershell
cd games/kundle
npm install
npm run build
# then copy the output into public/kundle/, e.g.:
Remove-Item -Recurse -Force ..\..\public\kundle
Copy-Item -Recurse dist ..\..\public\kundle
```

`games/kundle/vite.config.ts` sets `base: '/kundle/'` so built asset paths
resolve correctly under that subpath instead of the site root.

## Requirements

- **Node.js 22.5+** (uses the built-in `node:sqlite` module — no native
  build tools/Python required).

## Setup

```powershell
npm install
npm start
```

Then open **http://localhost:3000** — the Huble hub. Click the Kontorle
icon to launch it.

By default the server listens on port 3000; override with the `PORT`
environment variable.

## Usage

1. Go to **Admin** (`/admin.html`) and upload a floor plan image (PNG/JPG).
2. Click **"+ New room"**, click points around a room's outline on the
   image (at least 3 points), then **"Finish room"** and give it a name
   (and optional category). Repeat for every room.
3. Go back to the game (`/kontorle.html`), pick your floor, and choose a
   mode to play.

Rooms can be renamed or deleted anytime from the Admin page. To change a
room's outline, delete it and re-trace it.

## Project layout

```
server/
  index.js       Express app + static file serving
  db.js          SQLite schema (floors, rooms, daily_challenges, scores)
  geometry.js    Polygon centroid/area, point-in-polygon, distance/bearing
  routes/
    floors.js    Floor plan upload/list/delete
    rooms.js     Room polygon CRUD
    game.js      Daily challenge + practice Globle guess/feedback logic
    scores.js    Score submission + leaderboard queries
public/
  index.html     Huble hub: app-icon grid linking to each game
  kontorle.html  Kontorle landing page: floor picker, mode selection, leaderboard
  admin.html     Floor plan upload + room polygon tracer
  game.html      Globle-style guessing UI (daily + practice)
  name.html      "Name the Rooms" UI
  js/, css/      Frontend logic and styles (vanilla JS, canvas-based)
  kundle/        Built Kundle static assets (served at /kundle/, do not edit
                 directly — rebuild from games/kundle/ instead)
games/
  kundle/        Kundle source project (Vite + React + TypeScript)
data/            SQLite database file (gitignored)
```

## Notes

- All hint/answer logic (direction, category, capacity, correctness) is
  computed server-side so the mystery room isn't trivially exposed in the
  page source.
- The daily mystery room is picked deterministically from the date + floor
  id, so it's stable across server restarts and identical for every player.
- There's no authentication — this is meant for a trusted internal office
  environment. Leaderboard names are self-reported.
