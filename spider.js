/* ==========================================================================
   TARANTULA — the real CAD, trotting
   tarantula_rig.glb holds the body and ONE leg split into its three links
   (coxa / femur / tibia), each expressed in its own joint frame — metres,
   Z up, X radial. The leg is instanced four times and driven by the same
   kinematics as the robot's firmware (Leg.cpp: R_HIP, L1, L2, L3, knee-up IK).

   Gait: diagonal trot, refined over the firmware version —
   · duty factor 0.58, so both diagonals share a short double-support phase
   · quintic swing in x whose end velocities match the stance velocity, so
     each foot lifts off and touches down with zero velocity w.r.t. the ground
   · smooth z bump (zero velocity and acceleration at lift-off / touch-down)
   · small body bob and roll synchronised with the diagonals
   The floor slides underneath at walking speed. Not controllable: it walks.
   ========================================================================== */

const mount = document.getElementById('spider3d');

if (mount) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      boot().catch((err) => {
        console.warn('3D model unavailable:', err);
        mount.classList.add('is-failed');
      });
    }
  }, { rootMargin: '500px 0px' });
  io.observe(mount);
}

async function boot() {
  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------ robot constants (Leg.h) */
  const R_HIP = 0.15;
  const L1 = 0.08;
  const L2 = 0.188;
  const L3 = 0.211;
  const LEG_THETA = [Math.PI / 4, -Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4];
  const FOOT_RADIUS = 0.006;
  const DEG = Math.PI / 180;

  // neutral stance used by the firmware: q = (0°, 20°, -100°)
  const Q2N = 20 * DEG;
  const Q3N = -100 * DEG;
  const R_NEUTRAL = L1 + L2 * Math.cos(Q2N) + L3 * Math.cos(Q2N + Q3N);
  const Z_NEUTRAL = L2 * Math.sin(Q2N) + L3 * Math.sin(Q2N + Q3N); // < 0
  const BODY_H = -Z_NEUTRAL + FOOT_RADIUS;

  /* ------------------------------------------------------------ gait */
  const GAIT = {
    T: 1.3,          // s per cycle
    duty: 0.58,      // stance fraction
    stride: 0.1,     // m
    lift: 0.05,      // m (firmware SWING_HEIGHT)
    offsets: [0, 0.5, 0, 0.5], // diagonals (0,2) and (1,3)
    bob: 0.004,      // m
    roll: 1.2 * DEG,
  };
  const SPEED = GAIT.stride / (GAIT.duty * GAIT.T);

  // quintic Hermite with zero end accelerations
  function quintic(p0, p1, v0, v1, s) {
    const s2 = s * s;
    const s3 = s2 * s;
    const s4 = s3 * s;
    const s5 = s4 * s;
    return (1 - 10 * s3 + 15 * s4 - 6 * s5) * p0
      + (10 * s3 - 15 * s4 + 6 * s5) * p1
      + (s - 6 * s3 + 8 * s4 - 3 * s5) * v0
      + (-4 * s3 + 7 * s4 - 3 * s5) * v1;
  }

  // foot offset (dx along walking direction, dz up) for a leg phase p in [0, 1)
  function footOffset(p) {
    const { duty, stride: S, lift } = GAIT;
    if (p < duty) return { dx: S / 2 - S * (p / duty), dz: 0 };
    const s = (p - duty) / (1 - duty);
    const v = -S * (1 - duty) / duty; // stance velocity, in swing-normalised time
    return {
      dx: quintic(-S / 2, S / 2, v, v, s),
      dz: lift * 64 * s * s * s * (1 - s) * (1 - s) * (1 - s),
    };
  }

  // Leg::solveIK, knee up
  function solveIK(x, y, z) {
    const q1 = Math.atan2(y, x);
    const s = Math.hypot(x, y) - L1;
    const D2 = s * s + z * z;
    const D = Math.sqrt(D2);
    const c3 = Math.min(1, Math.max(-1, (D2 - L2 * L2 - L3 * L3) / (2 * L2 * L3)));
    const q3 = -Math.acos(c3);
    const a1 = Math.atan2(z, s);
    const c2 = Math.min(1, Math.max(-1, (L2 * L2 + D2 - L3 * L3) / (2 * L2 * D)));
    const q2 = a1 + Math.acos(c2);
    return [q1, q2, q3];
  }

  /* ------------------------------------------------------------ renderer */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 30);
  scene.add(camera);

  // the robot's code is Z-up; the scene (camera, environment, lights) stays Y-up
  const world = new THREE.Group();
  world.rotation.x = -Math.PI / 2;
  scene.add(world);

  /* ------------------------------------------------------------ lights */
  scene.add(new THREE.HemisphereLight(0xfff4ec, 0xe7b0a4, 0.5));
  const key = new THREE.DirectionalLight(0xfff6ee, 1.8);
  key.position.set(0.9, 2.2, -0.7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -0.8, right: 0.8, top: 0.8, bottom: -0.8, near: 0.2, far: 6 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.003;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc9bd, 1.1);
  rim.position.set(-1.4, 0.9, 1.1);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xfff1ea, 0.55);
  fill.position.set(0.4, 0.6, 1);
  camera.add(fill);

  /* ------------------------------------------------------------ materials */
  const MAT = {
    carbon: new THREE.MeshPhysicalMaterial({ color: 0x232327, roughness: 0.38, metalness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
    plate: new THREE.MeshPhysicalMaterial({ color: 0x2e3038, roughness: 0.45, metalness: 0.2, clearcoat: 0.35 }),
    housing: new THREE.MeshStandardMaterial({ color: 0x29292d, roughness: 0.58, metalness: 0.05 }),
    motor: new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.3, metalness: 0.75 }),
    cover: new THREE.MeshStandardMaterial({ color: 0xeee5da, roughness: 0.38, metalness: 0.15 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x9a9aa0, roughness: 0.28, metalness: 0.85 }),
  };
  // the CAD colours tell the parts apart: map them onto the site's materials
  function siteMaterial(cadColor, isBody) {
    const l = (cadColor.r + cadColor.g + cadColor.b) / 3;
    if (l < 0.08) return isBody ? MAT.plate : MAT.carbon;
    if (l < 0.42) return MAT.metal;
    if (l < 0.58) return MAT.motor;
    if (l < 0.8) return MAT.housing; // parts without colour in the CAD (printed, black in reality)
    return MAT.cover;
  }

  /* ------------------------------------------------------------ model */
  const gltf = await new GLTFLoader().loadAsync('tarantula_rig.glb');
  const parts = Object.fromEntries(gltf.scene.children.map((n) => [n.name, n]));
  const prep = (obj, isBody = false) => {
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.material = siteMaterial(o.material.color, isBody);
      o.castShadow = true;
      o.receiveShadow = true;
    });
    return obj;
  };
  prep(parts.body, true);
  ['coxa', 'femur', 'tibia'].forEach((k) => prep(parts[k]));

  // hierarchy as in the firmware viewer: mirrored root (code frame is X fwd, Y right)
  const root = new THREE.Group();
  root.scale.y = -1;
  world.add(root);
  const body = new THREE.Group();
  body.rotation.order = 'ZYX';
  root.add(body);
  body.add(parts.body);

  const legs = LEG_THETA.map((theta) => {
    const base = new THREE.Group();
    base.position.set(R_HIP * Math.cos(theta), R_HIP * Math.sin(theta), 0);
    base.rotation.z = theta;
    body.add(base);
    const coxa = new THREE.Group();
    base.add(coxa);
    const hip = new THREE.Group();
    hip.position.x = L1;
    coxa.add(hip);
    const knee = new THREE.Group();
    knee.position.x = L2;
    hip.add(knee);
    // the quantised node transforms (translation/scale) are part of the geometry: keep them
    coxa.add(parts.coxa.clone(true));
    hip.add(parts.femur.clone(true));
    knee.add(parts.tibia.clone(true));
    const rN = R_HIP + R_NEUTRAL;
    return { theta, coxa, hip, knee, neutral: new THREE.Vector2(rN * Math.cos(theta), rN * Math.sin(theta)) };
  });

  /* ------------------------------------------------------------ floor */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.ShadowMaterial({ color: 0x8a2a1c, opacity: 0.24 }),
  );
  ground.receiveShadow = true;
  world.add(ground);

  const TILE = 0.06;
  const dots = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(166, 36, 26, 0.36)';
    g.beginPath();
    g.arc(32, 32, 2.6, 0, Math.PI * 2);
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.6 / TILE, 1.6 / TILE);
    t.anisotropy = 4;
    return t;
  })();
  const fade = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    grd.addColorStop(0, '#fff');
    grd.addColorStop(0.45, '#999');
    grd.addColorStop(0.85, '#000');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.6),
    new THREE.MeshBasicMaterial({ map: dots, alphaMap: fade, transparent: true, depthWrite: false }),
  );
  floor.position.z = 0.0005;
  world.add(floor);

  /* ------------------------------------------------------------ pose */
  const tmp = new THREE.Vector3();
  const inv = new THREE.Matrix4();

  function pose(phase) {
    // body: height + bob (lowest just after each diagonal touches down) + gentle roll
    const tdA = GAIT.duty - 0.5; // touch-down phase of the second diagonal
    const bob = -GAIT.bob * Math.cos(4 * Math.PI * (phase - tdA - 0.04));
    const roll = GAIT.roll * Math.sin(2 * Math.PI * (phase - 0.25));
    body.position.set(0, 0, BODY_H + bob);
    body.rotation.set(roll, 0, 0);
    body.updateMatrix();
    inv.copy(body.matrix).invert();

    legs.forEach((leg, i) => {
      const p = (phase + GAIT.offsets[i]) % 1;
      const { dx, dz } = reducedMotion ? { dx: 0, dz: 0 } : footOffset(p);
      // foot in the world (body-centred, ground at z = FOOT_RADIUS) → body frame → leg frame
      tmp.set(leg.neutral.x + dx, leg.neutral.y, FOOT_RADIUS + dz).applyMatrix4(inv);
      const hx = tmp.x - R_HIP * Math.cos(leg.theta);
      const hy = tmp.y - R_HIP * Math.sin(leg.theta);
      const c = Math.cos(-leg.theta);
      const s = Math.sin(-leg.theta);
      const [q1, q2, q3] = solveIK(c * hx - s * hy, s * hx + c * hy, tmp.z);
      leg.coxa.rotation.z = q1;
      leg.hip.rotation.y = -q2;
      leg.knee.rotation.y = -q3;
    });
  }

  /* ------------------------------------------------------------ controls */
  mount.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = 0.7;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.42;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.7;
  controls.target.set(0, 0.09, 0);
  renderer.domElement.style.touchAction = 'pan-y';

  let resumeTimer = 0;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    mount.classList.add('is-touched');
    window.clearTimeout(resumeTimer);
  });
  controls.addEventListener('end', () => {
    if (reducedMotion) return;
    resumeTimer = window.setTimeout(() => { controls.autoRotate = true; }, 3500);
  });

  // a click (not a drag) on the model opens the project sheet
  const playBtn = document.querySelector('.spider__play');
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener('click', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved < 6 && performance.now() - down.t < 450 && playBtn) playBtn.click();
    down = null;
  });

  /* ------------------------------------------------------------ layout */
  function resize() {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = 1.4 * Math.max(1, 1.3 / camera.aspect);
    if (!camera.userData.placed) {
      const polar = 1.1;
      const azimuth = 0.8; // three-quarter view
      camera.position.set(
        controls.target.x + dist * Math.sin(polar) * Math.sin(azimuth),
        controls.target.y + dist * Math.cos(polar),
        controls.target.z + dist * Math.sin(polar) * Math.cos(azimuth),
      );
      camera.userData.placed = true;
    } else {
      const v = camera.position.clone().sub(controls.target).setLength(dist);
      camera.position.copy(controls.target).add(v);
    }
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(mount);
  resize();

  /* ------------------------------------------------------------ loop */
  let visible = true;
  let running = false;
  let phase = 0.2;
  let last = performance.now();
  let scroll = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reducedMotion) {
      phase = (phase + dt / GAIT.T) % 1;
      scroll += (SPEED * dt) / TILE; // the floor slides back at walking speed
      dots.offset.x = scroll % 1;
    }
    pose(phase);
    controls.update();
    renderer.render(scene, camera);
    if (visible && !document.hidden) {
      window.requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    window.requestAnimationFrame(frame);
  }

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) start();
  }).observe(mount);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) start(); });

  mount.classList.add('is-ready');
  start();
}
