/* Bushido newrecruit PDF parser. Input: pages = [{items:[{s,x,y,w,h}]}] with y measured from page top. */
const BP = (() => {
  const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();

  // Merge fragments split by ligatures ("Pro"+"fi"+"le") into cells
  function cells(items) {
    const its = items.filter(i => i.s && i.s.trim()).map(i => ({ s: i.s, x0: i.x, x1: i.x + i.w, y: i.y, h: i.h }))
      .sort((a, b) => Math.abs(a.y - b.y) < 0.8 ? a.x0 - b.x0 : a.y - b.y);
    const out = [];
    for (const it of its) {
      const last = out[out.length - 1];
      if (last && Math.abs(last.y - it.y) < 0.8 && it.x0 - last.x1 < 1.5 && it.x0 >= last.x0) { last.s += it.s; last.x1 = it.x1; }
      else out.push({ ...it });
    }
    out.forEach(c => c.s = c.s.replace(/\s+/g, " ").trim());
    return out;
  }

  const HEAD_WORDS = { "character profile": "Melee Pool", "models": "Options", "melee weapon": "Melee Weapon Strength",
    "ranged weapon": "Ranged Weapon Strength", "ki feat": "Cost", "character traits": "Traits", "unique effects": "Description",
    "special card": null };
  function headerKind(c, line) {
    if (c.x0 > 14) return null;
    const n = norm(c.s);
    let kind = Object.keys(HEAD_WORDS).find(k => n === k || (k === "special card" && n.startsWith("special card")));
    if (!kind) return null;
    const others = line.filter(o => o !== c);
    if (!others.length) return null;
    if (kind === "special card") {
      const first = norm(others[0].s);
      if (!["description", "melee weapon strength", "ranged weapon strength", "base"].includes(first)) return null;
      return n === "special card" ? "special" : n.includes("melee") ? "special-melee" : n.includes("ranged") ? "special-ranged" : n.includes("terrain") ? "special-terrain" : "special";
    }
    if (!others.some(o => norm(o.s) === norm(HEAD_WORDS[kind]))) return null;
    return kind;
  }

  // Split a page into blocks: each a header line + the cells beneath it
  function blocks(cs) {
    const byLine = new Map();
    cs.forEach(c => { const k = Math.round(c.y * 2) / 2; (byLine.get(k) || byLine.set(k, []).get(k)).push(c); });
    const heads = [];
    for (const [y, line] of byLine) for (const c of line) { const k = headerKind(c, line); if (k) heads.push({ kind: k, y: c.y, cols: line.slice().sort((a, b) => a.x0 - b.x0) }); }
    heads.sort((a, b) => a.y - b.y);
    // end markers: Rules / Categories footers
    const stops = cs.filter(c => c.x0 > 9 && c.x0 < 14 && /^(Rules|Categories)\b/.test(c.s)).map(c => c.y);
    return heads.map((h, i) => {
      const next = Math.min(heads[i + 1] ? heads[i + 1].y : 1e9, ...stops.filter(y => y > h.y));
      const stopY = stops.filter(y => y > h.y).length ? Math.min(...stops.filter(y => y > h.y)) - 5 : 1e9;
      const body = cs.filter(c => c.y > h.y + 1 && c.y < Math.min(heads[i + 1] ? heads[i + 1].y - 1 : 1e9, stopY) && !h.cols.includes(c));
      return { ...h, rows: rowsOf(h, body) };
    });
  }

  function rowsOf(h, body) {
    const cols = h.cols.map(c => ({ name: c.s, x0: c.x0 }));
    const colOf = c => { let best = 0; cols.forEach((k, i) => { if (k.x0 <= c.x0 + 3) best = i; }); return best; };
    const anchors = body.filter(c => colOf(c) === 0).sort((a, b) => a.y - b.y);
    const groups = [];
    for (const a of anchors) { const g = groups[groups.length - 1]; if (g && a.y - g[g.length - 1].y < 14) g.push(a); else groups.push([a]); }
    let rows = groups.map(g => ({ y: g.reduce((s, c) => s + c.y, 0) / g.length, cells: [] }));
    if (!rows.length) rows = [{ y: 0, cells: [] }];
    body.forEach(c => { let r = rows[0]; rows.forEach(x => { if (Math.abs(x.y - c.y) < Math.abs(r.y - c.y)) r = x; }); r.cells.push(c); });
    return rows.map(r => {
      const o = {};
      cols.forEach((k, i) => { o[k.name] = r.cells.filter(c => colOf(c) === i).sort((a, b) => a.y - b.y || a.x0 - b.x0).map(c => c.s).join(" ").replace(/\s+/g, " ").trim(); });
      o._first = o[cols[0].name];
      return o;
    });
  }

  // Split on commas outside brackets/parentheses
  function splitTop(s) {
    const out = []; let depth = 0, cur = "";
    for (const ch of s || "") { if ("[(".includes(ch)) depth++; if ("])".includes(ch)) depth--; if (ch === "," && depth <= 0) { out.push(cur.trim()); cur = ""; } else cur += ch; }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  const IMMUNE_MAP = { fire: "On Fire", "on fire": "On Fire", poison: "Poisoned", poisoned: "Poisoned", bleed: "Bleed", control: "Controlled", controlled: "Controlled" };
  const STATE_NAMES = ["Aggressive", "Bleed", "Blind", "Controlled", "Cowardly", "Death Sentence", "Diseased", "Disguised", "Frightened", "Held", "Immobilised", "Impetuous", "On Fire", "Poisoned", "Prone", "Reloading", "Run", "Spirit Block", "Stunned", "Virtue"];
  function immunities(traits) {
    const set = new Set();
    const m = traits.match(/Immune\s*\[([^\]]+)\]/i);
    if (m) m[1].split(",").forEach(x => { const k = x.trim().toLowerCase(); const st = IMMUNE_MAP[k] || STATE_NAMES.find(s => s.toLowerCase() === k); if (st) set.add(st); });
    if (/\bFearless\b/.test(traits)) set.add("Frightened");
    if (/\bSoulless\b/.test(traits)) ["Bleed", "Frightened", "Poisoned"].forEach(x => set.add(x));
    if (/\bImmovable\b/.test(traits)) set.add("Prone");
    return [...set];
  }
  const num = s => { const m = String(s || "").match(/-?\d+/); return m ? +m[0] : null; };

  function parseCardPage(title, rice, bl, roleHint) {
    const profiles = [], weapons = [], feats = [], notes = [], equip = [], traitsArr = [];
    let cardText = [];
    for (const b of bl) {
      for (const r of b.rows) {
        const g = k => r[k] || "";
        if (b.kind === "character profile" && r._first) {
          profiles.push({ name: r._first, mp: g("Melee Pool"), mb: g("Melee Boost"), rp: g("Ranged Pool"), rb: g("Ranged Boost"), mv: g("Move"), mvb: g("Move Boost"),
            ki: num(g("Ki")) ?? 0, kib: g("Ki Boost"), kic: num(g("Ki Cap")) ?? 0, w: num(g("Wounds")) ?? 1, size: g("Size & Base") });
        } else if (b.kind === "character traits" && g("Traits")) traitsArr.push(g("Traits"));
        else if ((b.kind === "melee weapon" || b.kind === "special-melee") && r._first)
          weapons.push({ n: r._first, s: g("Melee Weapon Strength"), t: [g("Traits"), g("Specials"), g("Unique Effects")].filter(Boolean).join(", "), eq: b.kind === "special-melee" });
        else if ((b.kind === "ranged weapon" || b.kind === "special-ranged") && r._first)
          weapons.push({ n: r._first, s: g("Ranged Weapon Strength"), range: g("Range Bands"), t: [g("Traits"), g("Specials"), g("Unique Effects")].filter(Boolean).join(", "), eq: b.kind === "special-ranged" });
        else if (b.kind === "ki feat" && r._first) {
          const lim = g("Limitation");
          feats.push({ n: r._first, c: num(g("Cost")) ?? 0, tm: g("Timing"), sub: g("Subject"), lim: /\bOpG\b|On(c)?e Per Game/i.test(lim) ? "OpG" : /\bOpT\b|On(c)?e Per Turn/i.test(lim) ? "OpT" : "", limText: lim, d: g("Description") });
        } else if (b.kind === "unique effects" && g("Description")) notes.push({ n: r._first, d: g("Description") });
        else if (b.kind === "special" && g("Description")) { equip.push({ n: r._first, d: g("Description") }); cardText.push(g("Description")); }
        else if (b.kind === "special-terrain") { const { _first, ...rest } = r; cardText.push(Object.entries(rest).filter(([k, v]) => v && k !== Object.keys(rest)[0]).map(([k, v]) => k === "Description" ? v : `${k}: ${v}`).join(". ")); }
      }
    }
    if (profiles.length) {
      const traits = traitsArr.join(", ");
      const allText = notes.map(n => n.d).join(" ");
      const models = profiles.map(p => {
        let name = p.name;
        if (profiles.length === 1 && norm(p.name).startsWith(norm(title))) name = title;
        return { name, card: title, rice, stats: p, w: p.w, kiGen: p.ki, kiCap: Math.max(p.kic, 0), traits, weapons, feats, notes,
          immune: immunities(traits), zeroKiSlow: /zero Ki Tokens?,? it has Slow/i.test(allText), intimidate: /\bIntimidate\b/.test(traits),
          group: /\bGroup\b/.test(traits) };
      });
      return { kind: "profile", title, rice, models, equip };
    }
    return { kind: "card", title, rice, text: cardText.join(" ") };
  }

  function parseGlossary(pages) {
    const g = {};
    for (const cs of pages) {
      let term = null;
      for (const c of cs) {
        if (c.x0 < 7 && /:$/.test(c.s) && c.s.length < 40 && c.h > 10.5) { term = c.s.replace(/\s*:$/, "").trim(); g[term] = ""; }
        else if (term && c.h < 10.5) g[term] = (g[term] + " " + c.s).trim();
      }
    }
    return g;
  }

  function parse(pages) {
    const pc = pages.map(p => cells(p.items));
    // Roster page
    const first = pc[0];
    const titleCell = first.find(c => c.y < 15);
    const listName = titleCell ? titleCell.s.replace(/\[\s*\d+\s*Rice\]/i, "").trim() : "Imported list";
    const sub = first.find(c => c.y > 15 && c.y < 35);
    const hdr = first.find(c => c.s === "NAME");
    const roleX = (first.find(c => c.s === "ROLE") || {}).x0 || 100, optX = (first.find(c => c.s === "OPTIONS") || {}).x0 || 200;
    const roster = [];
    if (hdr) {
      const rows = new Map();
      first.filter(c => c.y > hdr.y + 2).forEach(c => { const k = Math.round(c.y); (rows.get(k) || rows.set(k, []).get(k)).push(c); });
      for (const [, line] of [...rows].sort((a, b) => a[0] - b[0])) {
        let name = "", role = "", opts = "";
        line.forEach(c => { if (c.x0 >= optX - 6) opts += " " + c.s; else if (c.x0 >= roleX - 6) role += " " + c.s; else name += " " + c.s; });
        name = name.trim(); role = role.trim();
        if (!role) { const m = name.match(/^(.*?)\s+((?:Faction|Ronin)\s+\w+\s+Cards)$/); if (m) { name = m[1]; role = m[2]; } }
        if (name) roster.push({ name, role, options: splitTop(opts.trim()) });
      }
    }
    // Card pages
    const cards = []; const glossPages = [];
    let inRules = false;
    pc.slice(1).forEach(cs => {
      if (cs.some(c => c.s === "Rules" && c.y < 20 && c.h > 14)) inRules = true;
      if (inRules) { glossPages.push(cs); return; }
      const banner = cs.filter(c => c.y < 13);
      if (!banner.length) return;
      const riceC = banner.find(c => /^-?\d+\s*RICE$/i.test(c.s));
      const titleC = banner.find(c => c !== riceC);
      if (!titleC) return;
      const rosterEntry = roster.find(r => norm(r.name).toUpperCase() === norm(titleC.s).toUpperCase() || norm(r.name) === norm(titleC.s));
      const title = rosterEntry ? rosterEntry.name : titleC.s;
      cards.push({ ...parseCardPage(title, riceC ? num(riceC.s) : 0, blocks(cs)), role: rosterEntry ? rosterEntry.role : "", options: rosterEntry ? rosterEntry.options : [] });
    });
    return { name: listName, subtitle: sub ? sub.s : "", roster, cards, glossary: parseGlossary(glossPages) };
  }

  const typeOf = role => /event/i.test(role) ? "Event" : /theme/i.test(role) ? "Theme" : /terrain/i.test(role) ? "Terrain" : /enhancement/i.test(role) ? "Enhancement" : /curse/i.test(role) ? "Curse" : "Card";

  return { parse, norm, splitTop, typeOf };
})();
if (typeof module !== "undefined") module.exports = BP;
