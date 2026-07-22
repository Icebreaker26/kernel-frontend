import { useEffect, useRef } from 'react';

const C = 'rgba(0,229,255,';

function poly(ctx, sides, r, startAngle = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 / sides) * i + startAngle;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawReticle(ctx, r) {
  const GAP = 0.28;
  for (let i = 0; i < 4; i++) {
    const sa = (Math.PI / 2) * i + GAP;
    const ea = (Math.PI / 2) * (i + 1) - GAP;
    ctx.beginPath();
    ctx.arc(0, 0, r, sa, ea);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  const ext = r * 1.55;
  ctx.beginPath();
  ctx.moveTo(-ext, 0); ctx.lineTo(-r - 3, 0);
  ctx.moveTo(r + 3, 0); ctx.lineTo(ext, 0);
  ctx.moveTo(0, -ext); ctx.lineTo(0, -r - 3);
  ctx.moveTo(0, r + 3); ctx.lineTo(0, ext);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFrame(ctx, r) {
  const s = r * 1.3;
  const len = r * 0.42;
  ctx.beginPath();
  ctx.moveTo(-s, -s + len); ctx.lineTo(-s, -s); ctx.lineTo(-s + len, -s);
  ctx.moveTo(s - len, -s);  ctx.lineTo(s, -s);  ctx.lineTo(s, -s + len);
  ctx.moveTo(s, s - len);   ctx.lineTo(s, s);   ctx.lineTo(s - len, s);
  ctx.moveTo(-s + len, s);  ctx.lineTo(-s, s);  ctx.lineTo(-s, s - len);
  ctx.stroke();
  const inner = r * 0.7;
  ctx.beginPath();
  ctx.moveTo(-inner, 0); ctx.lineTo(-inner + len * 0.5, 0);
  ctx.moveTo(inner, 0);  ctx.lineTo(inner - len * 0.5, 0);
  ctx.moveTo(0, -inner); ctx.lineTo(0, -inner + len * 0.5);
  ctx.moveTo(0, inner);  ctx.lineTo(0, inner - len * 0.5);
  ctx.stroke();
}

function drawCross(ctx, r) {
  const w = r * 0.25;
  ctx.beginPath(); ctx.rect(-w, -r, w * 2, r * 2); ctx.stroke();
  ctx.beginPath(); ctx.rect(-r, -w, r * 2, w * 2); ctx.stroke();
  ctx.beginPath(); ctx.rect(-w * 0.5, -w * 0.5, w, w); ctx.stroke();
}

function drawArrow(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.55, r * 0.4);
  ctx.lineTo(r * 0.2, r * 0.1);
  ctx.lineTo(r * 0.2, r);
  ctx.lineTo(-r * 0.2, r);
  ctx.lineTo(-r * 0.2, r * 0.1);
  ctx.lineTo(-r * 0.55, r * 0.4);
  ctx.closePath();
  ctx.stroke();
}

const DRAW_FNS = {
  tri:      (ctx, r) => poly(ctx, 3, r, -Math.PI / 2),
  diamond:  (ctx, r) => poly(ctx, 4, r, Math.PI / 4),
  hex:      (ctx, r) => poly(ctx, 6, r, 0),
  oct:      (ctx, r) => poly(ctx, 8, r, Math.PI / 8),
  reticle:  drawReticle,
  frame:    drawFrame,
  cross:    drawCross,
  arrow:    drawArrow,
};

const TYPES = Object.keys(DRAW_FNS);

const GeometricBackground = () => {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, raf, frame = 0;

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Build shape pool — two of each type
    const shapes = [...TYPES, ...TYPES].map((type) => ({
      type,
      x:         Math.random() * W,
      y:         Math.random() * H,
      r:         type === 'reticle' ? 22 + Math.random() * 28 : 9 + Math.random() * 32,
      rot:       Math.random() * Math.PI * 2,
      rs:        (Math.random() - 0.5) * 0.0035,
      baseAlpha: 0.13 + Math.random() * 0.17,
      phase:     Math.random() * Math.PI * 2,
      dx:        (Math.random() - 0.5) * 0.18,
      dy:        (Math.random() - 0.5) * 0.18,
    }));

    // Static stars
    const stars = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.5 + Math.random() * 1.1,
      a: 0.2 + Math.random() * 0.5,
    }));

    let gridT = 0;

    const drawGrid = () => {
      gridT = (gridT + 0.22) % 80;
      const vx = W / 2;
      const vy = H * 0.26;

      ctx.strokeStyle = C + '0.06)';
      ctx.lineWidth   = 0.5;

      // Perspective rays
      for (let i = 0; i <= 10; i++) {
        const bx = (W * i) / 10;
        ctx.beginPath();
        ctx.moveTo(vx, vy);
        ctx.lineTo(bx, H);
        ctx.stroke();
      }

      // Animated horizontal bands
      for (let j = 0; j < 14; j++) {
        const p = ((j / 14) + gridT / 80) % 1;
        const t = Math.pow(p, 1.9);
        const y  = vy + (H - vy) * t;
        const xl = vx - vx * t;
        const xr = vx + (W - vx) * t;
        if (y > vy + 6) {
          ctx.globalAlpha = t * 0.9;
          ctx.beginPath();
          ctx.moveTo(xl, y);
          ctx.lineTo(xr, y);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    };

    const loop = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);

      drawGrid();

      // Stars
      stars.forEach((s) => {
        ctx.fillStyle = C + s.a + ')';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Geometric shapes
      shapes.forEach((s) => {
        const pulse = 0.7 + 0.3 * Math.sin(frame * 0.018 + s.phase);
        const alpha = s.baseAlpha * pulse;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.strokeStyle = C + alpha.toFixed(3) + ')';
        ctx.lineWidth   = 1.0;

        DRAW_FNS[s.type](ctx, s.r);

        ctx.restore();

        s.x   += s.dx;
        s.y   += s.dy;
        s.rot += s.rs;

        const pad = s.r + 30;
        if (s.x < -pad)    s.x = W + pad;
        else if (s.x > W + pad) s.x = -pad;
        if (s.y < -pad)    s.y = H + pad;
        else if (s.y > H + pad) s.y = -pad;
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default GeometricBackground;
