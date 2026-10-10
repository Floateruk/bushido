# Working on this repository

This is a static web app served by GitHub Pages from the `main` branch root.
Pushing to `main` publishes it to https://floateruk.github.io/bushido/ within a minute or two.

## Layout
- `src/` is the source. Edit these, never `index.html` directly.
  - `shell.html`: title, font link, CSS and page markup (everything before the script).
  - `parser.js`: reads newrecruit.eu list PDFs (pdf.js text items with positions) into warbands.
  - `app.js`: the tracker (state, phases, reminders, rendering, warbands and games, backup).
  - `seed.json`: card library and three starter lists bundled into the app.
  - `build.py`: run `python3 src/build.py` from the repo root to regenerate `index.html`.
- `sync.js` + `config.js`: Firebase Firestore sync (anonymous auth, `groups/{syncCode}/...`).
  The Firebase web config is public by design; access is limited by Firestore rules and the sync code.
- `sw.js`: service worker for offline use.
- `pdf.min.mjs`, `pdf.worker.min.mjs`: bundled pdf.js 6.2.108 so PDF import works offline.

## Releasing a change
1. Edit files in `src/` (or `sync.js`), then run `python3 src/build.py`.
2. Bump `VERSION` in `sw.js`. Devices only fetch the new version when this changes.
3. Commit and push to `main`. Devices show "App updated" the next time they open online.

## Notes
- Player data lives in localStorage (`bushido-warbands-v1`, `bushido-games-v1`, `bushido-current-v1`,
  `bushido-library-v1`) and in Firestore. Keep these formats backward compatible.
- The owner plays at venues with no signal: never make startup depend on the network.
