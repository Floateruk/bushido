/* Adds hand-transcribed card sets (src/cards/*.js) to src/seed.json.
   Run from the repo root:  node src/build_seed.js && python3 src/build.py
   Bump SEED_REV when card data changes, so installed apps apply it on next open. */
const fs = require("fs"), path = require("path");
const SEED_REV = 1;
const seedPath = path.join(__dirname, "seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const clone = o => JSON.parse(JSON.stringify(o));

seed.warbands = [];
for (const file of fs.readdirSync(path.join(__dirname, "cards")).filter(f => f.endsWith(".js"))) {
  const set = require(path.join(__dirname, "cards", file));
  for (const [name, m] of Object.entries(set.models))
    seed.lib.cards[norm(name)] = { kind: "profile", title: name, rice: m.rice, role: "Faction Profile Cards", models: [m], equip: [] };
  for (const e of set.equip) {
    const entry = e.feat ? { n: e.n, d: e.d, feat: e.feat } : { n: e.n, d: e.d };
    for (const key of [e.n, ...(e.alias || [])]) seed.lib.equip[norm(key)] = entry;
  }
  for (const c of set.cards)
    seed.lib.cards[norm(c.title)] = { kind: "card", title: c.title, rice: c.rice, role: c.type, type: c.type, text: c.text };

  /* Ready-made warband for the owner's list */
  const L = set.list;
  const models = L.models.map(([name, eqs]) => {
    const d = clone(set.models[name]);
    d.equip = [];
    for (const n of eqs) {
      const e = set.equip.find(x => x.n === n);
      d.equip.push({ n: e.n, d: e.d });
      if (e.feat) d.feats.push({ ...e.feat, n: e.feat.n, from: e.n });
    }
    return d;
  });
  const cards = L.cards.map(t => { const c = set.cards.find(x => x.title === t); return { name: c.title, type: c.type, text: c.text }; });
  seed.warbands.push({ id: "w-seed-" + norm(L.name).replace(/[^a-z0-9]+/g, "-"), name: L.name, sub: L.sub, models, cards });
}
seed.rev = SEED_REV;
fs.writeFileSync(seedPath, JSON.stringify(seed));
console.log("seed rev", SEED_REV, "| warbands:", seed.warbands.map(w => `${w.name} (${w.models.length} models, ${w.cards.length} cards)`).join(", "),
  "| library cards:", Object.keys(seed.lib.cards).length);
