/**
 * Day Mode artwork: "Late afternoon, river, a wanderer".
 *
 * Painted entirely by code (Canvas 2D, no image files, no photos, no stock art). It is the visual opposite of the
 * Night Mode painting and uses the same method: deterministic seeded randomness, layered washes, a painterly brush
 * pass that samples the underlying colours, a recursive tree and a lone wanderer on a riverbank.
 *
 * What makes it read as late afternoon:
 *  - the sun sits low and to the right, warm gold, with a bloom and faint crepuscular rays;
 *  - the sky runs from deep clear blue to peach at the horizon, with cumulus lit from the sun side and
 *    cool lavender on the shadow side (a small light-marching pass on a noise-based cloud field);
 *  - distant hills fade into warm haze (atmospheric perspective) and catch a rim of light on the sun side;
 *  - the river mirrors the sky and hills and carries a broken sun glitter;
 *  - every upright object (tree, reeds, wanderer) throws a long, soft shadow across the bank, away from the sun,
 *    and has a thin golden rim of light on its sunward edge.
 */

/** Deterministic PRNG (mulberry32), so the picture is identical on every visit. */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export function drawLateAfternoonPainting(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const rnd = mulberry32(1969);
  const rr = (a: number, b: number) => a + (b - a) * rnd();
  const k = W / 1000; // the scene is authored on a 1000 px square
  const w0 = 0.7 * H; // far shore / start of the river
  const w1 = 0.8 * H; // near bank / end of the river

  // Sun: low in the sky, to the right (the moon of the night picture sits upper left).
  const sx = 0.86 * W;
  const sy = 0.33 * H;

  // ---------- value noise + fractal noise (seeded) ----------
  const perm = new Uint8Array(512);
  const order = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = order[i & 255];
  const lattice = (ix: number, iy: number) => perm[perm[ix & 255] + (iy & 255)] / 255;
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = smooth(0, 1, x - xi);
    const v = smooth(0, 1, y - yi);
    const a = lattice(xi, yi);
    const b = lattice(xi + 1, yi);
    const c = lattice(xi, yi + 1);
    const d = lattice(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbm = (x: number, y: number) => {
    let s = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < 5; o++) {
      s += amp * noise(x * f, y * f);
      f *= 2.03;
      amp *= 0.5;
    }
    return s;
  };

  // ---------- 1. sky: deep blue overhead, peach at the horizon ----------
  const sky = ctx.createLinearGradient(0, 0, 0, w0);
  sky.addColorStop(0.0, 'rgb(52,98,168)');
  sky.addColorStop(0.28, 'rgb(98,148,205)');
  sky.addColorStop(0.55, 'rgb(172,190,214)');
  sky.addColorStop(0.8, 'rgb(246,208,160)');
  sky.addColorStop(1.0, 'rgb(250,190,128)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // ---------- 2. clouds: noise field, lit from the sun side (light-marching) ----------
  {
    const cw = Math.ceil(W / 2);
    const ch = Math.ceil((w0 + 4 * k) / 2);
    const off = document.createElement('canvas');
    off.width = cw;
    off.height = ch;
    const octx = off.getContext('2d');
    if (octx) {
      const img = octx.createImageData(cw, ch);
      const SHADOW: RGB = [118, 116, 150];
      const LIT: RGB = [255, 208, 150];
      const GLOW: RGB = [255, 238, 208];
      for (let py = 0; py < ch; py++) {
        for (let px = 0; px < cw; px++) {
          const x = px * 2;
          const y = py * 2;
          const nx = (x / W) * 3.1 + 7.3;
          const ny = (y / H) * 8.2;
          const warp = fbm(nx * 0.7 + 11, ny * 0.7) * 0.9;
          const d0 = fbm(nx + warp, ny);
          const cover = smooth(0.47, 0.7, d0);
          const band = smooth(0.03, 0.26, y / H) * (1 - 0.65 * smooth(0.4, 0.6, y / H));
          const a = cover * band;
          if (a <= 0.003) continue;
          // march toward the sun: if the neighbour toward the sun is thinner, this edge faces the light
          const dxs = ((sx - x) / W) * 3.1;
          const dys = ((sy - y) / H) * 8.2;
          const len = Math.hypot(dxs, dys) || 1;
          const dToward = fbm(nx + warp + (dxs / len) * 0.14, ny + (dys / len) * 0.14);
          const lit = clamp01(0.52 + (d0 - dToward) * 5.5);
          let col = mix(SHADOW, LIT, lit);
          const near = Math.exp(-(((x - sx) / (0.26 * W)) ** 2 + ((y - sy) / (0.3 * H)) ** 2));
          col = mix(col, GLOW, near * 0.75);
          const i = (py * cw + px) * 4;
          img.data[i] = col[0];
          img.data[i + 1] = col[1];
          img.data[i + 2] = col[2];
          img.data[i + 3] = Math.min(255, a * 235);
        }
      }
      octx.putImageData(img, 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(off, 0, 0, cw * 2, ch * 2);
      ctx.restore();
    }
  }

  // ---------- 3. sun bloom, crepuscular rays, sun disc ----------
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const bloom = ctx.createRadialGradient(sx, sy, 0, sx, sy, 430 * k);
  bloom.addColorStop(0, 'rgba(255,226,160,0.9)');
  bloom.addColorStop(0.12, 'rgba(255,205,125,0.55)');
  bloom.addColorStop(0.4, 'rgba(250,170,95,0.22)');
  bloom.addColorStop(1, 'rgba(250,170,95,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);
  // rays fan out from the sun and are cut by the horizon
  ctx.beginPath();
  ctx.rect(0, 0, W, w0 + 10 * k);
  ctx.clip();
  for (let i = 0; i < 34; i++) {
    const a = rr(Math.PI * 0.04, Math.PI * 0.96) + Math.PI * 0.02; // downward and sideways
    const spread = rr(0.012, 0.045);
    const reach = rr(380, 820) * k;
    const alpha = rr(0.025, 0.08);
    const x1 = sx + Math.cos(a - spread) * reach;
    const y1 = sy + Math.sin(a - spread) * reach;
    const x2 = sx + Math.cos(a + spread) * reach;
    const y2 = sy + Math.sin(a + spread) * reach;
    const rg = ctx.createRadialGradient(sx, sy, 20 * k, sx, sy, reach);
    rg.addColorStop(0, `rgba(255,224,160,${alpha})`);
    rg.addColorStop(1, 'rgba(255,224,160,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgb(255,243,205)';
  ctx.beginPath();
  ctx.arc(sx, sy, 27 * k, 0, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,236,0.9)';
  ctx.beginPath();
  ctx.arc(sx - 3 * k, sy - 3 * k, 15 * k, 0, 7);
  ctx.fill();

  // ---------- 4. hills: atmospheric perspective, light from the right ----------
  const hills: Array<{ hy: number; amp: number; col: RGB; seed: number }> = [
    { hy: 0.565, amp: 34, col: [190, 166, 186], seed: 1.3 },
    { hy: 0.598, amp: 30, col: [158, 154, 150], seed: 2.9 },
    { hy: 0.63, amp: 24, col: [118, 132, 96], seed: 4.4 },
    { hy: 0.662, amp: 18, col: [84, 100, 66], seed: 6.1 }
  ];
  const ridge = (hl: (typeof hills)[number], x: number) => {
    const t = (x / W) * 1000;
    return hl.hy * H - hl.amp * k * (0.5 + 0.5 * Math.sin(t / 120 + hl.seed)) * (0.6 + 0.4 * Math.sin(t / 37 + hl.hy * 9 + hl.seed));
  };
  hills.forEach((hl, li) => {
    const lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, css(mix(hl.col, [60, 70, 110], 0.28)));
    lg.addColorStop(0.5, css(hl.col));
    lg.addColorStop(0.88, css(mix(hl.col, [255, 214, 150], 0.34)));
    lg.addColorStop(1, css(mix(hl.col, [255, 220, 160], 0.4)));
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4 * k) ctx.lineTo(x, ridge(hl, x));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = lg;
    ctx.fill();
    // light catching the sunward ridge
    const rim = ctx.createLinearGradient(0, 0, W, 0);
    rim.addColorStop(0, 'rgba(255,214,150,0)');
    rim.addColorStop(0.55, 'rgba(255,214,150,0.15)');
    rim.addColorStop(1, 'rgba(255,226,170,0.7)');
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4 * k) (x === 0 ? ctx.moveTo(x, ridge(hl, x)) : ctx.lineTo(x, ridge(hl, x)));
    ctx.strokeStyle = rim;
    ctx.lineWidth = (1.1 + li * 0.3) * k;
    ctx.stroke();
    // haze between layers (further hills fade more)
    const haze = ctx.createLinearGradient(0, ridge(hl, W * 0.5) - 50 * k, 0, w0 + 4 * k);
    haze.addColorStop(0, 'rgba(255,214,160,0)');
    haze.addColorStop(1, `rgba(255,208,150,${0.3 - li * 0.06})`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, ridge(hl, W * 0.5) - 50 * k, W, w0 - ridge(hl, W * 0.5) + 54 * k);
  });

  // ---------- 5. river: mirrors sky and hills, with glitter ----------
  const water = ctx.createLinearGradient(0, w0, 0, w1);
  water.addColorStop(0, 'rgb(238,190,142)');
  water.addColorStop(0.35, 'rgb(150,160,160)');
  water.addColorStop(1, 'rgb(60,92,106)');
  ctx.fillStyle = water;
  ctx.fillRect(0, w0, W, w1 - w0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, w0, W, w1 - w0);
  ctx.clip();
  hills.forEach((hl, li) => {
    ctx.beginPath();
    ctx.moveTo(0, w0);
    for (let x = 0; x <= W; x += 4 * k) ctx.lineTo(x, w0 + (w0 - ridge(hl, x)) * 0.55);
    ctx.lineTo(W, w0);
    ctx.closePath();
    ctx.fillStyle = css(mix(hl.col, [70, 90, 110], 0.4), 0.22 + li * 0.04);
    ctx.fill();
  });
  // broad warm column of light, then broken glitter dashes
  const col = ctx.createLinearGradient(sx - 110 * k, 0, sx + 110 * k, 0);
  col.addColorStop(0, 'rgba(255,214,150,0)');
  col.addColorStop(0.5, 'rgba(255,224,165,0.55)');
  col.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = col;
  ctx.fillRect(sx - 110 * k, w0, 220 * k, w1 - w0);
  ctx.globalCompositeOperation = 'lighter';
  for (let y = w0; y < w1; y += 1.5 * k) {
    const t = (y - w0) / (w1 - w0);
    const half = (12 + t * 70) * k;
    const n = 2 + Math.floor(rr(0, 5));
    for (let i = 0; i < n; i++) {
      const dl = rr(5, 24) * k * (0.6 + t);
      const dx = sx + rr(-half, half) - dl / 2;
      ctx.fillStyle = `rgba(255,226,160,${(0.32 + 0.4 * (1 - t)) * rr(0.35, 1)})`;
      ctx.fillRect(dx, y, dl, Math.max(1, 1.3 * k));
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 300; i++) {
    const y = rr(w0, w1);
    const x = rr(0, W);
    const len = rr(18, 90) * k;
    ctx.strokeStyle = rnd() > 0.5 ? 'rgba(255,232,190,0.16)' : 'rgba(30,55,70,0.14)';
    ctx.lineWidth = Math.max(1, rr(0.8, 1.6) * k);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + rr(-0.6, 0.6) * k);
    ctx.stroke();
  }
  ctx.restore();

  // ---------- 6. near bank: warm, sunlit earth ----------
  const bank = ctx.createLinearGradient(0, w1, 0, H);
  bank.addColorStop(0, 'rgb(132,108,62)');
  bank.addColorStop(0.5, 'rgb(98,82,48)');
  bank.addColorStop(1, 'rgb(62,52,34)');
  ctx.fillStyle = bank;
  ctx.fillRect(0, w1, W, H - w1);
  const wash = ctx.createLinearGradient(0, 0, W, 0);
  wash.addColorStop(0, 'rgba(40,40,70,0.18)');
  wash.addColorStop(0.55, 'rgba(255,190,100,0)');
  wash.addColorStop(1, 'rgba(255,200,110,0.3)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, w1, W, H - w1);

  // ---------- 7. painterly brush pass (samples the colours painted so far) ----------
  const base = ctx.getImageData(0, 0, W, H).data;
  const sample = (x: number, y: number): RGB => {
    const xi = Math.min(W - 1, Math.max(0, x | 0));
    const yi = Math.min(H - 1, Math.max(0, y | 0));
    const i = (yi * W + xi) * 4;
    return [base[i], base[i + 1], base[i + 2]];
  };
  const N = Math.min(24000, Math.round(W * H * 0.045));
  ctx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const x = rr(0, W);
    const y = rr(0, H);
    let c = sample(x, y);
    c = [c[0] + rr(-12, 12), c[1] + rr(-12, 12), c[2] + rr(-12, 12)];
    let ang: number;
    let ln: number;
    let wd: number;
    if (y > w1) {
      ang = rr(-0.14, 0.14);
      ln = rr(9, 22) * k;
      wd = rr(2, 4) * k;
    } else if (y >= w0 - 4 * k) {
      ang = rr(-0.04, 0.04);
      ln = rr(16, 38) * k;
      wd = rr(2, 3.6) * k;
    } else if (y > 0.52 * H) {
      ang = rr(-0.1, 0.1);
      ln = rr(8, 18) * k;
      wd = rr(2, 3) * k;
    } else {
      ang = rr(-0.16, 0.16);
      ln = rr(12, 30) * k;
      wd = rr(2, 4.2) * k;
    }
    ctx.strokeStyle = css(c, 0.9);
    ctx.lineWidth = Math.max(1, wd);
    const dx = Math.cos(ang) * ln;
    const dy = Math.sin(ang) * ln;
    ctx.beginPath();
    ctx.moveTo(x - dx / 2, y - dy / 2);
    ctx.lineTo(x + dx / 2, y + dy / 2);
    ctx.stroke();
  }

  // far tree line on the opposite shore, warmed on the sunward side
  for (let x = 0; x < W; x += 5 * k) {
    const lightness = smooth(0.2, 1, x / W);
    ctx.strokeStyle = css(mix([44, 56, 42], [120, 112, 62], lightness * 0.6));
    ctx.lineWidth = rr(3, 6) * k;
    ctx.beginPath();
    ctx.moveTo(x, w0 + 1.5 * k);
    ctx.lineTo(x, w0 - rr(5, 17) * k);
    ctx.stroke();
  }

  // ---------- 8. tree geometry (recursive), then its long shadow, then the tree ----------
  type Seg = { x1: number; y1: number; x2: number; y2: number; wd: number };
  const segs: Seg[] = [];
  const tips: Array<[number, number]> = [];
  const treeBaseX = 0.8 * W;
  const treeBaseY = 0.88 * H;
  const grow = (x: number, y: number, ang: number, ln: number, wd: number, depth: number) => {
    if (depth === 0 || ln < 8 * k) {
      tips.push([x, y]);
      return;
    }
    const x2 = x + Math.cos(ang) * ln;
    const y2 = y + Math.sin(ang) * ln;
    segs.push({ x1: x, y1: y, x2, y2, wd });
    for (const s of [-1, 1]) grow(x2, y2, ang + s * rr(0.3, 0.6) + 0.05, ln * rr(0.62, 0.78), wd * 0.68, depth - 1);
    if (rnd() < 0.5) grow(x2, y2, ang + rr(-0.2, 0.2), ln * 0.7, wd * 0.7, depth - 1);
  };
  grow(treeBaseX, treeBaseY, -Math.PI / 2 + 0.05, 150 * k, 16 * k, 6);

  // shadows fall away from the sun (to the left) and slightly toward the viewer
  const SH_LEN = 1.75;
  const SH_DEPTH = 0.2;
  const project = (by: number, x: number, y: number): [number, number] => {
    const h = by - y;
    return [x - SH_LEN * h, by + SH_DEPTH * h];
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, w1, W, H - w1);
  ctx.clip();
  ctx.lineCap = 'round';
  for (const [widen, alpha] of [[2.2, 0.1], [1.3, 0.14], [0.8, 0.2]] as Array<[number, number]>) {
    ctx.strokeStyle = `rgba(38,28,52,${alpha})`;
    segs.forEach((s) => {
      const [a, b] = project(treeBaseY, s.x1, s.y1);
      const [c, d] = project(treeBaseY, s.x2, s.y2);
      ctx.lineWidth = Math.max(1.5 * k, s.wd * widen);
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo(c, d);
      ctx.stroke();
    });
  }
  tips.forEach((p) => {
    if (p[1] > 0.5 * H) return;
    const [a, b] = project(treeBaseY, p[0], p[1]);
    ctx.fillStyle = 'rgba(38,28,52,0.22)';
    ctx.beginPath();
    ctx.ellipse(a, b, 30 * k, 8 * k, 0, 0, 7);
    ctx.fill();
  });
  ctx.restore();

  // tree body (cool shadowed side) + thin golden rim on the sunward side
  ctx.lineCap = 'round';
  segs.forEach((s) => {
    ctx.strokeStyle = 'rgb(46,36,30)';
    ctx.lineWidth = Math.max(1, s.wd);
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,196,110,0.75)';
    ctx.lineWidth = Math.max(0.8, s.wd * 0.28);
    ctx.beginPath();
    ctx.moveTo(s.x1 + s.wd * 0.3, s.y1);
    ctx.lineTo(s.x2 + s.wd * 0.3, s.y2);
    ctx.stroke();
  });
  // foliage: deep green in shade, gold where the sun reaches the leaves
  tips.forEach((p) => {
    if (p[1] > 0.5 * H) return;
    for (let i = 0; i < 70; i++) {
      const a = rr(0, 7);
      const r = rr(0, 36) * k;
      const fx = p[0] + Math.cos(a) * r;
      const fy = p[1] + Math.sin(a) * r * 0.8;
      const sunward = clamp01(0.5 + Math.cos(a) * 0.5);
      const c = mix([28 + rr(0, 14), 56 + rr(0, 22), 30 + rr(0, 14)] as RGB, [196 + rr(0, 40), 168 + rr(0, 30), 70 + rr(0, 30)] as RGB, sunward * 0.7);
      ctx.strokeStyle = css(c);
      ctx.lineWidth = rr(2, 4) * k;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + rr(-4, 4) * k, fy + rr(-5, 5) * k);
      ctx.stroke();
    }
  });

  // ---------- 9. grass blades, reeds ----------
  for (let i = 0; i < 520; i++) {
    const gx = rr(0, W);
    const gy = rr(w1 + 6 * k, H);
    const depthScale = 0.55 + (gy - w1) / (H - w1);
    const h = rr(6, 17) * k * depthScale;
    const lean = rr(-4, 4) * k;
    ctx.strokeStyle = rnd() > 0.35 ? 'rgba(60,52,28,0.85)' : 'rgba(76,70,34,0.85)';
    ctx.lineWidth = rr(0.8, 1.6) * k;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.quadraticCurveTo(gx + lean * 0.3, gy - h * 0.6, gx + lean, gy - h);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,208,125,${rr(0.2, 0.65)})`;
    ctx.lineWidth = 0.8 * k;
    ctx.beginPath();
    ctx.moveTo(gx + 0.9 * k, gy - h * 0.45);
    ctx.lineTo(gx + lean + 0.9 * k, gy - h);
    ctx.stroke();
  }
  const reedBaseY = w1 + 2 * k;
  const reedCluster: Array<[number, number, number]> = [];
  for (let i = 0; i < 20; i++) reedCluster.push([0.2 * W + rr(-30, 62) * k, reedBaseY + rr(-4, 10) * k, rr(22, 52) * k]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, w1, W, H - w1);
  ctx.clip();
  reedCluster.forEach(([rx, by, h]) => {
    const [a, b] = project(by, rx, by - h);
    ctx.strokeStyle = 'rgba(38,28,52,0.26)';
    ctx.lineWidth = 2 * k;
    ctx.beginPath();
    ctx.moveTo(rx, by);
    ctx.lineTo(a, b);
    ctx.stroke();
  });
  ctx.restore();
  reedCluster.forEach(([rx, by, h]) => {
    const lean = rr(-6, 6) * k;
    ctx.strokeStyle = 'rgb(54,46,28)';
    ctx.lineWidth = 2 * k;
    ctx.beginPath();
    ctx.moveTo(rx, by);
    ctx.lineTo(rx + lean, by - h);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,110,0.65)';
    ctx.lineWidth = 0.9 * k;
    ctx.beginPath();
    ctx.moveTo(rx + 1.4 * k, by);
    ctx.lineTo(rx + lean + 1.4 * k, by - h);
    ctx.stroke();
    if (h > 40 * k) {
      ctx.fillStyle = 'rgb(70,50,30)';
      ctx.beginPath();
      ctx.ellipse(rx + lean, by - h - 4 * k, 2 * k, 6 * k, 0, 0, 7);
      ctx.fill();
    }
  });

  // ---------- 10. the wanderer: cloak, hood, staff, long shadow ----------
  const px = 0.4 * W;
  const py = 0.86 * H;
  const fh = 68 * k; // figure height
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, w1, W, H - w1);
  ctx.clip();
  // long shadow: the silhouette projected along the ground, away from the sun
  const outline: Array<[number, number]> = [
    [-14, 0], [-13, 0.3], [-9, 0.62], [-8, 0.74], [-6, 0.82], [-7, 0.9], [-3, 1.0], [3, 1.0], [7, 0.9], [6, 0.82], [8, 0.74], [9, 0.62], [13, 0.3], [14, 0]
  ];
  for (const [alpha, grow] of [[0.1, 1.5], [0.22, 1]] as Array<[number, number]>) {
    ctx.fillStyle = `rgba(38,28,52,${alpha})`;
    ctx.beginPath();
    outline.forEach(([ox, hh], i) => {
      const q = project(py, px + ox * k * grow, py - hh * fh);
      i === 0 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]);
    });
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(30,24,22,0.45)';
  ctx.beginPath();
  ctx.ellipse(px, py + 2 * k, 16 * k, 3.8 * k, 0, 0, 7);
  ctx.fill();
  // cloak: sloped shoulders, A-line fall, a few folds at the hem
  const cloak = new Path2D();
  cloak.moveTo(px - 3 * k, py - fh * 0.9);
  cloak.quadraticCurveTo(px - 9 * k, py - fh * 0.84, px - 11 * k, py - fh * 0.72);
  cloak.quadraticCurveTo(px - 15 * k, py - fh * 0.34, px - 15 * k, py);
  cloak.lineTo(px - 7 * k, py + 1.5 * k);
  cloak.lineTo(px - 1 * k, py - 0.5 * k);
  cloak.lineTo(px + 6 * k, py + 1.5 * k);
  cloak.lineTo(px + 14 * k, py);
  cloak.quadraticCurveTo(px + 14 * k, py - fh * 0.34, px + 11 * k, py - fh * 0.72);
  cloak.quadraticCurveTo(px + 9 * k, py - fh * 0.84, px + 3 * k, py - fh * 0.9);
  cloak.closePath();
  const cg = ctx.createLinearGradient(px - 15 * k, 0, px + 14 * k, 0);
  cg.addColorStop(0, 'rgb(30,27,38)');
  cg.addColorStop(0.65, 'rgb(54,43,42)');
  cg.addColorStop(1, 'rgb(104,70,44)');
  ctx.fillStyle = cg;
  ctx.fill(cloak);
  ctx.strokeStyle = 'rgba(20,16,22,0.55)';
  ctx.lineWidth = 1.1 * k;
  for (const fx of [-6, 0, 6]) {
    ctx.beginPath();
    ctx.moveTo(px + fx * k, py - fh * 0.5);
    ctx.quadraticCurveTo(px + (fx - 1) * k, py - fh * 0.25, px + (fx + 1) * k, py);
    ctx.stroke();
  }
  // hood and head
  ctx.fillStyle = 'rgb(38,32,38)';
  ctx.beginPath();
  ctx.moveTo(px - 8 * k, py - fh * 0.8);
  ctx.quadraticCurveTo(px - 9 * k, py - fh * 1.04, px - 1 * k, py - fh * 1.12);
  ctx.quadraticCurveTo(px + 9 * k, py - fh * 1.04, px + 8 * k, py - fh * 0.8);
  ctx.quadraticCurveTo(px, py - fh * 0.74, px - 8 * k, py - fh * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(20,16,20,0.7)';
  ctx.beginPath();
  ctx.ellipse(px, py - fh * 0.93, 4 * k, 5 * k, 0, 0, 7);
  ctx.fill();
  // golden rim light along the sunward edge
  ctx.strokeStyle = 'rgba(255,204,120,0.95)';
  ctx.lineWidth = 1.8 * k;
  ctx.beginPath();
  ctx.moveTo(px + 3 * k, py - fh * 0.9);
  ctx.quadraticCurveTo(px + 9 * k, py - fh * 0.84, px + 11 * k, py - fh * 0.72);
  ctx.quadraticCurveTo(px + 14 * k, py - fh * 0.34, px + 14 * k, py);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px + 7.6 * k, py - fh * 0.84);
  ctx.quadraticCurveTo(px + 10 * k, py - fh * 1.02, px + 1.5 * k, py - fh * 1.11);
  ctx.stroke();
  // staff held on the shadow side, with a lit edge
  ctx.strokeStyle = 'rgb(60,45,32)';
  ctx.lineWidth = 2.6 * k;
  ctx.beginPath();
  ctx.moveTo(px - 18 * k, py + 2 * k);
  ctx.lineTo(px - 18 * k, py - fh * 1.08);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,204,120,0.8)';
  ctx.lineWidth = 0.9 * k;
  ctx.beginPath();
  ctx.moveTo(px - 16.8 * k, py + 2 * k);
  ctx.lineTo(px - 16.8 * k, py - fh * 1.08);
  ctx.stroke();

  // ---------- 11. a few birds, atmosphere, grade ----------
  ctx.strokeStyle = 'rgba(52,56,84,0.62)';
  ctx.lineWidth = 1.5 * k;
  for (let i = 0; i < 6; i++) {
    const bx = rr(0.14, 0.5) * W;
    const by = rr(0.14, 0.3) * H;
    const s = rr(6, 12) * k;
    ctx.beginPath();
    ctx.moveTo(bx - s, by + s * 0.1);
    ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.55, bx, by);
    ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.55, bx + s, by + s * 0.1);
    ctx.stroke();
  }
  // warm haze over the river and the horizon
  const hz = ctx.createLinearGradient(0, 0.5 * H, 0, w1);
  hz.addColorStop(0, 'rgba(255,214,160,0)');
  hz.addColorStop(0.55, 'rgba(255,210,150,0.2)');
  hz.addColorStop(1, 'rgba(255,200,140,0.06)');
  ctx.fillStyle = hz;
  ctx.fillRect(0, 0.5 * H, W, w1 - 0.5 * H);
  // golden-hour colour grade
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const grade = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.95);
  grade.addColorStop(0, 'rgba(255,196,110,0.55)');
  grade.addColorStop(1, 'rgba(70,60,120,0.35)');
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // paper grain
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,240,215,0.07)' : 'rgba(40,30,20,0.06)';
    ctx.fillRect(rr(0, W), rr(0, H), rr(1, 2.2) * k, rr(1, 2.2) * k);
  }
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.25, W / 2, H * 0.45, W * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(40,24,12,0.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}
