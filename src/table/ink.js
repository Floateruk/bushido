/* Sumi-e (ink wash) drawing for the table board: rice paper, brushed terrain pictures, ensō objectives.
   Terrain is drawn in the piece's own frame (u along its width, v along its height, centred on 0,0), then
   placed with translate + rotate, so the picture turns with the piece. Strokes are seeded by the piece id,
   so a piece looks the same on every redraw. */
const INK_KIND = {
  "honden": "building", "minka": "building", "kura": "building", "tea-house": "building", "burnt-shrine": "burnt",
  "bell-tower": "tower", "yagura": "tower", "castle-wall": "castle", "cliff-face": "cliff", "lantern-row": "lanterns",
  "bamboo-fence": "fence", "low-wall": "lowwall", "fallen-bamboo": "fallen", "rice-bales": "bales",
  "onryo-well": "well", "village-well": "well", "ridge-pine": "pine", "sakura": "sakura", "hanging-tree": "deadtree",
  "mossy-boulder": "boulder", "dense-bamboo": "bamboo", "bamboo-thicket": "bamboo", "bamboo-copse": "bamboo",
  "elephant-grass": "grass", "mountain-stream": "stream", "jungle-stream": "stream", "koi-pond": "pond",
  "blood-pond": "pond", "rice-paddy": "paddy", "dirt-road": "road", "forest-path": "road", "wooden-bridge": "bridge",
  "grassy-hill": "hill", "rocky-outcrop": "hill", "spirit-fog": "fog", "graveyard": "graves", "corpse-pit": "pit",
  "cursed-stones": "stones", "gravel-garden": "gravel", "haystacks": "hay"
};
/* Pieces whose edge is soft (drawn as a broken line rather than a solid brush rim) */
const INK_SOFT = new Set(["fog", "bamboo", "grass", "hill", "stream", "pond", "paddy", "road", "pit", "gravel", "graves", "stones", "hay"]);

function inkRng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const f2 = n => (Math.round(n * 100) / 100).toString();
/* A tapered brush stroke from (x1,y1) to (x2,y2): w is the width at the middle, bend curves it sideways */
function brush(x1, y1, x2, y2, w, bend = 0) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return `M${f2(x1)} ${f2(y1)}Q${f2(mx + nx * (bend + w))} ${f2(my + ny * (bend + w))} ${f2(x2)} ${f2(y2)}Q${f2(mx + nx * (bend - w))} ${f2(my + ny * (bend - w))} ${f2(x1)} ${f2(y1)}Z`;
}
/* A brushed ring (ensō-like): a thick-to-thin stroke round a circle, leaving a small gap */
function ensoPath(cx, cy, r, w, start = -60, sweep = 320, ry = r) {
  const N = 36, outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = (start + t * sweep) * Math.PI / 180, ww = w * (0.25 + 0.75 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.5));
    outer.push(`${f2(cx + Math.cos(a) * (r + ww / 2))} ${f2(cy + Math.sin(a) * (ry + ww / 2))}`);
    inner.unshift(`${f2(cx + Math.cos(a) * (r - ww / 2))} ${f2(cy + Math.sin(a) * (ry - ww / 2))}`);
  }
  return `M${outer.join("L")}L${inner.join("L")}Z`;
}

function inkDefs() {
  return `<defs>
    <filter id="inkEdge" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="2.4" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0.1" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="inkWash" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0.35" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="2" seed="11" result="m"/><feColorMatrix in="m" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.6 0 0 0 -0.15" result="ma"/><feComposite in="d" in2="ma" operator="arithmetic" k1="1" result="w"/><feGaussianBlur in="w" stdDeviation="0.04"/></filter>
  </defs>`;
}

/* The scroll mounting round the board, with a red seal in the corner */
function inkMount() {
  return `<path class="mount" fill-rule="evenodd" d="M-0.7 -0.7H24.7V24.7H-0.7Z M0 0V24H24V0Z"/>
    <rect x="-0.14" y="-0.14" width="24.28" height="24.28" class="mount-line"/>
    <g class="seal" transform="translate(24.12 24.12)"><rect width="0.5" height="0.5" rx="0.05"/><text x="0.25" y="0.27">武</text></g>`;
}

/* Terrain art in the piece's own frame. Returns SVG markup. */
function inkTerrain(t, d, fill) {
  const kind = INK_KIND[d.id] || (d.visibility === "Clear" ? "pond" : "building");
  const R = inkRng(t.id + d.id), w = d.w / 2, h = d.h / 2, rnd = (a, b) => a + R() * (b - a);
  const ell = d.shape === "ellipse";
  const inside = (u, v, m = 0) => ell ? (u * u) / Math.pow(Math.max(0.05, w - m), 2) + (v * v) / Math.pow(Math.max(0.05, h - m), 2) <= 1
    : Math.abs(u) <= w - m && Math.abs(v) <= h - m;
  const scatter = (n, m = 0.2) => { const P = []; for (let k = 0; k < n * 20 && P.length < n; k++) { const u = rnd(-w, w), v = rnd(-h, h); if (inside(u, v, m)) P.push([u, v]); } return P; };
  const shape = cls => ell ? `<ellipse rx="${f2(w)}" ry="${f2(h)}" class="${cls}"/>` : `<rect x="${f2(-w)}" y="${f2(-h)}" width="${f2(2 * w)}" height="${f2(2 * h)}" class="${cls}"/>`;
  const long = w >= h;  /* draw linear motifs along the long side */
  const ink = [], fine = [], tint = [];  /* filled ink strokes, thin ink lines, coloured touches */
  const line = (x1, y1, x2, y2) => fine.push(`M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}`);
  const area = 4 * w * h;
  let washFill = fill, washOp = null;

  switch (kind) {
    case "building": case "burnt": {
      /* roof seen from above: a ridge along the long side with tiles brushed down to the eaves */
      const L = long ? w : h, S = long ? h : w, P = (a, b) => long ? [a, b] : [b, a];
      const [ax, ay] = P(-L * 0.78, 0), [bx, by] = P(L * 0.78, 0);
      ink.push(brush(ax, ay, bx, by, 0.16, 0));
      const n = Math.max(6, Math.round(L * 3.2));
      for (let i = 0; i <= n; i++) {
        const a = -L * 0.92 + (i / n) * L * 1.84;
        for (const s of [-1, 1]) {
          if (kind === "burnt" && R() < 0.35) continue;
          const [x1, y1] = P(a, s * 0.12), [x2, y2] = P(a + rnd(-0.05, 0.05), s * (S - 0.12));
          fine.push(`M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}`);
        }
      }
      for (const s of [-1, 1]) { const [x1, y1] = P(-L * 0.97, s * (S - 0.1)), [x2, y2] = P(L * 0.97, s * (S - 0.1)); ink.push(brush(x1, y1, x2, y2, 0.07, s * 0.04)); }
      if (kind === "burnt") for (const [u, v] of scatter(Math.round(area / 3), 0.3)) ink.push(brush(u, v, u + rnd(-0.6, 0.6), v + rnd(-0.6, 0.6), rnd(0.12, 0.3), rnd(-0.1, 0.1)));
      washOp = 0.5;
      break;
    }
    case "tower": {
      /* hipped roof: corners to a short ridge, layered eaves */
      ink.push(brush(-w * 0.2, 0, w * 0.2, 0, 0.14));
      for (const [cx, cy] of [[-w, -h], [w, -h], [w, h], [-w, h]]) ink.push(brush(cx * 0.95, cy * 0.95, Math.sign(cx) * w * 0.2, 0, 0.07));
      for (const k of [0.82, 0.55]) fine.push(`M${f2(-w * k)} ${f2(-h * k)}H${f2(w * k)}V${f2(h * k)}H${f2(-w * k)}Z`);
      if (d.id === "bell-tower") tint.push(`<circle r="${f2(Math.min(w, h) * 0.18)}" class="ink-dot"/>`);
      washOp = 0.5;
      break;
    }
    case "castle": {
      /* stone base: courses of blocks, a dark coping stroke along the top */
      const L = long ? w : h, S = long ? h : w, P = (a, b) => long ? [a, b] : [b, a];
      const rows = 3;
      for (let r = 1; r < rows; r++) { const b = -S + (2 * S * r) / rows, [x1, y1] = P(-L, b), [x2, y2] = P(L, b); line(x1, y1, x2, y2); }
      for (let r = 0; r < rows; r++) {
        let a = -L + (r % 2 ? 0.35 : 0);
        while (a < L) { const b1 = -S + (2 * S * r) / rows, b2 = b1 + (2 * S) / rows, [x1, y1] = P(a, b1), [x2, y2] = P(a, b2); line(x1, y1, x2, y2); a += rnd(0.6, 0.9); }
      }
      const [ax, ay] = P(-L * 0.98, -S * 0.75), [bx, by] = P(L * 0.98, -S * 0.75);
      ink.push(brush(ax, ay, bx, by, 0.2, rnd(-0.05, 0.05)));
      washOp = 0.45;
      break;
    }
    case "cliff": {
      /* jagged rock: heavy diagonal hatching (axe-cut strokes) */
      const L = long ? w : h, S = long ? h : w, P = (a, b) => long ? [a, b] : [b, a];
      for (let a = -L + 0.2; a < L; a += rnd(0.35, 0.6)) {
        const [x1, y1] = P(a, -S * 0.9), [x2, y2] = P(a + rnd(0.3, 0.7), S * rnd(0.1, 0.9));
        ink.push(brush(x1, y1, x2, y2, rnd(0.08, 0.2), rnd(-0.1, 0.1)));
      }
      const [ax, ay] = P(-L, -S * 0.9), [bx, by] = P(L, -S * 0.9);
      ink.push(brush(ax, ay, bx, by, 0.22));
      washOp = 0.55;
      break;
    }
    case "lanterns": {
      const L = long ? w : h, P = (a, b) => long ? [a, b] : [b, a], n = Math.max(3, Math.round(L * 1.2));
      for (let i = 0; i < n; i++) {
        const [cx, cy] = P(-L + (2 * L) * (i + 0.5) / n, 0), s = 0.32;
        fine.push(`M${f2(cx - s)} ${f2(cy - s)}H${f2(cx + s)}V${f2(cy + s)}H${f2(cx - s)}Z`);
        tint.push(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="0.13" class="ink-dot"/>`);
      }
      washOp = 0.2;
      break;
    }
    case "fence": case "fallen": {
      const L = long ? w : h, S = long ? h : w, P = (a, b) => long ? [a, b] : [b, a];
      if (kind === "fence") {
        for (const b of [-S * 0.4, S * 0.4]) { const [x1, y1] = P(-L, b), [x2, y2] = P(L, b); line(x1, y1, x2, y2); }
        for (let a = -L + 0.1; a < L; a += 0.28) { const [x1, y1] = P(a, -S * 0.9), [x2, y2] = P(a, S * 0.9); ink.push(brush(x1, y1, x2, y2, 0.06)); }
      } else {
        for (let k = 0; k < 4; k++) {
          const b = rnd(-S * 0.6, S * 0.6), [x1, y1] = P(-L * rnd(0.7, 0.98), b), [x2, y2] = P(L * rnd(0.7, 0.98), b + rnd(-0.3, 0.3));
          ink.push(brush(x1, y1, x2, y2, 0.09, rnd(-0.08, 0.08)));
          for (let a = -L * 0.6; a < L * 0.7; a += rnd(0.7, 1.1)) { const t = (a + L) / (2 * L), x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t, [ox, oy] = P(0, 0.12); line(x - ox, y - oy, x + ox, y + oy); }
        }
      }
      washOp = 0.15;
      break;
    }
    case "lowwall": case "bales": {
      const L = long ? w : h, S = long ? h : w, P = (a, b) => long ? [a, b] : [b, a];
      const sz = kind === "bales" ? Math.min(S * 0.9, 0.5) : S * 0.8;
      for (let a = -L + sz; a <= L - sz * 0.8; a += sz * (kind === "bales" ? 2 : 1.6)) {
        for (const b of kind === "bales" && S > 0.6 ? [-S / 2, S / 2] : [0]) {
          const [cx, cy] = P(a, b);
          fine.push(`M${f2(cx - sz * 0.9)} ${f2(cy)}a${f2(sz * 0.9)} ${f2(sz * 0.7)} ${f2(rnd(-20, 20))} 1 0 ${f2(sz * 1.8)} 0a${f2(sz * 0.9)} ${f2(sz * 0.7)} 0 1 0 ${f2(-sz * 1.8)} 0`);
          if (kind === "bales") { const [ox, oy] = P(0, sz * 0.7); line(cx - ox, cy - oy, cx + ox, cy + oy); }
        }
      }
      washOp = 0.3;
      break;
    }
    case "well": {
      const r = Math.min(w, h);
      ink.push(ensoPath(0, 0, r * 0.72, r * 0.32, rnd(0, 360), 340));
      tint.push(`<circle r="${f2(r * 0.42)}" class="ink-deep"/>`);
      ink.push(brush(-r * 0.95, -r * 0.2, r * 0.95, -r * 0.2, 0.05), brush(-r * 0.95, r * 0.2, r * 0.95, r * 0.2, 0.05));
      washOp = 0.25;
      break;
    }
    case "pine": case "deadtree": case "sakura": {
      const r = Math.min(w, h);
      /* trunk and branches seen from above, radiating from the centre */
      const nb = kind === "deadtree" ? 7 : 5;
      for (let i = 0; i < nb; i++) {
        const a = (i / nb) * Math.PI * 2 + rnd(-0.3, 0.3), L = r * rnd(0.6, 0.95);
        ink.push(brush(0, 0, Math.cos(a) * L, Math.sin(a) * L, kind === "deadtree" ? 0.1 : 0.07, rnd(-0.15, 0.15)));
        if (kind === "deadtree") { const m = L * 0.6, b = a + rnd(0.4, 0.8) * (R() < 0.5 ? -1 : 1); ink.push(brush(Math.cos(a) * m, Math.sin(a) * m, Math.cos(a) * m + Math.cos(b) * r * 0.35, Math.sin(a) * m + Math.sin(b) * r * 0.35, 0.05)); }
        if (kind === "deadtree" && i % 2) { const x = Math.cos(a) * L * 0.8, y = Math.sin(a) * L * 0.8; tint.push(`<path d="M${f2(x)} ${f2(y)}l0.06 0.22" class="rope"/>`); }
        if (kind === "pine") for (const k of [0.55, 0.85]) {
          const cx = Math.cos(a) * L * k, cy = Math.sin(a) * L * k;
          for (let j = -3; j <= 3; j++) { const b = a + j * 0.32; line(cx, cy, cx + Math.cos(b) * 0.38, cy + Math.sin(b) * 0.38); }
        }
      }
      ink.push(`M0 0m-0.16 0a0.16 0.16 0 1 0 0.32 0a0.16 0.16 0 1 0 -0.32 0`);
      if (kind === "sakura") for (const [u, v] of scatter(Math.round(area * 4.5), 0.1)) tint.push(`<circle cx="${f2(u)}" cy="${f2(v)}" r="${f2(rnd(0.05, 0.12))}" class="petal"/>`);
      washOp = kind === "sakura" ? 0.22 : 0.3;
      if (kind === "sakura") washFill = "var(--petal)";
      break;
    }
    case "boulder": {
      const r = Math.min(w, h);
      for (let i = 0; i < 4; i++) { const a = rnd(0, Math.PI * 2); ink.push(brush(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2, Math.cos(a + 0.6) * r * 0.85, Math.sin(a + 0.6) * r * 0.85, 0.07, 0.1)); }
      ink.push(ensoPath(0, 0, r * 0.88, 0.16, rnd(0, 360), 200));
      for (const [u, v] of scatter(14, 0.25)) tint.push(`<circle cx="${f2(u)}" cy="${f2(v)}" r="0.06" class="moss"/>`);
      washOp = 0.45;
      break;
    }
    case "bamboo": case "grass": {
      const dense = d.id === "dense-bamboo" ? 1.6 : d.id === "bamboo-copse" ? 1.1 : kind === "grass" ? 2.6 : 0.8;
      if (kind === "bamboo") for (const [u, v] of scatter(Math.round(area * 0.6 * dense), 0.25)) fine.push(`M${f2(u - 0.07)} ${f2(v)}a0.07 0.07 0 1 0 0.14 0a0.07 0.07 0 1 0 -0.14 0`);
      for (const [u, v] of scatter(Math.round(area * 0.9 * dense), 0.3)) {
        if (kind === "grass") { const a = rnd(-2.2, -0.9), L = rnd(0.5, 0.9); ink.push(brush(u, v, u + Math.cos(a) * L, v + Math.sin(a) * L, 0.025, rnd(-0.12, 0.12))); continue; }
        /* sumi-e bamboo leaves: three or four tapered strokes fanning from one point */
        const base = rnd(0, Math.PI * 2), k = R() < 0.5 ? 3 : 4;
        for (let j = 0; j < k; j++) { const a = base + (j - (k - 1) / 2) * 0.5, L = rnd(0.35, 0.6); ink.push(brush(u, v, u + Math.cos(a) * L, v + Math.sin(a) * L, rnd(0.06, 0.09), rnd(-0.04, 0.04))); }
      }
      washOp = d.id === "dense-bamboo" ? 0.45 : 0.3;
      break;
    }
    case "stream": case "pond": case "paddy": {
      if (d.id === "blood-pond") washFill = "var(--shu)";
      const L = long ? w : h, S = long ? h : w, P = (a, b) => long ? [a, b] : [b, a];
      if (kind === "paddy") {
        for (let b = -S + 0.45; b < S; b += 0.6) { const [x1, y1] = P(-L + 0.2, b), [x2, y2] = P(L - 0.2, b); line(x1, y1, x2, y2);
          for (let a = -L + 0.4; a < L - 0.2; a += 0.45) { const [x, y] = P(a, b); ink.push(brush(x, y, x + rnd(-0.08, 0.08), y - 0.16, 0.02)); } }
        washOp = 0.32;
        break;
      }
      /* ripples: short wave strokes along the flow */
      for (const [u, v] of scatter(Math.round(area * (kind === "stream" ? 1.4 : 0.9)), 0.25)) {
        const [dx, dy] = P(0.32, 0), [nx, ny] = P(0, -0.08);
        fine.push(`M${f2(u - dx)} ${f2(v - dy)}q${f2(dx / 2 + nx)} ${f2(dy / 2 + ny)} ${f2(dx)} ${f2(dy)}t${f2(dx)} ${f2(dy)}`);
      }
      if (d.id === "koi-pond") for (let i = 0; i < 3; i++) { const [u, v] = scatter(1, 0.6)[0] || [0, 0], a = rnd(0, 6.28); tint.push(`<path d="${brush(u, v, u + Math.cos(a) * 0.45, v + Math.sin(a) * 0.45, 0.13, 0.05)}" class="${i ? "koi" : "koi w"}"/>`); }
      if (kind === "stream") for (let i = 0; i < Math.round(L); i++) { const [u, v] = scatter(1, 0.15)[0] || [0, 0]; fine.push(`M${f2(u - 0.12)} ${f2(v)}a0.12 0.09 0 1 0 0.24 0a0.12 0.09 0 1 0 -0.24 0`); }
      washOp = d.id === "blood-pond" ? 0.42 : 0.38;
      break;
    }
    case "road": case "bridge": {
      const L = long ? w : h, S = long ? h : w, P = (a, b) => long ? [a, b] : [b, a];
      if (kind === "bridge") {
        for (let a = -L + 0.2; a < L; a += 0.3) { const [x1, y1] = P(a, -S * 0.8), [x2, y2] = P(a, S * 0.8); line(x1, y1, x2, y2); }
        for (const b of [-S * 0.88, S * 0.88]) { const [x1, y1] = P(-L * 0.98, b), [x2, y2] = P(L * 0.98, b); ink.push(brush(x1, y1, x2, y2, 0.1, b > 0 ? -0.12 : 0.12)); }
        tint.push(`<circle cx="${f2(P(-L * 0.98, -S * 0.88)[0])}" cy="${f2(P(-L * 0.98, -S * 0.88)[1])}" r="0.1" class="shu-dot"/><circle cx="${f2(P(L * 0.98, S * 0.88)[0])}" cy="${f2(P(L * 0.98, S * 0.88)[1])}" r="0.1" class="shu-dot"/>`);
        washOp = 0.35;
      } else {
        for (const b of [-S * 0.85, S * 0.85]) for (let a = -L; a < L; a += rnd(0.5, 0.9)) { const [x1, y1] = P(a, b), [x2, y2] = P(Math.min(L, a + rnd(0.3, 0.6)), b + rnd(-0.06, 0.06)); line(x1, y1, x2, y2); }
        for (const [u, v] of scatter(Math.round(area * 0.8), 0.25)) tint.push(`<circle cx="${f2(u)}" cy="${f2(v)}" r="${f2(rnd(0.03, 0.06))}" class="ink-dot"/>`);
        washOp = 0.28;
      }
      break;
    }
    case "hill": {
      /* contour strokes, broken like a quick sketch */
      for (const k of [0.8, 0.55, 0.3]) ink.push(ensoPath(0, 0, w * k, 0.09, rnd(0, 360), rnd(230, 300), h * k));
      if (d.id === "rocky-outcrop") for (const [u, v] of scatter(6, 0.6)) ink.push(brush(u, v, u + rnd(-0.5, 0.5), v + rnd(-0.5, 0.5), 0.07));
      else for (const [u, v] of scatter(Math.round(area * 0.35), 0.4)) ink.push(brush(u, v, u + rnd(-0.1, 0.1), v - 0.22, 0.025));
      washOp = 0.32;
      break;
    }
    case "fog": {
      for (const [u, v] of scatter(Math.round(area / 3.5), 0.8)) { const r = rnd(0.3, 0.55); fine.push(`M${f2(u + r)} ${f2(v)}a${f2(r)} ${f2(r)} 0 1 1 ${f2(-r * 0.8)} ${f2(-r * 0.6)}a${f2(r * 0.5)} ${f2(r * 0.5)} 0 1 1 ${f2(r * 0.3)} ${f2(r * 0.6)}`); }
      washOp = 0.18;
      break;
    }
    case "graves": {
      for (const [u, v] of scatter(Math.round(area / 1.6), 0.35)) { const a = rnd(-25, 25); tint.push(`<rect x="${f2(u - 0.17)}" y="${f2(v - 0.1)}" width="0.34" height="0.2" transform="rotate(${f2(a)} ${f2(u)} ${f2(v)})" class="ink-deep"/>`); }
      for (const [u, v] of scatter(5, 0.3)) ink.push(brush(u, v, u + rnd(-0.1, 0.1), v - 0.5, 0.035));
      washOp = 0.25;
      break;
    }
    case "pit": {
      for (const [u, v] of scatter(Math.round(area * 1.2), 0.35)) { const a = rnd(0, 6.28); ink.push(brush(u, v, u + Math.cos(a) * 0.3, v + Math.sin(a) * 0.3, 0.035)); tint.push(`<circle cx="${f2(u)}" cy="${f2(v)}" r="0.05" class="ink-dot"/>`); }
      washOp = 0.4;
      break;
    }
    case "stones": {
      const n = 7;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = Math.cos(a) * w * 0.7, y = Math.sin(a) * h * 0.7; tint.push(`<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="0.32" ry="0.22" transform="rotate(${f2(a * 57.3)} ${f2(x)} ${f2(y)})" class="ink-deep"/>`); }
      fine.push(`M${f2(w * 0.7)} 0a${f2(w * 0.7)} ${f2(h * 0.7)} 0 1 0 ${f2(-w * 1.4)} 0a${f2(w * 0.7)} ${f2(h * 0.7)} 0 1 0 ${f2(w * 1.4)} 0`);
      for (let i = 0; i < n; i++) { const a = ((i + 0.5) / n) * Math.PI * 2, x = Math.cos(a) * w * 0.7, y = Math.sin(a) * h * 0.7; tint.push(`<path d="M${f2(x)} ${f2(y)}l0.05 0.25l-0.1 0.05" class="rope"/>`); }
      washOp = 0.22;
      break;
    }
    case "gravel": {
      const rx = rnd(-w * 0.4, w * 0.4), ry = rnd(-h * 0.3, h * 0.3);
      for (const k of [0.45, 0.7, 0.95]) fine.push(`M${f2(rx + k)} ${f2(ry)}a${f2(k)} ${f2(k * 0.8)} 0 1 0 ${f2(-2 * k)} 0a${f2(k)} ${f2(k * 0.8)} 0 1 0 ${f2(2 * k)} 0`);
      for (let b = -h + 0.25; b < h; b += 0.25) { let a = -w; const segs = []; while (a < w) { const a2 = Math.min(w, a + 0.3); const mid = (a + a2) / 2; if (Math.hypot((mid - rx) / 1.05, (b - ry) / 0.86) > 1) segs.push([a, a2]); a = a2; } for (const [a1, a2] of segs) line(a1, b, a2, b); }
      tint.push(`<ellipse cx="${f2(rx)}" cy="${f2(ry)}" rx="0.32" ry="0.24" class="ink-deep"/>`);
      washOp = 0.12;
      break;
    }
    case "hay": {
      for (const [u, v] of [[-w * 0.45, -h * 0.2], [w * 0.4, h * 0.25], [w * 0.05, -h * 0.05]]) {
        const r = Math.min(w, h) * 0.55;
        for (let j = 0; j < 12; j++) { const a = (j / 12) * Math.PI * 2; ink.push(brush(u, v, u + Math.cos(a) * r, v + Math.sin(a) * r, 0.03, 0.05)); }
        ink.push(`M${f2(u - 0.1)} ${f2(v)}a0.1 0.1 0 1 0 0.2 0a0.1 0.1 0 1 0 -0.2 0`);
      }
      washOp = 0.3;
      break;
    }
  }
  const op = washOp ?? 0.35;
  return `<g transform="translate(${f2(t.x)} ${f2(SY(t.y))}) rotate(${f2(t.rot)})">
    <g class="wash" filter="url(#inkWash)"><g fill="${washFill}" style="opacity:${op}">${shape("")}</g></g>
    <clipPath id="clip-${t.id}">${shape("")}</clipPath>
    <g clip-path="url(#clip-${t.id})" class="art">
      ${fine.length ? `<path d="${fine.join("")}" class="ink-fine"/>` : ""}
      ${ink.length ? `<path d="${ink.join("")}" class="ink-solid"/>` : ""}
      ${tint.join("")}
    </g>
    <g filter="url(#inkEdge)">${shape(INK_SOFT.has(kind) ? "rim soft" : "rim")}</g>
  </g>`;
}

/* An objective as a brushed ensō over a wash of its alignment colour */
function inkObjective(o, r, col, ang) {
  const R = inkRng(o.id || "o");
  return `<circle r="${f2(r * 0.92)}" fill="${col}" class="obj-wash"/>
    <path d="${ensoPath(0, 0, r * 0.9, Math.max(0.12, r * 0.3), R() * 360, 325)}" class="ink-solid"/>
    <path d="${brush(0, 0, 0, -r * 1.12, 0.07)}" transform="rotate(${ang})" class="ink-solid"/>`;
}
