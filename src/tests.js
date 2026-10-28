/* ---------- Testing lists: two warbands side by side with every stat, wounds, Ki, feats and states ----------
   Step 1 of the testing flow: import or pick two lists here. Step 2: the Table picks this test in its setup,
   and its models are linked to these (same ids). Wounds, Ki and states live here; position, facing,
   activations, turn, SP and VP live on the table. Killed models come off the table; Prone and Blind set on
   either screen show on both; the table's "Next turn" runs Ki Generation and End Phase removals here.
   Saved in bushido-tests-v1 and synced (collection "tests"), merged per model so a tablet and a laptop
   can change the same test at the same time. */
const TESTKEY = "bushido-tests-v1";
let TESTS = null;
const tests = () => TESTS || (TESTS = load(TESTKEY, {}));
const saveTests = () => store(TESTKEY, tests());
let xForm = null;               /* new test choices {F, E} */
let xOpen = new Set();          /* model cards opened in full */
let xConfirm = null, xDeleted = null;

const xDef = tm => tm.def || {};
const xW = tm => +xDef(tm).w || 1;
const xLS = tm => /\bLast Stand\b/i.test(xDef(tm).traits || "");
/* Killed and off the table: at 0 wounds, unless on Last Stand (then removed at the End Phase) */
const xGone = tm => (tm.dmg || 0) >= xW(tm) && (!xLS(tm) || tm.removed);
const xOnLS = tm => (tm.dmg || 0) >= xW(tm) && xLS(tm) && !tm.removed;

/* The table, loaded on demand (it is only read from storage when first needed) */
function tbl() { if (TBL === undefined) { try { TBL = load(TBLKEY, null); } catch (e) { TBL = null; } } return TBL; }
const tableModel = id => { const t = tbl(); return t && t.testId ? [...t.sides.F.models, ...t.sides.E.models].find(m => m.id === id) : null; };
const WHERE = { table: "On the table", tray: "Not placed yet", elsewhere: "Elsewhere" };

let xKiUndo = null;
function touchTest(tg, tm) {
  const now = Date.now();
  if (tm) tm.u = now;
  tg.updated = now;
  saveTests();
  window.Sync?.pushTest?.(tg);
  xRecord(tg);
}
/* Undo for a test: a snapshot of both sides after each change (up to 100, in memory on this device).
   Another device's changes, and the table's Next turn, start the history again. */
const xHist = {};
const xSnap = tg => JSON.stringify(tg.sides);
function xHistReset(tg) { xHist[tg.id] = { last: xSnap(tg), stack: [] }; }
function xRecord(tg) {
  const h = xHist[tg.id]; if (!h) return xHistReset(tg);
  const cur = xSnap(tg);
  if (h.last !== cur) { h.stack.push(h.last); if (h.stack.length > 100) h.stack.shift(); h.last = cur; }
}
function xUndo(tg) {
  const h = xHist[tg.id]; if (!h || !h.stack.length) return false;
  const prev = JSON.parse(h.stack.pop()), now = Date.now(), same = (a, b) => JSON.stringify({ ...a, u: 0 }) === JSON.stringify({ ...b, u: 0 });
  for (const sd of ["F", "E"]) {
    const cur = tg.sides[sd];
    /* what changed gets a new timestamp, so the other device takes the undone version when it merges */
    cur.models = prev[sd].models.map(pm => { const c = cur.models.find(m => m.id === pm.id); return c && same(c, pm) ? c : { ...pm, u: now }; });
    cur.cards = prev[sd].cards.map((pc, i) => { const c = cur.cards[i]; return c && same(c, pc) ? c : { ...pc, u: now }; });
  }
  tg.updated = now; saveTests(); window.Sync?.pushTest?.(tg);
  h.last = xSnap(tg);
  return true;
}
function newTest(fId, eId) {
  const now = Date.now();
  const side = id => {
    const w = WB[id];
    return { wbId: id, name: w.name, sub: w.sub || "",
      models: w.models.map(d => ({ id: "x" + uid() + uid(), def: clone(d), dmg: 0, ki: 0, used: {}, states: {}, u: now })),
      cards: (w.cards || []).map(c => ({ name: c.name, type: c.type, text: c.text, done: false, u: now })) };
  };
  const tg = { id: "tg" + uid() + uid(), created: now, updated: now, name: `${WB[fId].name} vs ${WB[eId].name}`, sides: { F: side(fId), E: side(eId) } };
  tests()[tg.id] = tg;
  touchTest(tg);
  return tg;
}
const findTest = id => tests()[id] || null;
function findTM(tg, id) { for (const s of ["F", "E"]) { const m = tg.sides[s].models.find(x => x.id === id); if (m) return [m, s]; } return [null, null]; }

/* Merge a copy from another device: newer model / card wins, piece by piece */
function mergeTest(mine, theirs) {
  const out = clone(theirs);
  let mineNewer = false;
  for (const s of ["F", "E"]) {
    const a = mine.sides[s], b = out.sides[s];
    b.models = b.models.map(bm => { const am = a.models.find(x => x.id === bm.id); if (am && (am.u || 0) > (bm.u || 0)) { mineNewer = true; return am; } return bm; });
    b.cards = b.cards.map((bc, i) => { const ac = a.cards[i]; if (ac && (ac.u || 0) > (bc.u || 0)) { mineNewer = true; return ac; } return bc; });
  }
  out.updated = Math.max(mine.updated || 0, theirs.updated || 0);
  return [out, mineNewer];
}

/* ---------- Turn hooks called by the table ---------- */
/* Starting Phase: Ki Generation (first number of the Ki statistic, up to the cap); once-per-turn feats reset;
   Run and Blind markers from last turn go. End Phase of the previous turn: Last Stand models are removed. */
function testStartTurn(tg, n) {
  const notes = [], gone = [];
  for (const s of ["F", "E"]) for (const tm of tg.sides[s].models) {
    if (n > 1 && xOnLS(tm)) { tm.removed = true; gone.push(tm.def.name); }
    if (xGone(tm)) continue;
    const d = xDef(tm);
    tm.ki = Math.min(+d.kiCap || 0, (tm.ki || 0) + (+d.kiGen || 0));
    for (const k in tm.used || {}) if (tm.used[k] === "OpT") delete tm.used[k];
    delete tm.states.Run; delete tm.states.Blind;
    tm.u = Date.now();
  }
  if (gone.length) notes.push(`removed at the End Phase (Last Stand): ${gone.join(", ")}`);
  /* States to resolve in the Starting Phase (the app doesn't change them: tick them off on the cards) */
  const dis = [], ds = [];
  for (const s of ["F", "E"]) for (const tm of tg.sides[s].models) {
    if (xGone(tm)) continue;
    for (const k in tm.states || {}) { const b = baseState(k); if (b === "Diseased") dis.push(xDef(tm).name); else if (b === "Death Sentence") ds.push(xDef(tm).name); }
  }
  if (dis.length) notes.push(`Diseased, remove a Disease marker and an Activation Counter: ${[...new Set(dis)].join(", ")}`);
  if (ds.length) notes.push(`Death Sentence, may spend 3 Ki to remove one: ${[...new Set(ds)].join(", ")}`);
  touchTest(tg); xHistReset(tg);
  return notes;
}

/* What the table is showing, read from the shared table */
function xTableStrip() {
  const t = TBL, P = t.play || { turn: 0, sp: { F: 0, E: 0 }, vp: { F: 0, E: 0 } };
  const cnt = k => ["F", "E"].map(sd => t.sides[sd].models.filter(m => m.where === k).length).join(" v ");
  return `<p class="note xstrip"><b>On the table</b> · ${P.turn ? `Turn ${P.turn}` : "setting up"} · SP ${P.sp.F}–${P.sp.E} · VP ${P.vp.F}–${P.vp.E} · placed ${cnt("table")}${t.updated ? ` · updated ${new Date(t.updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</p>`;
}
/* An existing table can be linked to a test when the same models are on both (matched by name) */
function xMatch(tg) {
  const t = tbl(); if (!t) return null;
  const pairs = [];
  for (const sd of ["F", "E"]) {
    const used = new Set(), tm = tg.sides[sd].models;
    if (tm.length !== t.sides[sd].models.length) return null;
    for (const m of t.sides[sd].models) {
      const x = tm.find(y => !used.has(y.id) && y.def.name === m.name); if (!x) return null;
      used.add(x.id); pairs.push([m, x.id]);
    }
  }
  return pairs;
}
const xCanLink = tg => !!xMatch(tg);
function xLinkTable(tg) {
  const pairs = xMatch(tg); if (!pairs) return toast("The models on that table don't match this test.");
  pairs.forEach(([m, id]) => { m.id = id; });
  TBL.testId = tg.id; tSave(); render(); toast("Table linked to this test.");
}

/* ---------- Screens ---------- */
function renderTests() {
  const v = $("testView");
  const wbs = Object.values(WB).sort((a, b) => a.name.localeCompare(b.name));
  if (!xForm) xForm = { F: wbs[0]?.id || "", E: (wbs[1] || wbs[0])?.id || "" };
  const all = Object.values(tests()).sort((a, b) => b.updated - a.updated);
  const opt = (id, cur) => `<option value="${esc(id)}" ${id === cur ? "selected" : ""}>${esc(WB[id].name)}</option>`;
  const pick = (s, label) => `<div class="xpick ${s}"><label>${label}<select data-xform="${s}">${wbs.map(w => opt(w.id, xForm[s])).join("")}</select></label>
    <label class="btn small file-btn" for="xPdf${s}">Import list PDF</label><input type="file" id="xPdf${s}" data-xpdf="${s}" accept="application/pdf,.pdf" hidden></div>`;
  v.innerHTML = `<div class="thead"><button class="btn small" data-area="home">‹ Home</button><h1>Testing lists</h1></div>
    <div class="sec-h"><h2>New test</h2></div>
    <div class="xnew">${pick("F", "Your list")}${pick("E", "Opponent's list")}
      <p class="note" id="xNote" role="status">Pick two warbands, or import a newrecruit.eu PDF for either side.</p>
      <div class="row"><button class="btn primary" data-xnew ${wbs.length ? "" : "disabled"}>Start test</button></div></div>
    <div class="sec-h"><h2>Tests</h2><span>${all.length}</span></div>
    <div class="slots">${all.map(tg => {
      const st = s => tg.sides[s].models.filter(m => !xGone(m)).length + "/" + tg.sides[s].models.length;
      return `<div class="slot"><div class="slot-main"><b>${esc(tg.name)}</b><span>Standing ${st("F")} v ${st("E")} · ${esc(dayLabel(tg.updated))}${tbl() && TBL.testId === tg.id ? " · on the table" : ""}</span></div>
        <button class="btn small primary" data-xopen="${tg.id}">Open</button>
        <button class="btn small ${xConfirm === tg.id ? "danger" : "quiet"}" data-xdel="${tg.id}">${xConfirm === tg.id ? "Delete?" : "Delete"}</button></div>`;
    }).join("") || `<p class="empty">No tests yet.</p>`}</div>`;
}

function xPips(n, filled, kind, id) {
  return pips(n, filled, kind, id).replace(/data-pip="/g, 'data-xpip="').replace(/data-m="/g, 'data-xm="');
}
function xChips(tm) {
  return Object.entries(tm.states || {}).map(([k, c]) => `<button class="chip cat-${CAT[k] || "neutral"}" data-xchip="${esc(k)}" data-xm="${tm.id}"><i></i>${esc(k)}${c > 1 ? `<span class="c num">${c}</span>` : ""}</button>`).join("");
}
function xModelHTML(tm) {
  const d = fixDef(xDef(tm)), st = d.stats || {}, gone = xGone(tm), ls = xOnLS(tm), w = xW(tm), cap = +d.kiCap || 0;
  const weapons = (d.weapons || []).filter(x => !(!x.s && /,/.test(x.n)));
  const feats = (d.feats || []).map(f => {
    const used = f.lim && (tm.used || {})[f.n], can = !gone && !used && (tm.ki || 0) >= f.c;
    return `<button class="feat ${used ? "used" : ""}" data-xfeat="${esc(f.n)}" data-xm="${tm.id}" ${can ? "" : "disabled"} title="${esc(f.d || "")}"><span class="cost">${f.c}</span>${esc(f.n)}${f.lim ? ` · ${f.lim}` : ""}</button>`;
  }).join("");
  const eqNames = [...weapons.filter(x => x.eq).map(x => x.n), ...(d.equip || []).map(e => e.n)];
  const open = xOpen.has(tm.id);
  return `<article class="m ${gone ? "dead" : ""} ${ls ? "on-ls" : ""}">
    <div class="m-head"><div class="m-name">${avatar(d)}${esc(d.name)}${eqNames.length ? `<span class="m-eq">${eqNames.map(n => `<span class="eq-tag">${esc(n)}</span>`).join("")}</span>` : ""}</div>
      ${(() => { const q = tableModel(tm.id); return q && !gone ? `<span class="pill xwhere ${q.where}">${WHERE[q.where] || ""}${q.where === "table" && q.act !== undefined ? ` · ${q.act} act` : ""}</span>` : ""; })()}
      ${gone ? `<span class="pill dead">Killed</span>` : ls ? `<button class="pill ls" data-rule="Last Stand">Last Stand</button>` : ""}</div>
    <div class="statline xstat">
      <div><small>Mel</small><b class="num">${stat(st.mp, st.mb)}</b></div><div><small>Rng</small><b class="num">${stat(st.rp, st.rb)}</b></div>
      <div><small>Mov</small><b class="num">${stat(st.mv, st.mvb)}</b></div><div><small>Ki</small><b class="num">${d.kiGen ?? "–"}/${d.kiCap ?? "–"}</b></div>
      <div><small>Size</small><b class="num">${esc(st.size || "–")}</b></div></div>
    <div class="track w"><span class="track-label">Wounds</span>${xPips(w, tm.dmg || 0, "w", tm.id)}<span class="track-val num"><b>${Math.max(0, w - (tm.dmg || 0))}</b>/${w}</span></div>
    ${cap ? `<div class="track k"><span class="track-label">Ki</span>${xPips(cap, tm.ki || 0, "k", tm.id)}<span class="track-val num"><b>${tm.ki || 0}</b> <span class="muted">+${+d.kiGen || 0} each turn</span></span></div>` : ""}
    <div class="states">${xChips(tm)}${gone ? "" : `<button class="add-state" data-xaddstate="${tm.id}">+ State</button>`}</div>
    ${feats ? `<div class="feats">${feats}</div>` : ""}
    ${d.traits ? traitBlock(d.traits, "xtraits") : ""}
    <button class="more" data-xdetail="${tm.id}">${open ? "Hide card ▴" : "Full card ▾"}</button>
    ${open ? `<div class="detail">
      ${weapons.length ? `<div><h4>Weapons</h4>${weapons.map(x => `<div class="wpn"><b>${esc(x.n)} ${esc(x.s || "")}${x.range ? ` · ${esc(x.range)}"` : ""}${x.eq ? '<span class="eq">Equip</span>' : ""}</b><em>${ruleList(x.t || "")}</em></div>`).join("")}</div>` : ""}
      ${(d.equip || []).length ? `<div><h4>Equipment</h4>${d.equip.map(e => `<p><b>${esc(e.n)}</b>: ${esc(e.d)}</p>`).join("")}</div>` : ""}
      ${(d.feats || []).length ? `<div><h4>Ki feats</h4>${d.feats.map(f => `<p><b>${esc(f.n)}</b> (${f.c} Ki${f.tm ? ", " + esc(f.tm) : ""}${f.sub ? ", " + esc(f.sub) : ""}${f.limText ? ", " + esc(f.limText) : ""}): ${esc(f.d)}</p>`).join("")}</div>` : ""}
      ${(d.notes || []).length ? `<div><h4>Unique effects</h4>${d.notes.map(n => `<p><b>${esc(n.n)}</b>: ${esc(n.d)}</p>`).join("")}</div>` : ""}
      ${(d.immune || []).length ? `<div><h4>Immune to</h4><p>${d.immune.join(", ")}</p></div>` : ""}
      ${d.rice != null ? `<p class="tap-hint">${esc(String(d.rice))} Rice · underlined rules open their definition.</p>` : ""}
    </div>` : ""}
  </article>`;
}
function renderTest(id) {
  const v = $("testView"), tg = findTest(id);
  if (!tg) { VIEW = "tests"; return renderTests(); }
  const side = s => {
    const S = tg.sides[s], up = S.models.filter(m => !xGone(m)).length, wd = S.models.reduce((a, m) => a + Math.min(m.dmg || 0, xW(m)), 0);
    return `<section class="xside ${s}">
      <div class="xside-h"><b>${esc(S.name)}</b><span>${up} of ${S.models.length} standing · ${wd} wounds taken</span></div>
      ${S.models.map(xModelHTML).join("")}
      ${S.cards.length ? `<div class="sec-h"><h2>Cards</h2></div>${S.cards.map((c, i) => `<div class="card ${c.done ? "done" : ""}"><button class="check ${c.done ? "on" : ""}" data-xcard="${s}:${i}" aria-label="Mark ${esc(c.name)} as resolved">${c.done ? "✓" : ""}</button><div><span class="card-type">${esc(c.type)}</span><b>${esc(c.name)}</b><p>${esc(c.text)}</p></div></div>`).join("")}` : ""}
    </section>`;
  };
  const onTable = !!(tbl() && TBL.testId === tg.id), other = !!tbl() && !onTable, canLink = other && xCanLink(tg);
  /* each side scrolls on its own: keep where each was when the screen redraws */
  const keep = [...v.querySelectorAll(".xside")].map(el => el.scrollTop), keepId = v.dataset.test;
  v.dataset.test = tg.id;
  if (!xHist[tg.id]) xHistReset(tg);
  v.innerHTML = `<div class="thead"><button class="btn small" data-area="tests">‹ Testing lists</button><h1>${esc(tg.name)}</h1><span class="spacer"></span>
      <button class="btn small" data-xundo="${tg.id}" title="Undo the last change (Ctrl+Z)" ${xHist[tg.id].stack.length ? "" : "disabled"}>↶ Undo</button>
      <button class="btn small" data-xki="${tg.id}" title="Ki Generation for every standing model, as at the start of a turn">Generate Ki</button>
      <button class="btn small ${onTable ? "" : "primary"}" data-xtable="${tg.id}">${onTable ? "Open the table" : "Set up the table"}</button></div>
    ${onTable ? xTableStrip() : `<p class="note">Wounds, Ki, feats and states. Turn, scores, positions and activations are on the Table: ${other ? "the table that is set up isn't linked to this test." : "set it up there (this device or another one with your sync code) and pick this test."}${canLink ? ` <button class="btn small" data-xlink="${tg.id}">Link that table to this test</button>` : ""}</p>`}
    <div class="xgrid">${side("F")}${side("E")}</div>`;
  if (keepId === tg.id) v.querySelectorAll(".xside").forEach((el, i) => el.scrollTop = keep[i] || 0);
}

/* ---------- Changes ---------- */
function xChange(tg, tm, fn) { fn(); touchTest(tg, tm); render(); }
function xStateSheet(tg, tm) {
  const imm = xDef(tm).immune || [], isImm = k => imm.includes(baseState(k)) || imm.includes(k);
  sheet(`<h3>${esc(tm.def.name)}</h3><p class="sub">Tap a state to add it. Tap it on the card to change it.</p>
    <div class="grid-states">${STATES.map(([k, c]) => `<button data-xpick="${esc(k)}" data-xm="${tm.id}" ${isImm(k) ? "disabled" : ""}><i style="background:var(--${c === "harm" ? "harm" : c === "fire" ? "fire" : c === "poison" ? "poison" : c === "good" ? "ki" : "muted"})"></i>${esc(k)}${isImm(k) ? "<small>Immune</small>" : tm.states[k] ? `<small>×${tm.states[k]}</small>` : ""}</button>`).join("")}</div>`);
}
function xChipSheet(tm, k) {
  sheet(`<h3>${esc(k)}</h3><p class="sub">${esc(tm.def.name)}</p>
    <div class="row"><button class="btn" data-xst="${esc(k)}" data-xm="${tm.id}" data-d="-1">−1</button><b class="num" style="font-size:20px;padding:0 10px">${tm.states[k] || 0}</b><button class="btn" data-xst="${esc(k)}" data-xm="${tm.id}" data-d="1">+1</button>
    <button class="btn danger" data-xst="${esc(k)}" data-xm="${tm.id}" data-d="-99">Remove</button></div>`);
}
const curTest = () => VIEW.startsWith("test:") ? findTest(VIEW.slice(5)) : null;

document.addEventListener("click", e => {
  if (VIEW !== "tests" && !VIEW.startsWith("test:") && !$("sheetHost").innerHTML) return;
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset;
  if (d.xdel === undefined) xConfirm = null;
  if (d.xnew !== undefined) {
    if (!xForm.F || !xForm.E) return;
    const tg = newTest(xForm.F, xForm.E); return go("test:" + tg.id);
  }
  if (d.xopen) return go("test:" + d.xopen);
  if (d.xdel) {
    if (xConfirm !== d.xdel) { xConfirm = d.xdel; return renderTests(); }
    const gone = tests()[d.xdel]; delete tests()[d.xdel]; saveTests(); window.Sync?.remove("tests", d.xdel); xConfirm = null; xDeleted = gone; renderTests();
    return toast(`Deleted ${gone.name}`, false, `<button data-xundel="1">Undo</button>`);
  }
  if (d.xundel !== undefined && xDeleted) {
    const tg = xDeleted; xDeleted = null; tests()[tg.id] = tg; tg.updated = Date.now(); saveTests(); window.Sync?.pushTest?.(tg);
    $("toastHost").innerHTML = ""; return VIEW === "tests" ? renderTests() : render();
  }
  if (d.xundo) {
    const tg = findTest(d.xundo); if (tg && xUndo(tg)) { render(); toast("Undone"); }
    return;
  }
  if (d.xlink) return xLinkTable(findTest(d.xlink));
  if (d.xki) {
    const tg = findTest(d.xki), before = {}; let gained = 0;
    for (const sd of ["F", "E"]) for (const tm of tg.sides[sd].models) {
      before[tm.id] = tm.ki || 0; if (xGone(tm)) continue;
      const b = tm.ki || 0; tm.ki = Math.min(+xDef(tm).kiCap || 0, b + (+xDef(tm).kiGen || 0)); gained += tm.ki - b; tm.u = Date.now();
    }
    xKiUndo = { id: tg.id, before }; touchTest(tg); render();
    return toast(`+${gained} Ki generated`, false, `<button data-xkiundo="1">Undo</button>`);
  }
  if (d.xkiundo && xKiUndo) {
    const tg = findTest(xKiUndo.id); if (tg) { for (const sd of ["F", "E"]) for (const tm of tg.sides[sd].models) if (tm.id in xKiUndo.before) { tm.ki = xKiUndo.before[tm.id]; tm.u = Date.now(); } touchTest(tg); }
    xKiUndo = null; $("toastHost").innerHTML = ""; return render();
  }
  if (d.xtable) {
    const tg = findTest(d.xtable);
    if (!(tbl() && TBL.testId === tg.id)) tSetup = { ...(tSetup || { scenario: "sacred-idols", deployment: "baseline", objSize: "small", vim: "Open" }), testId: tg.id, you: tg.sides.F.wbId, them: tg.sides.E.wbId };
    if (tbl() && TBL.testId !== tg.id) toast("A different table is set up on this device. Use New table there to start this one.");
    return go("table");
  }
  const tg = curTest(); if (!tg) return;
  const [tm] = d.xm ? findTM(tg, d.xm) : [null];
  if (d.xpip && tm) {
    const i = +d.i, f = d.xpip === "w" ? "dmg" : "ki", next = (tm[f] || 0) === i + 1 ? i : i + 1;
    if (f === "dmg" && xLS(tm) && (tm.dmg || 0) >= xW(tm) && next < tm.dmg) return toast("Last Stand: wounds can't be recovered.");
    return xChange(tg, tm, () => { tm[f] = next; if (f === "dmg" && next < xW(tm)) tm.removed = false; });
  }
  if (d.xfeat && tm) {
    const f = (tm.def.feats || []).find(x => x.n === d.xfeat); if (!f) return;
    xChange(tg, tm, () => { tm.ki = Math.max(0, (tm.ki || 0) - f.c); if (f.lim) { tm.used = tm.used || {}; tm.used[f.n] = f.lim; } });
    return toast(`${tm.def.name}: ${f.n} (−${f.c} Ki)`);
  }
  if (d.xaddstate && tm) return xStateSheet(tg, findTM(tg, d.xaddstate)[0]);
  if (d.xaddstate) return xStateSheet(tg, findTM(tg, d.xaddstate)[0]);
  if (d.xpick && tm) { closeSheet(); return xChange(tg, tm, () => { tm.states[d.xpick] = (tm.states[d.xpick] || 0) + 1; }); }
  if (d.xchip && tm) return xChipSheet(tm, d.xchip);
  if (d.xst && tm) {
    xChange(tg, tm, () => { const n = (tm.states[d.xst] || 0) + +d.d; if (n <= 0) delete tm.states[d.xst]; else tm.states[d.xst] = n; });
    return tm.states[d.xst] ? xChipSheet(tm, d.xst) : closeSheet();
  }
  if (d.xdetail) { xOpen.has(d.xdetail) ? xOpen.delete(d.xdetail) : xOpen.add(d.xdetail); return render(); }
  if (d.xcard) { const [s, i] = d.xcard.split(":"), c = tg.sides[s].cards[+i]; c.done = !c.done; c.u = Date.now(); touchTest(tg); return render(); }
});
document.addEventListener("change", async e => {
  const d = e.target.dataset;
  if (d.xform) { xForm[d.xform] = e.target.value; return; }
  if (d.xpdf && e.target.files[0]) {
    const note = $("xNote"); note.textContent = "Reading PDF…";
    try {
      const p = await readPdf(e.target.files[0]), g = gameFromPdf(p);
      if (!g.models.length) { note.textContent = "No profile cards found. Is this a newrecruit.eu list PDF?"; return; }
      addToLibrary(p);
      const wb = addWarband(wbFromGame(g));
      xForm[d.xpdf] = wb.id; renderTests();
      $("xNote").textContent = `Imported ${wb.name}: ${g.models.length} models.`;
    } catch (err) { note.textContent = `Couldn't read that PDF (${err.message}).`; }
  }
});

/* Ctrl+Z on a test page */
document.addEventListener("keydown", e => {
  if (!VIEW.startsWith("test:") || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" || e.shiftKey || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || "")) return;
  const tg = curTest(); if (tg && xUndo(tg)) { e.preventDefault(); render(); toast("Undone"); }
});
