/* 40 Japanese-themed terrain pieces for the table, eight per theme.
   Traits follow the rulebook (p.74-76): [Passage, Visibility, Size]. No piece is larger than 9" x 9".
   shape: "rect" or "ellipse", w x h in inches. restricted = can't be placed in zones, deployment zones or
   within 3" of an objective (Impassable pieces, and walls models can't end a move on). */
const TERRAIN_THEMES = {
  horror: "Haunted & horror",
  temple: "Mountain temple",
  village: "Village",
  bamboo: "Bamboo forest",
  feudal: "Feudal Japan"
};
const T = (id, name, theme, passage, visibility, size, shape, w, h, note, restricted) =>
  ({ id, name, theme, passage, visibility, size, shape, w, h, note, restricted: restricted ?? passage === "Impassable" });

const TERRAIN = [
  /* Haunted & horror */
  T("onryo-well", "Onryō's Well", "horror", "Impassable", "Blocking", "Small", "ellipse", 2, 2, "A dry well; something pale climbs out at night."),
  T("spirit-fog", "Spirit Fog Bank", "horror", "Normal", "Obscuring", "Huge", "ellipse", 7, 5, "Cold mist where the dead whisper."),
  T("graveyard", "Abandoned Graveyard", "horror", "Difficult", "Obscuring", "Small", "rect", 6, 4, "Leaning gravestones and broken offerings."),
  T("hanging-tree", "Hanging Tree", "horror", "Impassable", "Blocking", "Large", "ellipse", 2.5, 2.5, "A dead tree with frayed ropes."),
  T("corpse-pit", "Corpse Pit", "horror", "Difficult", "Clear", "Zero", "ellipse", 4, 3, "Shallow pit of bones and mud."),
  T("burnt-shrine", "Burnt-out Shrine", "horror", "Impassable", "Blocking", "Huge", "rect", 5, 4, "Charred timbers of a shrine no one rebuilt."),
  T("cursed-stones", "Cursed Stone Circle", "horror", "Difficult", "Obscuring", "Medium", "ellipse", 4, 4, "Menhirs wrapped in rotting shimenawa rope."),
  T("blood-pond", "Blood Pond", "horror", "Difficult", "Clear", "Zero", "ellipse", 5, 3.5, "Chi-no-ike: water stained red."),
  /* Mountain temple */
  T("honden", "Mountain Shrine Hall", "temple", "Impassable", "Blocking", "Huge", "rect", 6, 5, "The main hall of the mountain temple."),
  T("rocky-outcrop", "Rocky Outcrop", "temple", "Normal", "Enhancing", "Large", "ellipse", 6, 4, "Raised ground: high ground for melee and sight."),
  T("cliff-face", "Cliff Face", "temple", "Impassable", "Blocking", "Huge", "rect", 8, 2.5, "Sheer rock wall."),
  T("lantern-row", "Stone Lantern Row", "temple", "Impassable", "Blocking", "Small", "rect", 4, 1, "Tōrō lanterns lining the approach."),
  T("bell-tower", "Bell Tower", "temple", "Impassable", "Blocking", "Huge", "rect", 4, 4, "Shōrō housing the great temple bell."),
  T("gravel-garden", "Raked Gravel Garden", "temple", "Difficult", "Clear", "Zero", "rect", 6, 4, "Karesansui: careful steps only."),
  T("ridge-pine", "Gnarled Ridge Pine", "temple", "Impassable", "Blocking", "Large", "ellipse", 2.5, 2.5, "Old pine clinging to the rock."),
  T("mountain-stream", "Mountain Stream", "temple", "Difficult", "Clear", "Zero", "rect", 9, 1.5, "Fast, cold water over stones."),
  /* Village */
  T("minka", "Farmhouse", "village", "Impassable", "Blocking", "Huge", "rect", 6, 4, "Thatched minka."),
  T("rice-paddy", "Rice Paddy", "village", "Difficult", "Clear", "Zero", "rect", 6, 5, "Flooded field; mud to the knee."),
  T("kura", "Storehouse", "village", "Impassable", "Blocking", "Huge", "rect", 4, 3, "Plastered kura with a heavy door."),
  T("bamboo-fence", "Bamboo Fence", "village", "Impassable", "Blocking", "Tiny", "rect", 6, 0.5, "Low fence: sight passes over it."),
  T("rice-bales", "Stacked Rice Bales", "village", "Impassable", "Blocking", "Medium", "rect", 2, 1.5, "The harvest, ready for the tax collector."),
  T("village-well", "Village Well", "village", "Impassable", "Blocking", "Small", "ellipse", 1.5, 1.5, "Stone well with a wooden roof."),
  T("haystacks", "Haystacks", "village", "Difficult", "Obscuring", "Medium", "ellipse", 3, 2, "Drying straw piled high."),
  T("dirt-road", "Dirt Road", "village", "Ideal", "Clear", "Zero", "rect", 9, 2, "Ideal: +2\" when a move crosses it."),
  /* Bamboo forest */
  T("dense-bamboo", "Dense Bamboo Grove", "bamboo", "Impassable", "Blocking", "Huge", "ellipse", 5, 4, "Too thick to push through."),
  T("bamboo-thicket", "Bamboo Thicket", "bamboo", "Difficult", "Obscuring", "Huge", "ellipse", 6, 5, "Sparse stalks; slow going."),
  T("bamboo-copse", "Bamboo Copse", "bamboo", "Difficult", "Obscuring", "Large", "ellipse", 4, 4, "A small stand of bamboo."),
  T("fallen-bamboo", "Fallen Bamboo", "bamboo", "Difficult", "Blocking", "Tiny", "rect", 5, 1, "Toppled stalks across the ground."),
  T("forest-path", "Forest Path", "bamboo", "Ideal", "Clear", "Zero", "rect", 8, 1.5, "A trodden trail through the grove."),
  T("jungle-stream", "Sluggish Stream", "bamboo", "Difficult", "Clear", "Zero", "rect", 9, 1.5, "Muddy water and leeches."),
  T("mossy-boulder", "Moss-covered Boulder", "bamboo", "Impassable", "Blocking", "Large", "ellipse", 2.5, 2.5, "Ancient stone under green moss."),
  T("elephant-grass", "Elephant Grass", "bamboo", "Normal", "Obscuring", "Small", "ellipse", 4, 3, "Tall grass that hides a crouching warrior."),
  /* Feudal Japan */
  T("castle-wall", "Castle Wall Section", "feudal", "Impassable", "Blocking", "Huge", "rect", 8, 1.5, "Stone base and plastered wall."),
  T("yagura", "Watchtower", "feudal", "Impassable", "Blocking", "Huge", "rect", 3, 3, "Yagura overlooking the road."),
  T("low-wall", "Low Stone Wall", "feudal", "Difficult", "Blocking", "Tiny", "rect", 6, 0.75, "Knee-high wall: gives cover, sight passes over.", true),
  T("sakura", "Sakura Tree", "feudal", "Impassable", "Blocking", "Large", "ellipse", 2.5, 2.5, "Cherry blossom in full bloom."),
  T("tea-house", "Tea House", "feudal", "Impassable", "Blocking", "Huge", "rect", 5, 4, "Wooden tea house with paper screens."),
  T("wooden-bridge", "Wooden Bridge", "feudal", "Ideal", "Clear", "Zero", "rect", 6, 2, "Arched bridge: Ideal terrain."),
  T("koi-pond", "Koi Pond", "feudal", "Difficult", "Clear", "Zero", "ellipse", 5, 3, "Ornamental pond."),
  T("grassy-hill", "Grassy Hill", "feudal", "Normal", "Enhancing", "Large", "ellipse", 7, 5, "High ground: Reach in melee, sight over smaller things.")
];
