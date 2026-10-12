/* Scenarios for the table. Positions are inches from the bottom-left corner of the 24" x 24" battlefield,
   with your side (Friendly, blue) along the bottom. Objectives are placed by their centre; zones are circles
   (centre + diameter), converted from the diagrams' edge measurements.
   Sources: Tournament & Scenario Pack V2510.1 (pp.12-28) and Bushido: Risen Sun rulebook R2 (pp.77-83). */
const CIRCLE_OBJ = [
  { x: 8, y: 6, align: "F" }, { x: 16, y: 6, align: "F" },
  { x: 6, y: 12, align: "N" }, { x: 18, y: 12, align: "N" },
  { x: 8, y: 18, align: "E" }, { x: 16, y: 18, align: "E" }
];
const CENTRE_OBJ = [{ x: 6, y: 12, align: "N" }, { x: 12, y: 12, align: "N" }, { x: 18, y: 12, align: "N" }];
const ROW_ZONES = [{ x: 5, y: 12, d: 4, align: "N" }, { x: 12, y: 12, d: 4, align: "N" }, { x: 19, y: 12, d: 4, align: "N" }];
const MOST_FRIENDLY = n => `Player with most Friendly objectives, End Phase turn ${n}`;
const MOST_SP = n => `Player with most SP, End Phase turn ${n}`;

const SCENARIOS = [
  { id: "depletion", name: "Depletion", source: "pack", level: "Basic", type: "Circle Objective",
    objectives: CIRCLE_OBJ, objSize: "choice", zones: [], vim: 0,
    length: "Variable (5)", interactions: ["Prayer (5) (Simple)"],
    victory: [MOST_SP(2), MOST_SP(3), "Player with most SP, End Phase last turn"],
    rules: ["Decreasing", "Reset Scenario Points (3,4)"] },
  { id: "sacred-idols", name: "Sacred Idols", source: "pack", level: "Basic", type: "Centre Objective (Small)",
    objectives: CENTRE_OBJ, objSize: "small", zones: [], vim: 0,
    length: "Fixed (6)", interactions: ["Influence (Simple)"],
    victory: [MOST_FRIENDLY(4), MOST_FRIENDLY(5), MOST_FRIENDLY(6)], rules: ["Decreasing"] },
  { id: "omaju", name: "Omaju", source: "pack", level: "Basic", type: "Centre Objective (Small)",
    objectives: CENTRE_OBJ, objSize: "small", zones: [], vim: 0,
    length: "Fixed (6)", interactions: ["Influence (Simple)"],
    victory: [MOST_FRIENDLY(2), MOST_FRIENDLY(4), MOST_FRIENDLY(6)], rules: ["Reset alignment (3,5)"],
    special: "The first Influence Action of the game (not per player) is Complex." },
  { id: "shin-keii", name: "Shin Keii", source: "pack", level: "Basic", type: "Circle Objective",
    objectives: CIRCLE_OBJ, objSize: "choice", zones: [], vim: 0,
    length: "Fixed (6)", interactions: ["Prayer (5) (Simple)"],
    victory: [MOST_SP(2), MOST_SP(4), MOST_SP(6)], rules: ["Reset Scenario Points (3,5)"] },
  { id: "ryodo", name: "Ryodo", source: "pack", level: "Basic", type: "Zone Control",
    objectives: [], zones: [{ x: 4, y: 16, d: 4, align: "E" }, { x: 12, y: 12, d: 4, align: "N" }, { x: 20, y: 8, d: 4, align: "F" }], vim: 0,
    length: "Fixed (6)", interactions: [], victory: [MOST_SP(2), MOST_SP(4), MOST_SP(6)], rules: ["Reset Scenario Points (3,5)"] },
  { id: "ryu-seikyuu", name: "Ryu-Seikyuu", source: "pack", level: "Basic", type: "Zone Control",
    objectives: [], zones: ROW_ZONES, vim: 0,
    length: "Fixed (6)", interactions: [], victory: [MOST_SP(2), MOST_SP(4), MOST_SP(6)], rules: ["Reset Scenario Points (2,4,6)"] },
  { id: "botoku", name: "Botokú", source: "pack", level: "Advanced", type: "Objectives & Zone Control",
    objectives: [{ x: 6, y: 6, align: "F" }, { x: 18, y: 18, align: "E" }], objSize: "choice",
    zones: [{ x: 12, y: 12, d: 4, align: "N" }], vim: 0,
    length: "Fixed (6)", interactions: ["Prayer (6) (Simple)"], victory: [MOST_SP(4), MOST_SP(5), MOST_SP(6)], rules: ["Decreasing"] },
  { id: "ichi-no-riten", name: "Ichi no Riten", source: "pack", level: "Advanced", type: "VIM & Zone Control",
    objectives: [], zones: [{ x: 7, y: 10, d: 8, align: "F" }, { x: 17, y: 14, d: 8, align: "E" }], vim: 1,
    length: "Variable (5)", interactions: [],
    victory: [MOST_SP(3), MOST_SP(5), "Player whose VIM is closest to the opponent's table edge, End Phase last turn"],
    rules: ["Reset Scenario Points (4)"] },
  { id: "muzukashi", name: "Muzukashí", source: "pack", level: "Advanced", type: "Circle Objective & VIM",
    objectives: CIRCLE_OBJ, objSize: "choice", zones: [], vim: 1,
    length: "Variable (5)", interactions: ["Influence (Simple)", "Prayer (5) (Simple)"],
    victory: [MOST_FRIENDLY(3), MOST_SP(5), "Player whose VIM is closest to a scenario objective, End Phase last turn"],
    rules: ["Decreasing"] },
  { id: "seigyo", name: "Seigyo", source: "pack", level: "Advanced", type: "Centre Objective (Small) & VIM",
    objectives: CENTRE_OBJ, objSize: "small", zones: [], vim: 1,
    length: "Variable (5)", interactions: ["Influence (Simple)"],
    victory: [MOST_FRIENDLY(3), MOST_FRIENDLY(5), "Player whose VIM is closest to the battlefield's central point, End Phase of the final turn"],
    rules: ["Decreasing"] },
  { id: "ninki", name: "Ninki", source: "pack", level: "Advanced", type: "Circle Objective",
    objectives: CIRCLE_OBJ, objSize: "choice", zones: [], vim: 0,
    length: "Fixed (6)", interactions: ["Influence (Simple)", "Prayer (5) (Simple)"],
    victory: [MOST_FRIENDLY(4), MOST_SP(5), MOST_SP(6)], rules: ["Reset Scenario Points (6)"] },
  { id: "osatsu", name: "Õsatsu", source: "pack", level: "Advanced", type: "Centre Objective (Small) & Zone Control",
    objectives: CENTRE_OBJ, objSize: "small",
    zones: [{ x: 6, y: 12, d: 8, align: "N", follows: 0 }, { x: 18, y: 12, d: 8, align: "N", follows: 2 }], vim: 0,
    length: "Fixed (6)", interactions: ["Influence (Complex)"], victory: [MOST_FRIENDLY(4), MOST_SP(5), MOST_SP(6)],
    rules: ["Reset Scenario Points (5,6)"],
    special: "The alignment of the zones changes to match the alignment of the objective at the centre of that zone." },
  /* Rulebook scenarios: deployment is fixed */
  { id: "keii", name: "Keii", source: "rulebook", level: null, type: "Scenario Objective",
    objectives: CIRCLE_OBJ, objSize: "small", zones: [], vim: 0, deployment: "baseline",
    length: "Fixed (6)", interactions: ["Prayer (5) (Simple)"], victory: [MOST_SP(2), MOST_SP(4), MOST_SP(6)], rules: ["Reset (3,5)"] },
  { id: "seikyu", name: "Seikyu", source: "rulebook", level: null, type: "Zone Control",
    objectives: [], zones: ROW_ZONES, vim: 0, deployment: "baseline",
    length: "Fixed (6)", interactions: [], victory: [MOST_SP(2), MOST_SP(4), MOST_SP(6)], rules: ["Reset (2,4,6)"] },
  { id: "idols", name: "Idols", source: "rulebook", level: null, type: "Scenario Objective",
    objectives: CENTRE_OBJ, objSize: "small", zones: [], vim: 0, deployment: "cornerSquare",
    length: "Fixed (6)", interactions: ["Influence (Simple)"], victory: [MOST_FRIENDLY(2), MOST_FRIENDLY(4), MOST_FRIENDLY(6)],
    rules: ["Decreasing Scorer"] }
];

/* Random tables from the pack (p.21) */
const SCENARIO_ROLLS = {
  Basic: ["depletion", "omaju", "sacred-idols", "shin-keii", "ryodo", "ryu-seikyuu"],
  Advanced: ["botoku", "ichi-no-riten", "muzukashi", "ninki", "osatsu", "seigyo"],
  Objective: ["depletion", "omaju", "sacred-idols", "shin-keii", "ninki", "osatsu"],
  Zone: ["ryodo", "ryu-seikyuu", "botoku"],
  VIM: ["ichi-no-riten", "muzukashi", "seigyo"]
};

/* Deployment types (pack p.17): zone areas for checks, edges where models deploy, and neutral (Flank) edges */
const DEPLOYMENTS = {
  baseline: { name: "Baseline", text: "Models are set up with their base touching your table edge.",
    neutral: [[0, 0, 0, 24], [24, 0, 24, 24]] },
  cornerSquare: { name: "Corner Square", text: "Models are set up completely within a 6\" square in your corner.",
    neutral: [[0, 12, 0, 24], [0, 24, 12, 24], [12, 0, 24, 0], [24, 0, 24, 12]] },
  cornerEdge: { name: "Corner Edge", text: "Models are set up touching a table edge within 8\" of your corner.",
    neutral: [[0, 12, 0, 24], [0, 24, 12, 24], [12, 0, 24, 0], [24, 0, 24, 12]] }
};
const OBJ_SIZE_MM = { small: 30, large: 50 };
const VIM_TYPES = ["Open", "Hidden", "Nominated"];
