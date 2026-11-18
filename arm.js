/* ==========================================================================
   Hero robot arm — a 3-DOF planar manipulator solving inverse kinematics
   in real time, rendered as a lit 2.5D scene (extruded links, shaded hubs,
   cast shadows). Motion is confined to the x–y plane; depth is visual only.
   ========================================================================== */

(() => {
  const canvas = document.getElementById('ik-canvas');
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const stage = canvas.parentElement;
  const instrument = stage.closest('.instrument');
  const modeEl = document.getElementById('ik-mode');
  const ro = ['q1', 'q2', 'x', 'y'].reduce((o, k) => ({ ...o, [k]: document.getElementById(`ro-${k}`) }), {});
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // scene palette (matches styles.css)
  const P = {
    wallTop: '#FAE6E0',
    wallBottom: '#F4D2C9',
    floorNear: '#E8B3A7',
    floorFar: '#EFC5BB',
    arch: '#EDB8AD',
    archShade: '#E2A396',
    link: ['#FFFBF6', '#F4E9DE', '#DCC9B8', '#C7B09E'], // highlight → core → shade → rim
    linkSide: '#BFA693',
    red: ['#F06A55', '#D2301E', '#A6241A'],
    redSide: '#7E170F',
    metal: ['#6B5650', '#3A2824', '#22160F'],
    ink: '#2B1B17',
    label: '#8E1D14',
    cast: 'rgba(130, 40, 28, 0.22)',
  };
  const MONO = '"DM Mono", ui-monospace, monospace';
  const METRES_PER_UNIT = 0.3; // presentational scale for the readout

  const L1 = 1.05;
  const L2 = 0.9;
  const L3 = 0.32;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let s = 1; // px per arm unit
  let base = { x: 0, y: 0 };
  let floorY = 0;
  let horizonY = 0;
  let depth = { x: 0, y: 0 }; // extrusion direction (oblique projection)

  const goal = { x: 0, y: 0 };
  const tip = { x: 0, y: 0 };
  const trail = [];
  let driven = false;
  let releaseTimer = 0;
  let visible = true;
  let rafId = 0;
  let lastReadout = 0;
  let clock = 0;

  /* ---------------------------------------------------------------- layout */
  function resize() {
    const rect = stage.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    s = Math.min(W * 0.37, H * 0.38);
    base = { x: W * 0.28, y: H * 0.66 };
    floorY = base.y + 0.42 * s;
    horizonY = floorY - 0.24 * s;
    depth = { x: 0.05 * s, y: -0.04 * s };
    if (!tip.x) {
      const p = idlePoint(0);
      Object.assign(tip, p);
      Object.assign(goal, p);
    }
    trail.length = 0;
    wake();
  }

  function idlePoint(time) {
    const cx = base.x + 0.98 * s;
    const cy = base.y - 0.5 * s;
    if (reducedMotion) return { x: cx, y: cy };
    return {
      x: cx + 0.55 * s * Math.sin(time * 0.5),
      y: cy + 0.3 * s * Math.sin(time * 1.0),
    };
  }

  /* ---------------------------------------------------------------- kinematics */
  // Tool tip target, with the tool held vertical (pointing down).
  function solve(px, py) {
    let dx = (px - base.x) / s;
    let dy = (base.y - py) / s + L3; // wrist sits L3 above the tip (y-up frame)
    dx = Math.max(dx, 0.15);
    let r = Math.hypot(dx, dy);
    const rMin = Math.abs(L1 - L2) + 0.1;
    const rMax = L1 + L2 - 0.02;
    if (r > rMax || r < rMin) {
      const k = Math.min(Math.max(r, rMin), rMax) / r;
      dx *= k;
      dy *= k;
      r = Math.hypot(dx, dy);
    }
    const c2 = (r * r - L1 * L1 - L2 * L2) / (2 * L1 * L2);
    const q2 = -Math.acos(Math.min(1, Math.max(-1, c2))); // elbow up
    const q1 = Math.atan2(dy, dx) - Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2));
    const q3 = -Math.PI / 2 - q1 - q2;
    return { q1, q2, q3 };
  }

  function fk({ q1, q2 }) {
    const j1 = { x: base.x, y: base.y };
    const j2 = { x: j1.x + L1 * s * Math.cos(q1), y: j1.y - L1 * s * Math.sin(q1) };
    const j3 = { x: j2.x + L2 * s * Math.cos(q1 + q2), y: j2.y - L2 * s * Math.sin(q1 + q2) };
    const end = { x: j3.x, y: j3.y + L3 * s };
    return { j1, j2, j3, end };
  }

  /* ---------------------------------------------------------------- primitives */
  function capsule(a, b, ra, rb, ox = 0, oy = 0) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.beginPath();
    ctx.arc(b.x + ox, b.y + oy, rb, ang - Math.PI / 2, ang + Math.PI / 2);
    ctx.arc(a.x + ox, a.y + oy, ra, ang + Math.PI / 2, ang + Math.PI * 1.5);
    ctx.closePath();
  }

  function circle(c, r, ox = 0, oy = 0) {
    ctx.beginPath();
    ctx.arc(c.x + ox, c.y + oy, r, 0, Math.PI * 2);
  }

  // Draws a shape extruded backwards along `depth`, casting a soft shadow.
  function extrude(pathFn, sideColor, steps = 7) {
    ctx.save();
    ctx.shadowColor = P.cast;
    ctx.shadowBlur = 0.16 * s;
    ctx.shadowOffsetX = 0.1 * s;
    ctx.shadowOffsetY = 0.12 * s;
    ctx.fillStyle = sideColor;
    pathFn(depth.x, depth.y);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = sideColor;
    for (let i = steps - 1; i > 0; i -= 1) {
      pathFn((depth.x * i) / steps, (depth.y * i) / steps);
      ctx.fill();
    }
  }

  function link(a, b, ra, rb, stripe) {
    extrude((ox, oy) => capsule(a, b, ra, rb, ox, oy), P.linkSide);

    // cylindrical shading across the link, lit from the top-left
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    let nx = -Math.sin(ang);
    let ny = Math.cos(ang);
    if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; } // n points toward the light
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const r = Math.max(ra, rb);
    const g = ctx.createLinearGradient(mid.x + nx * r, mid.y + ny * r, mid.x - nx * r, mid.y - ny * r);
    g.addColorStop(0, P.link[2]);
    g.addColorStop(0.12, P.link[0]);
    g.addColorStop(0.45, P.link[1]);
    g.addColorStop(0.85, P.link[2]);
    g.addColorStop(1, P.link[3]);
    capsule(a, b, ra, rb);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 70, 50, 0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (stripe) {
      // signal-red band on the upper link, like an industrial arm's livery
      const t0 = 0.3;
      const t1 = 0.62;
      const p0 = { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 };
      const p1 = { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 };
      const w = Math.min(ra, rb) * 0.42;
      ctx.lineCap = 'round';
      ctx.strokeStyle = P.red[1];
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  function hub(c, R, angle) {
    extrude((ox, oy) => circle(c, R, ox, oy), P.redSide);

    const g = ctx.createRadialGradient(c.x - R * 0.4, c.y - R * 0.45, R * 0.1, c.x, c.y, R);
    g.addColorStop(0, P.red[0]);
    g.addColorStop(0.55, P.red[1]);
    g.addColorStop(1, P.red[2]);
    circle(c, R);
    ctx.fillStyle = g;
    ctx.fill();

    // cream bearing cap
    const capR = R * 0.56;
    const cg = ctx.createRadialGradient(c.x - capR * 0.35, c.y - capR * 0.4, capR * 0.1, c.x, c.y, capR);
    cg.addColorStop(0, '#FFFDF9');
    cg.addColorStop(1, '#E3D2C2');
    circle(c, capR);
    ctx.fillStyle = cg;
    ctx.fill();

    // bolts turn with the joint
    ctx.fillStyle = P.redSide;
    for (let i = 0; i < 6; i += 1) {
      const a = angle + (i * Math.PI) / 3;
      circle({ x: c.x + Math.cos(a) * R * 0.78, y: c.y - Math.sin(a) * R * 0.78 }, Math.max(1.2, R * 0.07));
      ctx.fill();
    }
    // shaft + index mark
    circle(c, capR * 0.28);
    ctx.fillStyle = P.ink;
    ctx.fill();
    ctx.strokeStyle = P.red[1];
    ctx.lineWidth = Math.max(1.2, R * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(angle) * capR * 0.4, c.y - Math.sin(angle) * capR * 0.4);
    ctx.lineTo(c.x + Math.cos(angle) * capR * 0.82, c.y - Math.sin(angle) * capR * 0.82);
    ctx.stroke();
  }

  function pedestal() {
    const w = 0.3 * s;
    const top = base.y + 0.06 * s;
    const ry = 0.07 * s;

    // contact shadow
    const sg = ctx.createRadialGradient(base.x + 0.05 * s, floorY, 0, base.x + 0.05 * s, floorY, w * 1.6);
    sg.addColorStop(0, 'rgba(120, 35, 25, 0.35)');
    sg.addColorStop(1, 'rgba(120, 35, 25, 0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(base.x + 0.05 * s, floorY, w * 1.6, ry * 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // foot flange
    const fw = w * 1.35;
    const fg = ctx.createLinearGradient(base.x - fw, 0, base.x + fw, 0);
    fg.addColorStop(0, '#B79C88');
    fg.addColorStop(0.35, '#F1E4D7');
    fg.addColorStop(1, '#A88B76');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(base.x, floorY - 0.03 * s, fw, ry, 0, 0, Math.PI);
    ctx.lineTo(base.x - fw, floorY - 0.07 * s);
    ctx.ellipse(base.x, floorY - 0.07 * s, fw, ry, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#F6ECE1';
    ctx.beginPath();
    ctx.ellipse(base.x, floorY - 0.07 * s, fw, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // red column
    const bg = ctx.createLinearGradient(base.x - w, 0, base.x + w, 0);
    bg.addColorStop(0, P.red[2]);
    bg.addColorStop(0.3, P.red[0]);
    bg.addColorStop(0.55, P.red[1]);
    bg.addColorStop(1, P.redSide);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(base.x, floorY - 0.07 * s, w, ry, 0, 0, Math.PI);
    ctx.lineTo(base.x - w, top);
    ctx.ellipse(base.x, top, w, ry, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // turntable
    const tg = ctx.createLinearGradient(base.x - w, top - ry, base.x + w, top + ry);
    tg.addColorStop(0, '#FFF8F1');
    tg.addColorStop(1, '#DCC7B5');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.ellipse(base.x, top, w, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function gripper(end, open) {
    const pw = 0.17 * s;
    const ph = 0.07 * s;
    const fl = 0.16 * s;
    const fw = 0.045 * s;

    const box = (x, y, w, h, r) => (ox, oy) => {
      ctx.beginPath();
      ctx.roundRect(x + ox, y + oy, w, h, r);
    };
    const metal = (x, w) => {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, P.metal[0]);
      g.addColorStop(0.4, P.metal[1]);
      g.addColorStop(1, P.metal[2]);
      return g;
    };

    // fingers
    [-1, 1].forEach((side) => {
      const x = end.x + side * (open + fw / 2) - fw / 2;
      const f = box(x, end.y + ph * 0.6, fw, fl, fw * 0.4);
      extrude(f, P.metal[2], 4);
      f(0, 0);
      ctx.fillStyle = metal(x, fw);
      ctx.fill();
      // red grip pad
      ctx.fillStyle = P.red[1];
      ctx.beginPath();
      ctx.roundRect(x + (side < 0 ? fw * 0.55 : 0), end.y + ph * 0.6 + fl * 0.55, fw * 0.45, fl * 0.38, 2);
      ctx.fill();
    });

    // palm
    const palm = box(end.x - pw, end.y - ph * 0.4, pw * 2, ph, ph * 0.35);
    extrude(palm, P.metal[2], 5);
    palm(0, 0);
    const pg = ctx.createLinearGradient(0, end.y - ph * 0.4, 0, end.y + ph * 0.6);
    pg.addColorStop(0, P.metal[0]);
    pg.addColorStop(1, P.metal[2]);
    ctx.fillStyle = pg;
    ctx.fill();
  }

  function angleArc(c, from, to, radius, text) {
    ctx.save();
    ctx.strokeStyle = 'rgba(166, 36, 26, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, -from, -to, to > from);
    ctx.stroke();
    ctx.setLineDash([]);
    const mid = (from + to) / 2;
    const lx = c.x + Math.cos(mid) * (radius + 14);
    const ly = c.y - Math.sin(mid) * (radius + 14);
    ctx.font = `500 11px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width + 12;
    ctx.fillStyle = 'rgba(251, 244, 236, 0.85)';
    ctx.beginPath();
    ctx.roundRect(lx - tw / 2, ly - 9, tw, 18, 9);
    ctx.fill();
    ctx.fillStyle = P.label;
    ctx.fillText(text, lx, ly + 0.5);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- scene */
  function room() {
    // wall
    const wg = ctx.createLinearGradient(0, 0, 0, horizonY);
    wg.addColorStop(0, P.wallTop);
    wg.addColorStop(1, P.wallBottom);
    ctx.fillStyle = wg;
    ctx.fillRect(0, 0, W, horizonY);

    // warm light pool on the wall
    const lx = base.x + 0.7 * s;
    const ly = base.y - 0.7 * s;
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 1.8 * s);
    lg.addColorStop(0, 'rgba(255, 250, 244, 0.75)');
    lg.addColorStop(1, 'rgba(255, 250, 244, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, horizonY);

    // skirting
    ctx.fillStyle = 'rgba(255, 246, 238, 0.55)';
    ctx.fillRect(0, horizonY - 0.035 * s, W, 0.035 * s);

    // arched niche
    const aw = Math.min(0.62 * s, W * 0.2);
    const ax = W - aw * 1.25;
    const atop = Math.max(horizonY - 1.75 * s, 0.12 * H);
    ctx.fillStyle = P.archShade;
    ctx.beginPath();
    ctx.moveTo(ax, horizonY);
    ctx.lineTo(ax, atop + aw / 2);
    ctx.arc(ax + aw / 2, atop + aw / 2, aw / 2, Math.PI, 0);
    ctx.lineTo(ax + aw, horizonY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.arch;
    ctx.beginPath();
    ctx.moveTo(ax + aw * 0.12, horizonY);
    ctx.lineTo(ax + aw * 0.12, atop + aw / 2);
    ctx.arc(ax + aw * 0.56, atop + aw / 2, aw * 0.44, Math.PI, 0);
    ctx.lineTo(ax + aw, horizonY);
    ctx.closePath();
    ctx.fill();

    // floor
    const fg = ctx.createLinearGradient(0, horizonY, 0, H);
    fg.addColorStop(0, P.floorFar);
    fg.addColorStop(1, P.floorNear);
    ctx.fillStyle = fg;
    ctx.fillRect(0, horizonY, W, H - horizonY);
    ctx.fillStyle = 'rgba(150, 50, 38, 0.12)';
    ctx.fillRect(0, horizonY, W, 1);
  }

  function goalMarker() {
    const r = 0.07 * s;
    const pulse = reducedMotion ? 0 : (Math.sin(clock * 3) + 1) / 2;
    const halo = ctx.createRadialGradient(goal.x, goal.y, 0, goal.x, goal.y, r * (2.2 + pulse * 0.6));
    halo.addColorStop(0, 'rgba(210, 48, 30, 0.22)');
    halo.addColorStop(1, 'rgba(210, 48, 30, 0)');
    ctx.fillStyle = halo;
    circle(goal, r * (2.2 + pulse * 0.6));
    ctx.fill();
    ctx.strokeStyle = P.red[1];
    ctx.lineWidth = 1.6;
    circle(goal, r * 0.55);
    ctx.stroke();
    ctx.fillStyle = P.red[1];
    circle(goal, 2.2);
    ctx.fill();
  }

  function draw(q) {
    const { j1, j2, j3, end } = fk(q);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    room();

    // floor shadow under the gripper (height → softer, wider)
    const hgt = Math.max(0, (floorY - end.y) / s);
    const sw = 0.2 * s * (1 + hgt * 0.35);
    const sa = 0.26 / (1 + hgt * 0.9);
    const fs = ctx.createRadialGradient(end.x + 0.06 * s, floorY - 0.04 * s, 0, end.x + 0.06 * s, floorY - 0.04 * s, sw);
    fs.addColorStop(0, `rgba(120, 35, 25, ${sa})`);
    fs.addColorStop(1, 'rgba(120, 35, 25, 0)');
    ctx.fillStyle = fs;
    ctx.beginPath();
    ctx.ellipse(end.x + 0.06 * s, floorY - 0.04 * s, sw, sw * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // tool path trail
    for (let i = 1; i < trail.length; i += 1) {
      ctx.strokeStyle = `rgba(210, 48, 30, ${(i / trail.length) * 0.35})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }

    goalMarker();
    pedestal();

    const open = 0.05 * s + (reducedMotion ? 0 : 0.025 * s * (Math.sin(clock * 1.6) + 1) / 2);
    link(j1, j2, 0.085 * s, 0.07 * s, true);
    link(j2, j3, 0.068 * s, 0.056 * s, false);
    link(j3, end, 0.05 * s, 0.045 * s, false);
    gripper(end, open);
    hub(j3, 0.08 * s, q.q1 + q.q2 + q.q3);
    hub(j2, 0.105 * s, q.q1 + q.q2);
    hub(j1, 0.13 * s, q.q1);

    angleArc(j1, 0, q.q1, 0.3 * s, 'θ1');
    angleArc(j2, q.q1, q.q1 + q.q2, 0.24 * s, 'θ2');

    return end;
  }

  /* ---------------------------------------------------------------- loop */
  const deg = (r) => `${((r * 180) / Math.PI).toFixed(1)}°`;

  function frame(now) {
    rafId = 0;
    clock = now / 1000;
    if (!driven) Object.assign(goal, idlePoint(reducedMotion ? 0 : clock));

    const k = driven ? 0.16 : 0.08;
    tip.x += (goal.x - tip.x) * k;
    tip.y += (goal.y - tip.y) * k;

    const q = solve(tip.x, tip.y);
    const end = draw(q);

    if (!reducedMotion) {
      trail.push({ x: end.x, y: end.y });
      if (trail.length > 60) trail.shift();
    }

    if (now - lastReadout > 90) {
      lastReadout = now;
      ro.q1.textContent = deg(q.q1);
      ro.q2.textContent = deg(q.q2);
      ro.x.textContent = (((end.x - base.x) / s) * METRES_PER_UNIT).toFixed(2);
      ro.y.textContent = (((base.y - end.y) / s) * METRES_PER_UNIT).toFixed(2);
    }

    const settled = Math.hypot(goal.x - tip.x, goal.y - tip.y) < 0.3;
    if (visible && !document.hidden && (!reducedMotion || !settled)) {
      rafId = window.requestAnimationFrame(frame);
    }
  }

  function wake() {
    if (!rafId && visible) rafId = window.requestAnimationFrame(frame);
  }

  function setDriven(on) {
    driven = on;
    instrument.classList.toggle('is-driven', on);
    if (modeEl) modeEl.textContent = on ? 'Manual' : 'Auto';
  }

  function pointerTo(e) {
    const rect = stage.getBoundingClientRect();
    goal.x = e.clientX - rect.left;
    // keep the gripper above the floor
    goal.y = Math.min(e.clientY - rect.top, floorY - 0.24 * s);
    window.clearTimeout(releaseTimer);
    setDriven(true);
    wake();
  }

  stage.addEventListener('pointermove', pointerTo);
  stage.addEventListener('pointerdown', pointerTo);
  stage.addEventListener('pointerleave', () => {
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => { setDriven(false); wake(); }, 900);
  });

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) wake();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(wake);
})();
