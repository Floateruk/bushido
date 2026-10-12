/* 40 Japanese-themed terrain pieces for the table, eight per theme.
   Traits follow the rulebook (p.74-76): [Passage, Visibility, Size]. No piece is larger than a playing card (3.5" x 2.5").
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
  T("onryo-well", "Onryō's Well", "horror", "Impassable", "Blocking", "Small", "ellipse", 1.5, 1.5, "A dry well; something pale climbs out at night."),
  T("spirit-fog", "Spirit Fog", "horror", "Normal", "Obscuring", "Huge", "ellipse", 3.5, 2.5, "A column of cold mist where the dead whisper."),
  T("graveyard", "Abandoned Graves", "horror", "Difficult", "Obscuring", "Small", "rect", 3.5, 2.5, "Leaning gravestones and broken offerings."),
  T("hanging-tree", "Hanging Tree", "horror", "Impassable", "Blocking", "Large", "ellipse", 2, 2, "A dead tree with frayed ropes."),
  T("corpse-pit", "Corpse Pit", "horror", "Difficult", "Clear", "Zero", "ellipse", 3, 2.5, "Shallow pit of bones and mud."),
  T("burnt-shrine", "Burnt-out Shrine", "horror", "Impassable", "Blocking", "Large", "rect", 3, 2.5, "Charred timbers of a wayside shrine."),
  T("cursed-stones", "Cursed Stones", "horror", "Difficult", "Obscuring", "Medium", "ellipse", 2.5, 2.5, "Menhirs wrapped in rotting shimenawa rope."),
  T("blood-pond", "Blood Pond", "horror", "Difficult", "Clear", "Zero", "ellipse", 3.5, 2.5, "Chi-no-ike: water stained red."),
  /* Mountain temple */
  T("honden", "Shrine Hall", "temple", "Impassable", "Blocking", "Huge", "rect", 3.5, 2.5, "A small hall with a steep roof."),
  T("rocky-outcrop", "Rocky Outcrop", "temple", "Normal", "Enhancing", "Medium", "ellipse", 3.5, 2.5, "Raised ground: high ground for melee and sight."),
  T("cliff-face", "Rock Spur", "temple", "Impassable", "Blocking", "Huge", "rect", 3.5, 1.5, "A tall blade of mountain rock."),
  T("lantern-row", "Stone Lanterns", "temple", "Impassable", "Blocking", "Small", "rect", 3, 0.75, "Tōrō lanterns lining the approach."),
  T("bell-tower", "Bell Tower", "temple", "Impassable", "Blocking", "Huge", "rect", 2.5, 2.5, "Shōrō housing the temple bell."),
  T("gravel-garden", "Raked Gravel Garden", "temple", "Difficult", "Clear", "Zero", "rect", 3.5, 2.5, "Karesansui: careful steps only."),
  T("ridge-pine", "Gnarled Pine", "temple", "Impassable", "Blocking", "Large", "ellipse", 2, 2, "Old pine clinging to the rock."),
  T("mountain-stream", "Mountain Stream", "temple", "Difficult", "Clear", "Zero", "rect", 3.5, 1.25, "Fast, cold water over stones."),
  /* Village */
  T("minka", "Farmhouse", "village", "Impassable", "Blocking", "Huge", "rect", 3.5, 2.5, "Thatched minka."),
  T("rice-paddy", "Rice Paddy", "village", "Difficult", "Clear", "Zero", "rect", 3.5, 2.5, "Flooded field; mud to the knee."),
  T("kura", "Storehouse", "village", "Impassable", "Blocking", "Large", "rect", 2.5, 2, "Plastered kura with a heavy door."),
  T("bamboo-fence", "Bamboo Fence", "village", "Impassable", "Blocking", "Tiny", "rect", 3.5, 0.5, "Low fence: sight passes over it."),
  T("rice-bales", "Stacked Rice Bales", "village", "Impassable", "Blocking", "Medium", "rect", 2, 1.5, "The harvest, ready for the tax collector."),
  T("village-well", "Village Well", "village", "Impassable", "Blocking", "Small", "ellipse", 1.5, 1.5, "Stone well with a wooden roof."),
  T("haystacks", "Haystacks", "village", "Difficult", "Obscuring", "Medium", "ellipse", 2.5, 2, "Drying straw piled high."),
  T("dirt-road", "Dirt Road", "village", "Ideal", "Clear", "Zero", "rect", 3.5, 1.5, "Ideal: +2\" when a move crosses it."),
  /* Bamboo forest */
  T("dense-bamboo", "Dense Bamboo", "bamboo", "Impassable", "Blocking", "Huge", "ellipse", 2.5, 2.5, "Too thick to push through."),
  T("bamboo-thicket", "Bamboo Thicket", "bamboo", "Difficult", "Obscuring", "Huge", "ellipse", 3.5, 2.5, "Sparse stalks; slow going."),
  T("bamboo-copse", "Bamboo Copse", "bamboo", "Difficult", "Obscuring", "Large", "ellipse", 2.5, 2.5, "A small stand of bamboo."),
  T("fallen-bamboo", "Fallen Bamboo", "bamboo", "Difficult", "Blocking", "Tiny", "rect", 3.5, 1, "Toppled stalks across the ground."),
  T("forest-path", "Forest Path", "bamboo", "Ideal", "Clear", "Zero", "rect", 3.5, 1.25, "A trodden trail through the grove."),
  T("jungle-stream", "Sluggish Stream", "bamboo", "Difficult", "Clear", "Zero", "rect", 3.5, 1.5, "Muddy water and leeches."),
  T("mossy-boulder", "Mossy Boulder", "bamboo", "Impassable", "Blocking", "Medium", "ellipse", 2, 2, "Ancient stone under green moss."),
  T("elephant-grass", "Tall Grass", "bamboo", "Normal", "Obscuring", "Small", "ellipse", 3, 2.5, "Grass that hides a crouching warrior."),
  /* Feudal Japan */
  T("castle-wall", "Castle Wall", "feudal", "Impassable", "Blocking", "Huge", "rect", 3.5, 1.25, "Stone base and plastered wall."),
  T("yagura", "Watchtower", "feudal", "Impassable", "Blocking", "Huge", "rect", 2, 2, "Yagura overlooking the road."),
  T("low-wall", "Low Stone Wall", "feudal", "Difficult", "Blocking", "Tiny", "rect", 3.5, 0.75, "Knee-high wall: gives cover, sight passes over.", true),
  T("sakura", "Sakura Tree", "feudal", "Impassable", "Blocking", "Large", "ellipse", 2, 2, "Cherry blossom in full bloom."),
  T("tea-house", "Tea House", "feudal", "Impassable", "Blocking", "Large", "rect", 3, 2.5, "Single-storey tea house with paper screens."),
  T("wooden-bridge", "Wooden Bridge", "feudal", "Ideal", "Clear", "Zero", "rect", 3.5, 1.5, "Arched bridge: Ideal terrain."),
  T("koi-pond", "Koi Pond", "feudal", "Difficult", "Clear", "Zero", "ellipse", 3, 2.5, "Ornamental pond."),
  T("grassy-hill", "Grassy Knoll", "feudal", "Normal", "Enhancing", "Medium", "ellipse", 3.5, 2.5, "High ground: Reach in melee, sight over smaller things.")
];
