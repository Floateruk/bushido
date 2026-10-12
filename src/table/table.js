/* ---------- Table: a 24" x 24" battlefield for scenarios, terrain and deployment ----------
   Coordinates are inches from the bottom-left corner, y up; your side (F, blue) deploys along the bottom,
   the opponent (E, red) along the top. Facing is in degrees clockwise, 0 = towards the top edge.
   Built for a laptop: drag to move, mouse wheel or Q/E to turn, Delete to remove, M for the ruler. */
const TBLKEY = "bushido-table-v1";
let TBL;                         /* current table, loaded on first use */
let tSetup = null;               /* setup form choices */
let tSel = null, tArm = null, tTool = null, tRuler = null, tDrag = null, tHover = null, tMsg = "", tConfirm = null;
const TBYID = Object.fromEntries(TERRAIN.map(t => [t.id, t]));
const SCN = id => SCENARIOS.find(s => s.id === id);
const SIZE_BASE = { Tiny: 30, Small: 30, Medium: 40, Large: 50, Huge: 60 };
const rad = d => d * Math.PI / 180;
const r1 = n => Math.round(n * 10) / 10;
const pick = a => a[Math.floor(Math.random() * a.length)];
function tSave() { if (TBL) { TBL.updated = Date.now(); store(TBLKEY, TBL); } }

/* ---------- Geometry ---------- */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function segPoint(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
function segsCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}
const segSeg = (a, b, c, d) => segsCross(a, b, c, d) ? 0 : Math.min(segPoint(a, c, d), segPoint(b, c, d), segPoint(c, a, b), segPoint(d, a, b));
function inPoly(p, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++)
    if ((P[i].y > p.y) !== (P[j].y > p.y) && p.x < (P[j].x - P[i].x) * (p.y - P[i].y) / (P[j].y - P[i].y) + P[i].x) inside = !inside;
  return inside;
}
const edges = P => P.map((p, i) => [p, P[(i + 1) % P.length]]);
function polyPoly(P, Q) {
  if (inPoly(P[0], Q) || inPoly(Q[0], P)) return 0;
  let m = Infinity;
  for (const [a, b] of edges(P)) for (const [c, d] of edges(Q)) m = Math.min(m, segSeg(a, b, c, d));
  return m;
}
const polyPoint = (P, p) => inPoly(p, P) ? 0 : Math.min(...edges(P).map(([a, b]) => segPoint(p, a, b)));
const polyCircle = (P, c, r) => polyPoint(P, c) - r;              /* negative when overlapping */
const polySeg = (P, a, b) => (inPoly(a, P) || inPoly(b, P)) ? 0 : Math.min(...edges(P).map(([c, d]) => segSeg(a, b, c, d)));
function terrPoly(t) {
  const d = TBYID[t.typeId], w = d.w / 2, h = d.h / 2, c = Math.cos(rad(t.rot)), s = Math.sin(rad(t.rot));
  const local = d.shape === "rect" ? [[-w, -h], [w, -h], [w, h], [-w, h]]
    : Array.from({ length: 20 }, (_, i) => [w * Math.cos(i * Math.PI / 10), h * Math.sin(i * Math.PI / 10)]);
  return local.map(([px, py]) => ({ x: t.x + px * c + py * s, y: t.y - px * s + py * c }));
}
const mirror = p => ({ x: 24 - p.x, y: 24 - p.y });

/* ---------- Deployment zones ---------- */
/* For side F; side E is the same rotated 180°. area: polygon for "within the zone"; edges: table edges inside the zone. */
function deployGeom(type) {
  if (type === "cornerSquare") return { area: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 6 }, { x: 0, y: 6 }], edges: [[{ x: 0, y: 0 }, { x: 6, y: 0 }], [{ x: 0, y: 0 }, { x: 0, y: 6 }]] };
  if (type === "cornerEdge") return { area: [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 8 }, { x: 0, y: 8 }], edges: [[{ x: 0, y: 0 }, { x: 8, y: 0 }], [{ x: 0, y: 0 }, { x: 0, y: 8 }]] };
  return { area: [{ x: 0, y: 0 }, { x: 24, y: 0 }, { x: 24, y: 1 }, { x: 0, y: 1 }], edges: [[{ x: 0, y: 0 }, { x: 24, y: 0 }]] };
}
function sideGeom(side) {
  const g = deployGeom(TBL.deployment);
  return side === "F" ? g : { area: g.area.map(mirror), edges: g.edges.map(([a, b]) => [mirror(a), mirror(b)]) };
}
/* Is a model legally deployed for its side? */
function deployedOK(m, side) {
  const p = side === "F" ? m : mirror(m), r = m.r, e = 0.06;
  if (TBL.deployment === "cornerSquare") return p.x - r >= -e && p.y - r >= -e && p.x + r <= 6 + e && p.y + r <= 6 + e;
  if (TBL.deployment === "cornerEdge") return (p.x - r <= e && p.y <= 8) || (p.y - r <= e && p.x <= 8);
  return p.y - r <= e;
}

/* ---------- Terrain rules (pack p.19) ---------- */
const tRad = t => Math.hypot(TBYID[t.typeId].w, TBYID[t.typeId].h) / 2;
/* first = stop at the first problem (the generator only needs yes/no) */
function terrainProblems(t, others, first = false) {
  const P = terrPoly(t), d = TBYID[t.typeId], R = tRad(t), out = [];
  const add = m => { out.push(m); return first; };
  if (P.some(p => p.x < -0.01 || p.y < -0.01 || p.x > 24.01 || p.y > 24.01) && add("Goes past the table edge")) return out;
  for (const side of ["F", "E"]) {
    const g = sideGeom(side);
    if (g.edges.some(([a, b]) => segPoint(t, a, b) - R < 3 && polySeg(P, a, b) < 3)) { if (add("Closer than 3\" to a table edge inside a deployment zone")) return out; break; }
  }
  for (const o of TBL.objectives) {
    if (dist(o, t) - R - objR() >= 3) continue;
    const gap = polyCircle(P, o, objR());
    if (gap < 0.01) { if (add("Overlaps a scenario objective")) return out; }
    else if (d.restricted && gap < 3 && add("Restricted terrain within 3\" of a scenario objective")) return out;
  }
  if (d.restricted) {
    if (TBL.zones.some(z => polyCircle(P, z, z.d / 2) < 0) && add("Restricted terrain inside a scenario zone")) return out;
    if (["F", "E"].some(s => polyPoly(P, sideGeom(s).area) === 0) && add("Restricted terrain inside a deployment zone")) return out;
  }
  for (const o of others) if (o.id !== t.id && dist(o, t) - R - tRad(o) < 3 && polyPoly(P, terrPoly(o)) < 3) { out.push(`Closer than 3" to ${TBYID[o.typeId].name}`); break; }
  return [...new Set(out)];
}
const objR = () => OBJ_SIZE_MM[TBL.objSize || "small"] / 25.4 / 2;

/* Try several whole layouts and keep the first (or fullest) that fits every requested piece */
function generateTerrain() {
  let best = null;
  for (let i = 0; i < 25; i++) {
    const r = layoutTerrain();
    if (!best || r.placed.length > best.placed.length) best = r;
    if (!r.missed.length) break;
  }
  TBL.terrain = best.placed;
  tMsg = best.missed.length ? `Placed ${best.placed.length} pieces. No legal space left for: ${best.missed.join(", ")}.` : `Placed ${best.placed.length} terrain pieces following the setup rules.`;
}
function layoutTerrain() {
  const themes = TBL.themes.length ? TBL.themes : Object.keys(TERRAIN_THEMES);
  const pool = TERRAIN.filter(t => themes.includes(t.theme));
  const want = TBL.count;
  /* The rulebook recommends one of each of these, then other pieces (p.76) */
  const picks = [];
  const take = f => { const c = pool.filter(t => f(t) && !picks.includes(t)); if (c.length) picks.push(pick(c)); };
  take(t => t.passage === "Impassable" && t.visibility === "Blocking" && t.size === "Huge");
  take(t => t.passage === "Difficult" && t.visibility === "Clear" && t.size === "Zero");
  take(t => t.visibility === "Obscuring");
  while (picks.length < want) { const rest = pool.filter(t => !picks.includes(t)); picks.push(pick(rest.length ? rest : pool)); }
  const placed = [], missed = [], used = new Set();
  const quad = p => (p.x >= 12 ? 1 : 0) + (p.y >= 12 ? 2 : 0);
  const tryPlace = def => {
    const R = Math.hypot(def.w, def.h) / 2;
    for (let i = 0; i < 220; i++) {
      const counts = [0, 0, 0, 0]; placed.forEach(p => counts[quad(p)]++);
      const min = Math.min(...counts), q = pick([0, 1, 2, 3].filter(k => counts[k] === min || i > 120));
      const x = (q % 2 ? 12 : 0) + Math.random() * 12, y = (q >= 2 ? 12 : 0) + Math.random() * 12;
      const t = { id: "t" + uid(), typeId: def.id, x: Math.min(24 - R * 0.6, Math.max(R * 0.6, x)), y: Math.min(24 - R * 0.6, Math.max(R * 0.6, y)), rot: 15 * Math.floor(Math.random() * 12) };
      if (!terrainProblems(t, placed, true).length) return t;
    }
    return null;
  };
  /* Big pieces first, so the smaller ones fill the gaps */
  picks.sort((a, b) => b.w * b.h - a.w * a.h);
  for (const def of picks) {
    let t = tryPlace(def);
    if (!t) {
      /* No room for this one: try other pieces from the chosen themes, smallest first */
      const alts = pool.filter(x => x.id !== def.id && !used.has(x.id) && x.w * x.h <= def.w * def.h).sort((a, b) => a.w * a.h - b.w * b.h);
      for (const alt of alts.slice(0, 6)) { t = tryPlace(alt); if (t) break; }
    }
    if (t) { placed.push(t); used.add(t.typeId); } else missed.push(def.name);
  }
  return { placed, missed };
}

/* ---------- Building a table from the setup choices ---------- */
function modelsFromWb(wb) {
  return (wb ? wb.models : []).map(d => {
    const sb = (d.stats && d.stats.size) || "";
    const size = (sb.match(/Tiny|Small|Medium|Large|Huge/i) || ["Small"])[0];
    const sizeCap = size[0].toUpperCase() + size.slice(1).toLowerCase();
    const base = +((sb.match(/(\d+)\s*mm/i) || [])[1] || SIZE_BASE[sizeCap] || 30);
    return { id: "m" + uid(), name: d.name, size: sizeCap, base, r: base / 25.4 / 2, x: 0, y: 0, facing: 0, where: "tray",
      flank: /\bFlank\b/.test(d.traits || ""), ghost: GHOST_RE.test(d.traits || ""), scout: (d.traits || "").match(/Scout \(?[\d\/"”]+\)?/)?.[0] || "", vim: false };
  });
}
function newTable(c) {
  const s = SCN(c.scenario);
  const you = WB[c.you], them = WB[c.them];
  TBL = {
    id: "tb" + uid(), created: Date.now(), updated: Date.now(),
    scenarioId: s.id, deployment: s.deployment || c.deployment, objSize: s.objSize === "choice" ? c.objSize : "small",
    vimType: s.vim ? c.vim : "", step: "setup", themes: Object.keys(TERRAIN_THEMES), count: 10,
    objectives: s.objectives.map((o, i) => ({ id: "o" + i, x: o.x, y: o.y, align: o.align })),
    zones: s.zones.map((z, i) => ({ id: "z" + i, ...z })),
    terrain: [], checks: { 3: true },
    sides: { F: { wbId: c.you, name: you ? you.name : "Your warband", models: modelsFromWb(you) },
             E: { wbId: c.them, name: them ? them.name : "Opponent", models: modelsFromWb(them) } }
  };
  tSel = tArm = tRuler = null; tTool = null; tMsg = "";
  tSave();
}
function swapZones() {
  /* Player 2 chose the other deployment zone: turn the battlefield around (scenario layouts are symmetric) */
  for (const o of TBL.objectives) { Object.assign(o, mirror(o)); o.align = { F: "E", E: "F", N: "N" }[o.align]; }
  for (const z of TBL.zones) { Object.assign(z, mirror(z)); z.align = { F: "E", E: "F", N: "N" }[z.align]; }
  for (const t of TBL.terrain) { Object.assign(t, mirror(t)); t.rot = (t.rot + 180) % 360; }
  tMsg = "Deployment zones swapped: the terrain and objectives have turned around.";
}
function autoDeploy(side) {
  const list = TBL.sides[side].models.filter(m => m.where === "tray" && !m.scout);
  const placedOthers = () => tableModels().map(([o]) => o);
  const free = (p, r) => placedOthers().every(o => dist(o, p) >= o.r + r + 0.15) && TBL.terrain.every(t => TBYID[t.typeId].passage !== "Impassable" || polyCircle(terrPoly(t), p, r) > 0.05);
  const face = TBL.deployment === "baseline" ? 0 : 45;
  for (const m of list) {
    let spot = null;
    const cands = [];
    if (TBL.deployment === "cornerSquare") { for (let y = m.r; y <= 6 - m.r + 0.01; y += 0.25) for (let x = m.r; x <= 6 - m.r + 0.01; x += 0.25) cands.push({ x, y }); cands.sort((a, b) => (b.x + b.y) - (a.x + a.y)); }
    else if (TBL.deployment === "cornerEdge") { for (let s = 8; s >= m.r; s -= 0.25) { cands.push({ x: s, y: m.r }); cands.push({ x: m.r, y: s }); } }
    else { for (let k = 0; k <= 24; k += 0.25) { cands.push({ x: 12 + k, y: m.r }); cands.push({ x: 12 - k, y: m.r }); } }
    for (const c0 of cands) { const c = side === "F" ? c0 : mirror(c0); if (c.x - m.r >= 0 && c.x + m.r <= 24 && free(c, m.r)) { spot = c; break; } }
    if (spot) Object.assign(m, spot, { where: "table", facing: side === "F" ? face : (face + 180) % 360 });
  }
}

/* ---------- Model warnings ---------- */
function modelProblems(m, side) {
  const out = [];
  if (TBL.step !== "play" && !deployedOK(m, side) && !m.scout) out.push(`Not in ${side === "F" ? "your" : "their"} deployment zone`);
  for (const s of ["F", "E"]) for (const o of TBL.sides[s].models)
    if (o !== m && o.where === "table" && dist(o, m) < o.r + m.r - 0.02) { out.push(`Overlaps ${o.name}`); break; }
  for (const t of TBL.terrain) if (TBYID[t.typeId].passage === "Impassable" && polyCircle(terrPoly(t), m, m.r) < -0.02) { out.push(`Stands in ${TBYID[t.typeId].name} (Impassable)`); break; }
  if (TBL.objectives.some(o => dist(o, m) < objR() + m.r - 0.02)) out.push("Overlaps a scenario objective");
  return out;
}
const findModel = id => { for (const s of ["F", "E"]) { const m = TBL.sides[s].models.find(x => x.id === id); if (m) return [m, s]; } return [null, null]; };
/* Edge-to-edge distance, and whether b is in a's front arc (centre of b within 90° of a's facing) */
function relation(a, b) {
  const edge = Math.max(0, dist(a, b) - a.r - b.r);
  const fx = Math.sin(rad(a.facing)), fy = Math.cos(rad(a.facing));
  const inArc = (b.x - a.x) * fx + (b.y - a.y) * fy >= -b.r;
  return { edge, inArc };
}

/* ---------- Movement (rulebook p.26) ----------
   A moving base may not pass through another model's base or Impassable terrain. Cloudwalk and Intangible
   ignore both while moving, but may not end the move overlapping either. Base to base (BtB) = bases touching. */
const GHOST_RE = /\b(Cloud ?walk|Intangible)\b/i;
const BTB_GAP = 0.03;
function isGhost(m, side) {
  if (m.ghost === undefined) {  /* tables saved before this existed: read the trait from the warband */
    const wb = WB[TBL.sides[side].wbId], d = wb && wb.models.find(x => x.name === m.name);
    m.ghost = !!(d && GHOST_RE.test(d.traits || ""));
  }
  return m.ghost;
}
const tableModels = () => ["F", "E"].flatMap(s => TBL.sides[s].models.filter(m => m.where === "table").map(m => [m, s]));
/* What blocks m, leaving out anything it already overlaps (so a misplaced model can still be dragged clear) */
function moveBlockers(m) {
  const models = tableModels().map(([o]) => o).filter(o => o !== m);
  const terr = TBL.terrain.filter(t => TBYID[t.typeId].passage === "Impassable").map(terrPoly);
  const B = { models, terr };
  return { models: models.filter(o => dist(o, m) >= o.r + m.r - 0.005), terr: terr.filter(P => polyCircle(P, m, m.r) >= -0.005), all: B };
}
function clearAt(m, p, B) {
  for (const o of B.models) if (dist(o, p) < o.r + m.r - 0.005) return false;
  for (const P of B.terr) if (polyCircle(P, p, m.r) < -0.005) return false;
  return true;
}
const clampBoard = (m, p) => ({ x: Math.min(24 - m.r, Math.max(m.r, p.x)), y: Math.min(24 - m.r, Math.max(m.r, p.y)) });
/* Walk the base towards the target in small steps, sliding round anything in the way */
function stepTowards(m, target, B) {
  let cur = { x: m.x, y: m.y };
  for (let i = 0; i < 400; i++) {
    const dx = target.x - cur.x, dy = target.y - cur.y, L = Math.hypot(dx, dy);
    if (L < 1e-3) break;
    const st = Math.min(0.04, L), a0 = Math.atan2(dy, dx);
    let next = null;
    for (const da of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.2, -1.2]) {
      const q = clampBoard(m, { x: cur.x + Math.cos(a0 + da) * st, y: cur.y + Math.sin(a0 + da) * st });
      if (dist(q, target) < L - 1e-4 && clearAt(m, q, B)) { next = q; break; }
    }
    if (!next) break;
    cur = next;
  }
  return cur;
}
/* Close a small gap so the bases touch exactly */
function snapBtB(m, p, B) {
  for (const o of B.all.models) {
    const d = dist(o, p), gap = d - o.r - m.r;
    if (gap > 0.005 && gap < 0.12 && d > 0) {
      const q = { x: o.x + (p.x - o.x) / d * (o.r + m.r), y: o.y + (p.y - o.y) / d * (o.r + m.r) };
      if (clearAt(m, q, B)) return q;
    }
  }
  return p;
}
function btbWith(m) { return tableModels().filter(([o]) => o !== m && dist(o, m) - o.r - m.r <= BTB_GAP); }
/* Nearest free spot to p (for placing a model from the tray) */
function freeSpot(m, p) {
  const B = { models: tableModels().map(([o]) => o).filter(o => o !== m), terr: TBL.terrain.filter(t => TBYID[t.typeId].passage === "Impassable").map(terrPoly) };
  for (let r = 0; r <= 3; r += 0.1) for (let k = 0; k < Math.max(1, Math.round(r * 12)); k++) {
    const a = k / Math.max(1, Math.round(r * 12)) * Math.PI * 2, q = clampBoard(m, { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r });
    if (clearAt(m, q, B)) return q;
  }
  return clampBoard(m, p);
}

/* ---------- Drawing ---------- */
const SY = y => 24 - y;
const ptsAttr = P => P.map(p => `${p.x.toFixed(3)},${SY(p.y).toFixed(3)}`).join(" ");
const ALIGN = { F: "var(--side-f)", N: "var(--side-n)", E: "var(--side-e)" };
const ALIGN_NAME = { F: "Friendly", N: "Neutral", E: "Enemy" };
function terrFill(d) {
  if (d.passage === "Ideal") return "var(--t-road)";
  if (d.visibility === "Enhancing") return "var(--t-hill)";
  if (d.visibility === "Obscuring") return "var(--t-wood)";
  if (d.visibility === "Clear") return "var(--t-water)";
  return d.size === "Tiny" ? "var(--t-low)" : "var(--t-stone)";
}
function boardSVG() {
  const s = SCN(TBL.scenarioId), out = [inkDefs()];
  out.push(`<rect x="0" y="0" width="24" height="24" class="felt"/>`);
  for (let i = 1; i < 24; i++) out.push(`<line x1="${i}" y1="0" x2="${i}" y2="24" class="${i % 6 ? "g1" : "g6"}"/><line x1="0" y1="${i}" x2="24" y2="${i}" class="${i % 6 ? "g1" : "g6"}"/>`);
  /* deployment zones and neutral edges, as brush strokes along the table edge */
  for (const side of ["F", "E"]) {
    const g = sideGeom(side), col = ALIGN[side];
    if (TBL.deployment === "cornerSquare") out.push(`<polygon points="${ptsAttr(g.area)}" fill="${col}" class="dz" filter="url(#inkWash)"/>`);
    for (const [a, b] of g.edges) out.push(`<path d="${brush(a.x, SY(a.y), b.x, SY(b.y), 0.16)}" fill="${col}" class="dedge"/>`);
  }
  for (const [x1, y1, x2, y2] of DEPLOYMENTS[TBL.deployment].neutral) out.push(`<path d="${brush(x1, SY(y1), x2, SY(y2), 0.1)}" fill="var(--side-n)" class="nedge"/>`);
  /* scenario zones */
  for (const z of TBL.zones) out.push(`<g class="zone ${tSel && tSel.id === z.id ? "sel" : ""}" data-k="zone" data-id="${z.id}"><circle cx="${z.x}" cy="${SY(z.y)}" r="${z.d / 2}" fill="${ALIGN[z.align]}" class="zwash" filter="url(#inkWash)"/><circle cx="${z.x}" cy="${SY(z.y)}" r="${z.d / 2}" class="zrim" filter="url(#inkEdge)"/></g>`);
  /* terrain, painted in ink; the outline only shows when selected or misplaced */
  for (const t of TBL.terrain) {
    const d = TBYID[t.typeId], P = terrPoly(t), bad = terrainProblems(t, TBL.terrain).length;
    out.push(`<g class="terr ${tSel && tSel.id === t.id ? "sel" : ""} ${bad ? "bad" : ""}" data-k="terrain" data-id="${t.id}">
      ${inkTerrain(t, d, terrFill(d))}<polygon points="${ptsAttr(P)}" class="edge"/>
      <text x="${t.x}" y="${SY(t.y)}" class="tlabel">${esc(d.name)}</text></g>`);
  }
  /* objectives: the tick shows which player it faces (Friendly faces you, Enemy faces them, Neutral faces neither) */
  const or = objR();
  for (const o of TBL.objectives) {
    const ang = { F: 180, E: 0, N: 90 }[o.align];
    out.push(`<g class="obj ${tSel && tSel.id === o.id ? "sel" : ""}" data-k="obj" data-id="${o.id}" transform="translate(${o.x} ${SY(o.y)})">
      ${inkObjective(o, or, ALIGN[o.align], ang)}</g>`);
  }
  /* models */
  for (const side of ["F", "E"]) for (const m of TBL.sides[side].models) {
    if (m.where !== "table") continue;
    const sel = tSel && tSel.id === m.id, bad = modelProblems(m, side).length;
    const ini = m.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2);
    out.push(`<g class="tok ${side} ${sel ? "sel" : ""} ${bad ? "bad" : ""}" data-k="model" data-id="${m.id}" transform="translate(${m.x.toFixed(3)} ${SY(m.y).toFixed(3)})">
      <circle r="${m.r}" class="base"/>
      <path d="M ${-m.r} 0 A ${m.r} ${m.r} 0 0 1 ${m.r} 0 Z" class="arc" transform="rotate(${m.facing})"/>
      <path d="${ensoPath(0, 0, m.r - 0.02, Math.max(0.09, m.r * 0.18), m.facing - 60, 330)}" class="ring"/>
      <line x1="0" y1="${(-m.r * 0.62).toFixed(3)}" x2="0" y2="${(-m.r - 0.08).toFixed(3)}" class="face" transform="rotate(${m.facing})"/>
      ${m.vim ? `<circle r="${m.r + 0.12}" class="vimring"/>` : ""}
      <text y="${m.r * 0.38}" class="ini" style="font-size:${(m.r * 0.75).toFixed(2)}px">${esc(ini)}</text></g>`);
    if (sel) {
      const hx = Math.sin(rad(m.facing)) * (m.r + 0.45), hy = -Math.cos(rad(m.facing)) * (m.r + 0.45);
      out.push(`<g transform="translate(${m.x} ${SY(m.y)})"><line x1="0" y1="0" x2="${hx}" y2="${hy}" class="hline"/><circle cx="${hx}" cy="${hy}" r="0.22" class="handle" data-k="rotate" data-id="${m.id}"/></g>`);
    }
  }
  /* base-to-base contacts: a vermilion mark between enemies, a small ink dot between friends */
  const tm = tableModels();
  for (let i = 0; i < tm.length; i++) for (let j = i + 1; j < tm.length; j++) {
    const [a, sa] = tm[i], [b, sb] = tm[j], d = dist(a, b);
    if (d - a.r - b.r > BTB_GAP || !d) continue;
    const cx = a.x + (b.x - a.x) / d * a.r, cy = a.y + (b.y - a.y) / d * a.r;
    out.push(sa !== sb ? `<g class="btb foe" transform="translate(${f2(cx)} ${f2(SY(cy))}) rotate(45)"><rect x="-0.11" y="-0.11" width="0.22" height="0.22"/></g>`
      : `<circle cx="${f2(cx)}" cy="${f2(SY(cy))}" r="0.06" class="btb"/>`);
  }
  /* selected terrain gets a rotate handle too */
  if (tSel && tSel.kind === "terrain") {
    const t = TBL.terrain.find(x => x.id === tSel.id);
    if (t) { const d = TBYID[t.typeId], L = d.h / 2 + 0.6, hx = Math.sin(rad(t.rot)) * L, hy = -Math.cos(rad(t.rot)) * L;
      out.push(`<g transform="translate(${t.x} ${SY(t.y)})"><line x1="0" y1="0" x2="${hx}" y2="${hy}" class="hline"/><circle cx="${hx}" cy="${hy}" r="0.24" class="handle" data-k="rotate" data-id="${t.id}"/></g>`); }
  }
  /* a line from the selected model to the hovered one */
  if (tSel && tSel.kind === "model" && tHover && tHover !== tSel.id) {
    const [a] = findModel(tSel.id), [b] = findModel(tHover);
    if (a && b && a.where === "table" && b.where === "table") out.push(`<line x1="${a.x}" y1="${SY(a.y)}" x2="${b.x}" y2="${SY(b.y)}" class="rel"/>`);
  }
  if (tDrag && tDrag.mode === "move" && tDrag.kind === "model") {
    const [m] = findModel(tDrag.id);
    out.push(`<line x1="${tDrag.start.x}" y1="${SY(tDrag.start.y)}" x2="${m.x}" y2="${SY(m.y)}" class="trail"/><text x="${m.x}" y="${SY(m.y) - m.r - 0.35}" class="dlabel">${r1(dist(tDrag.start, m))}"</text>`);
  }
  if (tRuler) out.push(`<line x1="${tRuler.a.x}" y1="${SY(tRuler.a.y)}" x2="${tRuler.b.x}" y2="${SY(tRuler.b.y)}" class="ruler"/><text x="${(tRuler.a.x + tRuler.b.x) / 2}" y="${SY((tRuler.a.y + tRuler.b.y) / 2) - 0.3}" class="dlabel">${r1(dist(tRuler.a, tRuler.b))}"</text>`);
  out.push(inkMount());
  return out.join("");
}

/* ---------- Panels ---------- */
const STEPS = [
  "Share warband lists with your opponent",
  "Make any permitted list changes",
  "Place scenario objectives and zones",
  "Deployment tactical test: the winner chooses to be player 1 or 2",
  "Terrain: alternate placing pieces until at least six are down",
  "Player 2 chooses a deployment zone",
  "Player 1 decides who deploys warband terrain first; alternate until done",
  "Declare or record VIMs",
  "The player who deployed warband terrain first deploys their whole warband, then the other player (Scout and Flank are exceptions)",
  "The first turn begins"
];
function scenarioCard(s) {
  return `<div class="tcard">
    <div class="tcard-h"><b>${esc(s.name)}</b><span>${s.level ? esc(s.level) + " · " : ""}${esc(s.type)}</span></div>
    <dl class="tfacts">
      <dt>Deployment</dt><dd>${esc(DEPLOYMENTS[TBL.deployment].name)}${s.deployment ? " (fixed)" : ""}</dd>
      ${s.objectives.length ? `<dt>Objectives</dt><dd>${s.objectives.length} × ${TBL.objSize === "large" ? "Large (50mm)" : "Small (30mm)"}</dd>` : ""}
      ${s.vim ? `<dt>VIM</dt><dd>${esc(TBL.vimType)}</dd>` : ""}
      <dt>Game length</dt><dd>${esc(s.length)}</dd>
      ${s.interactions.length ? `<dt>Interaction</dt><dd>${s.interactions.map(esc).join("<br>")}</dd>` : ""}
    </dl>
    <h4>Victory points</h4><ol class="tvp">${s.victory.map(v => `<li>${esc(v)}</li>`).join("")}</ol>
    ${s.rules.length ? `<p class="trules">${s.rules.map(esc).join(" · ")}</p>` : ""}
    ${s.special ? `<p class="trules"><b>Special:</b> ${esc(s.special)}</p>` : ""}
    <p class="tsrc">${s.source === "rulebook" ? "Rulebook R2" : "Tournament & Scenario Pack 2510.1"}</p>
  </div>`;
}
function trayHTML(side) {
  const S = TBL.sides[side], s = SCN(TBL.scenarioId);
  const status = m => m.where === "table" ? (modelProblems(m, side).length ? `<span class="warn">Check</span>` : `<span class="okk">On table</span>`)
    : m.where === "elsewhere" ? `<span class="els">Elsewhere${m.flankTurn ? ` · Flank T${m.flankTurn} ${esc(m.flankEdge)}` : ""}</span>` : `<span class="muted">Not deployed</span>`;
  const edgesFor = TBL.deployment === "baseline" ? ["left edge", "right edge"] : ["left edge", "top edge", "bottom edge", "right edge"];
  return `<div class="tray ${side}">
    <div class="tray-h"><b>${side === "F" ? "Your warband" : "Opponent"}</b><span>${esc(S.name)}</span></div>
    ${S.models.map(m => `<div class="trow ${tSel && tSel.id === m.id ? "sel" : ""} ${tArm === m.id ? "armed" : ""}">
      <button class="tname" data-tsel="${m.id}">${esc(m.name)} <small>${m.size} · ${m.base}mm${m.scout ? " · " + esc(m.scout) : ""}${m.flank ? " · Flank" : ""}</small></button>
      ${status(m)}
      <div class="tacts">
        ${m.where !== "table" ? `<button class="tbtn" data-tarm="${m.id}">${tArm === m.id ? "Click the table…" : "Place"}</button>` : `<button class="tbtn" data-ttray="${m.id}">Remove</button>`}
        ${m.where !== "elsewhere" ? `<button class="tbtn" data-telse="${m.id}">${m.flank ? "Flank" : "Elsewhere"}</button>` : `<button class="tbtn" data-ttray="${m.id}">Back</button>`}
        ${s.vim ? `<button class="tbtn ${m.vim ? "on" : ""}" data-tvim="${m.id}" aria-pressed="${m.vim}">VIM</button>` : ""}
      </div>
      ${m.where === "elsewhere" && m.flank ? `<div class="tflank">Arrives turn <select data-tfturn="${m.id}">${[2, 3, 4].map(n => `<option ${m.flankTurn == n ? "selected" : ""}>${n}</option>`).join("")}</select>
        on <select data-tfedge="${m.id}">${edgesFor.map(e => `<option ${m.flankEdge === e ? "selected" : ""}>${e}</option>`).join("")}</select> <span class="muted">Hidden information</span></div>` : ""}
    </div>`).join("")}
    <div class="row"><button class="btn small" data-tauto="${side}">Deploy the rest in the zone</button></div>
  </div>`;
}
function selectedHTML() {
  if (!tSel) return `<p class="muted tsmall">Select a model, terrain piece or objective on the table to see its details.</p>`;
  if (tSel.kind === "model") {
    const [m, side] = findModel(tSel.id); if (!m) return "";
    const probs = m.where === "table" ? modelProblems(m, side) : [], btb = m.where === "table" ? btbWith(m) : [];
    let rel = "";
    if (tHover && tHover !== m.id) { const [b] = findModel(tHover); if (b && b.where === "table" && m.where === "table") { const r = relation(m, b); rel = `<p>To <b>${esc(b.name)}</b>: ${r.edge <= BTB_GAP ? "base to base" : r1(r.edge) + '" edge to edge'} · ${r.inArc ? "in front arc" : "behind (outside front arc)"}</p>`; } }
    return `<div class="tinfo"><b>${esc(m.name)}</b> <span class="muted">${side === "F" ? "Yours" : "Opponent"}</span>
      <p>${m.size} · ${m.base}mm base · facing ${Math.round(m.facing)}°${m.where === "table" ? ` · at (${r1(m.x)}, ${r1(m.y)})` : ""}</p>
      ${probs.map(p => `<p class="warn">⚠ ${esc(p)}</p>`).join("")}
      ${btb.length ? `<p><b>Base to base</b> with ${btb.map(([o, s]) => `<span class="${s === side ? "" : "btb-foe"}">${esc(o.name)}</span>`).join(", ")}</p>` : ""}${rel}
      <label class="inline tsmall"><input type="checkbox" data-tghost="${m.id}" ${isGhost(m, side) ? "checked" : ""}> Moves through models and terrain (Cloudwalk, Intangible)</label>
      <p class="muted tsmall">Hover another model to measure to it.</p></div>`;
  }
  if (tSel.kind === "terrain") {
    const t = TBL.terrain.find(x => x.id === tSel.id); if (!t) return "";
    const d = TBYID[t.typeId], probs = terrainProblems(t, TBL.terrain);
    return `<div class="tinfo"><b>${esc(d.name)}</b> <span class="muted">${esc(TERRAIN_THEMES[d.theme])}</span>
      <p>[${d.passage}, ${d.visibility}, ${d.size}] · ${d.w}" × ${d.h}"${d.restricted ? " · restricted" : ""}</p>
      <p class="muted">${esc(d.note)}</p>${probs.map(p => `<p class="warn">⚠ ${esc(p)}</p>`).join("")}
      <div class="row"><button class="btn small danger" data-tdelterr="${t.id}">Remove piece</button></div></div>`;
  }
  const o = (tSel.kind === "obj" ? TBL.objectives : TBL.zones).find(x => x.id === tSel.id); if (!o) return "";
  return `<div class="tinfo"><b>${tSel.kind === "obj" ? "Scenario objective" : `Zone (${o.d}")`}</b> <span class="muted">${ALIGN_NAME[o.align]}</span>
    <div class="row">${["F", "N", "E"].map(a => `<button class="btn small ${o.align === a ? "primary" : ""}" data-talign="${a}">${ALIGN_NAME[a]}</button>`).join("")}</div></div>`;
}

function setupHTML() {
  const wbs = Object.values(WB).sort((a, b) => a.name.localeCompare(b.name));
  if (!tSetup) tSetup = { you: wbs[0]?.id || "", them: (wbs[1] || wbs[0])?.id || "", scenario: "sacred-idols", deployment: "baseline", objSize: "small", vim: "Open" };
  const s = SCN(tSetup.scenario);
  const opt = (v, cur, label) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(label)}</option>`;
  const grp = (label, list) => `<optgroup label="${label}">${list.map(x => opt(x.id, tSetup.scenario, x.name)).join("")}</optgroup>`;
  return `<div class="tsetup">
    <div class="sec-h"><h2>Set up a table</h2></div>
    <div class="tform">
      <label>Your warband<select data-tset="you">${wbs.map(w => opt(w.id, tSetup.you, w.name)).join("")}</select></label>
      <label>Opponent<select data-tset="them">${wbs.map(w => opt(w.id, tSetup.them, w.name)).join("")}</select></label>
      <label>Scenario<select data-tset="scenario">
        ${grp("Tournament pack · Basic", SCENARIOS.filter(x => x.level === "Basic"))}
        ${grp("Tournament pack · Advanced", SCENARIOS.filter(x => x.level === "Advanced"))}
        ${grp("Rulebook", SCENARIOS.filter(x => x.source === "rulebook"))}</select></label>
      <div class="row tdice"><span class="muted">Roll a scenario:</span>
        ${["Basic", "Advanced", "Objective", "Zone", "VIM"].map(k => `<button class="btn small" data-troll="${k}">${k}</button>`).join("")}
        <button class="btn small" data-troll="any">Any</button></div>
      <label>Deployment${s.deployment ? `<span class="fixed">${esc(DEPLOYMENTS[s.deployment].name)} (fixed by this scenario)</span>` :
        `<select data-tset="deployment">${Object.entries(DEPLOYMENTS).map(([k, d]) => opt(k, tSetup.deployment, d.name)).join("")}</select>`}</label>
      ${s.objSize === "choice" ? `<label>Objective size<select data-tset="objSize">${opt("small", tSetup.objSize, "Small (30mm)")}${opt("large", tSetup.objSize, "Large (50mm)")}</select></label>` : ""}
      ${s.vim ? `<label>VIM type<select data-tset="vim">${VIM_TYPES.map(v => opt(v, tSetup.vim, v)).join("")}</select></label>` : ""}
      <div class="row"><button class="btn small" data-troll="extras">Roll deployment${s.objSize === "choice" ? ", size" : ""}${s.vim ? ", VIM type" : ""}</button></div>
      <div class="row"><button class="btn primary" id="tCreate">Set up the table</button></div>
    </div>
  </div>`;
}

function renderTable() {
  if (TBL === undefined) TBL = load(TBLKEY, null);
  const v = $("tableView");
  if (!TBL) {
    v.innerHTML = `<div class="thead"><button class="btn small" data-thub>‹ Home</button><h1>Table</h1></div>${setupHTML()}`;
    return;
  }
  const s = SCN(TBL.scenarioId);
  const keep = v.querySelector(".tside.right")?.scrollTop || 0;
  v.innerHTML = `
    <div class="thead"><button class="btn small" data-thub>‹ Home</button><h1>${esc(s.name)}</h1>
      <span class="muted">${esc(TBL.sides.F.name)} vs ${esc(TBL.sides.E.name)}</span>
      <span class="spacer"></span>
      <button class="btn small ${tTool === "ruler" ? "primary" : ""}" data-ttool="ruler" title="M">Ruler</button>
      <button class="btn small" data-tswap>Swap deployment zones</button>
      <button class="btn small ${TBL.step === "play" ? "primary" : ""}" data-tstep>${TBL.step === "play" ? "Game started" : "Start game"}</button>
      <button class="btn small quiet" data-tnew>${tConfirm === "tnew" ? "Clear table?" : "New table"}</button></div>
    <div class="tgrid">
      <aside class="tside left">${scenarioCard(s)}
        <div class="tcard"><h4>Game setup</h4><ol class="tsteps">${STEPS.map((t, i) => `<li><label><input type="checkbox" data-tcheck="${i + 1}" ${TBL.checks[i + 1] ? "checked" : ""}> ${esc(t)}</label></li>`).join("")}</ol></div>
      </aside>
      <div class="tboard">
        <svg id="tSvg" viewBox="-0.7 -0.7 25.4 25.4" class="${tTool === "ruler" || tArm ? "crosshair" : ""}" role="img" aria-label="Battlefield">${boardSVG()}</svg>
        <p class="thint">${tMsg ? esc(tMsg) + " · " : ""}Drag to move (bases stop at models and Impassable terrain) · Mouse wheel or Q / E to turn (Shift for 5°) · Delete removes · M ruler · Esc deselects</p>
      </div>
      <aside class="tside right">
        <div class="tcard"><h4>Selected</h4>${selectedHTML()}</div>
        ${trayHTML("F")}${trayHTML("E")}
        <div class="tcard"><h4>Terrain</h4>
          <div class="tthemes">${Object.entries(TERRAIN_THEMES).map(([k, n]) => `<label><input type="checkbox" data-ttheme="${k}" ${TBL.themes.includes(k) ? "checked" : ""}> ${esc(n)}</label>`).join("")}</div>
          <div class="row"><label class="inline">Pieces <select data-tcount>${[6, 7, 8, 9, 10, 11, 12].map(n => `<option ${TBL.count === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
            <button class="btn small primary" data-tgen>Generate terrain</button><button class="btn small" data-tclear>Clear</button></div>
          <div class="row"><select id="tAddSel" aria-label="Terrain piece">${Object.entries(TERRAIN_THEMES).map(([k, n]) => `<optgroup label="${esc(n)}">${TERRAIN.filter(t => t.theme === k).map(t => `<option value="${t.id}">${esc(t.name)} [${t.passage}, ${t.visibility}, ${t.size}]</option>`).join("")}</optgroup>`).join("")}</select>
            <button class="btn small" data-tadd>Add</button></div>
          <ul class="tlegend"><li><i style="background:var(--t-stone)"></i>Blocking</li><li><i style="background:var(--t-low)"></i>Blocking, Tiny (see over)</li><li><i style="background:var(--t-wood)"></i>Obscuring</li><li><i style="background:var(--t-water)"></i>Clear, Difficult</li><li><i style="background:var(--t-road)"></i>Ideal</li><li><i style="background:var(--t-hill)"></i>Enhancing</li></ul>
        </div>
      </aside>
    </div>`;
  v.querySelector(".tside.right").scrollTop = keep;
  bindBoard();
}
function redrawBoard() {
  const svg = $("tSvg"); if (!svg) return renderTable();
  svg.innerHTML = boardSVG();
  const sel = document.querySelector(".tside.right .tcard"); if (sel) sel.innerHTML = `<h4>Selected</h4>${selectedHTML()}`;
}

/* ---------- Board interaction ---------- */
function svgPoint(e) {
  const svg = $("tSvg"), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse()); return { x: p.x, y: 24 - p.y };
}
function itemOf(kind, id) {
  if (kind === "model") return findModel(id)[0];
  if (kind === "terrain") return TBL.terrain.find(x => x.id === id);
  if (kind === "obj") return TBL.objectives.find(x => x.id === id);
  if (kind === "zone") return TBL.zones.find(x => x.id === id);
}
function rotateSel(by) {
  if (!tSel) return;
  const it = itemOf(tSel.kind, tSel.id); if (!it) return;
  if (tSel.kind === "model") it.facing = (it.facing + by + 360) % 360;
  if (tSel.kind === "terrain") it.rot = (it.rot + by + 360) % 360;
  tSave(); redrawBoard();
}
function snapEdges(m) {
  for (const k of ["x", "y"]) { if (Math.abs(m[k] - m.r) < 0.3) m[k] = m.r; if (Math.abs(24 - m[k] - m.r) < 0.3) m[k] = 24 - m.r; }
  m.x = Math.min(24 - m.r, Math.max(m.r, m.x)); m.y = Math.min(24 - m.r, Math.max(m.r, m.y));
}
function bindBoard() {
  const svg = $("tSvg"); if (!svg) return;
  svg.addEventListener("pointerdown", e => {
    const p = svgPoint(e), el = e.target.closest("[data-k]");
    svg.setPointerCapture(e.pointerId);
    if (tTool === "ruler") { tRuler = { a: p, b: p }; tDrag = { mode: "ruler" }; return redrawBoard(); }
    if (tArm) {
      const [m, side] = findModel(tArm);
      Object.assign(m, { x: p.x, y: p.y, where: "table", facing: side === "F" ? (TBL.deployment === "baseline" ? 0 : 45) : (TBL.deployment === "baseline" ? 180 : 225) });
      snapEdges(m); Object.assign(m, freeSpot(m, m)); tSel = { kind: "model", id: m.id }; tArm = null; tSave(); return renderTable();
    }
    if (!el) { tSel = null; return renderTable(); }
    const kind = el.dataset.k, id = el.dataset.id;
    if (kind === "rotate") { tDrag = { mode: "rotate", id }; return; }
    const it = itemOf(kind, id);
    const changed = !tSel || tSel.id !== id;
    tSel = { kind, id };
    if (kind === "obj" || kind === "zone") { tDrag = { mode: "click", kind, id }; return renderTable(); }
    tDrag = { mode: "move", kind, id, off: { x: it.x - p.x, y: it.y - p.y }, start: { x: it.x, y: it.y }, moved: false };
    if (kind === "model") {
      const [, side] = findModel(id);
      tMsg = "";
      Object.assign(tDrag, { B: moveBlockers(it), ghost: isGhost(it, side), lastOK: { x: it.x, y: it.y },
        btb0: btbWith(it).filter(([, s]) => s !== side).map(([o]) => o.id) });
    }
    if (changed) redrawBoard();
  });
  svg.addEventListener("pointermove", e => {
    const p = svgPoint(e);
    if (!tDrag) {
      const el = e.target.closest("[data-k='model']"), h = el ? el.dataset.id : null;
      if (h !== tHover) { tHover = h; if (tSel && tSel.kind === "model") redrawBoard(); }
      return;
    }
    if (tDrag.mode === "ruler") { tRuler.b = p; return redrawBoard(); }
    if (tDrag.mode === "rotate") {
      const it = itemOf(tSel.kind, tDrag.id), a = (Math.atan2(p.x - it.x, p.y - it.y) * 180 / Math.PI + 360) % 360;
      const snap = e.shiftKey ? 1 : 5, v = Math.round(a / snap) * snap % 360;
      if (tSel.kind === "model") it.facing = v; else it.rot = v;
      return redrawBoard();
    }
    if (tDrag.mode === "move") {
      const it = itemOf(tDrag.kind, tDrag.id);
      const target = { x: p.x + tDrag.off.x, y: p.y + tDrag.off.y }; tDrag.moved = true;
      if (tDrag.kind === "model") {
        if (tDrag.ghost) { Object.assign(it, clampBoard(it, target)); if (clearAt(it, it, tDrag.B)) tDrag.lastOK = { x: it.x, y: it.y }; }
        else Object.assign(it, snapBtB(it, stepTowards(it, clampBoard(it, target), tDrag.B), tDrag.B));
      } else Object.assign(it, target);
      redrawBoard();
    }
  });
  const end = () => {
    if (!tDrag) return;
    if (tDrag.mode === "click") {
      const o = itemOf(tDrag.kind, tDrag.id);
      o.align = { N: "F", F: "E", E: "N" }[o.align];
      followZones();
    }
    if (tDrag.mode === "move" && tDrag.kind === "model" && tDrag.moved) {
      const [m, side] = findModel(tDrag.id);
      if (tDrag.ghost && !clearAt(m, m, tDrag.B)) { Object.assign(m, tDrag.lastOK); tMsg = `${m.name} moves through models and terrain, but can't end its move on Impassable terrain or another model.`; }
      const foes = btbWith(m).filter(([, s]) => s !== side), fresh = foes.filter(([o]) => !tDrag.btb0.includes(o.id));
      if (!tDrag.btb0.length && fresh.length > 1) tMsg = `${m.name} is now in base contact with ${fresh.length} enemy models. A model not already in BtB can only enter BtB with 1 enemy model per activation.`;
    }
    const wasMove = tDrag.mode === "move" || tDrag.mode === "rotate" || tDrag.mode === "click";
    tDrag = null; if (wasMove) tSave(); renderTable();
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("wheel", e => { if (!tSel || (tSel.kind !== "model" && tSel.kind !== "terrain")) return; e.preventDefault(); rotateSel((e.deltaY > 0 ? 1 : -1) * (e.shiftKey ? 5 : 15)); }, { passive: false });
}
/* Õsatsu: zones take the alignment of the objective at their centre */
function followZones() { for (const z of TBL.zones) if (z.follows != null && TBL.objectives[z.follows]) z.align = TBL.objectives[z.follows].align; }

/* ---------- Buttons, form fields and keys ---------- */
document.addEventListener("click", e => {
  if (VIEW !== "table") return;
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset;
  if (d.thub !== undefined) return go("home");
  if (t.id === "tCreate") {
    if (!tSetup.you || !tSetup.them) return toast("Add a warband in My lists first.");
    newTable(tSetup); return renderTable();
  }
  if (d.troll) {
    if (d.troll === "extras") { tSetup.deployment = pick(Object.keys(DEPLOYMENTS)); tSetup.objSize = pick(["small", "large"]); tSetup.vim = pick(VIM_TYPES); }
    else { const list = d.troll === "any" ? SCENARIOS.map(x => x.id) : SCENARIO_ROLLS[d.troll]; tSetup.scenario = pick(list); toast(`Rolled ${SCN(tSetup.scenario).name}`); }
    return renderTable();
  }
  if (!TBL) return;
  if (d.tnew !== undefined) { if (tConfirm !== "tnew") { tConfirm = "tnew"; return renderTable(); } tConfirm = null; TBL = null; store(TBLKEY, null); return renderTable(); }
  if (tConfirm) { tConfirm = null; renderTable(); }
  if (d.ttool) { tTool = tTool === d.ttool ? null : d.ttool; tRuler = null; return renderTable(); }
  if (d.tswap !== undefined) { swapZones(); TBL.checks[6] = true; tSave(); return renderTable(); }
  if (d.tstep !== undefined) { TBL.step = TBL.step === "play" ? "setup" : "play"; if (TBL.step === "play") TBL.checks[10] = true; tSave(); return renderTable(); }
  if (d.tgen !== undefined) { generateTerrain(); TBL.checks[5] = true; tSel = null; tSave(); return renderTable(); }
  if (d.tclear !== undefined) { TBL.terrain = []; tSel = null; tMsg = ""; tSave(); return renderTable(); }
  if (d.tadd !== undefined) { const id = $("tAddSel").value; const nt = { id: "t" + uid(), typeId: id, x: 12, y: 12, rot: 0 }; TBL.terrain.push(nt); tSel = { kind: "terrain", id: nt.id }; tSave(); return renderTable(); }
  if (d.tdelterr) { TBL.terrain = TBL.terrain.filter(x => x.id !== d.tdelterr); tSel = null; tSave(); return renderTable(); }
  if (d.talign) { const o = itemOf(tSel.kind, tSel.id); o.align = d.talign; followZones(); tSave(); return renderTable(); }
  if (d.tsel) { tSel = { kind: "model", id: d.tsel }; return renderTable(); }
  if (d.tarm) { tArm = tArm === d.tarm ? null : d.tarm; tTool = null; return renderTable(); }
  if (d.ttray) { const [m] = findModel(d.ttray); m.where = "tray"; delete m.flankTurn; tSave(); return renderTable(); }
  if (d.telse) { const [m] = findModel(d.telse); m.where = "elsewhere"; if (m.flank) { m.flankTurn = 2; m.flankEdge = "left edge"; } tSave(); return renderTable(); }
  if (d.tvim) { const [m, side] = findModel(d.tvim); const was = m.vim; TBL.sides[side].models.forEach(x => x.vim = false); m.vim = !was; if (m.vim) TBL.checks[8] = TBL.sides.F.models.some(x => x.vim) && TBL.sides.E.models.some(x => x.vim); tSave(); return renderTable(); }
  if (d.tauto) { autoDeploy(d.tauto); tSave(); return renderTable(); }
});
document.addEventListener("change", e => {
  if (VIEW !== "table") return;
  const d = e.target.dataset;
  if (d.tset) { tSetup[d.tset] = e.target.value; return renderTable(); }
  if (!TBL) return;
  if (d.tcheck) { TBL.checks[d.tcheck] = e.target.checked; return tSave(); }
  if (d.ttheme) { const k = d.ttheme; TBL.themes = e.target.checked ? [...new Set([...TBL.themes, k])] : TBL.themes.filter(x => x !== k); return tSave(); }
  if (d.tcount !== undefined) { TBL.count = +e.target.value; return tSave(); }
  if (d.tfturn) { findModel(d.tfturn)[0].flankTurn = +e.target.value; return tSave(); }
  if (d.tfedge) { findModel(d.tfedge)[0].flankEdge = e.target.value; return tSave(); }
  if (d.tghost) { findModel(d.tghost)[0].ghost = e.target.checked; return tSave(); }
});
document.addEventListener("keydown", e => {
  if (VIEW !== "table" || !TBL || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || "")) return;
  const k = e.key.toLowerCase();
  if (k === "q" || k === "e") { e.preventDefault(); rotateSel((k === "e" ? 1 : -1) * (e.shiftKey ? 5 : 15)); }
  else if (k === "m") { tTool = tTool === "ruler" ? null : "ruler"; tRuler = null; renderTable(); }
  else if (k === "escape") { tSel = null; tArm = null; tTool = null; tRuler = null; renderTable(); }
  else if ((k === "delete" || k === "backspace") && tSel) {
    e.preventDefault();
    if (tSel.kind === "terrain") TBL.terrain = TBL.terrain.filter(x => x.id !== tSel.id);
    else if (tSel.kind === "model") findModel(tSel.id)[0].where = "tray";
    tSel = null; tSave(); renderTable();
  }
});
