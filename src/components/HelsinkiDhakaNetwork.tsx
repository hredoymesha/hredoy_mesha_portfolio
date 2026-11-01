import { useEffect, useRef } from 'react';
import { drawLateAfternoonPainting } from './LateAfternoonPainting';

/**
 * Deterministic PRNG: mulberry32
 */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Night Mode artwork (coded painting): a solitary figure on a riverbank at dusk,
 * beneath a veiled moon and distant monsoon hills.
 */
export function drawMonsoonNightPainting(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const rnd = mulberry32(7);
  const rr = (a: number, b: number) => a + (b - a) * rnd();
  const k = W / 1000; // scale factor (scene authored at 1000px)
  const rgb = (c: number[]) => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  const hor = 0.6;

  // --- sky gradient ---
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.0, 'rgb(16,20,30)');
  g.addColorStop(0.45, 'rgb(33,37,50)');
  g.addColorStop(0.66, 'rgb(58,56,62)');
  g.addColorStop(0.84, 'rgb(120,104,78)');
  g.addColorStop(1.0, 'rgb(96,86,64)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // --- soft cloud modulation (blurred noise pass) ---
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 260; i++) {
    const x = rr(0, W);
    const y = rr(0, hor * H + 60 * k);
    const v = rr(0, 1) > 0.5 ? 255 : 0;
    const fade = 1 - y / (hor * H + 60 * k);
    ctx.globalAlpha = 0.1 * fade;
    ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
    ctx.beginPath();
    ctx.ellipse(x, y, rr(30, 90) * k, rr(16, 40) * k, 0, 0, 7);
    ctx.fill();
  }
  ctx.restore();

  // --- moon glow + disc ---
  const mx = 0.33 * W;
  const my = 0.28 * H;
  const glow = ctx.createRadialGradient(mx, my, 0, mx, my, 300 * k);
  glow.addColorStop(0, 'rgba(234,224,190,0.85)');
  glow.addColorStop(0.3, 'rgba(150,138,104,0.35)');
  glow.addColorStop(1, 'rgba(150,138,104,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgb(236,228,201)';
  ctx.beginPath();
  ctx.arc(mx, my, 30 * k, 0, 7);
  ctx.fill();

  // --- hills (sine silhouettes, receding) ---
  const hills = [
    { hy: 0.57, amp: 36, col: [78, 86, 100], op: 0.55 },
    { hy: 0.6, amp: 30, col: [54, 62, 74], op: 0.78 },
    { hy: 0.635, amp: 24, col: [36, 42, 52], op: 1.0 }
  ];
  hills.forEach((hl) => {
    ctx.save();
    ctx.globalAlpha = hl.op;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4 * k) {
      const t = (x / W) * 1000;
      const y =
        hl.hy * H -
        hl.amp * k * (0.5 + 0.5 * Math.sin(t / 120)) * (0.6 + 0.4 * Math.sin(t / 37 + hl.hy * 9));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = rgb(hl.col);
    ctx.fill();
    ctx.restore();
  });

  // --- water band ---
  const w0 = 0.7 * H;
  const w1 = 0.8 * H;
  const wg = ctx.createLinearGradient(0, w0, 0, w1);
  wg.addColorStop(0, 'rgb(92,96,96)');
  wg.addColorStop(0.4, 'rgb(58,62,66)');
  wg.addColorStop(1, 'rgb(40,45,52)');
  ctx.fillStyle = wg;
  ctx.fillRect(0, w0, W, w1 - w0);

  // moon reflection on water
  for (let y = w0; y < w1; y += 1) {
    const half = (14 + (y - w0) * 0.2) * k;
    ctx.fillStyle = 'rgba(196,184,150,0.6)';
    ctx.fillRect(mx - half, y, half * 2, 1);
  }

  // --- foreground ---
  const fg = ctx.createLinearGradient(0, w1, 0, H);
  fg.addColorStop(0, 'rgb(26,30,35)');
  fg.addColorStop(1, 'rgb(10,13,16)');
  ctx.fillStyle = fg;
  ctx.fillRect(0, w1, W, H - w1);

  // --- sample base colours for the brush pass ---
  const base = ctx.getImageData(0, 0, W, H).data;
  const sample = (x: number, y: number) => {
    const xi = Math.min(W - 1, Math.max(0, x | 0));
    const yi = Math.min(H - 1, Math.max(0, y | 0));
    const i = (yi * W + xi) * 4;
    return [base[i], base[i + 1], base[i + 2]];
  };

  // --- painterly brush pass ---
  const N = Math.min(20000, Math.round(W * H * 0.038));
  ctx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const x = rr(0, W);
    const y = rr(0, H);
    let c = sample(x, y);
    c = [c[0] + rr(-16, 16), c[1] + rr(-16, 16), c[2] + rr(-16, 16)];
    let ang: number;
    let ln: number;
    let wd: number;
    let mul = 1;
    if (y > H * 0.82) {
      ang = rr(-0.1, 0.1);
      ln = rr(10, 22) * k;
      wd = rr(2, 4) * k;
      mul = 0.95;
    } else if (y >= w0 - 4 * k && y <= w1 + 4 * k) {
      ang = rr(-0.05, 0.05);
      ln = rr(14, 34) * k;
      wd = rr(2, 4) * k;
    } else if (y > hor * H) {
      ang = rr(-0.12, 0.12);
      ln = rr(8, 18) * k;
      wd = rr(2, 3) * k;
      mul = 0.98;
    } else {
      ang = rr(-0.18, 0.18);
      ln = rr(10, 26) * k;
      wd = rr(2, 4) * k;
    }
    c = [c[0] * mul, c[1] * mul, c[2] * mul];
    const dx = Math.cos(ang) * ln;
    const dy = Math.sin(ang) * ln;
    ctx.strokeStyle = rgb(c);
    ctx.lineWidth = Math.max(1, wd);
    ctx.beginPath();
    ctx.moveTo(x - dx / 2, y - dy / 2);
    ctx.lineTo(x + dx / 2, y + dy / 2);
    ctx.stroke();
  }

  // --- far tree line along the water's edge ---
  ctx.strokeStyle = 'rgb(20,24,30)';
  for (let x = 0; x < W; x += 6 * k) {
    ctx.lineWidth = rr(3, 6) * k;
    ctx.beginPath();
    ctx.moveTo(x, w0);
    ctx.lineTo(x, w0 - rr(6, 16) * k);
    ctx.stroke();
  }

  // --- ancient tree (recursive) ---
  const tips: Array<[number, number]> = [];
  function branch(x: number, y: number, ang: number, ln: number, wd: number, depth: number) {
    if (depth === 0 || ln < 8 * k) {
      tips.push([x, y]);
      return;
    }
    const x2 = x + Math.cos(ang) * ln;
    const y2 = y + Math.sin(ang) * ln;
    ctx.strokeStyle = 'rgb(12,15,20)';
    ctx.lineWidth = Math.max(1, wd);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    for (const s of [-1, 1]) {
      branch(x2, y2, ang + s * rr(0.3, 0.6) + 0.05, ln * rr(0.62, 0.78), wd * 0.68, depth - 1);
    }
    if (rnd() < 0.5) {
      branch(x2, y2, ang + rr(-0.2, 0.2), ln * 0.7, wd * 0.7, depth - 1);
    }
  }
  const tx = 0.2 * W;
  branch(tx, H, -Math.PI / 2 - 0.05, 150 * k, 16 * k, 6);

  // foliage around upper tips
  tips.forEach((p) => {
    if (p[1] > 0.5 * H) return;
    const n = 60;
    for (let i = 0; i < n; i++) {
      const a = rr(0, 7);
      const r = rr(0, 34) * k;
      const fx = p[0] + Math.cos(a) * r;
      const fy = p[1] + Math.sin(a) * r * 0.8;
      ctx.strokeStyle =
        'rgb(' +
        (12 + (rr(0, 10) | 0)) +
        ',' +
        (16 + (rr(0, 10) | 0)) +
        ',' +
        (20 + (rr(0, 12) | 0)) +
        ')';
      ctx.lineWidth = rr(2, 4) * k;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + rr(-4, 4) * k, fy + rr(-5, 5) * k);
      ctx.stroke();
    }
  });

  // --- reeds near the water, right ---
  ctx.strokeStyle = 'rgb(12,16,20)';
  for (let i = 0; i < 18; i++) {
    const rx = 0.78 * W + rr(-30, 60) * k;
    const by = w1 + rr(-4, 10) * k;
    ctx.lineWidth = 2 * k;
    ctx.beginPath();
    ctx.moveTo(rx, by);
    ctx.lineTo(rx + rr(-6, 6) * k, by - rr(20, 46) * k);
    ctx.stroke();
  }

  // --- lone wanderer with staff ---
  const px = 0.6 * W;
  const py = 0.86 * H;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(px, py + 5 * k, 16 * k, 4 * k, 0, 0, 7);
  ctx.fill();

  ctx.strokeStyle = 'rgb(8,10,14)';
  ctx.lineWidth = 9 * k;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px, py - 34 * k);
  ctx.stroke();

  ctx.fillStyle = 'rgb(8,10,14)';
  ctx.beginPath();
  ctx.arc(px, py - 42 * k, 6 * k, 0, 7);
  ctx.fill();

  ctx.strokeStyle = 'rgb(10,12,16)';
  ctx.lineWidth = 3 * k;
  ctx.beginPath();
  ctx.moveTo(px + 10 * k, py + 4 * k);
  ctx.lineTo(px + 10 * k, py - 40 * k);
  ctx.stroke();

  // --- mist over the water ---
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = 'rgb(205,210,214)';
  ctx.fillRect(0, w0 - 12 * k, W, w1 - w0 + 20 * k);
  ctx.restore();

  // --- vignette ---
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.2, W / 2, H * 0.45, W * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

export function drawArtwork(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  theme: 'light' | 'dark' = 'light'
) {
  if (theme === 'dark') {
    drawMonsoonNightPainting(ctx, W, H);
  } else {
    drawLateAfternoonPainting(ctx, W, H);
  }
}

export function HelsinkiDhakaNetworkCanvas({
  theme = 'light',
  className = ''
}: {
  theme?: 'light' | 'dark';
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const parent = cv.parentElement;
    const cssW = Math.max(260, parent ? parent.clientWidth : 420);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = Math.min(800, Math.round(cssW * dpr));

    cv.width = S;
    cv.height = S;

    const ctx = cv.getContext('2d');
    if (!ctx) return;

    drawArtwork(ctx, S, S, theme);
  }, [theme]);

  return (
    <figure
      className={`m-0 border border-[var(--line-strong)] rounded-2xl overflow-hidden bg-[var(--panel)] shadow-sm ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="block w-full aspect-square"
        role="img"
        aria-label={
          theme === 'dark'
            ? 'Drawn by code: a solitary figure on a riverbank at dusk under a veiled moon.'
            : 'Drawn by code: a solitary figure on a riverbank in late afternoon under a low golden sun, with long shadows.'
        }
      />
    </figure>
  );
}
