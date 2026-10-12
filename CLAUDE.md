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
  `bushido-library-v1`) and in Firestore. Keep these formats backward compatible.
- The owner plays at venues with no signal: never make startup depend on the network.
