/* Passing the Night (Prefecture of Ryu, 100 rice): the owner's list from newrecruit (9 Nov 2026).
   Takashi, Tama and Ton come from the newrecruit PDF. Mizuko and Shōgo-Ryu are typed in from the card images
   (bushido-cards-2026-11-09.pdf): the PDF only has the combined card. The combined card carries `forms`
   (src/forms.js splits and rejoins them) and all three are Okami, so their Ki goes on the Communion with
   the Dragon communal card (`communal: true`; Ki maximum "*" on the cards). */
const okami = { communal: true, kiCap: 0 };

const mizuko = {
  name: "Mizuko", card: "Mizuko", rice: "Sp", ...okami, types: ["Okami", "Shisai"],
  stats: { name: "Mizuko", mp: "2", mb: "3", rp: "3", rb: "", mv: "4", mvb: "", ki: 3, kib: "", kic: 0, w: 5, size: "Small 30mm" },
  w: 5, kiGen: 3,
  traits: "Bravery, Dodge (1), Immune [Fire], Ranged Defence (2)",
  weapons: [
    { n: "Fire Magic", s: "+2", t: "Fire (1/1), Push Defence (0)", eq: false },
    { n: "Fire Magic (ranged)", s: "+1", range: "2/4/6", t: "Fire (1/1)", eq: false }
  ],
  feats: [
    { n: "Fire Shield", c: 1, tm: "Active", sub: "Target 6\"", lim: "", limText: "noBtB", d: "Until the End Phase, when Target model is successfully attacked in a Melee Exchange, after the activation is complete, the opposing model gains a Fire (2) Marker." },
    { n: "Idolise", c: 2, tm: "Active", sub: "Target 6\"", lim: "", limText: "", d: "Target Friendly Faction model with a Rice Cost of more than this model gains +1 to its Melee Pool or Ranged Pool until the End Phase." }
  ],
  notes: [{ n: "Unique Effects", d: "This model may only Target Dragon models with its Idolise Feat, this includes Su cost Dragon models." }],
  immune: ["On Fire"], zeroKiSlow: false, intimidate: false, group: false
};

const shogo = {
  name: "Shōgo-Ryu", card: "Shōgo-Ryu", rice: "Su", ...okami, types: ["Dragon", "Okami"],
  stats: { name: "Shōgo-Ryu", mp: "3", mb: "3", rp: "3", rb: "3", mv: "5", mvb: "3", ki: 0, kib: "3", kic: 0, w: 10, size: "Large 50mm" },
  w: 10, kiGen: 0,
  traits: "Cloudwalk, Fearless, Fear (5), Immune [Fire, Prone], Mettle (1), Ranged Defence (2), Sixth Sense, Spirit (3)",
  weapons: [
    { n: "Bite", s: "+2", t: "Fire (1/1), Pierce (1), Sharp (1), Throw Attack (1), Push Defence (0)", eq: false },
    { n: "Fire Breath", s: "+2", range: "2/4/6", t: "Fire (1/1)", eq: false }
  ],
  feats: [
    { n: "Eight Petal Comet", c: 1, tm: "Instant", sub: "Personal", lim: "", limText: "Starting Phase, usable Elsewhere", d: "This Ki Feat may be used while Elsewhere. Use only in the Starting Phase. Choose one of the following: If this model is Elsewhere it gains Flank and returns to play this turn using those rules. Or: Replace Mizuko with Mizuko & Shōgo-Ryu. They are considered the same model for non-Wound box transfer effects. Transfer wound box effects from Shōgo-Ryu to Mizuko & Shōgo-Ryu, remove Shōgo-Ryu from play. Leave marked Wound boxes on Mizuko's profile." }
  ],
  notes: [
    { n: "Inhale", d: "This model may perform a Wait Action to gain Range 4/8/12 and Strong on its Fire Breath weapon." },
    { n: "Unique Effects", d: "If a Mizuko that you own is removed from play, also remove this model from play." }
  ],
  immune: ["On Fire", "Prone", "Frightened"], zeroKiSlow: false, intimidate: false, group: false
};

const TYPES = { "Mizuko & Shōgo-Ryu": ["Dragon", "Okami", "Shisai"], "Takashi Hida": ["Novice", "Shisai", "Takashi"], "Takashi Kazu": ["Samurai", "Shamed", "Takashi"],
  "Takashi Nagisa": ["Samurai", "Shamed", "Takashi"], "Takashi Takanibu": ["Samurai", "Shamed", "Takashi"], "Tama": ["Mourner", "Shisai"], "Ton": ["Shisai"] };

const combined = Object.assign({
  "name": "Mizuko & Shōgo-Ryu",
  "card": "Mizuko & Shōgo-Ryu",
  "rice": 23,
  "stats": {
    "name": "Mizuko & Shōgo-Ryu",
    "mp": "3",
    "mb": "3",
    "rp": "3",
    "rb": "3",
    "mv": "4",
    "mvb": "",
    "ki": 3,
    "kib": "",
    "kic": 0,
    "w": 10,
    "size": "Large 50mm"
  },
  "w": 10,
  "kiGen": 3,
  "kiCap": 0,
  "traits": "Aware, Cloudwalk, Fear (5), Fearless, Immune [Fire, Prone], Indomitable (1), Mettle (1), Ranged Defence (2), Sixth Sense",
  "weapons": [
    {
      "n": "Fire Magic",
      "s": "+2",
      "t": "Fire (1/1), Push Defence (0), Dual Attack (1), Throw Attack (1)",
      "eq": false
    },
    {
      "n": "Fire Breath",
      "s": "+2",
      "range": "2/4/6",
      "t": "Fire (1/1)",
      "eq": false
    }
  ],
  "feats": [
    {
      "n": "Dragon Manipulation",
      "c": 2,
      "tm": "Active",
      "sub": "Personal",
      "lim": "OpT",
      "limText": "noBtB, OpT",
      "d": "When this model declares a Ranged Attack Action its Ranged Weapon gains one of the following until the current Ranged Attack Action is resolved: +2 Weapon Strength Lightweight Ranged Weapon Bands become 4/8/12"
    },
    {
      "n": "Fly High",
      "c": 1,
      "tm": "Active",
      "sub": "Special",
      "lim": "",
      "limText": "noBtB",
      "d": "This Ki feat may only be used in the Main Phase. Replace this model with Mizuko, they are considered the same model for non-wound box transfer effects. Place Shōgo-Ryu Elsewhere, transfer wound box effects to Shōgo-Ryu's profile card."
    }
  ],
  "notes": [
    {
      "n": "Unique Effects",
      "d": "Mizuko, Shōgo-Ryu and Mizuko & Shōgo-Ryu profiles are considered the same model when creating a Warband. If this model is removed from play, replace this model and profile card with Mizuko, they are considered the same model for non-Wound box transfer effects. If this model is included in your Warband you may also include Ronin [Fire] Kami. This model may not be Placed and may not have Enhancements attached to it."
    }
  ],
  "immune": [
    "On Fire",
    "Prone",
    "Frightened"
  ],
  "zeroKiSlow": false,
  "intimidate": false,
  "group": false
}, okami, { forms: { mizuko, shogo } });

const models = Object.assign({ "Mizuko & Shōgo-Ryu": combined }, {
  "Takashi Hida": {
    "name": "Takashi Hida",
    "card": "Takashi Hida",
    "rice": 10,
    "stats": {
      "name": "Takashi Hida",
      "mp": "2",
      "mb": "",
      "rp": "2",
      "rb": "",
      "mv": "4",
      "mvb": "",
      "ki": 2,
      "kib": "",
      "kic": 8,
      "w": 5,
      "size": "Small 30mm"
    },
    "w": 5,
    "kiGen": 2,
    "kiCap": 8,
    "traits": "Believer [Samurai with no Shame Tokens]:(1/4\"), Bravery, Channel (6/6\"), Leadership [Samurai, Ashigaru]:(1/8\")",
    "weapons": [
      {
        "n": "Unarmed",
        "s": "-2",
        "t": "",
        "eq": false
      }
    ],
    "feats": [
      {
        "n": "Rally",
        "c": 3,
        "tm": "Active",
        "sub": "Pulse 8\"",
        "lim": "",
        "limText": "",
        "d": "Remove the Frightened state from all Friendly models in the Pulse."
      },
      {
        "n": "Daimyo's Blessing",
        "c": 3,
        "tm": "Simple",
        "sub": "Aura 6\"",
        "lim": "",
        "limText": "noBtB",
        "d": "Choose Melee Pool or Ranged Pool. While within the Aura, Friendly Faction models increase the chosen Pool by one."
      }
    ],
    "notes": [
      {
        "n": "Unique Effects",
        "d": "When this model takes Damage in a Melee Exchange, all Friendly models gain a Shame Token. If this model is Killed or Removed from Play, this Warband cannot score Scenario Points and models in this Warband may not perform Scenario Actions for the rest of the turn. This model may have Equipment Attached that has Requirement [Fujitaka]. This model may only be recruited into any Warband recruiting the Passing the Night Theme."
      }
    ],
    "immune": [],
    "zeroKiSlow": false,
    "intimidate": false,
    "group": false
  },
  "Takashi Kazu": {
    "name": "Takashi Kazu",
    "card": "Takashi Kazu",
    "rice": 16,
    "stats": {
      "name": "Takashi Kazu",
      "mp": "3",
      "mb": "3",
      "rp": "3",
      "rb": "3",
      "mv": "4",
      "mvb": "",
      "ki": 2,
      "kib": "",
      "kic": 6,
      "w": 6,
      "size": "Small 30mm"
    },
    "w": 6,
    "kiGen": 2,
    "kiCap": 6,
    "traits": "Armour (3), Bravery, Prowess [Melee]:(1), Slow, Unstable",
    "weapons": [
      {
        "n": "Naginata",
        "s": "+2",
        "t": "Reach, Powerful Attack (1), Counterstrike Defence (1), Push Defence (0)",
        "eq": false
      }
    ],
    "feats": [
      {
        "n": "Redemption Strike",
        "c": 1,
        "tm": "Active",
        "sub": "Personal",
        "lim": "",
        "limText": "",
        "d": "Remove one Shame Token from this model. If you do, this model gains Strong and its Naginata Weapon gains Brutal (1) until the end of this Activation."
      },
      {
        "n": "Umbrella Block",
        "c": 2,
        "tm": "Instant",
        "sub": "Personal",
        "lim": "",
        "limText": "",
        "d": "This model gains Parry (1) until the end of the current Melee Exchange"
      }
    ],
    "notes": [
      {
        "n": "Unique Effects",
        "d": "This model may only be recruited into any Warband recruiting the Passing the Night Theme."
      }
    ],
    "immune": [],
    "zeroKiSlow": false,
    "intimidate": false,
    "group": false
  },
  "Takashi Nagisa": {
    "name": "Takashi Nagisa",
    "card": "Takashi Nagisa",
    "rice": 16,
    "stats": {
      "name": "Takashi Nagisa",
      "mp": "3",
      "mb": "3",
      "rp": "3",
      "rb": "",
      "mv": "4",
      "mvb": "",
      "ki": 2,
      "kib": "",
      "kic": 6,
      "w": 6,
      "size": "Small 30mm"
    },
    "w": 6,
    "kiGen": 2,
    "kiCap": 6,
    "traits": "Armour (3), Bravery, Indomitable (1), Prowess [Melee]:(1), Slow, Unstable",
    "weapons": [
      {
        "n": "Naginata",
        "s": "+2",
        "t": "Reach, Critical Attack (0), Powerful Attack (1), Push Attack (0)",
        "eq": false
      }
    ],
    "feats": [
      {
        "n": "Do-Kote",
        "c": 2,
        "tm": "Active",
        "sub": "Personal",
        "lim": "",
        "limText": "",
        "d": "This model gains Feint (1) until the end of the current Melee Exchange."
      },
      {
        "n": "First in the Fray",
        "c": 1,
        "tm": "Active",
        "sub": "Personal",
        "lim": "",
        "limText": "",
        "d": "Remove a Shame Token from this model. If you do, this model gains Aggressive and Banzai! until the end of this Activation."
      }
    ],
    "notes": [
      {
        "n": "Unique Effects",
        "d": "This model may only be recruited into any Warband recruiting the Passing the Night Theme."
      }
    ],
    "immune": [],
    "zeroKiSlow": false,
    "intimidate": false,
    "group": false
  },
  "Takashi Takanibu": {
    "name": "Takashi Takanibu",
    "card": "Takashi Takanibu",
    "rice": 16,
    "stats": {
      "name": "Takashi Takanibu",
      "mp": "3",
      "mb": "3",
      "rp": "3",
      "rb": "",
      "mv": "4",
      "mvb": "",
      "ki": 2,
      "kib": "",
      "kic": 6,
      "w": 6,
      "size": "Small 30mm"
    },
    "w": 6,
    "kiGen": 2,
    "kiCap": 6,
    "traits": "Armour (3), Bravery, Prowess [Melee]:(1), Slow, Unstable",
    "weapons": [
      {
        "n": "Naginata",
        "s": "+2",
        "t": "Reach, Powerful Attack (1), Push Attack (0), Push Defence (0)",
        "eq": false
      }
    ],
    "feats": [
      {
        "n": "Do-Kote",
        "c": 2,
        "tm": "Active",
        "sub": "Personal",
        "lim": "",
        "limText": "",
        "d": "This model gains Feint (1) until the end of the current Melee Exchange."
      },
      {
        "n": "Atonement Swings",
        "c": 1,
        "tm": "Active",
        "sub": "Personal",
        "lim": "",
        "limText": "",
        "d": "Remove one Shame Token from this model. If you do, this model's Naginata gains Dual Attack (0) until the end of this Activation."
      }
    ],
    "notes": [
      {
        "n": "Unique Effects",
        "d": "This model may only be recruited into any Warband recruiting the Passing the Night Theme."
      }
    ],
    "immune": [],
    "zeroKiSlow": false,
    "intimidate": false,
    "group": false
  },
  "Tama": {
    "name": "Tama",
    "card": "Tama",
    "rice": 8,
    "stats": {
      "name": "Tama",
      "mp": "2",
      "mb": "3",
      "rp": "3",
      "rb": "",
      "mv": "4",
      "mvb": "",
      "ki": 1,
      "kib": "",
      "kic": 6,
      "w": 6,
      "size": "Small 30mm"
    },
    "w": 6,
    "kiGen": 1,
    "kiCap": 6,
    "traits": "",
    "weapons": [
      {
        "n": "Unarmed",
        "s": "-2",
        "t": "Push Defence (0)",
        "eq": false
      }
    ],
    "feats": [
      {
        "n": "Wailing Shōmyō",
        "c": 1,
        "tm": "Simple",
        "sub": "Aura X+1\"",
        "lim": "",
        "limText": "noBtB",
        "d": "Enemy models in the Aura cannot benefit from Enhancement cards. X is equal to the number of models that were recruited into this Warband but have been Killed or removed from play."
      },
      {
        "n": "Spirit Ward",
        "c": 2,
        "tm": "Complex",
        "sub": "Aura 6\"",
        "lim": "",
        "limText": "noWalk, noBtB",
        "d": "While within this Aura, Kami, Gashadokuro, and Asura models cannot move closer to this model."
      }
    ],
    "notes": [
      {
        "n": "Prayer Guardian",
        "d": "Before the first turn, if one or more models on the Battlefield has this ability, both players gain one Prayer Token. During Deployment, choose one Friendly model to begin the game with a Virtue Token."
      },
      {
        "n": "Virtue",
        "d": "While this model is in play, when a Friendly Shisai model spends a Virtue Token you may choose the following effect: This model may use one of its Simple or Complex Ki Feats for free as an Instant Ki Feat. Use this only when the Active Player but not during any model's Activation."
      }
    ],
    "immune": [],
    "zeroKiSlow": false,
    "intimidate": false,
    "group": false
  },
  "Ton": {
    "name": "Ton",
    "card": "Ton",
    "rice": 11,
    "stats": {
      "name": "Ton",
      "mp": "3",
      "mb": "3",
      "rp": "1",
      "rb": "",
      "mv": "3",
      "mvb": "",
      "ki": 2,
      "kib": "3",
      "kic": 8,
      "w": 9,
      "size": "Medium 40mm"
    },
    "w": 9,
    "kiGen": 2,
    "kiCap": 8,
    "traits": "Endurance, Immovable, Tough (1), Unstable",
    "weapons": [
      {
        "n": "Unarmed",
        "s": "+1",
        "t": "Push Attack (0)",
        "eq": false
      }
    ],
    "feats": [
      {
        "n": "Burden",
        "c": 1,
        "tm": "Simple",
        "sub": "Target 6\"",
        "lim": "OpT",
        "limText": "OpT",
        "d": "Transfer a Shame Token from Target Friendly model to this model."
      },
      {
        "n": "Oppressed Shōmyō",
        "c": 3,
        "tm": "Complex",
        "sub": "Aura 4\"",
        "lim": "",
        "limText": "noBtB",
        "d": "Friendly Models in the Aura gain the Strong and Lightfooted Traits."
      },
      {
        "n": "Scorn Stone",
        "c": 1,
        "tm": "Simple",
        "sub": "Pulse 6\"",
        "lim": "OpT",
        "limText": "OpT",
        "d": "Transfer any number of Shame Tokens from this model to other Friendly models in the Pulse."
      }
    ],
    "notes": [
      {
        "n": "Virtue",
        "d": "While this model is in play, when a Friendly model spends a Virtue Token you may choose the following effect: This model gains Endurance until the end of the current Activation."
      },
      {
        "n": "Unique Effects",
        "d": "If this model is Killed or Removed from Play, Friendly models may not have Shame Tokens removed for the rest of the game except by the Hari-Kiri Ki Feat. You may recruit this model for -X Rice, where X is the number of Shamed models recruited into the Warband. This model may only be recruited into any Warband recruiting the Passing the Night Theme."
      }
    ],
    "immune": [
      "Prone"
    ],
    "zeroKiSlow": false,
    "intimidate": false,
    "group": false
  }
});

const equip = [
  {
    "n": "The Dragon Banner",
    "d": "While this model is within 6\" of any Enemy model, any Friendly Ashigaru or Samurai model with LoS to this model gains: Vengeance [Enemy models with RC > 10] For the purpose of this ability, this model is considered Medium Sized and Friendly models have Aware. Requirement: [Takashi Hida or Fujitaka]"
  }
];

const cards = [
  { title: "Communion with the Dragon", type: "Communal", rice: 0, text: "When an Okami model would generate Ki Tokens (or otherwise gain Ki Tokens) instead place those Ki Tokens on this card. Whenever an Okami model would spend Ki Tokens you may spend them from this card to pay for Ki Feats, Boosts or other effects. Friendly Okami may use feats listed on this card. Awakening (4 Ki, Active, Target 6\"): Target Friendly Dragon model not affected by the Order Action this turn gains an Activation Counter. A model may only be affected by this Ki Feat once per turn from any source. That model now counts as having been affected by the Order Action for the purpose of further Order Actions this turn. Object of Devotion (1 Ki, Active, Target 6\"): Target Friendly Shisai model gains a Virtue Token." },
  { title: "Passing the Night", type: "Theme", rice: 0, text: "In the Starting Phase, the opponent must give 1 Shame Token to each Friendly Samurai that is not a Shamed model and then 1 Shame Token to a number of Friendly models equal to the turn number. Friendly models that are not Ton may only have one Shame Token. While a Friendly Faction Samurai or Shisai model has no Shame Tokens, it gains the following benefits: - Fearless - Melee Boost (2) - Spirit (+1) - Melee Weapons gain +1 Melee Weapon Strength - Lose Slow Warbands recruiting this Theme must recruit Hida. Permitted: [Samurai, Shisai, Ronin Shisai]" }
];

const list = {
  name: "Passing the Night",
  sub: "Risen Sun [100 Rice] (Prefecture of Ryu)",
  models: [["Mizuko & Shōgo-Ryu", []], ["Takashi Hida", ["The Dragon Banner"]], ["Takashi Kazu", []], ["Takashi Nagisa", []], ["Takashi Takanibu", []], ["Tama", []], ["Ton", []]],
  cards: ["Passing the Night", "Communion with the Dragon"]
};

for (const [n, t] of Object.entries(TYPES)) models[n].types = t;

module.exports = { models, equip, cards, list };
