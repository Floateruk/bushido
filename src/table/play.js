/* ---------- Playing on the table: turns, scenario and victory points, activation counters, model cards ----------
   Rulebook p.28: in the Starting Phase every model gains 2 Activation Counters; a Simple action removes 1, a
   Complex action 2, taking part in a Melee Exchange 1. A model with none is Exhausted.
   Pack p.15: Reset Scenario Points / Reset Alignment happen in the Starting Phase of the listed turns.
   State: TBL.play = { turn, sp: {F, E}, vp: {F, E} }; each model keeps m.act (counters left).
   Wounds, Ki and states are in the linked Testing lists game (TBL.testId), see tests.js. */
const ACT_PER_TURN = 2;
let tUndo = null;          /* snapshot for the Undo on "Next turn" */

function playState() {
  if (!TBL.play) TBL.play = { turn: TBL.step === "play" ? 1 : 0, sp: { F: 0, E: 0 }, vp: { F: 0, E: 0 } };
  return TBL.play;
}
const allModels = () => ["F", "E"].flatMap(s => TBL.sides[s].models);
const turnsIn = (rule, re) => { const m = rule.match(re); return m ? m[1].split(/[,/]/).map(Number) : []; };
function gameLength(s) { const m = (s.length || "").match(/(Fixed|Variable)\s*\((\d+)\)/); return m ? { kind: m[1], n: +m[2] } : { kind: "Fixed", n: 6 }; }
/* The last turn (pack p.15-16): Fixed (X) ends after turn X. Variable (X): from turn X a D6 in the Starting
   Phase, 4+ makes it the last turn; the game always ends after turn 7. 0 = not known yet. */
function lastTurn(s) {
  const L = gameLength(s), P = playState();
  if (L.kind === "Fixed") return L.n;
  return P.lastTurn || (P.turn >= 7 ? 7 : 0);
}
/* Which victory condition is scored this turn */
function vpTurn(text, s) {
  const m = text.match(/turn (\d+)/i); if (m) return +m[1];
  if (/last|final/i.test(text)) return lastTurn(s);
  return 0;
}

function startTurn(n) {
  const P = playState(), s = SCN(TBL.scenarioId), notes = [];
  const tg = linkedTest();
  tUndo = JSON.stringify({ TBL, test: tg });
  P.turn = n;
  for (const m of allModels()) { m.act = ACT_PER_TURN; m.blind = false; }   /* Blind markers go in the End Phase */
  /* Wounds, Ki and states live in the linked test: Ki Generation, Last Stand removals, Run/Blind cleared there */
  if (tg) notes.push(...testStartTurn(tg, n), "Ki generated");
  for (const r of s.rules || []) {
    if (/^Reset( Scenario Points)?\s*\(/i.test(r) && turnsIn(r, /\(([\d,\/]+)\)/).includes(n)) { P.sp = { F: 0, E: 0 }; notes.push("Scenario Points reset to 0"); }
    if (/^Reset alignment/i.test(r) && turnsIn(r, /\(([\d,\/]+)\)/).includes(n)) { TBL.objectives.forEach(o => o.align = "N"); followZones(); notes.push("objectives reset to Neutral"); }
  }
  const flank = allModels().filter(m => m.where === "elsewhere" && m.flank && m.flankTurn === n).map(m => m.name);
  if (flank.length) notes.push(`Flank arrivals: ${flank.join(", ")}`);
  tSave(); tHistReset(); tLast = tSnap();
  return notes;
}

/* The game card at the top of the left column */
function gameCardHTML() {
  const P = playState(), s = SCN(TBL.scenarioId), L = gameLength(s);
  if (TBL.step !== "play") return "";
  const step = (k, side) => `<div class="tscore-v"><button class="tstep" data-tscore="${k}" data-side="${side}" data-d="-1" aria-label="Remove one">−</button><b class="num">${P[k][side]}</b><button class="tstep" data-tscore="${k}" data-side="${side}" data-d="1" aria-label="Add one">+</button></div>`;
  const vps = (s.victory || []).map(v => { const t = vpTurn(v, s); return `<li class="${t === P.turn ? "now" : t && t < P.turn ? "past" : ""}">${esc(v)}</li>`; }).join("");
  const last = lastTurn(s);
  const roll = L.kind === "Variable" && P.turn >= L.n && !last && P.rolled !== P.turn
    ? `<div class="troll"><p class="tsmall"><b>Starting Phase:</b> roll a D6. On 4+ the game ends after this turn.</p>
        <div class="tacts"><button class="tbtn" data-tlast="yes">4+: last turn</button><button class="tbtn" data-tlast="no">1–3: carry on</button></div></div>` : "";
  const exhausted = side => TBL.sides[side].models.filter(m => m.where === "table" && (m.act ?? ACT_PER_TURN) === 0).length;
  const onTable = side => TBL.sides[side].models.filter(m => m.where === "table").length;
  return `<div class="tcard tgame">
    <div class="tturn"><button class="tstep" data-tturnback aria-label="Previous turn" ${P.turn <= 1 ? "disabled" : ""}>‹</button>
      <div><small>${L.kind === "Fixed" ? `Fixed game · ${L.n} turns` : `Variable game · roll from turn ${L.n}`}</small><b>Turn ${P.turn}${last === P.turn ? ` <span class="tlast">last turn</span>` : ""}</b></div>
      ${last && P.turn >= last ? `<p class="tsmall muted tend">The game ends after this turn.</p>` : `<button class="btn small primary" data-tnextturn>Turn ${P.turn + 1} ▸</button>`}</div>
    ${roll}
    <div class="tscore">
      <span></span><small>SP</small><small>VP</small>
      <span class="tscore-n F" title="${esc(TBL.sides.F.name)}">${esc(TBL.sides.F.name)}</span>${step("sp", "F")}${step("vp", "F")}
      <span class="tscore-n E" title="${esc(TBL.sides.E.name)}">${esc(TBL.sides.E.name)}</span>${step("sp", "E")}${step("vp", "E")}
    </div>
    <p class="tsmall muted">Exhausted: ${exhausted("F")} of ${onTable("F")} yours · ${exhausted("E")} of ${onTable("E")} theirs</p>
    <h4>Victory points</h4><ol class="tvp">${vps}</ol>
  </div>`;
}

/* Activation counters: small dots behind the token on the board (unobtrusive), full control in the side panel */
function actDots(m) {
  if (TBL.step !== "play" || m.act == null) return "";
  /* inside the base, just in from its back edge, so they never fall off the table edge */
  const back = rad(m.facing + 180), out = [], R = m.r * 0.74, gap = 0.17 / R;
  for (let i = 0; i < ACT_PER_TURN; i++) {
    const a = back + (i - (ACT_PER_TURN - 1) / 2) * gap;
    out.push(`<circle cx="${f2(Math.sin(a) * R)}" cy="${f2(-Math.cos(a) * R)}" r="0.065" class="actdot ${i < m.act ? "on" : ""}"/>`);
  }
  return out.join("");
}
function actHTML(m) {
  if (TBL.step !== "play" || m.where !== "table") return "";
  const n = m.act ?? ACT_PER_TURN;
  const dots = Array.from({ length: Math.max(ACT_PER_TURN, n) }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
  return `<div class="tact"><span class="tact-dots" aria-label="${n} activation counters">${dots}</span>
    <b>${n ? `${n} activation${n > 1 ? "s" : ""} left` : "Exhausted"}</b>
    <span class="tacts"><button class="tbtn" data-tact="-1" data-id="${m.id}" ${n < 1 ? "disabled" : ""} title="Key 1">Simple −1</button><button class="tbtn" data-tact="-2" data-id="${m.id}" ${n < 2 ? "disabled" : ""} title="Key 2">Complex −2</button><button class="tbtn" data-tact="1" data-id="${m.id}" title="Key +">+1</button></span></div>`;
}

/* The model's full card from its warband, in the side panel */
function modelCardHTML(m, side) {
  const d = cardOf(m, side);
  if (!d) return `<p class="muted tsmall">No card found for this model in the warband.</p>`;
  const st = d.stats || {};
  const weapons = (d.weapons || []).filter(w => !(!w.s && /,/.test(w.n)));
  return `<div class="tmcard detail">
    <div class="statline">
      <div><small>Mel</small><b class="num">${stat(st.mp, st.mb)}</b></div><div><small>Rng</small><b class="num">${stat(st.rp, st.rb)}</b></div>
      <div><small>Mov</small><b class="num">${stat(st.mv, st.mvb)}</b></div><div><small>Ki</small><b class="num">${d.kiGen ?? "–"}/${d.kiCap ?? "–"}</b></div>
      <div><small>Wds</small><b class="num">${d.w ?? "–"}</b></div></div>
    ${st.size ? `<p class="tsmall"><b>Size &amp; base:</b> ${esc(st.size)}${d.rice != null ? ` · ${esc(String(d.rice))} Rice` : ""}</p>` : ""}
    ${weapons.length ? `<div><h4>Weapons</h4>${weapons.map(w => `<div class="wpn"><b>${esc(w.n)} ${esc(w.s || "")}${w.range ? ` · ${esc(w.range)}"` : ""}${w.eq ? '<span class="eq">Equip</span>' : ""}</b><em>${ruleList(w.t || "")}</em></div>`).join("")}</div>` : ""}
    ${(d.equip || []).length ? `<div><h4>Equipment</h4>${d.equip.map(e => `<p><b>${esc(e.n)}</b>: ${esc(e.d)}</p>`).join("")}</div>` : ""}
    ${d.traits ? `<div><h4>Traits</h4><p>${ruleList(d.traits)}</p></div>` : ""}
    ${(d.feats || []).length ? `<div><h4>Ki feats</h4>${d.feats.map(f => `<p><b>${esc(f.n)}</b> (${f.c} Ki${f.tm ? ", " + esc(f.tm) : ""}${f.sub ? ", " + esc(f.sub) : ""}${f.limText ? ", " + esc(f.limText) : ""}): ${esc(f.d)}</p>`).join("")}</div>` : ""}
    ${(d.notes || []).length ? `<div><h4>Unique effects</h4>${d.notes.map(n => `<p><b>${esc(n.n)}</b>: ${esc(n.d)}</p>`).join("")}</div>` : ""}
    ${(d.immune || []).length ? `<div><h4>Immune to</h4><p>${d.immune.join(", ")}</p></div>` : ""}
    <p class="tap-hint">Underlined rules open their definition.</p></div>`;
}

function spendAct(id, d) {
  const [m] = findModel(id); if (!m) return;
  m.act = Math.max(0, Math.min(9, (m.act ?? ACT_PER_TURN) + d));
  tSave(); renderTable();
}

document.addEventListener("click", e => {
  if (VIEW !== "table" || !TBL) return;
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset;
  if (d.tact) return spendAct(d.id, +d.tact);
  if (d.tscore) { const P = playState(); P[d.tscore][d.side] = Math.max(0, P[d.tscore][d.side] + +d.d); tSave(); return renderTable(); }
  if (d.tnextturn !== undefined) {
    const n = playState().turn + 1, notes = startTurn(n);
    renderTable();
    return toast(`Turn ${n}: ${ACT_PER_TURN} activation counters each${notes.length ? "; " + notes.join("; ") : ""}.`, false, `<button data-tundoturn="">Undo</button>`);
  }
  if (d.tundoturn !== undefined && tUndo) {
    const u = JSON.parse(tUndo); TBL = u.TBL; tUndo = null; tHistReset(); tSave();
    if (u.test) { const now = Date.now(); u.test.sides.F.models.concat(u.test.sides.E.models).forEach(m => m.u = now); tests()[u.test.id] = u.test; touchTest(u.test); xHistReset(u.test); }
    $("toastHost").innerHTML = ""; return renderTable();
  }
  if (d.tlast) { const P = playState(); if (d.tlast === "yes") P.lastTurn = P.turn; else P.rolled = P.turn; tSave(); return renderTable(); }
  if (d.tturnback !== undefined) { const P = playState(); if (P.turn > 1) { if (P.lastTurn >= P.turn) delete P.lastTurn; P.turn--; tSave(); renderTable(); } }
});
document.addEventListener("keydown", e => {
  if (VIEW !== "table" || !TBL || TBL.step !== "play" || !tSel || tSel.kind !== "model") return;
  if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || "")) return;
  if (e.key === "1") spendAct(tSel.id, -1);
  else if (e.key === "2") spendAct(tSel.id, -2);
  else if (e.key === "+" || e.key === "=") spendAct(tSel.id, 1);
});

/* ---------- Link to the Testing lists game ----------
   Table models made from a test share its model ids. Killed models leave the board; Prone and Blind are the
   test's states (shown and set on both screens). A table without a test keeps Prone/Blind on its own models. */
const linkedTest = () => (TBL && TBL.testId && typeof findTest === "function") ? findTest(TBL.testId) : null;
function linkedTM(m) { const tg = linkedTest(); return tg ? findTM(tg, m.id)[0] : null; }
const isGoneT = m => { const tm = linkedTM(m); return !!tm && xGone(tm); };
const onLastStandT = m => { const tm = linkedTM(m); return !!tm && xOnLS(tm); };
function tFlag(m, k) {           /* k: "prone" | "blind" */
  const tm = linkedTM(m);
  return tm ? !!tm.states[k === "prone" ? "Prone" : "Blind"] : !!m[k];
}
function setTFlag(m, k) {
  const tg = linkedTest(), tm = linkedTM(m), key = k === "prone" ? "Prone" : "Blind";
  if (tm) { if (tm.states[key]) delete tm.states[key]; else tm.states[key] = 1; touchTest(tg, tm); }
  else m[k] = !m[k];
}
