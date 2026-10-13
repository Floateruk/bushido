/* ---------- Line of sight and cover ----------
   Rulebook R2: LoS (p.6), Cover (p.4), terrain Visibility (p.74), Aware, Blind, Prone, Enhancing.
   - LoS is a straight line from any part of the observer's base to a point of the target in the observer's
     Facing (the 180° in front of it; all round with Aware). A Blind observer can't draw LoS outside BtB.
   - Blocking terrain and models block it, except models and terrain smaller than the target, and models
     (other than the target) and terrain smaller than the observer. A model on Enhancing terrain also
     ignores models and terrain smaller than that terrain. Prone models don't block. Zero terrain never does.
   - Cover: any line from the observer that passes through Obscuring or Blocking terrain within 1" of the
     target (even terrain too small to block it, like a Tiny wall).
   The board is flat, so heights are the Size categories, exactly as the rules use them. */
const SIZE_RANK = { Zero: 0, Tiny: 1, Small: 2, Medium: 3, Large: 4, Huge: 5 };
const AWARE_RE = /\bAware\b/;
const LOS_PTS = 24;   /* points sampled round each base, plus its centre */

function cardOf(m, side) { const wb = WB[TBL.sides[side].wbId]; return wb ? wb.models.find(x => x.name === m.name) : null; }
function mentionsRe(m, side, re) {
  const wb = WB[TBL.sides[side].wbId];
  return re.test(JSON.stringify(cardOf(m, side) || {})) || (!!wb && re.test(JSON.stringify(wb.cards || [])));
}
function isAware(m, side) {
  if (m.aware === undefined) { const d = cardOf(m, side); m.aware = !!(d && AWARE_RE.test(d.traits || "")); }
  return m.aware;
}
function basePoints(m) {
  const P = [{ x: m.x, y: m.y }];
  for (let i = 0; i < LOS_PTS; i++) { const a = i / LOS_PTS * Math.PI * 2; P.push({ x: m.x + Math.cos(a) * m.r * 0.999, y: m.y + Math.sin(a) * m.r * 0.999 }); }
  return P;
}
/* Size of the highest Enhancing terrain the model stands on (centre of its base inside the footprint) */
function elevationOf(m) {
  let e = 0, by = null;
  for (const t of TBL.terrain) { const d = TBYID[t.typeId]; if (d.visibility === "Enhancing" && inPoly(m, terrPoly(t)) && SIZE_RANK[d.size] > e) { e = SIZE_RANK[d.size]; by = d.name; } }
  return { e, by };
}
const inFacing = (a, q) => (q.x - a.x) * Math.sin(rad(a.facing)) + (q.y - a.y) * Math.cos(rad(a.facing)) >= -1e-6;

function losCheck(a, sa, b, sb) {
  const res = { los: false, cover: false, coverBy: [], blockedBy: [], lines: [], seen: 0, total: 0, note: "" };
  const touching = dist(a, b) - a.r - b.r <= BTB_GAP;
  const sixth = /\bSixth Sense\b/.test((cardOf(a, sa) || {}).traits || "");  /* Immune [Blind] */
  if (a.blind && !sixth && !touching) { res.note = "Blind: no LoS outside base contact"; return res; }
  const aware = isAware(a, sa), elev = elevationOf(a);
  const thr = Math.max(SIZE_RANK[a.size] || 2, SIZE_RANK[b.size] || 2, elev.e);
  const terr = TBL.terrain.map(t => ({ d: TBYID[t.typeId], P: terrPoly(t) }));
  /* terrain a model stands inside doesn't hide it from itself */
  const blockT = terr.filter(o => o.d.visibility === "Blocking" && SIZE_RANK[o.d.size] >= thr && !inPoly(a, o.P) && !inPoly(b, o.P));
  const others = tableModels().map(([m]) => m).filter(m => m !== a && m !== b && !m.prone && (SIZE_RANK[m.size] || 2) >= thr);
  const coverT = terr.filter(o => (o.d.visibility === "Blocking" || o.d.visibility === "Obscuring") && polyCircle(o.P, b, b.r) <= 1);
  const A = basePoints(a), targets = basePoints(b).filter(q => aware || inFacing(a, q));
  res.total = targets.length;
  if (!targets.length) { res.note = "Outside its facing"; return res; }
  const blocked = new Set();
  for (const q of targets) {
    for (const p of A) {
      let hit = null;
      for (const o of blockT) if (polySeg(o.P, p, q) < 1e-6) { hit = o.d.name; break; }
      if (!hit) for (const m of others) if (segPoint(m, p, q) < m.r - 1e-6) { hit = m.name; break; }
      if (!hit) { res.seen++; res.lines.push([p, q]); break; }
      blocked.add(hit);
    }
  }
  res.los = res.seen > 0;
  if (!res.los) { res.blockedBy = [...blocked]; return res; }
  for (const o of coverT)
    if (targets.some(q => A.some(p => polySeg(o.P, p, q) < 1e-6))) res.coverBy.push(o.d.name);
  res.cover = res.coverBy.length > 0;
  if (elev.by) res.note = `On ${elev.by}: sees over smaller models and terrain`;
  return res;
}
function losText(r) {
  if (!r.los) return r.note || (r.blockedBy.length ? `No LoS: blocked by ${r.blockedBy.slice(0, 3).join(", ")}` : "No LoS");
  return `LoS${r.seen < r.total ? ` (${Math.round(100 * r.seen / r.total)}% of the base)` : ""}${r.cover ? ` · Cover from ${r.coverBy.join(", ")}` : " · no cover"}`;
}

/* Board overlay in LoS mode: the observer's facing line, then either the sight lines to the hovered model
   or a ring on every enemy model it can see (dashed when the enemy has cover) */
function losOverlay() {
  if (tTool !== "los" || !tSel || tSel.kind !== "model") return "";
  const [a, sa] = findModel(tSel.id); if (!a || a.where !== "table") return "";
  const out = [];
  if (!isAware(a, sa)) {
    const px = Math.cos(rad(a.facing)), py = -Math.sin(rad(a.facing));
    out.push(`<line x1="${f2(a.x - px * 40)}" y1="${f2(SY(a.y - py * 40))}" x2="${f2(a.x + px * 40)}" y2="${f2(SY(a.y + py * 40))}" class="los-face"/>`);
  }
  const [b, sb] = tHover && tHover !== a.id ? findModel(tHover) : [null, null];
  if (b && b.where === "table") {
    const r = losCheck(a, sa, b, sb);
    if (r.los) for (const [p, q] of r.lines) out.push(`<line x1="${f2(p.x)}" y1="${f2(SY(p.y))}" x2="${f2(q.x)}" y2="${f2(SY(q.y))}" class="los-line"/>`);
    else out.push(`<line x1="${f2(a.x)}" y1="${f2(SY(a.y))}" x2="${f2(b.x)}" y2="${f2(SY(b.y))}" class="los-no"/>`);
    out.push(`<text x="${f2(b.x)}" y="${f2(SY(b.y) - b.r - 0.3)}" class="dlabel">${r.los ? (r.cover ? "LoS · cover" : "LoS") : "No LoS"}</text>`);
  } else {
    for (const [m, s] of tableModels()) {
      if (s === sa) continue;
      const r = losCheck(a, sa, m, s);
      if (r.los) out.push(`<circle cx="${f2(m.x)}" cy="${f2(SY(m.y))}" r="${f2(m.r + 0.16)}" class="los-ring ${r.cover ? "cover" : ""}"/>`);
    }
  }
  return out.join("");
}

/* Selected panel: which enemies this model can see, and which can see it */
function losPanel(m, side) {
  if (m.where !== "table") return "";
  const foes = tableModels().filter(([, s]) => s !== side);
  if (!foes.length) return "";
  const row = ([o, s], r) => `<li><b>${esc(o.name)}</b> <span class="muted">${r1(Math.max(0, dist(m, o) - m.r - o.r))}"</span>${r.cover ? ` <span class="els">cover</span>` : ""}</li>`;
  const sees = foes.map(f => [f, losCheck(m, side, f[0], f[1])]).filter(([, r]) => r.los);
  const seenBy = foes.map(f => [f, losCheck(f[0], f[1], m, side)]).filter(([, r]) => r.los);
  return `<div class="tlos"><h5>Can see</h5>${sees.length ? `<ul>${sees.map(([f, r]) => row(f, r)).join("")}</ul>` : `<p class="muted tsmall">No enemy models</p>`}
    <h5>Seen by</h5>${seenBy.length ? `<ul>${seenBy.map(([f, r]) => row(f, r)).join("")}</ul>` : `<p class="muted tsmall">No enemy models (out of their LoS)</p>`}</div>`;
}
/* LoS-related states: Prone and Blind for any model, Aware where its cards mention it */
function losStates(m, side) {
  const b = (k, label, on) => `<button class="tbtn ${on ? "on" : ""}" data-tstate="${k}" data-id="${m.id}" aria-pressed="${on}">${label}</button>`;
  return `<div class="tacts">${mentionsRe(m, side, AWARE_RE) || isAware(m, side) ? b("aware", "Aware (360° LoS)", isAware(m, side)) : ""}${b("prone", "Prone", !!m.prone)}${b("blind", "Blind", !!m.blind)}</div>`;
}
