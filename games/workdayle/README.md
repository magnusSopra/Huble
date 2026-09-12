# Workdayle

A playable Three.js corporate-comedy game. Explore a sprawling, fictionalized Sopra Steria Stavanger office, do absurd favours, earn REP, and defeat four managers in first-person boxing to become CEO.

Iteration 4 extends the existing game with living office floors, 64 optional colleague tasks, meeting questions and excuses, occasional recruitment/CV events, a twenty-second bathroom emergency, collectibles and hidden corporate nonsense. Each boss victory now includes a physical trip toward the next floor; Jill first defends her snack kingdom. The original tasks, first-person boss fights, timer, personal bests, Vitas parade and enormous CEO office remain.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite. On macOS/Linux, use `npm` instead of `npm.cmd`.

```powershell
npm.cmd run build
npm.cmd run preview
npm.cmd test
```

The browser gameplay suite covers tasks, promotions, combat retries, and save/resume. It uses collision-aware walking, DOM task interactions, and accelerated simulation for long sequences. Combat tests include a hazard-aware player simulation without health or reward shortcuts:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

An installed Chrome can be used instead of downloading Playwright's browser:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:e2e
```

## Play

- **WASD / arrows:** move; **Shift:** sprint; **E:** interact.
- **Hide/Show stats** reclaims the sidebar's actual rendering space. **Tab** toggles it while focus is in gameplay; **M** also toggles it. Tab still navigates buttons and modal dialogs.
- Follow the room signs through consulting bays, meeting rooms, storage, server areas and the kitchen. Find colleagues with green task markers; walls block movement and interaction. Earn the floor's REP requirement, then find MANAGEMENT.
- **Boss fights:** mouse looks, left click or **F** punches, **Space / right click** dodges. **Q / R** also turn, including browsers without mouse capture.
- Dodge when the boss winds up, move within punching distance, and counter during the green recovery window. Strafe through volleys. Warning circles become **instantly lethal holes**: never walk or dodge across them. The floor-safety radar also shows hazards behind you.
- A new imminent strike or projectile permits a reactive dodge even during repositioning cooldown. Protection lasts 0.3 seconds; repeatedly pressing dodge does not extend global invulnerability. Kjell's CMON uppercut crouches, winds back and sweeps upward before contact.
- Defeating a boss gives you their job, displays their name and reward, and starts a nine-second arena departure/lift/new-floor reveal. Skip reaches the same destination. Progression: **Consultant → Office Manager → Department Manager → Executive Director → CEO**.
- Coffee restores energy and increases bathroom need. **E** at the WC door enters a separate physical bathroom; normally use the toilet to reset the meter. At **100 need**, a red warning starts a **20-second emergency**: reaching the WC door in time resolves it immediately. Explicit pause freezes the countdown; ignoring it produces a cartoon HR incident and game over.
- Meeting tasks demand convincing nods and reel scrolling in the same rounds, plus quick answers when directly questioned. Stop scrolling to respond. Dodge Meeting lets you mark yourself unavailable and send a believable excuse. Read each minigame's controls before starting; ready screens do not consume the task timer.
- Optional phone, employee-delegation and AI tasks provide more ways to earn REP. All original tasks and their saved completion IDs remain available.
- **Escape** pauses exploration or leaves a task. Cinematics have separate continue/skip controls; the parade also has pause and mute controls.
- Random fictional rival offers reward loyalty with REP; accepting ends the career. A yellow CV warning sends you to a workstation to select a local simulated AI and repair your CV. Events have shared spacing and individual cooldowns; a pending CV or emergency prevents another random interruption.
- Find **20 office collectibles** and **four hidden cartoon bathroom cameras**. Destroy cameras to restore privacy and add them to the collection, once each. Hidden shrine rooms and unnecessary buttons are optional. No cameras exist in the private CEO bathroom.

**Test mode** is off by default. Use the top-bar button or **F2**, then explicitly enable it. It creates an isolated in-memory career with the required REP, all four individual boss shortcuts, Jill's snack introduction, event/emergency previews, cutscene skipping, office/CEO access and a reset button. F2 reopens the tools during combat. Returning to normal restores the prior career; test progress never writes the career save or personal best. Reload also discards the test career.

The timer starts on Clock In and counts exploration (including bathrooms), dialogue, tasks, events, transitions and boss retries. Explicit pause (including auto-pause when the window loses focus), confirmation screens and test tools stop it. It uses actual elapsed time, independent of rendering speed. Defeating Kjell freezes the final time and statistics, shows his victory departure, then starts the existing corporate text crawl, third-person CEO parade and office reveal. Skipping either cinematic preserves the final result and the office reward. Score is `round(1,000,000 / (1 + seconds / 300))`: faster is better.

After the results, choose **Enjoy the corner office**. Explore the gold-and-marble office, Ferrari trophy with spinning rims, bubbling jacuzzi, representative Sopra Steria location map, CEO desk/computer, excessive control panel and private executive bathroom. The car is a stylized procedural trophy, not a driveable vehicle. Control-panel buttons change office effects or issue deeply unnecessary executive announcements.

Progress and personal bests are saved in this browser's local storage. Continue resumes in the office, not mid-fight or mid-mini-game. Bathroom and hidden-room saves return to the exterior door; collectibles, event outcomes, pending CV tasks and remaining emergency seconds persist. An HR/recruitment game over survives reload until you restart. Completed careers resume in the CEO office, even if interrupted during the celebration. Failed fights retain tasks and REP. A new career requires confirmation before replacing a save; your personal best remains. Original unfinished saves retain their rank, tasks and REP and restart at a safe location in the new map. Original completed careers keep their CEO title. Migrated careers are marked **legacy/unranked** because the old timer did not count dialogue; start a new career for the four-boss speedrun.

Office and combat audio is synthesized locally, begins after a user gesture, and can be muted. Kjell retains his heavier final-boss arrangement.

The CEO parade uses the supplied **Vitas - The 7th Element.mp3** in `assets\music`, unchanged. Playback now starts once at the corridor cinematic, survives the parade → CEO office transition without restarting, follows pause/mute, and naturally continues in the corner office until the same track ends or you restart. MP3, OGG, WAV, M4A, AAC and FLAC assets are supported; music-folder files take priority over other audio assets. Keep the intended parade song as the sole music file to avoid ambiguity, and rebuild before deploying replacement assets. A missing/unplayable song produces a clear console warning and on-screen notice; the cinematic continues without substituting another track. No network AI service or external media service is used.

Optional Kjell voice clips can be dropped into `assets\audio\bosses\` as:

```text
assets\audio\bosses\kjell_cmon.mp3
assets\audio\bosses\kjell_random.mp3
```

Other supported audio extensions with the same basenames also work. Missing files only log a warning and never break the fight.

## Bosses and photographs

| Boss | Promotion | Signature mechanics |
| --- | --- | --- |
| Jill Guldhav | Office Manager | Candy Hadouken and readable melee |
| Sander Thomassen | Department Manager | Number Crunch and warned, lethal Resource Cut holes |
| Alf Gilroy | Executive Director | Daily Digest / Apps Nytt volleys, escalating at 70% and 40% HP |
| Kjell Rusti | CEO | Four HP phases, inherited attacks, CMON!! uppercut and Aura Manifestation |

Place photographs in the **project-root** `assets\bosses` folder:

```text
assets\bosses\jill_guldhav.jpg
assets\bosses\sander_thomassen.jpg
assets\bosses\alf_gilroy.jpg
assets\bosses\kjell_rusti.jpg
```

These exact lowercase JPG filenames are used. Each boss has a closed, sculpted 3D head with cheeks, eye sockets, nose, jaw, ears and skull. The corresponding photograph is cropped to the face and baked into the head's UV texture in memory, with equally scaled image pixels across the face and feathered transitions into the temples and scalp. It uses a rough, scene-lit material, not a plane, billboard, frame, cube-front image, or UI portrait. The head stays in the existing character hierarchy throughout turns and attacks; the exaggerated bodies and combat abilities are unchanged.

`src\boss-head.js` contains crop coordinates and nose landmarks calibrated to the supplied photographs. Coordinates are relative to the listed source dimensions, so proportional resizing keeps the mapping intact. Different framing requires adjusting that boss's crop and landmarks. The original JPGs are never edited. Arena and snack-room introductions wait for the portrait before revealing the boss. Shared CPU atlases avoid repeated decoding, while every head owns its GPU texture; disposing an old scene cannot dispose the replacement portrait. Failed loads expire after 12 seconds and log the exact path, show an explicit notice, and leave a conspicuous pink, fully playable fallback. A later attempt can retry.

Vite picks up matching assets; refresh if necessary, and rebuild before deploying newly added photos. Supplied photographs stay local to this project and are bundled with the game; only add images you have permission to use.


## Extend

| File | Responsibility |
| --- | --- |
| `src/content.js` | Floors, NPCs, dialogue, task definitions and rewards |
| `src/layout.js` | Office bounds, safe spawns, NPC slots and facility locations |
| `src/bosses.js` | Four boss identities, attacks, HP phases and difficulty |
| `src/state.js` | Career state, REP, task rewards, save format, collision movement |
| `src/world.js` | Procedural office furniture, characters, arena and signage |
| `src/office-navigation.js`, `src/exploration.js` | Safe NPC routes, shuffled task pools, collectibles and camera props |
| `src/minigames.js`, `src/office-minigames.js`, `src/multitask-minigames.js` | Original and expanded arcade tasks with a shared lifecycle |
| `src/interiors.js` | Separate employee/executive bathrooms using existing world builders |
| `src/ceo-parade.js`, `src/ceo-office.js` | Third-person celebration, pooled confetti, luxury office and interactive trophies |
| `src/combat.js` | Renderer-independent boss AI, telegraphs, movement, hit detection and dodges |
| `src/combat-effects.js` | Pooled candy, numbers, newsletters, holes, aura particles and signature effects |
| `src/boss-animation.js` | Crouch, uppercut sweep and recovery with stable photographic head aim |
| `src/boss-faces.js`, `src/boss-head.js` | Exact JPG mapping, calibrated face crops, sculpted closed heads, UV atlases and safe loading/disposal |
| `src/run.js`, `src/ending.js` | Real-time clock, final scoring and original cinematic/results |
| `src/career-cutscene.js` | Jill's snack introduction and boss victory/lift travel |
| `src/office-events.js`, `src/office-life.js` | Cooldown events, CV tasks, emergency countdown and exploration rewards |
| `src/developer-mode.js` | Isolated in-memory test career, boss selection and recovery to normal progress |
| `src/main.js` | Input, scene/camera, interactions and gameplay transitions |
| `src/ui.js`, `src/style.css`, `src/expansion.css` | HUD, timer, floor-safety radar, modals and responsive presentation |
| `src/audio.js` | Web Audio music and interaction sounds |

Office geometry is a fictional placeholder layout, not a surveyed reproduction of the real office. Replace geometry in `world.js` with reference-derived models while retaining collider and interaction positions. No external models, fonts, or audio assets are required; the four local JPGs provide the photographic faces. This is an unofficial affectionate parody, not an official Sopra Steria product.
