import React, { useEffect, useRef } from 'react';
import { useTheme } from '../utils/theme';

/* ─────────────────────────────────────────────────────────────
   Per-theme colour palettes
   Each palette is [r, g, b] triplets for particle/glow colours.
   bgColor is the canvas base clear colour.
   nebula* are the three ambient glow spots: centre, top-left, bottom-right.
───────────────────────────────────────────────────────────── */
const THEME_PALETTES = {
  dark: {
    bg:       [3,   3,  14],
    particles: [[99,102,241],[139,92,246],[34,211,238],[52,211,153],[168,85,247]],
    nebulaC:  [99, 102, 241],
    nebulaTL: [34,  211, 238],
    nebulaBR: [168,  85, 247],
  },
  light: {
    bg:       [224, 242, 254],
    particles: [[14,165,233],[56,189,248],[99,102,241],[2,132,199],[125,211,252]],
    nebulaC:  [14, 165, 233],
    nebulaTL: [99, 102, 241],
    nebulaBR: [56, 189, 248],
  },
  nature: {
    bg:       [10, 18,  12],
    particles: [[74,124,89],[107,189,126],[52,211,153],[139,195,74],[34,197,94]],
    nebulaC:  [74, 124,  89],
    nebulaTL: [52, 211, 153],
    nebulaBR: [107,189, 126],
  },
  fire: {
    bg:       [5,  1,   1],
    particles: [[255,0,0],[255,77,0],[255,153,0],[220,38,38],[239,68,68]],
    nebulaC:  [255,  0,   0],
    nebulaTL: [255, 77,   0],
    nebulaBR: [255,153,   0],
  },
  queen: {
    bg:       [12,  3,   8],
    particles: [[255,113,139],[212,149,192],[255,77,109],[229,185,92],[255,159,180]],
    nebulaC:  [255, 113, 139],
    nebulaTL: [212, 149, 192],
    nebulaBR: [255,  77, 109],
  },
  monochrome: {
    bg:       [0,   0,   0],
    particles: [[255,255,255],[180,180,180],[120,120,120],[220,220,220],[200,200,200]],
    nebulaC:  [200, 200, 200],
    nebulaTL: [255, 255, 255],
    nebulaBR: [150, 150, 150],
  },
  cyberpunk: {
    bg:       [2,   0,  20],
    particles: [[0,255,204],[255,0,255],[252,238,10],[0,200,160],[180,0,255]],
    nebulaC:  [0,  255, 204],
    nebulaTL: [255,  0, 255],
    nebulaBR: [252, 238,  10],
  },
};

const DEFAULT_PALETTE = THEME_PALETTES.dark;

export default function GrowthBackground() {
  const { theme, previewTheme } = useTheme();
  const activeTheme = previewTheme || theme;

  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  // Store palette in a ref so the canvas loop always reads the latest value
  // without needing to restart.
  const paletteRef = useRef(THEME_PALETTES[activeTheme] || DEFAULT_PALETTE);

  // Update paletteRef whenever theme changes — particles will recolour on respawn
  useEffect(() => {
    paletteRef.current = THEME_PALETTES[activeTheme] || DEFAULT_PALETTE;
  }, [activeTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W = 0, H = 0;
    let mouse = { x: -9999, y: -9999 };

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener('mousemove', onMouseMove);

    const rnd = (a, b) => Math.random() * (b - a) + a;
    const pickColor = () => {
      const p = paletteRef.current.particles;
      return p[Math.floor(Math.random() * p.length)];
    };

    /* ── Rising particle ──────────────────────────────────── */
    class Particle {
      constructor(x, y) {
        this.x      = x  ?? rnd(0, W);
        this.y      = y  ?? rnd(0, H);
        this.vx     = rnd(-0.25, 0.25);
        this.vy     = -rnd(0.15, 0.55);
        this.r      = rnd(0.8, 2.2);
        this.baseAlpha = rnd(0.35, 0.85);
        this.alpha  = 0;
        this.phase  = rnd(0, Math.PI * 2);
        this.speed  = rnd(0.008, 0.022);
        this.col    = pickColor();   // snapshot at birth; re-rolled on respawn
        this.age    = 0;
        this.maxAge = rnd(280, 550);
      }
      update() {
        this.x   += this.vx;
        this.y   += this.vy;
        this.age += 1;
        this.phase += this.speed;

        const dx = mouse.x - this.x, dy = mouse.y - this.y;
        const d  = Math.hypot(dx, dy);
        if (d < 180 && d > 0) {
          this.vx += (dx / d) * 0.004;
          this.vy += (dy / d) * 0.004;
        }
        const spd = Math.hypot(this.vx, this.vy);
        if (spd > 1.2) { this.vx *= 0.95; this.vy *= 0.95; }

        const t = this.age / this.maxAge;
        const pulse = 0.7 + 0.3 * Math.sin(this.phase);
        if (t < 0.1)       this.alpha = this.baseAlpha * (t / 0.1) * pulse;
        else if (t > 0.85) this.alpha = this.baseAlpha * ((1 - t) / 0.15) * pulse;
        else               this.alpha = this.baseAlpha * pulse;

        return this.age < this.maxAge && this.y > -20;
      }
      draw() {
        const [r, g, b] = this.col;
        if (this.r > 1.2) {
          const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 5);
          grd.addColorStop(0, `rgba(${r},${g},${b},${this.alpha * 0.35})`);
          grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.r * 5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${this.alpha})`;
        ctx.fill();
      }
    }

    /* ── Expanding growth ring ────────────────────────────── */
    class GrowthRing {
      constructor() { this.reset(); }
      reset() {
        this.x     = rnd(W * 0.15, W * 0.85);
        this.y     = rnd(H * 0.15, H * 0.85);
        this.rad   = 0;
        this.maxR  = rnd(60, 160);
        this.alpha = rnd(0.2, 0.45);
        this.spd   = rnd(0.4, 0.9);
        this.col   = pickColor();
        this.done  = false;
      }
      update() {
        this.rad += this.spd;
        this.currentAlpha = this.alpha * (1 - this.rad / this.maxR);
        if (this.rad >= this.maxR) this.done = true;
      }
      draw() {
        const [r, g, b] = this.col;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.rad, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${this.currentAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    /* ── Shooting streak ──────────────────────────────────── */
    class Streak {
      constructor() { this.active = false; }
      fire() {
        this.x   = rnd(-100, W * 0.6);
        this.y   = rnd(-40,  H * 0.4);
        this.vx  = rnd(4, 9);
        this.vy  = rnd(1.5, 4);
        this.len = rnd(60, 130);
        this.alpha = 0;
        this.life  = 0;
        this.max   = rnd(28, 50);
        this.active = true;
      }
      update() {
        if (!this.active) return;
        this.x += this.vx; this.y += this.vy; this.life++;
        const t = this.life / this.max;
        this.alpha = t < 0.2 ? (t / 0.2) * 0.7 : t > 0.7 ? ((1 - t) / 0.3) * 0.7 : 0.7;
        if (this.life >= this.max) this.active = false;
      }
      draw() {
        if (!this.active) return;
        const angle = Math.atan2(this.vy, this.vx);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        const [r, g, b] = paletteRef.current.particles[0];
        const grd = ctx.createLinearGradient(-this.len, 0, 4, 0);
        grd.addColorStop(0, `rgba(${r},${g},${b},0)`);
        grd.addColorStop(0.7, `rgba(${r},${g},${b},${this.alpha * 0.5})`);
        grd.addColorStop(1, `rgba(255,255,255,${this.alpha})`);
        ctx.beginPath();
        ctx.moveTo(-this.len, 0);
        ctx.lineTo(4, 0);
        ctx.strokeStyle = grd;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }
    }

    /* ── Pool initialisation ─────────────────────────────── */
    const MAX_PARTICLES = 130;
    let particles = Array.from({ length: MAX_PARTICLES }, () => new Particle());
    const rings   = [];
    let ringTimer = 0;
    const streaks   = [new Streak(), new Streak(), new Streak()];
    let streakTimer = 0;
    let tick = 0;

    /* ── Draw loop ────────────────────────────────────────── */
    const loop = () => {
      tick++;
      const pal = paletteRef.current;
      const [bgR, bgG, bgB] = pal.bg;

      // Motion-blur trail
      ctx.fillStyle = `rgba(${bgR},${bgG},${bgB},0.18)`;
      ctx.fillRect(0, 0, W, H);

      const breathe = (off) => 0.032 + 0.013 * Math.sin(tick * 0.007 + off);

      // Centre nebula
      {
        const cx = W / 2, cy = H / 2;
        const [nr, ng, nb] = pal.nebulaC;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.45);
        g.addColorStop(0,   `rgba(${nr},${ng},${nb},${breathe(0)})`);
        g.addColorStop(0.5, `rgba(${nr},${ng},${nb},${breathe(1) * 0.45})`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      // Top-left nebula
      {
        const [nr, ng, nb] = pal.nebulaTL;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.42);
        g.addColorStop(0, `rgba(${nr},${ng},${nb},${breathe(2) * 0.65})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      // Bottom-right nebula
      {
        const [nr, ng, nb] = pal.nebulaBR;
        const g = ctx.createRadialGradient(W, H, 0, W, H, W * 0.38);
        g.addColorStop(0, `rgba(${nr},${ng},${nb},${breathe(3) * 0.65})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }

      // Neural connection lines
      const CONN_DIST = 130;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pi = particles[i], pj = particles[j];
          const dx = pi.x - pj.x, dy = pi.y - pj.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < CONN_DIST) {
            const fade = 1 - d / CONN_DIST;
            const [r1,g1,b1] = pi.col, [r2,g2,b2] = pj.col;
            const r = (r1+r2)>>1, g = (g1+g2)>>1, b = (b1+b2)>>1;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.strokeStyle = `rgba(${r},${g},${b},${fade * Math.min(pi.alpha, pj.alpha) * 0.28})`;
            ctx.lineWidth   = fade * 0.8;
            ctx.stroke();
          }
        }
      }

      // Particles
      particles = particles.filter(p => {
        const alive = p.update();
        if (alive) p.draw();
        return alive;
      });
      while (particles.length < MAX_PARTICLES) {
        particles.push(new Particle(rnd(0, W), H + 10));
      }

      // Growth rings
      ringTimer++;
      if (ringTimer >= 110) { rings.push(new GrowthRing()); ringTimer = 0; }
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].update(); rings[i].draw();
        if (rings[i].done) rings.splice(i, 1);
      }

      // Streaks
      streakTimer++;
      if (streakTimer > 220) {
        streakTimer = 0;
        const idle = streaks.find(s => !s.active);
        if (idle) idle.fire();
      }
      streaks.forEach(s => { s.update(); s.draw(); });

      rafRef.current = requestAnimationFrame(loop);
    };

    // Hard-clear first frame with current theme bg
    const [bgR, bgG, bgB] = paletteRef.current.bg;
    ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
    ctx.fillRect(0, 0, W, H);

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []); // canvas loop runs once; theme changes flow through paletteRef

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}
