/* ---------- Library ---------- */
const norm = BP.norm;
const LIBKEY = "bushido-library-v1";
let LIB = JSON.parse(JSON.stringify(SEED.lib));
try { const saved = JSON.parse(localStorage.getItem(LIBKEY)); if (saved) { Object.assign(LIB.cards, saved.cards); Object.assign(LIB.equip, saved.equip); Object.assign(LIB.glossary, saved.glossary); } } catch (e) {}
function saveLib() { try { localStorage.setItem(LIBKEY, JSON.stringify(LIB)); } catch (e) {} }
/* How much rules detail a library card holds, so a blank PDF never replaces full card data */
const richness = c => !c ? -1 : c.kind === "profile"
  ? c.models.reduce((a, m) => a + (m.traits || "").length + 20 * ((m.weapons || []).length + (m.feats || []).length + (m.notes || []).length), 0)
  : (c.text || "").length;
function addToLibrary(parsed) {
  for (const c of parsed.cards) {
    if (c.kind === "profile") {
      c.models.forEach(m => m.weapons.filter(w => w.eq).forEach(w => LIB.equip[norm(w.n)] = { n: w.n, weapon: w }));
      c.equip.forEach(e => { if (!LIB.equip[norm(e.n)] || !LIB.equip[norm(e.n)].feat) LIB.equip[norm(e.n)] = { n: e.n, d: e.d }; });
      const entry = { ...c, models: c.models.map(m => ({ ...m, weapons: m.weapons.filter(w => !w.eq) })) };
      if (richness(entry) >= richness(LIB.cards[norm(c.title)])) LIB.cards[norm(c.title)] = entry;
    } else if (richness(c) >= richness(LIB.cards[norm(c.title)])) LIB.cards[norm(c.title)] = c;
  }
  Object.assign(LIB.glossary, parsed.glossary);
  saveLib();
  window.Sync?.pushLibrary();
}

const STATES = [
  ["Aggressive","good"],["Berserk","neutral"],["Bleed 1","harm"],["Bleed 2","harm"],["Bleed 3","harm"],["Blind","harm"],["Controlled","harm"],
  ["Cowardly","harm"],["Death Sentence","harm"],["Diseased","harm"],["Disguised","good"],["Earth","good"],["Frightened","harm"],["Held","harm"],
  ["Immobilised","harm"],["Impetuous","harm"],["Last Stand","good"],["Oni Rage","neutral"],["On Fire 1","fire"],["On Fire 2","fire"],["On Fire 3","fire"],
  ["Poisoned 1","poison"],["Poisoned 2","poison"],["Poisoned 3","poison"],["Prone","harm"],["Reloading","neutral"],
  ["Run","neutral"],["Spirit Block","harm"],["Stunned","harm"],["Virtue","good"],["Special","neutral"]
];
const CAT = Object.fromEntries(STATES);
const baseState = k => k.replace(/ \d$/, "");
/* Ki feats costing X ("Return to Serve"): usable with 1 Ki or more; the player takes the X off the Ki track */
const xCost = f => String(f.c).toUpperCase() === "X";
const kiCost = f => xCost(f) ? 1 : +f.c;
const TICKING = ["Bleed", "On Fire", "Poisoned"];
/* States with something to resolve in the Starting Phase */
const START_RULES = { Diseased: "remove a Disease marker and an Activation Counter", "Death Sentence": "may spend 3 Ki to remove one Death Sentence marker" };

const SAMPLE = `The Imperial Court - Campaign 3 - [90 Rice]

# ++ Risen Sun ++ [90 Rice]
## Faction Profile Cards [34 Rice]
Meng Yi [26 Rice]
Shìbīng [8 Rice]:
• 1x Shìbīng A [8 Rice]

## Ronin Profile Cards [54 Rice]
Xi [14 Rice]: Triangle Knife [2 Rice]
Yanjing [12 Rice]
Yizhi [12 Rice]
Yūkan'na [16 Rice]

## Ronin Event Cards [1 Rice]
Year of the Risen Sun [1 Rice]

## Ronin Terrain Cards [1 Rice]
Rice Bale Barricades [1 Rice]

## Ronin Theme Cards
The Imperial March`;

/* ---------- Building a game from a parsed PDF or a text list ---------- */
const uid = () => Math.random().toString(36).slice(2, 8);
const newModel = def => ({ id: uid(), def, dmg: 0, ki: 0, states: {}, used: {} });
const equipToDef = (def, eqs) => {
  const d = JSON.parse(JSON.stringify(def));
  d.equip = [];
  eqs.forEach(e => {
    if (e.weapon) d.weapons.unshift({ ...e.weapon, eq: true }); else d.equip.push({ n: e.n, d: e.d || "" });
    if (e.feat && !d.feats.some(f => f.n === e.feat.n)) d.feats.push({ ...e.feat, from: e.n });
  });
  return d;
};
function gameFromPdf(p) {
  const models = [], cards = [];
  for (const c of p.cards) {
    if (c.kind === "profile") {
      const modelNames = c.models.map(m => norm(m.name));
      const lib = LIB.cards[norm(c.title)];
      c.models.forEach(m => {
        const eqs = c.equip.filter(e => !modelNames.includes(norm(e.n)));
        const fuller = lib && lib.kind === "profile" && lib.models.find(x => norm(x.name) === norm(m.name));
        if (fuller && richness({ kind: "profile", models: [fuller] }) > richness({ kind: "profile", models: [m] })) {
          /* This PDF has no rules for the model, but the library does (e.g. from card images) */
          return models.push(newModel(equipToDef(fuller, eqs.map(e => LIB.equip[norm(e.n)] || e))));
        }
        const d = JSON.parse(JSON.stringify(m));
        d.equip = eqs;
        models.push(newModel(d));
      });
    } else {
      const lib = LIB.cards[norm(c.title)];
      const text = lib && lib.kind === "card" && richness(lib) > richness(c) ? lib.text : c.text;
      cards.push({ name: c.title, type: BP.typeOf(c.role), text, done: false });
    }
  }
  return { listName: p.name, sub: p.subtitle, models, cards };
}
function gameFromText(text) {
  const out = { listName: "My list", sub: "", models: [], cards: [], unknown: [] };
  let section = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^created with/i.test(line)) continue;
    if (line.startsWith("# ")) { const m = line.match(/\+\+\s*(.+?)\s*\+\+/); if (m) out.listName = m[1]; continue; }
    if (line.startsWith("##")) { section = line.toLowerCase(); continue; }
    if (!section || line.startsWith("•") || /^\d+x\s/.test(line)) continue;
    const m = line.match(/^(.+?)\s*(?:\[\d+\s*Rice\])?\s*(?::\s*(.*))?$/);
    if (!m) continue;
    const name = m[1].trim();
    const opts = BP.splitTop(m[2] || "").map(s => s.replace(/\[\d+\s*Rice\]/i, "").trim()).filter(Boolean);
    const lib = LIB.cards[norm(name)];
    if (/profile/.test(section)) {
      if (!lib || lib.kind !== "profile") { out.unknown.push(name); continue; }
      const eqs = opts.map(o => LIB.equip[norm(o)]).filter(Boolean);
      opts.filter(o => !LIB.equip[norm(o)] && !lib.models.some(x => norm(x.name) === norm(o))).forEach(o => out.unknown.push(o));
      const picked = lib.models.filter(x => !opts.length || lib.models.length === 1 || opts.some(o => norm(o) === norm(x.name)));
      (picked.length ? picked : lib.models).forEach(x => out.models.push(newModel(equipToDef(x, eqs))));
    } else {
      if (!lib) out.unknown.push(name);
      out.cards.push({ name: lib ? lib.title : name, type: BP.typeOf(section), text: lib ? lib.text : "Card text not in your library yet. Load this list's PDF once to add it.", done: false });
    }
  }
  return out;
}

/* ---------- Storage: warbands, games, current game ---------- */
const KEY = "bushido-tracker-v2";               /* old single-game save, migrated once */
const WBKEY = "bushido-warbands-v1", GKEY = "bushido-games-v1", CURKEY = "bushido-current-v1";
const load = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? f; } catch (e) { return f; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const clone = o => JSON.parse(JSON.stringify(o));
let WB = load(WBKEY, null), GAMES = load(GKEY, {}), CUR = load(CURKEY, null);
let S, undoStack = [], openChip = null, openDetail = new Set(), oppOpen = false, oppConfirm = null, sheetConfirm = null;
const blankGame = g => ({ listName: g.listName, sub: g.sub || "", turn: 0, phase: "deploy", vp: 0, sp: 0, models: g.models, cards: g.cards, opp: { vp: 0, models: [] }, dismissed: {}, temp: [] });

/* A warband is a reusable template; a game is a warband plus play state */
const wbFromGame = (g, extra = {}) => ({ id: "w" + uid() + uid(), name: g.listName, sub: g.sub || "", models: g.models.map(m => clone(m.def)), cards: g.cards.map(c => ({ name: c.name, type: c.type, text: c.text })), added: Date.now(), ...extra });
const gameFromWb = wb => blankGame({ listName: wb.name, sub: wb.sub, models: wb.models.map(d => newModel(clone(d))), cards: wb.cards.map(c => ({ ...c, done: false })) });
const dayLabel = t => new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
function saveAll() { store(WBKEY, WB); store(GKEY, GAMES); store(CURKEY, CUR); }
function addWarband(wb) {
  const same = Object.values(WB).find(x => x.name === wb.name && x.sub === wb.sub);
  if (same) wb.id = same.id;                    /* re-importing a list updates it in place */
  wb.updated = Date.now();
  WB[wb.id] = wb; saveAll(); window.Sync?.pushWarband(wb); return wb;
}
function startGame(wbId) {
  const wb = WB[wbId], id = "g" + uid() + uid();
  GAMES[id] = { id, wbId, name: wb.name, created: Date.now(), updated: Date.now(), state: gameFromWb(wb) };
  window.Sync?.pushGame(GAMES[id]);
  switchGame(id);
  go("play");
}
function switchGame(id) {
  CUR = id; S = GAMES[id].state; undoStack = []; openDetail.clear(); openChip = null; oppOpen = false;
  saveAll();
}

/* First run: keep the game already in progress, and add the lists we already know */
if (!WB) {
  WB = {};
  const old = load(KEY, null);
  if (old && old.models && old.models.length) {
    const wb = addWarband(wbFromGame(old));
    const id = "g" + uid() + uid();
    GAMES[id] = { id, wbId: wb.id, name: wb.name, created: Date.now(), updated: Date.now(), state: old };
    CUR = id;
  }
  SEED.lists.forEach(p => { const g = gameFromPdf(p); if (!Object.values(WB).some(x => x.name === g.listName)) addWarband(wbFromGame(g)); });
  saveAll();
}
/* Card data shipped with an app update (e.g. cards transcribed from images) is applied once per device:
   the library gets the fuller cards, matching warbands are replaced, and games keep their play state */
(function applySeedUpdate() {
  const REVKEY = "bushido-seed-rev";
  if ((+load(REVKEY, 0)) >= (SEED.rev || 0)) return;
  for (const [k, c] of Object.entries(SEED.lib.cards)) if (richness(c) >= richness(LIB.cards[k])) LIB.cards[k] = c;
  for (const [k, e] of Object.entries(SEED.lib.equip)) LIB.equip[k] = e;
  for (const [k, g] of Object.entries(SEED.lib.glossary)) if (!LIB.glossary[k]) LIB.glossary[k] = g;
  saveLib();
  const now = Date.now();
  for (const t of SEED.warbands || []) {
    const mine = Object.values(WB).filter(x => x.name === t.name && (x.sub || "") === (t.sub || ""));
    const id = mine.length ? mine[0].id : t.id;
    WB[id] = { ...clone(t), id, added: mine.length ? mine[0].added : now, updated: now };
    for (const g of Object.values(GAMES)) {
      if (g.wbId !== id && !(g.state.listName === t.name && (g.state.sub || "") === (t.sub || ""))) continue;
      g.state.models.forEach(m => { const d = t.models.find(x => norm(x.name) === norm(m.def.name)); if (d) m.def = clone(d); });
      g.state.cards.forEach(c => { const d = t.cards.find(x => norm(x.name) === norm(c.name)); if (d) { c.text = d.text; c.type = d.type; } });
      g.updated = now;
    }
  }
  store(REVKEY, SEED.rev);
  saveAll();
})();
if (CUR && !GAMES[CUR]) CUR = null;
S = CUR ? GAMES[CUR].state : null;

/* Screens: "home" (hub), "lists" (My lists), "play" (the current game), "end:<gameId>" (a finished game's summary), "table" */
const VIEWKEY = "bushido-view-v1";
const isOver = g => !!g && g.status === "finished";
let VIEW = load(VIEWKEY, null);
if (!VIEW) VIEW = CUR && !isOver(GAMES[CUR]) ? "play" : "home";
let homeMsg = "", freshWb = null, abandoned = null;
function go(view) {
  VIEW = view; store(VIEWKEY, view); closeSheet();
  clearTimeout(toastTimer); $("toastHost").innerHTML = "";
  render();
  try { window.scrollTo(0, 0); } catch (e) {}
}
/* My lists screen: undo for deleting a game or list and for adding a list (in memory on this device) */
const listUndo = [];
function pushListUndo(label, fn) { listUndo.push({ label, fn }); if (listUndo.length > 20) listUndo.shift(); }
function doListUndo() {
  const u = listUndo.pop(); if (!u) return;
  u.fn(); saveAll(); homeMsg = ""; render(); toast(`Undone: ${u.label}`);
}
function save() { if (!CUR || !GAMES[CUR]) return; GAMES[CUR].state = S; GAMES[CUR].updated = Date.now(); store(GKEY, GAMES); store(CURKEY, CUR); window.Sync?.pushGame(GAMES[CUR]); }
function mutate(fn) { undoStack.push(JSON.stringify(S)); if (undoStack.length > 60) undoStack.shift(); fn(); save(); render(); }
function undo() { if (!undoStack.length) return; S = JSON.parse(undoStack.pop()); save(); render(); toast("Undone"); }
const hasLS = m => /\bLast Stand\b/i.test(m.def.traits || "") || !!m.states["Last Stand"];
const onLastStand = m => m.dmg >= m.def.w && hasLS(m) && !m.removed;
const alive = m => m.dmg < m.def.w || onLastStand(m);
if (!LIB.glossary["Last Stand"]) LIB.glossary["Last Stand"] = "If this model is reduced to 0 wounds, it may still be activated until the end of the Turn and is not removed from play. This model cannot recover wounds through any game effects or traits once its wounds have been reduced to 0. During the End Phase, the model is removed from play.";
const findAny = id => S.models.find(x => x.id === id) || S.opp.models.find(x => x.id === id);

/* ---------- Phase flow ---------- */
const PH = [["deploy", "Deploy"], ["start", "Start"], ["main", "Main"], ["end", "End"]];
function nextPhase() {
  mutate(() => {
    if (S.phase === "deploy" || S.phase === "end") {
      S.turn++; S.phase = "start";
      let gained = 0;
      S.models.forEach(m => {
        for (const k in m.used) if (m.used[k] === "OpT") delete m.used[k];
        if (alive(m)) { const b = m.ki; m.ki = Math.min(m.def.kiCap, m.ki + m.def.kiGen); gained += m.ki - b; }
        delete m.states["Run"];
      });
      setTimeout(() => toast(`Turn ${S.turn}: +${gained} Ki generated`, true), 0);
    } else if (S.phase === "start") S.phase = "main";
    else if (S.phase === "main") {
      S.phase = "end";
      const gone = S.models.filter(onLastStand);
      gone.forEach(m => m.removed = true);
      if (gone.length) setTimeout(() => toast(`Removed at End Phase (Last Stand): ${gone.map(m => m.def.name).join(", ")}`, true), 0);
      (S.temp || []).forEach(t => { const m = findAny(t.id); if (m) delete m.states[t.state]; });
      S.temp = [];
    }
  });
}

/* Reminders come from card and model text: sentences are placed by the phase they mention */
function phaseOf(sentence) {
  if (/Starting Phase/i.test(sentence)) return "start";
  if (/\bEnd Phase\b/i.test(sentence) && !/until the End Phase/i.test(sentence)) return "end";
  if (/deploy|begin the game|before the game/i.test(sentence)) return "deploy";
  return null;
}
const sentences = t => (t || "").replace(/\s*\b(Permitted|Requirement)\s*\[[^\]]*\]\.?/g, "").replace(/\s+/g, " ").split(/(?<=\.)\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
function actionFor(s) {
  if (/\b(all|friendly) models (gain|begin the game with) (a|1) Ki Token/i.test(s)) return { kind: "ki" };
  const m = s.match(/Enemy model to gain (?:a |an |the )?([A-Z][\w' -]*?) (Marker|Trait|State)/);
  if (m) return { kind: "enemy", state: m[1].trim(), temp: /until the End Phase/i.test(s) };
  return null;
}
/* "Play during X." carries its phase to the sentences that follow it */
function cardGroups(text) {
  const out = []; let open = null;
  for (const s of sentences(text)) {
    if (/^(Requirement|Permitted)\b/i.test(s)) { open = null; continue; }
    const ph = phaseOf(s), turn = (s.match(/Turn (\d+)/i) || [])[1];
    if (ph) { const g = { phase: ph, turn: turn ? +turn : null, text: s }; out.push(g); open = g; }
    else if (open && (/^Play\b/i.test(open.text) || /^(That|This|It|Then)\b/.test(s))) open.text += " " + s;
  }
  return out;
}
function reminders() {
  const r = [];
  const keyBase = `${S.turn}:${S.phase}`;
  const push = (key, html, extra = {}) => { const k = `${keyBase}:${key}`; if (!S.dismissed[k]) r.push({ key: k, html, ...extra }); };
  S.cards.forEach((c, ci) => {
    cardGroups(c.text).forEach((g, gi) => {
      if (g.phase !== S.phase || (g.turn && g.turn !== S.turn)) return;
      const lasting = /rest of the game/i.test(g.text);
      if (c.done && !lasting) return;
      push(`c${ci}g${gi}`, `<strong>${esc(c.name)}</strong>: ${esc(g.text)}`, { action: actionFor(g.text), card: c.type === "Event" && !lasting ? ci : null });
    });
  });
  S.models.forEach(m => {
    if (!alive(m)) return;
    m.def.notes.forEach((n, ni) => sentences(n.d).forEach((s, si) => {
      if (phaseOf(s) === S.phase && !/^Play/.test(s)) push(`${m.id}n${ni}s${si}`, `<strong>${esc(m.def.name)}</strong> · ${esc(n.n)}: ${esc(s)}`);
    }));
    if (S.phase === "start" && m.def.intimidate) push(`${m.id}int`, `<strong>${esc(m.def.name)}</strong> may Intimidate an enemy within 8".`);
    if (S.phase === "start") {
      const st = Object.keys(m.states).filter(k => START_RULES[baseState(k)]);
      st.forEach(k => push(`${m.id}start${baseState(k)}`, `<strong>${esc(m.def.name)}</strong> · ${esc(k)}${m.states[k] > 1 ? " ×" + m.states[k] : ""}: ${START_RULES[baseState(k)]}.`));
    }
    if (S.phase === "end") {
      const tick = Object.keys(m.states).filter(k => TICKING.includes(baseState(k)));
      if (tick.length) push(`${m.id}tick`, `<strong>${esc(m.def.name)}</strong>: resolve ${tick.map(k => esc(k) + (m.states[k] > 1 ? " ×" + m.states[k] : "")).join(", ")}.`);
    }
  });
  return r;
}

/* ---------- Render ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function glossKey(token) {
  const keys = Object.keys(LIB.glossary);
  let t = token.replace(/\[.*?\]|\(.*?\)|:.*$/g, "").trim();
  while (t) {
    const k = keys.find(k => norm(k) === norm(t));
    if (k) return k;
    t = t.split(" ").slice(0, -1).join(" ");
  }
  return null;
}
const ruleList = s => BP.splitTop(s).map(tok => { const k = glossKey(tok); return k ? `<button class="rule" data-rule="${esc(k)}">${esc(tok)}</button>` : esc(tok); }).join(", ");
/* Traits used while resolving a Melee Exchange (defences, dice and damage modifiers, special attacks and defences), shown first and apart from the rest */
const MELEE_TRAITS = new Set(["parry","dodge","prowess","indomitable","feint","impenetrable defence","counterstrike defence","brutal","strong","weak","pierce","powerful attack","combo attack","armour","tough","durable","reach","slow","lightning reflexes","kata","co-ordinated attack","coordinated attack","defensive","aggressive","chain weapon","sharp","endurance","tireless","unblockable","forceback attack","push attack","push defence","sidestep attack","sidestep defence","slam attack","sweep attack","sweep defence","split attack","stun attack","bear stands alone"]);
const meleeTrait = tok => { const t = tok.replace(/\[.*?\]|\(.*?\)|:.*$/g, "").trim().toLowerCase().replace(/\s+/g, " "); return MELEE_TRAITS.has(t) || [...MELEE_TRAITS].some(n => t.startsWith(n + " ")); };
/* Corrections for card data that lost its brackets and numbers when it was read from a list PDF (checked against the printed cards).
   Applied in place whenever a model is drawn, so existing lists, games and tests on a device are repaired too. */
function fixDef(d) {
  if (!d || !d.name) return d;
  if (norm(d.name) === "yukan'na") {
    if (d.traits && /Prowess\s+Melee(?![\]\w])/.test(d.traits)) d.traits = d.traits.replace(/Prowess\s+Melee(\s*\(\d\))?/, "Prowess [Melee](1)");
    (d.feats || []).forEach(f => { if (f.d && /Bodyguard Imperial\s*\./.test(f.d)) f.d = f.d.replace(/Bodyguard Imperial\s*\./, 'Bodyguard [Imperial](3").'); });
  }
  return d;
}
function traitBlock(s, cls) {
  const toks = BP.splitTop(s || ""), mel = toks.filter(meleeTrait), rest = toks.filter(t => !meleeTrait(t));
  const one = list => ruleList(list.join(", "));
  if (!mel.length) return `<p class="${cls}">${one(rest)}</p>`;
  return `<div class="tgroups ${cls}"><p class="tg-melee"><span class="tg-label">Melee exchange</span>${one(mel)}</p>${rest.length ? `<p class="tg-other"><span class="tg-label">Other</span>${one(rest)}</p>` : ""}</div>`;
}
function pips(n, filled, cls, mid) {
  const box = (i, label) => `<button class="pip ${i < filled ? "on" : ""}" data-pip="${cls}" data-m="${mid}" data-i="${i}" aria-label="${cls === "w" ? "Wound box" : "Ki"} ${label}"></button>`;
  if (cls !== "w") {
    let h = `<div class="pips">`;
    for (let i = 0; i < n; i++) h += box(i, i + 1);
    return h + `</div>`;
  }
  /* Wounds: fixed rows of at most 8, balanced. The top row depletes first, each row right to left. */
  const per = n <= 8 ? n : Math.ceil(n / Math.ceil(n / 8));
  let h = `<div class="pips rows">`, start = 0, label = 1;
  while (start < n) {
    const len = Math.min(per, n - start);
    h += `<div class="pip-row">`;
    for (let p = 0; p < len; p++) h += box(start + len - 1 - p, label++);
    h += `</div>`;
    start += len;
  }
  return h + `</div>`;
}
function chipsFor(m) {
  return Object.entries(m.states).map(([k, c]) => {
    const key = `${m.id}:${k}`, cat = CAT[k] || "neutral";
    return openChip === key
      ? `<span class="chip open cat-${cat}"><i></i>${esc(k)}<button class="step" data-st="${esc(k)}" data-m="${m.id}" data-d="-1" aria-label="Remove one">−</button><span class="c num">${c}</span><button class="step" data-st="${esc(k)}" data-m="${m.id}" data-d="1" aria-label="Add one">+</button></span>`
      : `<button class="chip cat-${cat}" data-chip="${esc(key)}"><i></i>${esc(k)}${c > 1 ? `<span class="c num">${c}</span>` : ""}</button>`;
  }).join("");
}
const stat = (a, b) => a === "" || a == null ? "–" : b ? `${a}/${b}` : a;

const HOME_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>`;
function render() {
  if (VIEW === "play" && (!CUR || !GAMES[CUR] || !S)) VIEW = "home";
  if (VIEW === "play" && isOver(GAMES[CUR])) VIEW = "end:" + CUR;
  if (VIEW.startsWith("end:") && !GAMES[VIEW.slice(4)]) VIEW = "lists";
  if (VIEW.startsWith("test:") && !findTest(VIEW.slice(5))) VIEW = "tests";
  $("homeView").hidden = VIEW !== "home" && VIEW !== "lists";
  $("endView").hidden = !VIEW.startsWith("end:");
  $("playView").hidden = VIEW !== "play";
  $("tableView").hidden = VIEW !== "table";
  const testing = VIEW === "tests" || VIEW.startsWith("test:");
  $("testView").hidden = !testing;
  document.body.classList.toggle("table-mode", VIEW === "table" || VIEW.startsWith("test:"));
  document.querySelector(".foot").hidden = VIEW === "table" || VIEW.startsWith("test:");
  document.body.classList.toggle("test-mode", VIEW.startsWith("test:"));
  if (typeof diceSync === "function") diceSync();
  if (VIEW === "home") return renderHub();
  if (VIEW === "lists") return renderHome();
  if (VIEW === "table") return renderTable();
  if (VIEW === "tests") return renderTests();
  if (VIEW.startsWith("test:")) return renderTest(VIEW.slice(5));
  if (VIEW !== "play") return renderEnd(GAMES[VIEW.slice(4)]);
  renderPlay();
}
function renderPlay() {
  $("listName").innerHTML = HOME_ICON + " " + esc(S.listName);
  $("turnLabel").textContent = S.turn ? `Turn ${S.turn}` : "Deployment";
  $("phases").innerHTML = PH.filter(p => S.turn ? p[0] !== "deploy" : true).map(p => `<span class="${p[0] === S.phase ? "on" : ""}">${p[1]}</span>`).join("");
  $("next").textContent = S.phase === "deploy" ? "Start turn 1" : S.phase === "start" ? "Main phase ▸" : S.phase === "main" ? "End phase ▸" : `Turn ${S.turn + 1} ▸`;
  $("vp").textContent = S.vp; $("sp").textContent = S.sp;
  $("undo").disabled = !undoStack.length;

  $("reminders").innerHTML = reminders().map(r => {
    const btn = r.action && r.action.kind === "ki" ? `<button class="act" data-rem="${r.key}" data-do="ki" data-card="${r.card ?? ""}">+1 Ki all</button>`
      : r.action && r.action.kind === "enemy" ? `<button class="act" data-rem="${r.key}" data-do="enemy" data-state="${esc(r.action.state)}" data-temp="${r.action.temp ? 1 : ""}" data-card="${r.card ?? ""}">Choose</button>`
      : "";
    return `<div class="rem"><p>${r.html}</p><div class="rem-acts">${btn}<button class="act quiet" data-rem="${r.key}" data-do="done" data-card="${r.card ?? ""}">Done</button></div></div>`;
  }).join("");

  renderOpp();
  const live = S.models.filter(alive);
  $("readyCount").textContent = `${live.length} of ${S.models.length} models standing`;
  $("woundTotal").textContent = `${S.models.reduce((a, m) => a + m.dmg, 0)} wounds taken`;

  $("models").innerHTML = S.models.map(m => {
    const d = fixDef(m.def), dead = !alive(m);
    const ls = onLastStand(m);
    const pills = dead ? `<span class="pill dead">Dead</span>` : ls ? `<button class="pill ls" data-rule="Last Stand">Last Stand</button>` : d.zeroKiSlow && m.ki === 0 ? `<span class="pill slow">Slow</span>` : "";
    const feats = d.feats.map(f => {
      const used = f.lim && m.used[f.n];
      const can = !dead && !used && m.ki >= kiCost(f);
      return `<button class="feat ${used ? "used" : ""}" data-feat="${esc(f.n)}" data-m="${m.id}" ${can ? "" : "disabled"} title="${esc(f.d)}"><span class="cost">${f.c}</span>${esc(f.n)}${f.lim ? ` · ${f.lim}` : ""}</button>`;
    }).join("");
    const st = d.stats;
    d.weapons = d.weapons.filter(w => !(!w.s && /,/.test(w.n)));
    const eqNames = [...d.weapons.filter(w => w.eq).map(w => w.n), ...(d.equip || []).map(e => e.n)];
    const detail = openDetail.has(m.id) ? `<div class="detail">
      <div class="statline">
        <div><small>Mel</small><b class="num">${stat(st.mp, st.mb)}</b></div><div><small>Rng</small><b class="num">${stat(st.rp, st.rb)}</b></div>
        <div><small>Mov</small><b class="num">${stat(st.mv, st.mvb)}</b></div><div><small>Ki</small><b class="num">${d.kiGen}/${d.kiCap}</b></div>
        <div><small>Base</small><b class="num">${esc((st.size || "").replace(/^\w+\s*/, "") || "–")}</b></div></div>
      ${d.weapons.length ? `<div><h4>Weapons</h4>${d.weapons.map(w => `<div class="wpn"><b>${esc(w.n)} ${esc(w.s)}${w.range ? ` · ${esc(w.range)}"` : ""}${w.eq ? '<span class="eq">Equip</span>' : ""}</b><em>${ruleList(w.t)}</em></div>`).join("")}</div>` : ""}
      ${(d.equip || []).length ? `<div><h4>Equipment</h4>${d.equip.map(e => `<p class="${(m.discarded || {})[e.n] ? "eq-off" : ""}"><b>${esc(e.n)}</b>${(m.discarded || {})[e.n] ? " (discarded)" : ""}: ${esc(e.d)}</p>`).join("")}</div>` : ""}
      ${d.traits ? `<div><h4>Traits</h4>${traitBlock(d.traits, "")}</div>` : ""}
      ${d.feats.length ? `<div><h4>Ki feats</h4>${d.feats.map(f => `<p><b>${esc(f.n)}</b> (${f.c} Ki, ${esc(f.tm)}${f.sub ? ", " + esc(f.sub) : ""}${f.limText ? ", " + esc(f.limText) : ""}): ${esc(f.d)}</p>`).join("")}</div>` : ""}
      ${d.notes.length ? `<div><h4>Unique effects</h4>${d.notes.map(n => `<p><b>${esc(n.n)}</b>: ${esc(n.d)}</p>`).join("")}</div>` : ""}
      ${d.immune.length ? `<div><h4>Immune to</h4><p>${d.immune.join(", ")}</p></div>` : ""}
      <p class="tap-hint">Underlined rules open their definition.</p>
    </div>` : "";
    return `<article class="m ${dead ? "dead" : ""} ${ls ? "on-ls" : ""}">
      <div class="m-head"><div class="m-name">${avatar(d)}${esc(d.name)}${d.group ? "<small>Group</small>" : ""}${eqNames.length ? `<span class="m-eq">${eqNames.map(n => { const off = (m.discarded || {})[n]; return `<button class="eq-tag ${off ? "off" : ""}" data-eqtoggle="${esc(n)}" data-m="${m.id}" aria-pressed="${off ? "true" : "false"}" title="${off ? "Discarded. Tap to restore" : "Tap when discarded"}">${esc(n)}</button>`; }).join("")}</span>` : ""}</div>${pills}</div>
      <div class="track w"><span class="track-label">Wounds</span>${pips(d.w, m.dmg, "w", m.id)}<span class="track-val num"><b>${d.w - m.dmg}</b>/${d.w}</span></div>
      ${d.kiCap > 0 ? `<div class="track k"><span class="track-label">Ki</span>${pips(d.kiCap, m.ki, "k", m.id)}<span class="track-val num"><b>${m.ki}</b> +${d.kiGen}</span></div>` : ""}
      <div class="states">${chipsFor(m)}${dead ? "" : `<button class="add-state" data-addstate="${m.id}">+ State</button>`}</div>
      ${feats ? `<div class="feats">${feats}</div>` : ""}
      <button class="more" data-detail="${m.id}">${openDetail.has(m.id) ? "Hide card ▴" : "Card details ▾"}</button>
      ${detail}
    </article>`;
  }).join("") || `<p class="note">No models loaded. Open “Games &amp; warbands” below.</p>`;

  $("cards").innerHTML = S.cards.map((c, i) => `<div class="card ${c.done ? "done" : ""}"><button class="check ${c.done ? "on" : ""}" data-cardcheck="${i}" aria-label="Mark ${esc(c.name)} as resolved">${c.done ? "✓" : ""}</button><div><span class="card-type">${esc(c.type)}</span><b>${esc(c.name)}</b><p>${esc(c.text)}</p></div></div>`).join("") || `<p class="note">No event, terrain or theme cards in this list.</p>`;
}

function renderOpp() {
  const o = S.opp;
  const marked = o.models.filter(m => Object.keys(m.states).length);
  const sum = !o.models.length ? `<em>Add their models to track markers</em>`
    : marked.length ? marked.map(m => `${esc(m.name)} <em>${Object.keys(m.states).map(esc).join(", ")}</em>`).join(" · ")
    : `<em>${o.models.length} models, no markers</em>`;
  $("opp").innerHTML = `<div class="opp">
    <button class="opp-head" data-opptoggle="1" aria-expanded="${oppOpen}"><b>Opponent</b><span class="opp-sum">${sum}</span><span class="opp-vp num">VP ${o.vp}</span><span aria-hidden="true">${oppOpen ? "▴" : "▾"}</span></button>
    ${oppOpen ? `<div class="opp-body">
      <div class="opp-tools"><div class="score"><b>Their VP</b><button class="step" data-oppvp="-1" aria-label="Remove opponent VP">−</button><span class="v num">${o.vp}</span><button class="step" data-oppvp="1" aria-label="Add opponent VP">+</button></div></div>
      ${o.models.map(m => `<div class="opp-row"><span class="nm">${avatar(m)}${esc(m.name)}</span>${chipsFor(m)}<button class="add-state" data-addstate="${m.id}">+ State</button><button class="x ${oppConfirm === m.id ? "confirm" : ""}" data-oppdel="${m.id}">${oppConfirm === m.id ? "Remove?" : "✕"}</button></div>`).join("")}
      <form class="opp-add" id="oppAdd"><input id="oppName" placeholder="Enemy model name" autocomplete="off" aria-label="Enemy model name"><button type="submit">Add</button></form>
      ${Object.keys(WB).length ? `<div class="opp-add"><select id="oppWb" aria-label="Saved warband">${Object.values(WB).sort((a, b) => a.name.localeCompare(b.name)).map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join("")}</select><button data-oppfill="">Add all from warband</button></div>` : ""}
    </div>` : ""}
  </div>`;
}

/* ---------- Sheets & toast ---------- */
const sheet = html => $("sheetHost").innerHTML = `<div class="scrim" data-close="1"><div class="sheet" role="dialog">${html}</div></div>`;
function closeSheet() { $("sheetHost").innerHTML = ""; }
function stateSheet(mid) {
  const m = findAny(mid), imm = m.def ? m.def.immune : [];
  const isImm = k => imm.includes(baseState(k)) || imm.includes(k);
  const name = m.def ? m.def.name : m.name;
  sheet(`<h3>${esc(name)}</h3><p class="sub">Tap a state to add it. Tap it on the card to change the count.</p>
    <div class="grid-states">${STATES.map(([k, c]) => `<button data-pick="${esc(k)}" data-m="${mid}" ${isImm(k) ? "disabled" : ""}><i style="background:var(--${c === "harm" ? "harm" : c === "fire" ? "fire" : c === "poison" ? "poison" : c === "good" ? "ki" : "muted"})"></i>${esc(k)}${isImm(k) ? "<small>Immune</small>" : m.states[k] ? `<small>×${m.states[k]}</small>` : ""}</button>`).join("")}</div>`);
}
function enemySheet(state, remKey, temp, card) {
  sheet(`<h3>${esc(state)}</h3><p class="sub">Which enemy model gains it?</p>
    <div class="pick-list">${S.opp.models.map(m => `<button data-enemy="${m.id}" data-state="${esc(state)}" data-rem="${remKey}" data-temp="${temp}" data-card="${card}">${esc(m.name)}</button>`).join("")}</div>
    <form class="opp-add" id="oppAddPick" style="margin-top:10px"><input id="oppPickName" placeholder="Or type an enemy model name" autocomplete="off" aria-label="Enemy model name"><button type="submit">Add</button></form>`);
  $("sheetHost").dataset.ctx = JSON.stringify({ state, remKey, temp, card });
}
const phaseName = { deploy: "Deployment", start: "Start Phase", main: "Main Phase", end: "End Phase" };
const resultOf = st => st.vp > st.opp.vp ? "win" : st.vp < st.opp.vp ? "loss" : "draw";
const RESULT = { win: "Victory", loss: "Defeat", draw: "Draw" };
const confirmBtn = (key, label, ask) => sheetConfirm === key
  ? `<button class="btn small danger" data-sdel="${key}">${ask}</button>`
  : `<button class="btn small quiet" data-sdel="${key}" aria-label="${esc(label)}">✕</button>`;
function renderHub() {
  const live = Object.values(GAMES).filter(g => !isOver(g)).length;
  let tbl = null; try { tbl = TBL === undefined ? load(TBLKEY, null) : TBL; } catch (e) {}
  $("homeView").innerHTML = `
    <header class="home-head"><span class="mark" aria-hidden="true">武</span><div><h1>Bushido</h1><p>Table tracker</p></div></header>
    <div class="hub">
      <button class="hub-tile" data-area="lists"><span class="hub-meta">${live ? `${live} game${live === 1 ? "" : "s"} in progress` : `${Object.keys(WB).length} warbands`}</span>
        <b>My lists</b><p>Track your own warband at the table: wounds, Ki, states, feats and card reminders.</p></button>
      <button class="hub-tile" data-area="tests"><span class="hub-meta">${Object.keys(tests()).length ? `${Object.keys(tests()).length} test${Object.keys(tests()).length === 1 ? "" : "s"}` : "Tablet"}</span>
        <b>Testing lists</b><p>Two warbands side by side with every stat, wounds, Ki, feats and states. Then play them on the Table.</p></button>
      <button class="hub-tile" data-area="table"><span class="hub-meta">${tbl ? "Table in progress" : "Laptop"}</span>
        <b>Table</b><p>Scenario, terrain and deployment on a 24" battlefield, with facing and measuring.</p></button>
      <button class="hub-tile" disabled><span class="hub-meta">Not built yet</span>
        <b>Campaign</b><p>Track games, results and changes across a campaign.</p></button>
    </div>`;
}
function renderHome() {
  const all = Object.values(GAMES).sort((a, b) => b.updated - a.updated);
  const live = all.filter(g => !isOver(g)), done = all.filter(isOver);
  const wbs = Object.values(WB).sort((a, b) => a.name.localeCompare(b.name));
  const libCount = Object.values(LIB.cards).filter(c => c.kind === "profile").length;
  $("homeView").innerHTML = `
    <div class="thead"><button class="btn small" data-area="home">‹ Home</button><h1>My lists</h1><span class="spacer"></span><button class="btn small" data-lundo title="Undo the last change to your lists (Ctrl+Z)" ${listUndo.length ? "" : "disabled"}>↶ Undo${listUndo.length ? ": " + esc(listUndo[listUndo.length - 1].label) : ""}</button></div>
    ${homeMsg ? `<p class="note" role="status">${esc(homeMsg)}</p>` : ""}

    ${live.length ? `<div class="sec-h"><h2>Games in progress</h2></div>
    <div class="slots">${live.map(g => { const st = g.state; return `<div class="slot">
      <div class="slot-main"><b>${esc(g.name)}</b><span>${st.turn ? `Turn ${st.turn} · ${phaseName[st.phase]}` : "Deployment"} · VP ${st.vp}–${st.opp.vp} · ${esc(dayLabel(g.updated))}</span></div>
      <button class="btn small primary" data-resume="${g.id}">Continue</button>${confirmBtn("g:" + g.id, "Abandon " + g.name, "Abandon?")}</div>`; }).join("")}</div>` : ""}

    <div class="sec-h"><h2>Start a game</h2><span>${wbs.length} warband${wbs.length === 1 ? "" : "s"}</span></div>
    <div class="slots">${wbs.map(w => `<div class="slot ${w.id === freshWb ? "fresh" : ""}">
      <div class="slot-main"><b>${esc(w.name)}</b><span>${esc(w.sub ? w.sub + " · " : "")}${w.models.length} models · ${w.cards.length} cards</span></div>
      <button class="btn small primary" data-newgame="${w.id}">Play</button>${confirmBtn("w:" + w.id, "Delete " + w.name, "Delete?")}</div>`).join("")
      || `<p class="empty">No warbands yet. Import a list below.</p>`}</div>

    <div class="sec-h"><h2>Add a warband</h2></div>
    <div class="import">
      <div class="row"><label class="btn primary file-btn" for="pdfFile">Import list PDF</label><input type="file" id="pdfFile" accept="application/pdf,.pdf" hidden></div>
      <p class="note" id="importNote" role="status">Use the PDF export from newrecruit.eu. It brings in stats, Ki feats, equipment, card text and rules.</p>
      <details class="paste"><summary>Paste list text instead</summary>
        <p class="note">Works for cards already in your library (${libCount} profile cards so far).</p>
        <textarea id="listText" spellcheck="false" placeholder="Paste a newrecruit.eu text export"></textarea>
        <div class="row"><button class="btn" id="doImport">Save warband</button></div>
      </details>
    </div>

    ${done.length ? `<div class="sec-h"><h2>Finished games</h2></div>
    <div class="slots">${done.map(g => { const st = g.state, r = resultOf(st); return `<div class="slot res-${r}">
      <div class="slot-main"><b>${esc(g.name)}</b><span>${RESULT[r]} ${st.vp}–${st.opp.vp} · ${st.turn} turn${st.turn === 1 ? "" : "s"} · ${esc(dayLabel(g.finished || g.updated))}</span></div>
      <button class="btn small" data-viewgame="${g.id}">View</button>${confirmBtn("g:" + g.id, "Delete " + g.name, "Delete?")}</div>`; }).join("")}</div>` : ""}

    <details class="paste"><summary>Backup and restore</summary>
      <p class="note">Copies all your warbands, games and card library as text, so you can move them to another copy of the tracker.</p>
      <div class="row"><button class="btn" id="copyBackup">Copy backup</button></div>
      <textarea id="backupText" spellcheck="false" placeholder="To restore, paste a backup here" aria-label="Backup text"></textarea>
      <div class="row"><button class="btn" id="doRestore">Restore from pasted backup</button></div>
      <p class="note" id="backupNote" role="status"></p>
    </details>`;
}
const duration = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`; };
function renderEnd(g) {
  const st = g.state, r = resultOf(st);
  const scored = st.vp || st.opp.vp;
  const lost = st.models.filter(m => !alive(m)), wounds = st.models.reduce((a, m) => a + m.dmg, 0);
  const wb = WB[g.wbId] || Object.values(WB).find(w => w.name === g.name);
  $("endView").innerHTML = `
    <div class="end-hero">
      <small>${esc(g.name)} · ${esc(dayLabel(g.finished || g.updated))}</small>
      <h1 class="${scored ? r : ""}">${scored ? RESULT[r] : "Game over"}</h1>
      <p>${st.turn ? `${st.turn} turn${st.turn === 1 ? "" : "s"}, ended in the ${phaseName[st.phase]}` : "Ended during Deployment"} · played for ${duration((g.finished || g.updated) - g.created)}</p>
      <div class="score-line"><div><b>${st.vp}</b><span>Your VP</span></div><i>–</i><div><b>${st.opp.vp}</b><span>Their VP</span></div></div>
    </div>
    <div class="tiles">
      <div><small>Turns</small><b>${st.turn}</b></div>
      <div><small>SP</small><b>${st.sp}</b></div>
      <div><small>Models lost</small><b>${lost.length}/${st.models.length}</b></div>
      <div><small>Wounds taken</small><b>${wounds}</b></div>
    </div>

    <div class="sec-h"><h2>Your warband</h2></div>
    <div class="roster">${st.models.map(m => {
      const dead = !alive(m), ls = onLastStand(m);
      const states = Object.entries(m.states).map(([k, c]) => k + (c > 1 ? " ×" + c : ""));
      const gone = Object.keys(m.discarded || {});
      const bits = [`Wounds ${m.dmg}/${m.def.w}`, `Ki ${m.ki}`, states.length ? states.join(", ") : "", gone.length ? "Discarded: " + gone.join(", ") : ""].filter(Boolean);
      return `<div class="roster-row ${dead ? "is-dead" : ""}"><b>${avatar(m.def)}${esc(m.def.name)}</b>
        <span class="st ${dead ? "dead" : "up"}">${dead ? "Dead" : ls ? "Last Stand" : "Standing"}</span>
        <span class="meta">${esc(bits.join(" · "))}</span></div>`;
    }).join("")}</div>

    ${st.opp.models.length ? `<div class="sec-h"><h2>Opponent</h2></div>
    <div class="roster">${st.opp.models.map(m => { const states = Object.entries(m.states).map(([k, c]) => k + (c > 1 ? " ×" + c : "")); return `<div class="roster-row"><b>${esc(m.name)}</b><span></span><span class="meta">${esc(states.join(", ") || "No markers")}</span></div>`; }).join("")}</div>` : ""}

    ${st.cards.length ? `<div class="sec-h"><h2>Cards</h2></div>
    <div class="roster">${st.cards.map(c => `<div class="roster-row"><b>${esc(c.name)}</b><span class="st ${c.done ? "up" : ""}">${/Event|Curse/.test(c.type) ? (c.done ? "Played" : "Not played") : ""}</span><span class="meta">${esc(c.type)}</span></div>`).join("")}</div>` : ""}

    <div class="end-actions">
      <button class="btn primary" id="endHome">Home</button>
      ${wb ? `<button class="btn" data-newgame="${wb.id}">Play again</button>` : ""}
      <button class="btn" data-reopen="${g.id}">Reopen game</button>
    </div>`;
}
function glossSheet(term) {
  sheet(`<h3>${esc(term)}</h3><p class="gloss">${esc(LIB.glossary[term])}</p>`);
}
let toastTimer;
function toast(msg, withUndo, action) {
  clearTimeout(toastTimer);
  $("toastHost").innerHTML = `<div class="toast" role="status"><span>${esc(msg)}</span>${action || (withUndo ? `<button data-undo="1">Undo</button>` : "")}</div>`;
  toastTimer = setTimeout(() => $("toastHost").innerHTML = "", 4000);
}

/* ---------- PDF reading (pdf.js loaded on first use) ---------- */
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
const loadScript = src => new Promise((ok, fail) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => fail(new Error("Could not load the PDF reader")); document.head.appendChild(s); });
let pdfReady = null;
function getPdfjs() {
  if (!pdfReady && window.APP_BUILD) pdfReady = (async () => {
    const lib = await import("./pdf.min.mjs");
    lib.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.mjs";
    return lib;
  })().catch(e => { pdfReady = null; throw e; });
  if (!pdfReady) pdfReady = (async () => {
    await loadScript(PDFJS + "pdf.min.js");
    await loadScript(PDFJS + "pdf.worker.min.js");
    const lib = window.pdfjsLib || window["pdfjs-dist/build/pdf"];
    lib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
    return lib;
  })().catch(e => { pdfReady = null; throw e; });
  return pdfReady;
}
async function readPdf(file) {
  const lib = await getPdfjs();
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
    pages.push({ items: tc.items.filter(i => typeof i.str === "string").map(i => ({ s: i.str, x: i.transform[4], y: vp.height - i.transform[5], w: i.width, h: i.height })) });
  }
  return BP.parse(pages);
}
document.addEventListener("change", async e => {
  if (e.target.id !== "pdfFile" || !e.target.files[0]) return;
  const note = $("importNote");
  note.textContent = "Reading PDF…";
  try {
    const p = await readPdf(e.target.files[0]);
    const g = gameFromPdf(p);
    if (!g.models.length) { note.textContent = "No profile cards found. Is this a newrecruit.eu list PDF?"; return; }
    addToLibrary(p);
    const wb = addWarband(wbFromGame(g));
    pushListUndo(`added ${wb.name}`, () => { delete WB[wb.id]; window.Sync?.remove("warbands", wb.id); });
    freshWb = wb.id; homeMsg = "";
    go("lists");
    toast(`Saved ${wb.name}: ${g.models.length} models, ${g.cards.length} cards. Tap Play to start.`);
  } catch (err) { note.textContent = `Couldn't read that PDF (${err.message}). Try again, or paste the list text.`; }
});

/* ---------- Events ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button,[data-close]"); if (!t) return;
  const ds = t.dataset, find = findAny;
  if (!ds.oppdel) oppConfirm = null;
  if (ds.close && e.target === t) return closeSheet();
  if (t.id === "next") return nextPhase();
  if (t.id === "undo" || ds.undo) return undo();
  if (ds.lundo !== undefined) return doListUndo();
  if (!ds.sdel) sheetConfirm = null;
  if (t.id !== "endGame") disarmEnd();
  if (t.id !== "abandonGame") disarmAbandon();
  if (ds.area) { homeMsg = ""; freshWb = null; return go(ds.area); }
  if (t.id === "listBtn" || t.id === "goHome" || t.id === "endHome") { homeMsg = ""; freshWb = null; return go("lists"); }
  if (ds.resume) { switchGame(ds.resume); go("play"); return toast(`Continuing ${GAMES[CUR].name}`); }
  if (ds.newgame) { freshWb = null; startGame(ds.newgame); return toast(`New game: ${GAMES[CUR].name}`); }
  if (ds.viewgame) return go("end:" + ds.viewgame);
  if (ds.reopen) {
    const g = GAMES[ds.reopen]; g.status = "playing"; delete g.finished; g.updated = Date.now();
    switchGame(g.id); save(); go("play"); return toast("Game reopened");
  }
  if (ds.sdel) {
    if (sheetConfirm !== ds.sdel) { sheetConfirm = ds.sdel; return render(); }
    const [kind, id] = ds.sdel.split(":"); sheetConfirm = null;
    if (kind === "g") { const g = GAMES[id]; delete GAMES[id]; if (id === CUR) { CUR = null; S = null; } pushListUndo(`deleted ${g.name}`, () => { GAMES[g.id] = g; window.Sync?.pushGame(g); }); }
    else { const w = WB[id]; delete WB[id]; pushListUndo(`deleted ${w.name}`, () => { WB[w.id] = w; window.Sync?.pushWarband?.(w); }); }
    saveAll(); window.Sync?.remove(kind === "g" ? "games" : "warbands", id);
    homeMsg = kind === "g" ? "" : "Warband deleted. Games already played with it are kept.";
    return render();
  }
  if (t.id === "endGame") {
    if (!endArmed) { endArmed = true; t.textContent = "End game?"; t.classList.add("armed"); clearTimeout(endTimer); endTimer = setTimeout(disarmEnd, 3000); return; }
    disarmEnd(); return finishGame();
  }
  if (t.id === "abandonGame") {
    if (!abandonArmed) { abandonArmed = true; t.textContent = "Abandon? Game will be deleted"; t.classList.add("armed"); clearTimeout(abandonTimer); abandonTimer = setTimeout(disarmAbandon, 3000); return; }
    disarmAbandon(); return abandonGame();
  }
  if (ds.unabandon !== undefined && abandoned) {
    GAMES[abandoned.id] = abandoned; window.Sync?.pushGame(abandoned);
    switchGame(abandoned.id); abandoned = null; go("play"); return toast("Game restored");
  }
  if (t.id === "copyBackup") {
    const text = JSON.stringify({ bushidoBackup: 1, WB, GAMES, LIB });
    const box = $("backupText"), note = $("backupNote");
    const shown = () => { box.value = text; box.focus(); box.select(); note.textContent = "Couldn't copy automatically. The backup is selected in the box above: copy it from there."; };
    try { navigator.clipboard.writeText(text).then(() => { note.textContent = `Backup copied (${Math.round(text.length / 1024)} KB). Paste it into the other copy's restore box.`; }, shown); } catch (err) { shown(); }
    return;
  }
  if (t.id === "doRestore") {
    let b; try { b = JSON.parse($("backupText").value); } catch (err) { b = null; }
    if (!b || !b.bushidoBackup) { $("backupNote").textContent = "That doesn't look like a tracker backup. Copy it again and paste the whole text."; return; }
    let w = 0, g = 0;
    for (const x of Object.values(b.WB || {})) if (!WB[x.id] || (WB[x.id].updated || 0) < (x.updated || 0)) { WB[x.id] = x; w++; window.Sync?.pushWarband(x); }
    for (const x of Object.values(b.GAMES || {})) if (!GAMES[x.id] || GAMES[x.id].updated < x.updated) { GAMES[x.id] = x; g++; window.Sync?.pushGame(x); }
    if (b.LIB) { Object.assign(LIB.cards, b.LIB.cards); Object.assign(LIB.equip, b.LIB.equip); Object.assign(LIB.glossary, b.LIB.glossary); saveLib(); window.Sync?.pushLibrary(); }
    if (CUR && GAMES[CUR]) S = GAMES[CUR].state;
    saveAll(); homeMsg = `Restored ${w} warbands and ${g} games.`;
    return render();
  }
  if (ds.oppfill !== undefined) {
    const wb = WB[$("oppWb").value]; if (!wb) return;
    mutate(() => { wb.models.forEach(d => S.opp.models.push({ id: "o" + uid(), name: d.name, states: {} })); });
    return toast(`Added ${wb.models.length} models from ${wb.name}`, true);
  }
  if (t.id === "themeBtn") { const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; r.dataset.theme = dark ? "light" : "dark"; try { localStorage.setItem(KEY + "-theme", r.dataset.theme) } catch (e) {} return; }
  if (t.id === "doReset") { closeSheet(); return restartGame(); }
  if (t.id === "restart") {
    if (!restartArmed) { restartArmed = true; t.classList.add("armed"); t.textContent = "Restart?"; clearTimeout(restartTimer); restartTimer = setTimeout(disarmRestart, 3000); return; }
    disarmRestart(); return restartGame();
  }
  if (t.id === "doImport") {
    const g = gameFromText($("listText").value);
    if (!g.models.length) { $("importNote").textContent = g.unknown.length ? `None of these are in your library yet: ${g.unknown.join(", ")}. Load the PDF instead.` : "No models found. Check the list has ## section headings."; return; }
    const wb = addWarband(wbFromGame(g)); freshWb = wb.id; homeMsg = ""; go("lists");
    pushListUndo(`added ${wb.name}`, () => { delete WB[wb.id]; window.Sync?.remove("warbands", wb.id); });
    return toast(g.unknown.length ? `Saved ${wb.name}. Not in library: ${g.unknown.join(", ")}` : `Saved ${wb.name}. Tap Play to start.`);
  }
  if (ds.score) return mutate(() => { S[ds.score] = Math.max(0, S[ds.score] + +ds.d); });
  if (ds.pip) {
    const m = find(ds.m), i = +ds.i, f = ds.pip === "w" ? "dmg" : "ki";
    const next = (m[f] === i + 1) ? i : i + 1;
    if (f === "dmg" && hasLS(m) && m.dmg >= m.def.w && next < m.dmg) return toast("Last Stand: wounds can't be recovered. Use Undo to fix a mistake.");
    mutate(() => { m[f] = next; if (f === "dmg" && next >= m.def.w && hasLS(m) && S.phase === "end") m.removed = true; });
    if (f === "dmg" && next >= m.def.w && hasLS(m)) toast(S.phase === "end" ? `${m.def.name} is removed from play (Last Stand)` : `${m.def.name} is on Last Stand until the End Phase`, true);
    return;
  }
  if (ds.addstate) return stateSheet(ds.addstate);
  if (ds.pick) { const m = find(ds.m); closeSheet(); openChip = `${m.id}:${ds.pick}`; return mutate(() => { m.states[ds.pick] = (m.states[ds.pick] || 0) + 1; }); }
  if (ds.chip) { openChip = openChip === ds.chip ? null : ds.chip; return render(); }
  if (ds.st) { const m = find(ds.m); return mutate(() => { const n = (m.states[ds.st] || 0) + +ds.d; if (n <= 0) { delete m.states[ds.st]; openChip = null; } else m.states[ds.st] = n; }); }
  if (ds.feat) { const m = find(ds.m), f = m.def.feats.find(x => x.n === ds.feat); mutate(() => { if (!xCost(f)) m.ki -= f.c; if (f.lim) m.used[f.n] = f.lim; }); return toast(xCost(f) ? `${m.def.name}: ${f.n}. Take off the X Ki you spend on the Ki track.` : `${m.def.name}: ${f.n} (−${f.c} Ki)`, true); }
  if (ds.detail) { openDetail.has(ds.detail) ? openDetail.delete(ds.detail) : openDetail.add(ds.detail); return render(); }
  if (ds.rule) return glossSheet(ds.rule);
  if (ds.eqtoggle) { const m = find(ds.m), n = ds.eqtoggle; let off; mutate(() => { m.discarded = m.discarded || {}; off = !m.discarded[n]; if (off) m.discarded[n] = 1; else delete m.discarded[n]; }); return toast(off ? `${n} discarded` : `${n} restored`, true); }
  if (ds.cardcheck !== undefined) return mutate(() => { S.cards[+ds.cardcheck].done = !S.cards[+ds.cardcheck].done; });
  if (ds.do === "done") return mutate(() => { S.dismissed[ds.rem] = 1; if (ds.card !== "") S.cards[+ds.card].done = true; });
  if (ds.do === "ki") { mutate(() => { S.models.forEach(m => { if (alive(m)) m.ki = Math.min(m.def.kiCap, m.ki + 1); }); S.dismissed[ds.rem] = 1; if (ds.card !== "") S.cards[+ds.card].done = true; }); return toast("All models gained 1 Ki", true); }
  if (ds.do === "enemy") return enemySheet(ds.state, ds.rem, ds.temp, ds.card);
  if (ds.enemy) { const m = find(ds.enemy); closeSheet(); applyEnemy(m, ds.state, ds.rem, ds.temp, ds.card); return; }
  if (ds.opptoggle) { oppOpen = !oppOpen; render(); if (oppOpen && !S.opp.models.length) $("oppName").focus(); return; }
  if (ds.oppvp) return mutate(() => { S.opp.vp = Math.max(0, S.opp.vp + +ds.oppvp); });
  if (ds.oppdel) { if (oppConfirm !== ds.oppdel) { oppConfirm = ds.oppdel; return render(); } oppConfirm = null; return mutate(() => { S.opp.models = S.opp.models.filter(x => x.id !== ds.oppdel); }); }
});
let endArmed = false, endTimer, abandonArmed = false, abandonTimer;
function disarmEnd() { endArmed = false; clearTimeout(endTimer); const b = $("endGame"); if (b) { b.textContent = "End game"; b.classList.remove("armed"); } }
function disarmAbandon() { abandonArmed = false; clearTimeout(abandonTimer); const b = $("abandonGame"); if (b) { b.textContent = "Abandon game"; b.classList.remove("armed"); } }
function finishGame() {
  const g = GAMES[CUR]; g.status = "finished"; g.finished = Date.now();
  save(); go("end:" + g.id);
}
function abandonGame() {
  const g = GAMES[CUR]; abandoned = g;
  delete GAMES[CUR]; window.Sync?.remove("games", CUR);
  CUR = null; S = null; saveAll(); homeMsg = "";
  go("lists");
  toast(`Abandoned ${g.name}`, false, `<button data-unabandon="">Undo</button>`);
}
let restartArmed = false, restartTimer;
const RESTART_ICON = `<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/></svg>`;
function disarmRestart() { restartArmed = false; const b = $("restart"); if (b) { b.classList.remove("armed"); b.innerHTML = RESTART_ICON; } }
function restartGame() {
  mutate(() => {
    const keep = S;
    S = blankGame({ listName: keep.listName, sub: keep.sub, cards: keep.cards.map(c => ({ ...c, done: false })), models: keep.models.map(m => ({ ...m, dmg: 0, ki: 0, states: {}, used: {}, discarded: {}, removed: false })) });
    S.opp.models = keep.opp.models.map(m => ({ ...m, states: {} }));
  });
  toast("Restarted at Deployment", true);
}
function applyEnemy(m, state, rem, temp, card) {
  mutate(() => {
    m.states[state] = (m.states[state] || 0) + 1;
    if (temp) (S.temp = S.temp || []).push({ id: m.id, state });
    S.dismissed[rem] = 1;
    if (card !== "" && card != null) S.cards[+card].done = true;
  });
  toast(`${m.name} gains ${state}${temp ? " until the End Phase" : ""}`, true);
}
document.addEventListener("click", e => { if (openChip && !e.target.closest(".chip")) { openChip = null; render(); } }, true);
document.addEventListener("submit", e => {
  e.preventDefault();
  if (e.target.id === "oppAdd") {
    const name = $("oppName").value.trim(); if (!name) return;
    mutate(() => { S.opp.models.push({ id: "o" + uid(), name, states: {} }); });
    $("oppName").focus();
  }
  if (e.target.id === "oppAddPick") {
    const name = $("oppPickName").value.trim(); if (!name) return;
    const ctx = JSON.parse($("sheetHost").dataset.ctx || "{}");
    const m = { id: "o" + uid(), name, states: {} };
    S.opp.models.push(m);
    closeSheet(); applyEnemy(m, ctx.state, ctx.remKey, ctx.temp, ctx.card);
  }
});
/* ---------- Hooks used by sync (installed app only) ---------- */
function currentTables() {
  try { if (TBL === undefined) TBL = load(TBLKEY, null); } catch (e) {}
  if (!TBL) return {};
  TBL.id = "current"; return { current: TBL };
}
window.App = {
  data: () => ({ WB, GAMES, LIB, TESTS: tests(), TABLES: currentTables() }),
  /* The table on the battlefield: one per sync code; the most recently changed copy wins */
  applyTable(remote) {
    if (TBL === undefined) TBL = load(TBLKEY, null);
    if (TBL && (TBL.updated || 0) >= (remote.updated || 0)) return;
    TBL = remote; TBL.id = "current"; store(TBLKEY, TBL); tHistReset(); regAllCustom();
    if (tSel && !itemOf(tSel.kind, tSel.id)) tSel = null;
    if (VIEW === "table" && !tDrag && !App.sheetOpen()) renderTable(); else if (VIEW === "home" || VIEW === "tests" || VIEW.startsWith("test:")) { if (!App.sheetOpen()) render(); }
  },
  applyTest(remote) {
    const mine = tests()[remote.id];
    delete xHist[remote.id];   /* the other device's changes can't be undone from here */
    if (!mine) tests()[remote.id] = remote;
    else {
      const [merged, mineNewer] = mergeTest(mine, remote);
      tests()[remote.id] = merged;
      if (mineNewer) window.Sync?.pushTest(merged);
    }
    saveTests();
    if (!App.sheetOpen() && (VIEW === "tests" || VIEW.startsWith("test:") || VIEW === "table" || VIEW === "home")) render();
  },
  sheetOpen: () => !!$("sheetHost").innerHTML,
  applyGame(g) {
    const mine = GAMES[g.id];
    if (mine && mine.updated >= g.updated) return;
    GAMES[g.id] = g;
    if (g.id === CUR) { S = g.state; undoStack = []; }
    store(GKEY, GAMES);
    if (!App.sheetOpen()) render();
  },
  applyWarband(w) { const mine = WB[w.id]; if (mine && (mine.updated || 0) >= (w.updated || 0)) return; WB[w.id] = w; store(WBKEY, WB); },
  applyRemove(kind, id) {
    if (kind === "games" && id !== CUR && GAMES[id]) { delete GAMES[id]; store(GKEY, GAMES); }
    if (kind === "warbands" && WB[id]) { delete WB[id]; store(WBKEY, WB); }
    if (kind === "table" && TBL) { TBL = null; tHistReset(); store(TBLKEY, null); if (VIEW === "table") renderTable(); else if (VIEW === "home") render(); }
    if (kind === "tests" && tests()[id]) { delete tests()[id]; saveTests(); if (VIEW === "tests") render(); }
  },
  mergeLibrary(lib) {
    Object.assign(LIB.cards, lib.cards || {}); Object.assign(LIB.equip, lib.equip || {}); Object.assign(LIB.glossary, lib.glossary || {});
    saveLib();
  },
  status(text, kind) { const el = $("syncStatus"); if (el) { el.textContent = text; el.dataset.kind = kind || ""; } },
  toast, sheet, closeSheet, esc
};
try { const th = localStorage.getItem(KEY + "-theme"); if (th) document.documentElement.dataset.theme = th; } catch (e) {}
render();

/* Ctrl+Z: undo on the game screen, and on the My lists screen */
document.addEventListener("keydown", e => {
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" || e.shiftKey || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || "")) return;
  if (VIEW === "play" && undoStack.length) { e.preventDefault(); undo(); }
  else if (VIEW === "lists" && listUndo.length) { e.preventDefault(); doListUndo(); }
});
