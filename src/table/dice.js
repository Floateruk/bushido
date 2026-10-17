/* ---------- Opposed dice tool (Table area) ----------
   Rulebook R2, Opposed Tests and the Melee Exchange (p.32, p.41-43):
   - Each player has an Attack pool and a Defence pool of d6; using only one of them is allowed.
   - Dice of 1 are removed. The highest remaining die, plus +1 for each of up to two more dice that weren't
     1s (supporting dice), plus any modifier, is the final result. No dice of a kind = a final result of 0.
   - The Attacker's Attack is compared with the Defender's Defence; the difference is the Success Level.
     A tie goes to the player who has more dice that weren't 1s (all Attack and Defence dice count for both),
     otherwise to the Active player. Then the Defender becomes the Attacker (step 13).
   Dice come from crypto.getRandomValues with rejection sampling, so every face is equally likely.
   Tap a die to re-roll it; the corner button removes it from the result (Unblockable, Impenetrable Defence...).
   Nothing here is saved or synced: it is a table aid for the current game on this device. */
const DICE = {
  open: false, att: "F", act: "F", pos: null,
  P: { F: { a: [], d: [], am: 0, dm: 0 }, E: { a: [], d: [], am: 0, dm: 0 } }
};
const DICE_MAX = 12;

/* Unbiased d6: 252 = 6 x 42, so values 252-255 are thrown away and drawn again */
function rollD6() {
  const b = new Uint8Array(1);
  do { crypto.getRandomValues(b); } while (b[0] >= 252);
  return (b[0] % 6) + 1;
}
const newDie = () => ({ v: 0, r: 0, x: false });
const rolled = pool => pool.filter(d => d.v > 0);

/* Final result of one pool: highest die + up to two supporting dice + modifier */
function poolResult(pool, mod) {
  const live = pool.filter(d => d.v > 1 && !d.x).map(d => d.v).sort((a, b) => b - a);
  if (!live.length) return { final: 0, hi: 0, sup: 0, live: 0, text: pool.some(d => d.v > 0) ? "no dice above 1" : "not rolled" };
  const sup = Math.min(2, live.length - 1);
  const final = live[0] + sup + mod;
  return { final, hi: live[0], sup, live: live.length, text: `${live[0]}${sup ? ` +${sup} supporting` : ""}${mod ? ` ${mod > 0 ? "+" : "−"}${Math.abs(mod)}` : ""} = ${final}` };
}
const liveCount = side => ["a", "d"].reduce((n, k) => n + DICE.P[side][k].filter(d => d.v > 1 && !d.x).length, 0);
const sideName = s => (typeof TBL !== "undefined" && TBL && TBL.sides ? TBL.sides[s].name : s === "F" ? "You" : "Opponent");
const otherSide = s => (s === "F" ? "E" : "F");

/* One attack against one defence */
function diceCompare(attSide, defSide) {
  const A = poolResult(DICE.P[attSide].a, DICE.P[attSide].am), D = poolResult(DICE.P[defSide].d, DICE.P[defSide].dm);
  const out = { A, D, attSide, defSide };
  if (A.final !== D.final) { out.winner = A.final > D.final ? attSide : defSide; out.sl = Math.abs(A.final - D.final); out.how = ""; return out; }
  const ca = liveCount(attSide), cd = liveCount(defSide);
  if (ca !== cd) { out.winner = ca > cd ? attSide : defSide; out.how = `tie: ${ca > cd ? sideName(attSide) : sideName(defSide)} rolled more dice above 1 (${Math.max(ca, cd)} v ${Math.min(ca, cd)})`; }
  else { out.winner = DICE.act; out.how = `tie: same number of dice, the Active player (${sideName(DICE.act)}) wins`; }
  out.sl = 0; return out;
}
function exchangeText(c) {
  if (!rolled(DICE.P[c.attSide].a).length && !rolled(DICE.P[c.defSide].d).length) return `<span class="muted">Roll some dice.</span>`;
  const hit = c.winner === c.attSide;
  return hit
    ? `<b class="dhit">${esc(sideName(c.attSide))} succeeds</b>: Damage Roll at Success Level ${c.sl}`
    : `<b class="dheld">${esc(sideName(c.defSide))} defends</b> (${c.sl ? `Success Level ${c.sl}` : "tie"}): no damage`;
}

/* ---------- Drawing ---------- */
function dieHTML(side, kind, i, d, hiIdx) {
  const cls = ["die", d.v === 0 ? "blank" : "", d.v === 1 ? "one" : "", d.x ? "off" : "", d.r ? "again" : "", hiIdx.hi === i ? "hi" : "", hiIdx.sup.includes(i) ? "sup" : ""].join(" ");
  const lab = d.v ? `${d.v}` : "–";
  return `<span class="diewrap"><button class="${cls}" data-die="${side}:${kind}:${i}" aria-label="${d.v ? `Die ${d.v}${d.x ? ", removed" : ""}. Re-roll` : "Roll"}">${lab}</button>
    <button class="diex ${d.x ? "on" : ""}" data-diex="${side}:${kind}:${i}" aria-label="${d.x ? "Count this die again" : "Remove this die from the result"}" title="${d.x ? "Count this die again" : "Remove this die from the result"}">${d.x ? "↺" : "×"}</button></span>`;
}
/* which dice make up the final result: the highest, and up to two supporting */
function diceRoles(pool) {
  const order = pool.map((d, i) => [d, i]).filter(([d]) => d.v > 1 && !d.x).sort((a, b) => b[0].v - a[0].v || a[1] - b[1]);
  return { hi: order.length ? order[0][1] : -1, sup: order.slice(1, 3).map(([, i]) => i) };
}
function poolHTML(side, kind) {
  const p = DICE.P[side], pool = p[kind], mod = p[kind === "a" ? "am" : "dm"], res = poolResult(pool, mod), roles = diceRoles(pool);
  const label = kind === "a" ? "Attack" : "Defence";
  return `<div class="dpool">
    <div class="dpool-h"><b>${label}</b>
      <span class="dstep" title="Number of dice"><button data-dn="${side}:${kind}:-1" aria-label="Fewer ${label} dice">−</button><span class="num">${pool.length}</span><button data-dn="${side}:${kind}:1" aria-label="More ${label} dice">+</button></span>
      <span class="dstep" title="Modifier to the highest die"><small>mod</small><button data-dm="${side}:${kind}:-1" aria-label="Lower ${label} modifier">−</button><span class="num">${mod > 0 ? "+" : ""}${mod}</span><button data-dm="${side}:${kind}:1" aria-label="Raise ${label} modifier">+</button></span>
      <button class="dsmall" data-droll="${side}:${kind}">Roll</button></div>
    <div class="dice">${pool.length ? pool.map((d, i) => dieHTML(side, kind, i, d, roles)).join("") : `<span class="muted dnone">Not used</span>`}</div>
    <div class="dres ${res.final ? "" : "zero"}">${pool.length ? esc(res.text) : "0"}</div></div>`;
}
function sideHTML(side) {
  return `<section class="dside ${side}"><h4>${esc(sideName(side))}${DICE.att === side ? ` <span class="pill dtag">Attacker</span>` : ""}${DICE.act === side ? ` <span class="pill dtag act">Active</span>` : ""}</h4>${poolHTML(side, "a")}${poolHTML(side, "d")}</section>`;
}
function diceHTML() {
  const A = DICE.att, B = otherSide(A), c1 = diceCompare(A, B), c2 = diceCompare(B, A);
  const seg = (key, label) => `<span class="dseg"><small>${label}</small>${["F", "E"].map(s => `<button class="${DICE[key] === s ? "on" : ""}" data-dset="${key}:${s}">${esc(s === "F" ? "You" : "Opp.")}</button>`).join("")}</span>`;
  return `<div class="dhead" data-dragdice><b>Opposed dice</b><span class="spacer"></span><button class="dsmall" data-dclose aria-label="Close dice">✕</button></div>
    <div class="dbody">
      <div class="dbar"><button class="btn small primary" data-drollall>Roll all</button><button class="btn small" data-dclear>Clear</button>${seg("att", "Attacker")}${seg("act", "Active")}</div>
      <div class="dcols">${sideHTML("F")}${sideHTML("E")}</div>
      <div class="dresult"><h4>Melee Exchange</h4>
        <p><small>1.</small> ${esc(sideName(A))} Attack ${c1.A.final} v ${esc(sideName(B))} Defence ${c1.D.final}<br>${exchangeText(c1)}${c1.how && (rolled(DICE.P[A].a).length || rolled(DICE.P[B].d).length) ? `<br><small class="muted">${esc(c1.how)}</small>` : ""}</p>
        <p><small>2.</small> ${esc(sideName(B))} Attack ${c2.A.final} v ${esc(sideName(A))} Defence ${c2.D.final}<br>${exchangeText(c2)}${c2.how && (rolled(DICE.P[B].a).length || rolled(DICE.P[A].d).length) ? `<br><small class="muted">${esc(c2.how)}</small>` : ""}</p>
        <p class="muted dnote">Second step only if the first didn't end the exchange (defender removed, Prone or out of base contact). 1s count as allocated but never score.</p></div>
    </div>`;
}

let diceHost = null;
function diceEl() {
  if (diceHost) return diceHost;
  diceHost = document.getElementById("diceHost"); return diceHost;
}
function diceRender() {
  const h = diceEl(); if (!h) return;
  const show = DICE.open && typeof VIEW !== "undefined" && VIEW === "table";
  h.hidden = !show; if (!show) return;
  if (DICE.pos) { h.style.left = DICE.pos.x + "px"; h.style.top = DICE.pos.y + "px"; h.style.right = "auto"; }
  /* keep the panel's own scroll when it redraws after a roll */
  const body = h.querySelector(".dbody"), keep = body ? body.scrollTop : 0;
  h.innerHTML = diceHTML();
  const nb = h.querySelector(".dbody"); if (nb) nb.scrollTop = keep;
}
function diceSync() { diceRender(); }

function rollPool(side, kind) {
  DICE.P[side][kind].forEach(d => { d.v = rollD6(); d.r = 0; d.x = false; });
}
function tumble(el) { el.classList.remove("roll"); void el.offsetWidth; el.classList.add("roll"); }

/* ---------- Controls ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.dice !== undefined) { DICE.open = !DICE.open; diceRender(); return; }
  const h = diceEl(); if (!h || !h.contains(t)) return;
  const d = t.dataset;
  if (d.dclose !== undefined) { DICE.open = false; return diceRender(); }
  if (d.drollall !== undefined) { for (const s of ["F", "E"]) for (const k of ["a", "d"]) rollPool(s, k); diceRender(); return h.querySelectorAll(".die").forEach(tumble); }
  if (d.dclear !== undefined) { for (const s of ["F", "E"]) for (const k of ["a", "d"]) DICE.P[s][k].forEach(x => { x.v = 0; x.r = 0; x.x = false; }); return diceRender(); }
  if (d.dset) { const [k, s] = d.dset.split(":"); DICE[k] = s; if (k === "att" && !DICE.touchedAct) DICE.act = s; if (k === "act") DICE.touchedAct = true; return diceRender(); }
  if (d.droll) { const [s, k] = d.droll.split(":"); rollPool(s, k); diceRender(); return h.querySelectorAll(`[data-die^="${s}:${k}:"]`).forEach(tumble); }
  if (d.dn) {
    const [s, k, by] = d.dn.split(":"), pool = DICE.P[s][k];
    if (+by > 0 && pool.length < DICE_MAX) pool.push(newDie()); else if (+by < 0) pool.pop();
    return diceRender();
  }
  if (d.dm) { const [s, k, by] = d.dm.split(":"), f = k === "a" ? "am" : "dm"; DICE.P[s][f] = Math.max(-9, Math.min(9, DICE.P[s][f] + +by)); return diceRender(); }
  if (d.die) {
    const [s, k, i] = d.die.split(":"), x = DICE.P[s][k][+i]; if (!x) return;
    x.r = x.v ? 1 : 0; x.v = rollD6(); diceRender();
    const n = h.querySelector(`[data-die="${d.die}"]`); if (n) tumble(n); return;
  }
  if (d.diex) { const [s, k, i] = d.diex.split(":"), x = DICE.P[s][k][+i]; if (x) x.x = !x.x; return diceRender(); }
});
document.addEventListener("keydown", e => {
  if (typeof VIEW === "undefined" || VIEW !== "table" || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || "")) return;
  if (e.key.toLowerCase() === "d" && !e.ctrlKey && !e.metaKey && !e.altKey) { DICE.open = !DICE.open; diceRender(); }
});

/* Drag the panel by its header */
document.addEventListener("pointerdown", e => {
  const hd = e.target.closest("[data-dragdice]"); if (!hd || e.target.closest("button")) return;
  const h = diceEl(), r = h.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
  const move = ev => {
    DICE.pos = { x: Math.max(0, Math.min(innerWidth - 80, ev.clientX - dx)), y: Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy)) };
    h.style.left = DICE.pos.x + "px"; h.style.top = DICE.pos.y + "px"; h.style.right = "auto";
  };
  const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
  addEventListener("pointermove", move); addEventListener("pointerup", up);
  e.preventDefault();
});
