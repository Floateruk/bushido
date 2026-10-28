/* Adds hand-transcribed card sets (src/cards/*.js) to src/seed.json.
   Run from the repo root:  node src/build_seed.js && python3 src/build.py
   Bump SEED_REV when card data changes, so installed apps apply it on next open. */
const fs = require("fs"), path = require("path");
const SEED_REV = 4;
const seedPath = path.join(__dirname, "seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const clone = o => JSON.parse(JSON.stringify(o));

seed.warbands = [];
for (const file of fs.readdirSync(path.join(__dirname, "cards")).filter(f => f.endsWith(".js"))) {
  const set = require(path.join(__dirname, "cards", file));
  if (set.glossary) Object.assign(seed.lib.glossary, set.glossary);
  if (!set.models) continue;
  for (const [name, m] of Object.entries(set.models))
    seed.lib.cards[norm(name)] = { kind: "profile", title: name, rice: m.rice, role: "Faction Profile Cards", models: [m], equip: [] };
  for (const e of set.equip || []) {
    const entry = e.feat ? { n: e.n, d: e.d, feat: e.feat } : { n: e.n, d: e.d };
    for (const key of [e.n, ...(e.alias || [])]) seed.lib.equip[norm(key)] = entry;
  }
  for (const c of set.cards || [])
    seed.lib.cards[norm(c.title)] = { kind: "card", title: c.title, rice: c.rice, role: c.type, type: c.type, text: c.text };

  /* Ready-made warband for the owner's list */
  const L = set.list;
  const models = L.models.map(([name, eqs, over]) => {
    /* models not transcribed in this set come from the library already in seed.json */
    const lib = seed.lib.cards[norm(name)];
    const d = clone(set.models[name] || (lib && lib.kind === "profile" && lib.models[0]));
    if (!d || !d.name) throw new Error(L.name + ": no card for " + name);
    Object.assign(d, over || {});
    if (over && over.name) d.stats = { ...d.stats, name: over.name };
    d.equip = [];
    for (const n of eqs) {
      const e = set.equip.find(x => x.n === n);
      d.equip.push({ n: e.n, d: e.d });
      if (e.feat) d.feats.push({ ...e.feat, n: e.feat.n, from: e.n });
    }
    return d;
  });
  const cards = L.cards.map(t => {
    const c = set.cards.find(x => x.title === t) || seed.lib.cards[norm(t)];
    if (!c) throw new Error(L.name + ": no card " + t);
    return { name: c.title, type: c.type || (/theme/i.test(c.role || "") ? "Theme" : /terrain/i.test(c.role || "") ? "Terrain" : "Event"), text: c.text };
  });
  seed.warbands.push({ id: "w-seed-" + norm(L.name).replace(/[^a-z0-9]+/g, "-"), name: L.name, sub: L.sub, models, cards });
}
seed.rev = SEED_REV;
fs.writeFileSync(seedPath, JSON.stringify(seed));
console.log("seed rev", SEED_REV, "| warbands:", seed.warbands.map(w => `${w.name} (${w.models.length} models, ${w.cards.length} cards)`).join(", "),
  "| library cards:", Object.keys(seed.lib.cards).length);
