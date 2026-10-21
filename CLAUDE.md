# Working on this repository

This is a static web app served by GitHub Pages from the `main` branch root.
Pushing to `main` publishes it to https://floateruk.github.io/bushido/ within a minute or two.

## Layout
- `src/` is the source. Edit these, never `index.html` directly.
  - `shell.html`: title, font link, CSS and page markup (everything before the script).
  - `parser.js`: reads newrecruit.eu list PDFs (pdf.js text items with positions) into warbands.
  - `app.js`: the tracker. Three screens, remembered per device in `bushido-view-v1`:
    home (games in progress, warbands to play, import, finished games, backup), play (the current game),
    and `end:<gameId>` (summary of a finished game). Games carry `status: "finished"` once ended;
    abandoning a game deletes it (with an Undo toast).
  - `seed.json`: card library and three starter lists bundled into the app.
  - `build.py`: run `python3 src/build.py` from the repo root to regenerate `index.html`.
  - `cards/*.js`: card sets transcribed by hand (e.g. from card images) for lists whose PDF lacks rules.
    `node src/build_seed.js` merges them into `seed.json`; bump `SEED_REV` there when card data changes,
    and installed apps apply it once on next open (library, matching warband, and games in progress).
- `src/table/`: the Table area (laptop-first), built into `index.html` before `app.js`.
  - Scenario panel (`scenarioCard` in table.js): "Turn by turn" (`scenarioTimeline`: Start-phase resets and variable-length roll, End-phase VPs, current turn highlighted in play) and "How it scores" (`scoringLines`: Influence, Prayer, Zones, VIM, Decreasing), both foldable.
  - `scenarios.js`: the 12 Tournament Pack 2510.1 scenarios and 3 rulebook ones; positions in inches from the
    bottom-left of the 24" table, your side (F) along the bottom. Deployment types and their neutral edges.
  - Faction terrain: user-made pieces (name, faction, Passage, Visibility, Size), always 3.5" x 2.5"; kept in `bushido-terrain-v1`, and a table carries the definitions of the ones placed (`TBL.customTerrain`).
  - `terrain.js`: 40 themed terrain pieces with [Passage, Visibility, Size]; footprints no bigger than a playing card (3.5" x 2.5").
  - `table.js`: setup, terrain generator (follows pack p.19 placement rules), tokens with facing
    (size and base read from the card's "Size & Base"), Elsewhere/Flank, deployment checks, ruler (edge to edge: ends inside a base snap to that model and stop at its edge). Movement: bases stop at other bases and Impassable
    terrain (Cloudwalk/Intangible pass through but can't end overlapping), exact contact (no snapping), base-to-base marks. Saved in
    `bushido-table-v1` and synced as `groups/{code}/table/current` (one table per sync code; whole-table, the most recently changed copy wins; "New table" deletes it everywhere). Undo (button, Ctrl+Z) keeps up to 100 steps in memory on this device only.
  - `los.js`: line of sight and cover from the rulebook (facing, Aware, Blind/Sixth Sense, Prone, Size rules for
    models and terrain, Enhancing elevation, cover within 1"); L toggles the board overlay; Selected panel lists Can see / Seen by.
  - `play.js`: playing on the table: TBL.play {turn, sp, vp}, Next turn (2 activation counters each, pack resets of
    SP/alignment, Flank reminders, Undo), activation dots inside tokens, and state badges on the base (`stateBadges`: from the linked test's states, else the table's own Prone/Blind; two letters, value, count). The table shows only position, facing, LoS, Prone/Blind and activations;
    a table made from a test (TBL.testId) shares its model ids: killed models leave the board, Prone/Blind are the
    test's states, and Next turn runs Ki Generation and Last Stand removals in the test (testStartTurn).
  - `avatar(d)` (table.js): round portrait for a model definition, used on My lists and Testing lists cards, opponent rows and the end summary.
  - `dice.js`: opposed dice tool (Dice button or D key): floating panel with Attack and Defence d6 pools for each side, tap a die to re-roll it, × removes it from the result, modifiers, Melee Exchange result (highest + up to 2 supporting, 1s ignored, ties by dice above 1 then Active player). Unbiased `crypto.getRandomValues` d6. In memory only, not synced.
  - Card art: `art/<slug>.webp` (192px round portraits, slug = model name lowercased, accents and punctuation removed) with `art/manifest.json`.
    `python3 src/build_art.py CARDS.pdf --names "A|B|C"` cuts them from a PDF of card images (front cards in order, one name each);
    build.py lists the manifest in the page (`ART_SLUGS`), tokens and the table lists show the art by model name, and sw.js stores
    every file in the manifest for offline use. After adding art, run build.py and bump `VERSION` in `sw.js`.
  - `ink.js`: sumi-e drawing for the board (brushed terrain pictures per piece, ensō objectives and token rings,
    ink filters, scroll mount and seal). Seeded by piece id so pictures stay stable between redraws.
  - `table.css`: table styles, inlined into the page's `<style>`.
- `src/tests.js`: Testing lists (`tests`, `test:<id>`): two warbands side by side with full cards, wounds, Ki, feats,
  states and cards (step 1); the Table setup picks a test (step 2). A test shows the table's turn, SP, VP and where each model is; "Generate Ki" runs Ki Generation by hand; an unlinked table with the same models can be linked (matched by name). Saved in `bushido-tests-v1` and synced as
  `groups/{code}/tests/{id}`, merged per model by its `u` timestamp so tablet and laptop can edit at once.
  Undo on a test page (button, Ctrl+Z): snapshots of both sides in memory (`xHist`, 100 steps), restarted by another device's changes and by the table's Next turn; deleting a test has an Undo toast.
  My lists has Undo on the game screen (`undoStack`) and, on the lists screen, for deleting a game or list and adding a list (`listUndo`).
- The home screen is a hub: My lists (`lists`, for real-life games), Testing lists (`tests`), Table (`table`); Campaign is not built yet.
- `sync.js` + `config.js`: Firebase Firestore sync (anonymous auth, `groups/{syncCode}/...`).
  The Firebase web config is public by design; access is limited by Firestore rules and the sync code.
- `sw.js`: service worker for offline use.
- `pdf.min.mjs`, `pdf.worker.min.mjs`: bundled pdf.js 6.2.108 so PDF import works offline.

## Releasing a change
1. Edit files in `src/` (or `sync.js`). If card data changed, run `node src/build_seed.js`. Then run `python3 src/build.py`.
2. Bump `VERSION` in `sw.js`. Devices only fetch the new version when this changes.
3. Commit and push to `main`. Devices load the new version the next time they open online
   (network-first page load with a 2.5 s fallback to the stored copy, then an automatic reload).

## Notes
- Player data lives in localStorage (`bushido-warbands-v1`, `bushido-games-v1`, `bushido-current-v1`,
  `bushido-library-v1`, `bushido-tests-v1`) and in Firestore. Keep these formats backward compatible.
- The owner plays at venues with no signal: never make startup depend on the network.
