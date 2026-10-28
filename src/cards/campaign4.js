/* Campaign 4: Imperial March zone-control list (95 rice), transcribed from the Imperial and Ronin card images
   (Cards_Updated_202604). Models not defined here (Yūkan'na, Golden Sentinel, Yu, Shìbīng) come from the
   library already in seed.json. Run by src/build_seed.js. */
const feat = (n, c, tm, sub, lim, d, limText) => ({ n, c, tm, sub, lim, limText: limText ?? lim, d });

const models = {
  "Zuǒ Cí": {
    name: "Zuǒ Cí", card: "Zuǒ Cí", rice: 15,
    stats: { name: "Zuǒ Cí", mp: "2", mb: "3", rp: "2", rb: "", mv: "4", mvb: "", ki: 2, kib: "", kic: 8, w: 6, size: "Small 30mm" },
    w: 6, kiGen: 2, kiCap: 8,
    traits: "Armour (1), Channel (4/6\"), Immovable",
    weapons: [{ n: "Runed Earth Sword", s: "+3", t: "Brutal (3), Powerful Attack (1), Stun Attack (0)", eq: false }],
    feats: [
      feat("Return to Serve", 0, "Simple", "Target 6\"", "OpG",
        "Costs X Ki. Target a Friendly Shìbīng or Rui Jin. Return to play another of the same model type and Deploy it in BtB with the Target with X unmarked Wound Boxes that was recruited into the Warband but has been Killed or removed from play. This Warband may only use this Ki Feat once per game.",
        "X Ki, once per game"),
      feat("Stone Spike", 1, "Instant", "Personal", "",
        "Until the end of the current activation, when this model takes Damage in a Melee Exchange, the Enemy model suffers 1 Damage, ignoring Tough."),
      feat("Tiger Strike", 2, "Active", "Personal", "",
        "This model's melee weapons gain Bleed (1/1) and Sharp (1) until the current activation is complete.")
    ],
    notes: [{ n: "Unique Effects", d: "This model can only Channel to Bǎi Qiān models. When this model Channels to a Bǎi Qiān, that model gains an Earth Token. Remove all Earth Tokens in the End Phase. Models with Earth Tokens gain Earth and Immovable. While a Bǎi Qiān model has an Earth Token it may use Ki Feats on Ivory models' cards as if they were on the Bǎi Qiān Profile Card." }],
    immune: [], zeroKiSlow: false, intimidate: false, group: false
  }
};

const equip = [
  { n: "Finesse", d: "While involved in a Melee Exchange with Attached model, Enemy models lose the Brutal Trait. Exclusion [Models with Brutal, Minimoto, Tadao, Taiki]" },
  { n: "Veteran Sentinel", d: "Attached Golden Sentinel gains Agile and can Walk into BtB with Enemy models, ignoring Zones of Control when they do. Requirement [Golden Sentinel]" }
];

const cards = [
  { title: "Tireless Legions", type: "Event", rice: 1, text: "Play during the Starting Phase before Ki Generation. Until the End Phase, Friendly Earth Bǎi Qiān gain Tireless. Models may not gain Activation Counters in the Main Phase this turn." },
  { title: "Second Chance", type: "Event", rice: 1, text: "After rolling dice for any Opposed Test, you may re-roll All the dice used in the test. If you do your Opponent may choose any of their dice to re-roll." },
  { title: "Grace of the Kami", type: "Event", rice: 1, text: "Play before rolling dice for any test. For this test results of 1 are not discarded, they have a value of 1 and count towards the result and any tie breaks." }
];

/* The list: [model name, equipment, overrides]. Names not in `models` are taken from the library. */
const list = {
  name: "Campaign 4",
  sub: "Risen Sun [95 Rice] (The Imperial March)",
  models: [
    ["Yūkan'na", ["Finesse"], { rice: 18 }],
    ["Golden Sentinel", ["Veteran Sentinel"], { name: "Golden Sentinel" }],
    ["Yu", [], { rice: 12 }],
    ["Zuǒ Cí", []],
    ["Shìbīng", [], { name: "Shìbīng (A)" }],
    ["Shìbīng", [], { name: "Shìbīng (B)" }],
    ["Shìbīng", [], { name: "Shìbīng (C)" }]
  ],
  cards: ["The Imperial March", "Imperial Censure", "Tireless Legions", "Second Chance", "Grace of the Kami"]
};

module.exports = { models, equip, cards, list };
