/* ---------- Models that change profile cards (Mizuko & Shōgo-Ryu) and communal Ki ----------
   A combined profile card carries `forms: {mizuko, shogo}` (src/cards/passing-night.js).
   - Fly High (Main Phase): the model becomes Mizuko. It keeps its id, Ki, states, counters and used feats
     (non-wound effects) and uses her own wound boxes (kept in `mDmg` while combined). Shōgo-Ryu joins the
     side as a second model (`partOf` = Mizuko's id) Elsewhere, carrying the dragon's marked wounds.
   - Eight Petal Comet (Starting Phase, usable Elsewhere): Shōgo-Ryu flies in by Flank (`flyIn`, the table
     puts him in its Flank list with 2 Activation Counters) or rejoins: the combined card replaces Mizuko,
     takes Shōgo-Ryu's wounds, and Mizuko's marked boxes stay on her card for the next split.
   - The combined model removed from play (killed) becomes Mizuko; Mizuko removed removes Shōgo-Ryu.
   Communal Ki: models with `communal: true` (Okami, Ki maximum "*") put their Ki on the "Communion with
   the Dragon" card (`pool`) and pay from it. Everything here works on a side {models, cards}: a My lists
   game (S) or one side of a test. */
const COMMUNAL = "communion with the dragon";
const communalCard = cards => (cards || []).find(c => c && norm(c.name || "") === COMMUNAL) || null;
const usesPool = (d, cards) => !!(d && d.communal) && !!communalCard(cards);
const comboBase = m => m.base || (m.def && m.def.forms ? m.def : null);
const isCombined = m => !!(m.def && m.def.forms);
const isMizuko = m => !!m.base && !m.def.forms;
const formDead = m => (m.dmg || 0) >= (+m.def.w || 1) || !!m.removed;

function kiAvail(m, cards) { const c = usesPool(m.def, cards) ? communalCard(cards) : null; return c ? (c.pool || 0) : (m.ki || 0); }
function kiSpend(m, cards, n) {
  const c = usesPool(m.def, cards) ? communalCard(cards) : null;
  if (c) { c.pool = Math.max(0, (c.pool || 0) - n); c.u = Date.now(); } else m.ki = Math.max(0, (m.ki || 0) - n);
}
/* Ki Generation for one model; returns the Ki gained */
function kiGenerate(m, cards) {
  const d = m.def, gen = +d.kiGen || 0;
  if (usesPool(d, cards)) { const c = communalCard(cards); c.pool = (c.pool || 0) + gen; c.u = Date.now(); return gen; }
  const b = m.ki || 0; m.ki = Math.min(+d.kiCap || 0, b + gen); return m.ki - b;
}

/* Fly High: m is the combined model; mk(def) makes a new model object for this screen */
function formSplit(side, m, mk) {
  const base = comboBase(m); if (!base || !isCombined(m)) return null;
  const dragon = m.dmg || 0;
  m.base = base;
  m.def = JSON.parse(JSON.stringify(base.forms.mizuko));
  m.dmg = m.mDmg || 0; delete m.mDmg; m.removed = false;
  const s = mk(JSON.parse(JSON.stringify(base.forms.shogo)));
  Object.assign(s, { id: m.id + "sr", dmg: dragon, partOf: m.id, elsewhere: true });
  const i = side.models.indexOf(m);
  side.models.splice(i + 1, 0, s);
  return s;
}
/* Eight Petal Comet, rejoin: s is Shōgo-Ryu */
function formRejoin(side, s) {
  const m = side.models.find(x => x.id === s.partOf); if (!m || !m.base) return null;
  m.mDmg = m.dmg || 0;
  m.def = m.base; delete m.base;
  m.dmg = s.dmg || 0;
  side.models.splice(side.models.indexOf(s), 1);
  return m;
}
/* Eight Petal Comet, fly in: he gains Flank and arrives this turn */
function formFlyIn(s, turn) { s.elsewhere = false; s.flyIn = turn || true; }

/* After any wound change: apply the cards' removal rules. Returns notes for a toast. */
function formAfterDamage(side) {
  const notes = [];
  for (const m of [...side.models]) {
    if (isCombined(m) && formDead(m) && !m.dragonGone) {
      /* "If this model is removed from play, replace this model and profile card with Mizuko" */
      m.base = m.def; m.def = JSON.parse(JSON.stringify(m.base.forms.mizuko));
      m.dmg = m.mDmg || 0; delete m.mDmg; m.removed = false; m.dragonGone = true;
      notes.push(`${m.base.name} removed: Mizuko takes its place with her own wounds (${m.def.w - m.dmg} left). Shōgo-Ryu is gone.`);
    }
  }
  for (const s of side.models.filter(x => x.partOf)) {
    const m = side.models.find(x => x.id === s.partOf);
    if (m && formDead(m) && !formDead(s)) { s.dmg = +s.def.w || 10; s.removed = true; notes.push("Mizuko removed from play: Shōgo-Ryu is removed too."); }
  }
  return notes;
}
/* Starting Phase reminder */
function formStartNotes(side) {
  return side.models.filter(s => s.partOf && !formDead(s)).map(s => s.elsewhere
    ? "Shōgo-Ryu is Elsewhere: Eight Petal Comet now (1 Ki) to fly in by Flank or rejoin Mizuko"
    : "Shōgo-Ryu may rejoin Mizuko now with Eight Petal Comet (1 Ki)");
}
/* The choice after Eight Petal Comet; attr is the data attribute prefix the screen listens for */
function formSheet(s, attr) {
  return `<h3>Eight Petal Comet</h3><p class="sub">Choose one (Starting Phase).</p><div class="row form-choice">
    ${s.elsewhere ? `<button class="btn primary" data-${attr}="flyin" data-fm="${s.id}">Fly in by Flank<small>Arrives this turn along a neutral edge you pick, 2 Activation Counters</small></button>` : ""}
    <button class="btn ${s.elsewhere ? "" : "primary"}" data-${attr}="rejoin" data-fm="${s.id}">Rejoin Mizuko<small>Mizuko &amp; Shōgo-Ryu replaces her with the dragon's wounds; hers stay on her card</small></button></div>`;
}
/* The communal card's pool and feats (on the card in the cards list) */
function communalHTML(c, attr, key) {
  if (!c || norm(c.name || "") !== COMMUNAL) return "";
  const p = c.pool || 0;
  return `<div class="pool"><span>Ki on this card <b class="num">${p}</b></span>
    <button class="btn small" data-${attr}="${key}:-1" ${p ? "" : "disabled"}>−1</button><button class="btn small" data-${attr}="${key}:1">+1</button>
    <button class="btn small" data-${attr}="${key}:-4" ${p >= 4 ? "" : "disabled"} title="Target Friendly Dragon model gains an Activation Counter">Awakening (4)</button>
    <button class="btn small" data-${attr}="${key}:-1" ${p >= 1 ? "" : "disabled"} title="Target Friendly Shisai model gains a Virtue Token">Object of Devotion (1)</button></div>`;
}
/* Ki line for a model that uses the pool */
const poolLine = (d, cards) => `<div class="track k"><span class="track-label">Ki</span><span class="pool-note">On ${esc(communalCard(cards).name)}: <b class="num">${communalCard(cards).pool || 0}</b> <span class="muted">+${+d.kiGen || 0} each turn</span></span></div>`;
const formPill = m => m.partOf ? (formDead(m) ? "" : m.elsewhere ? `<span class="pill xwhere elsewhere">Elsewhere</span>` : m.flyIn && m.flyIn !== true ? `<span class="pill xwhere">Flew in turn ${m.flyIn}</span>` : "")
  : isMizuko(m) && !formDead(m) ? `<span class="pill xwhere">${m.dragonGone ? "Mizuko alone" : "Split from Shōgo-Ryu"}</span>` : "";
