/* Horse Lords of Ataka cards, transcribed from the owner's card images (bushido-cards-2026-10-10.pdf).
   Stats were checked against the newrecruit "Horse Lords 1" list PDF.
   Run by src/build_seed.js to add these to seed.json. */
const SIZE = "Large 50mm";
const feat = (n, c, tm, sub, lim, d, limText) => ({ n, c, tm, sub, lim, limText: limText ?? lim, d });
const model = (name, rice, s, traits, weapons, feats, notes = [], immune = []) => ({
  name, card: name, rice,
  stats: { name, mp: s[0], mb: s[1], rp: s[2], rb: s[3], mv: s[4], mvb: s[5], ki: s[6], kib: s[7], kic: s[8], w: s[9], size: SIZE },
  w: s[9], kiGen: s[6], kiCap: s[8], traits, weapons, feats, notes, immune,
  zeroKiSlow: false, intimidate: false, group: false
});
const passingStrike = feat("Passing Strike", 1, "Active", "Personal", "", "If this model moved into Melee this activation, it may make a normal Damage Roll when resolving a successful Sidestep Attack.");

const models = {
  "Inoue Kikuko": model("Inoue Kikuko", 17, ["3", "3", "3", "3", "4", "3", 2, "", 6, 6],
    "Armour (2), Aware, Banzai!, Bravery, Cavalry (3\"), Immune [Prone], Prowess [Melee](1), Unstable",
    [{ n: "Hooves", s: "+2", t: "Slow, Fire (1/1), Slam Attack (1)" },
     { n: "Dai Kyu", s: "+1", range: "5/10/15", t: "Reload (1)" }],
    [feat("Quick Reload", 3, "Active", "Personal", "", "Remove any Reload Markers from this model.", "noBtB"),
     feat("Zen Archery", 3, "Active", "Personal", "OpG", "After this model completes any Ranged Attack, this model makes another Ranged Attack, ignoring Reload Markers, at the same model, instead of making a Ranged Attack Test, the Result is the same as the previous shot, compare the result to the Target Number and roll Damage as usual.")],
    [], ["Prone"]),
  "Ōiwa Yoshitaka": model("Ōiwa Yoshitaka", 22, ["4", "3", "3", "3", "4", "", 2, "", 6, 6],
    "Armour (2), Banzai!, Bravery, Cavalry (2\"), Prowess [Melee](1), Unstable",
    [{ n: "Katana", s: "+1", t: "Charging Bonus [Pierce (1)], Forceback Attack (0), Sidestep Attack (0), Push Defence (1)" }],
    [feat("Do Kote", 2, "Active", "Personal", "", "This model gains Feint (1) until the current action is resolved."),
     feat("Mouth of Jigoku", 3, "Active", "Special", "OpG", "When this model Charges, it may move through models and ignore ZoC. Each model that you own moved through may be placed in BtB with the Charge Target if possible. Models Placed in this way may remove any Control, Disease, Fire, Poison, Prone or Spirit Block Markers."),
     passingStrike]),
  "Taka Toshiyuki": model("Taka Toshiyuki", 19, ["3", "3", "2", "", "4", "", 2, "", 6, 6],
    "Armour (3), Banzai!, Cavalry (2\"), Endurance, Fearless, Indomitable (1), Parry (1), Prowess [Melee](1)",
    [{ n: "Yari", s: "+0", t: "Charging Bonus [Strong], Reach, Forceback Attack (0), Powerful Attack (1), Push Attack (0)" }],
    [feat("Do and Die", 2, "Active", "Target 6\"", "OpT", "Target Other Friendly Samurai model gains Coordinated Attack [Samurai] until the current action is resolved."),
     feat("Inferno", 2, "Simple", "Pulse 2\"", "", "All other models within the Pulse's area of effect gain a Fire (2) Marker.")],
    [{ n: "Unique Effects", d: "If this model Charges, the Target gains a Stunned Marker when this model enters BtB." }],
    ["Frightened"]),
  "Takeda Reiko": model("Takeda Reiko", 21, ["3", "3", "3", "3", "5", "3", 2, "3", 8, 6],
    "Armour (2), Banzai!, Bravery, Cavalry (4\"), Command [Friendly](3/6\"), Leadership [Friendly](1/6\"), Prowess [Melee](1), Tactician (1), Unstable",
    [{ n: "Naginata", s: "+1", t: "Charging Bonus [Pierce (2)], Reach, Powerful Attack (1), Push Attack (0), Counterstrike Defence (1)" }],
    [feat("Cleave", 2, "Active", "Personal", "", "This model's Melee Weapons gain Brutal (2) until the current action is resolved."),
     feat("Honour the Charge", 2, "Active", "Personal", "OpG", "When this model charges, it gains Intangible for the Charge Move. For each Objective moved through during this Charge, you may change that Objective's alignment one degree (Enemy - Neutral - Friendly)."),
     feat("Outmanoeuvre", 2, "Active", "Personal", "", "When applying Melee Assist penalties, this model inflicts -2 dice rather than -1 until the current Melee Exchange is resolved.")],
    [{ n: "Unique Effects", d: "When this model uses its Command trait, if all nominated models declare a Charge Action then, after those Activations are resolved, this model may also declare a Charge Action without using any Activation Counters." }]),
  "Watanabe Yuka": model("Watanabe Yuka", 15, ["3", "", "2", "", "5", "3", 2, "", 6, 6],
    "Armour (2), Banzai!, Bravery, Cavalry (2\"), Impetuous (0), Jump up, Prowess [Melee](1), Unstable",
    [{ n: "Nagamaki", s: "+1", t: "Charging Bonus [Pierce (2), Slam Attack (0)], Forceback Attack (0), Push Attack (0), Sidestep Attack (0)" }],
    [feat("Adrenaline Rush", 2, "Active", "Personal", "OpT", "When this model charges it gains Intangible, loses Unstable and its Nagamaki Melee Weapon gains Unblockable (1) until the end of the current activation. In the Start Phase of the next turn this model gains an Impetuous Marker.", "noBtB, OpT"),
     feat("Vitality", 3, "Instant", "Personal", "OpT", "This model gains an Activation Counter.")]),
  "Tomoto Kazuma": model("Tomoto Kazuma", 21, ["4", "3", "3", "", "4", "3", 2, "", 6, 6],
    "Armour (2), Banzai!, Bravery, Cavalry (2\"), Prowess [Melee](1), Unstable",
    [{ n: "Katana", s: "+1", t: "Charging Bonus [Pierce (1)], Powerful Attack (1), Sidestep Attack (0), Counterstrike Defence (1)" }],
    [feat("Fade", 1, "Simple", "Personal", "OpG", "Place this model Elsewhere. It gains Flank and returns to play using those rules. The table edge chosen to return on must be Friendly."),
     passingStrike])
};

/* Equipment and enhancements that attach to a model */
const equip = [
  { n: "Ataka Archery Cap", d: "Attached model gains Courage (1), and its Dai Kyu Ranged Weapon gains Lightweight. Requirement [Inoue Kikuko]" },
  { n: "Western Riding Hat", d: "Attached model gains Charging Bonus [Fear(5)], Courage (1), and Ranged Defence (2). Requirement [Ōiwa Yoshitaka]" },
  { n: "Horse-Leather Helmet", alias: ["Horse Leather Helmet"], d: "Attached model gains Charging Bonus [Fear(5)], Ranged Defence (2), and Resistance (1). Requirement [Taka Toshiyuki]" },
  { n: "Sangi Crown", d: "Attached model gains Charging Bonus [Fear(6)], and Ranged Defence (2). Requirement [Takeda Reiko]" },
  { n: "The High Crest", d: "Attached model gains Courage (1), and Ranged Defence (2). Requirement [Watanabe Yuka]" },
  { n: "Yeti Horns", d: "Attached model gains Charging Bonus [Fear(5)], Courage (1), and Ranged Defence (2). Requirement [Kazuma Tomoto]" },
  { n: "Equestrian Leg Yield", d: "During an Enemy model's activation in which it entered into BtB with, or Targets the Attached Friendly Samurai model with a Ranged Attack or Ki Feat, but before any Melee Exchange begins; make an Opposed Move Test. If successful, place the Attached model within 2\" of its current location, the Enemy model's action is then considered resolved. Discard this Card. This is a Trap Effect. Requirement [Samurai]" },
  { n: "Flying Changes", d: "Attached model gains the following Ki Feat: Agility.",
    feat: feat("Agility", 1, "Instant", "Personal", "OpT", "After making a Scenario Action, this model gains an Activation Counter.") }
];

/* Event, curse, terrain and theme cards */
const cards = [
  { title: "Cleansed by Balefire", type: "Event", rice: 1, text: "When a Friendly Faction model declares a Charge Action, the Target gains a Fire (1) Marker when this model enters BtB. Remove any Bleed, Death Sentence, Disease, Fire, Poison, Stunned or Spirit Block Markers from the Charging model." },
  { title: "To Ride Through Jigoku", type: "Event", rice: 2, text: "Choose a Friendly Faction Samurai model to gain Ranged Defence (4) and Intangible until the end of the current activation." },
  { title: "Beneath the Open Sky", type: "Event", rice: 3, text: "Remove a piece of pool terrain after terrain deployment has been finished. Exclusion [Beyond the Plains]" },
  { title: "Ride Them Down!", type: "Event", rice: 2, text: "Play after a Friendly model declares a Charge action. That model may Move through Enemy models. It may not end its Move occupying the same area as an Impassable Terrain Element or another model. Any Enemy model moved through can be Moved up to 2\" in any direction you choose." },
  { title: "Rout!", type: "Event", rice: 1, text: "When an Enemy model takes a Fear Test in the End Phase and is within 3\" of a Friendly Horselords of Ataka Cavalry model, that Enemy model automatically fails the Fear Test." },
  { title: "Beyond the Plains", type: "Curse", rice: -10, text: "Opponent deploys the first 6 pieces of Pool Terrain and then deploys any recruited Warband Terrain Elements (these are deployed before your Warband Terrain). You place no Terrain except Terrain Elements Recruited into this Warband. A Warband may only recruit one Curse Event Card." },
  { title: "Forced March", type: "Curse", rice: -10, text: "In the first turn of the game, Friendly Horselords of Ataka models receive only one Activation Counter instead of two. A Warband may only recruit one Curse Event Card. Exclusion [Warband using Risen Sun Cycle deck]" },
  { title: "Misfortune", type: "Curse", rice: -10, text: "This Warband automatically loses the Tactical Roll on odd numbered turns. A Warband may only recruit one Curse Event Card. If both players automatically lose the Tactical test then roll the Tactical test as usual." },
  { title: "Open Plains", type: "Terrain", rice: 1, text: "Terrain [Normal, Clear, Zero]. This Terrain may be placed on the Battlefield, ignoring all restrictions in the terrain rules. No Terrain may be deployed within 1\" of this Terrain. If using 'Players deploying Terrain', deploy this Terrain before any other Terrain." },
  { title: "Cavalry Charge", type: "Theme", rice: 0, text: "The first Charging Friendly Samurai that causes a rolled Fear test each turn gains Terror and Dread (1). Once per game use this ability in the Starting Phase, until the End Phase Friendly models treat Cavalry trait as Move instead of Walk. When a Friendly model declares a Run Action, it gains 1 Ki Token. You must recruit a Curse card into the Warband. Permitted [Samurai]" },
  { title: "Hit & Run", type: "Theme", rice: 0, text: "When a Charge Attack Damage Roll Kills an Enemy model, the Charging Samurai may make a Walk equal to its Move Statistic. Once per game use this ability in the Starting Phase, until the End Phase Friendly models may use their Cavalry Trait before AND after their Action. The first time, each turn, a Friendly model is successful on a Charge Attack Roll, that model suffers half Damage on any Damage Roll from the same Melee Exchange. You must recruit a Curse card into the Warband. Permitted [Samurai]" }
];

/* The owner's "Horse Lords 1" list (newrecruit), with each model's equipment */
const list = {
  name: "Horse Lords 1",
  sub: "Risen Sun [100 Rice] (Horse Lords of Ataka)",
  models: [
    ["Inoue Kikuko", ["Ataka Archery Cap"]],
    ["Ōiwa Yoshitaka", ["Western Riding Hat"]],
    ["Taka Toshiyuki", ["Horse-Leather Helmet"]],
    ["Takeda Reiko", ["Equestrian Leg Yield", "Sangi Crown"]],
    ["Watanabe Yuka", ["Flying Changes"]]
  ],
  cards: ["Cleansed by Balefire", "To Ride Through Jigoku", "Beyond the Plains", "Open Plains", "Cavalry Charge"]
};

module.exports = { models, equip, cards, list };
