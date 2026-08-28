(() => {
  "use strict";

  const L = window.YAEL_LEVEL;
  const SPR = window.YAEL_SPRITES.get();
  const { TILE, PHYS, T, solid, oneWay } = L;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const VIEW_W = 960;
  const VIEW_H = 540;

  const WEAPONS = [
    {
      id: "ar",
      name: "RIFLE DE ASALTO",
      short: "MA5B",
      color: "#5a6b3a",
      accent: "#c4d46a",
      dmg: 8,
      speed: 16,
      spread: 0.07,
      cooldown: 6,
      maxAmmo: 90,
      automatic: true,
      pellets: 1,
      r: 3.2,
      kick: 0.35,
      specialName: "RAFAGA DE FRAG",
      specialAmmo: 6,
    },
    {
      id: "magnum",
      name: "MAGNUM",
      short: "M6G",
      color: "#d4b44a",
      accent: "#fff3b0",
      dmg: 28,
      speed: 20,
      spread: 0.008,
      cooldown: 18,
      maxAmmo: 18,
      automatic: false,
      pellets: 1,
      r: 4.2,
      kick: 1.4,
      specialName: "PERFORANTE",
      specialAmmo: 2,
    },
    {
      id: "shotgun",
      name: "ESCOPETA",
      short: "M90",
      color: "#6b3a1f",
      accent: "#e8c39e",
      dmg: 9,
      speed: 14,
      spread: 0.24,
      cooldown: 32,
      maxAmmo: 12,
      automatic: false,
      pellets: 7,
      r: 2.6,
      kick: 2.0,
      specialName: "EXPLOSION",
      specialAmmo: 2,
    },
    {
      id: "plasma",
      name: "RIFLE PLASMA",
      short: "PLASMA",
      color: "#7b2cbf",
      accent: "#e0aaff",
      dmg: 12,
      speed: 11,
      spread: 0.03,
      cooldown: 8,
      maxAmmo: 60,
      automatic: true,
      pellets: 1,
      r: 5,
      kick: 0.25,
      plasma: true,
      specialName: "SOBRECARGA",
      specialAmmo: 8,
    },
  ];

  const keys = Object.create(null);
  const mouse = { x: VIEW_W / 2, y: VIEW_H / 2, left: false, right: false, leftClick: false, rightClick: false };

  let state = "menu";
  let currentLevel = 1;
  let levelName = "NIVEL 1: PROTOCOLO BELMONT";
  let time = 0;
  let shake = 0;
  let cam = { x: 0, y: 0 };
  let worldW = 0;
  let worldH = 0;
  let tiles = [];
  let tileMeta = [];
  let player = null;
  let enemies = [];
  let bullets = [];
  let particles = [];
  let pickups = [];
  let floating = [];
  let lavaSpawns = [];
  let zones = [];
  let spawns = null;
  let coins = 0;
  let kills = 0;
  let lives = 4;
  let winT = 0;
  let seaKingSpawned = false;
  let audio = null;
  let muted = false;
  let doorX = 0;
  let doorY = 0;
  let groundY = 13;
  let risingLavaY = 999999;
  let risingLavaSpeed = 0;
  let isVerticalLevel = false;

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function irand(a, b) {
    return (a + Math.random() * (b - a + 1)) | 0;
  }
  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }
  function angTo(ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
  }

  let bgm = null;

  function initBGM() {
    if (bgm) return;
    try {
      bgm = new Audio("Battle of the Brass.mp3");
      bgm.loop = true;
      bgm.volume = 0.35; // Volumen equilibrado para destacar los efectos de armas y explosiones
    } catch (err) {}
  }

  function playBGM() {
    initBGM();
    if (!bgm) return;
    if (muted) {
      bgm.muted = true;
    } else {
      bgm.muted = false;
      if (bgm.paused) {
        bgm.play().catch(() => {});
      }
    }
  }

  function pauseBGM() {
    if (bgm && !bgm.paused) bgm.pause();
  }

  function ensureAudio() {
    if (!muted && !audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio = new AC();
    }
    playBGM();
  }

  function beep(freq, dur, type, vol, slide) {
    if (!audio || muted) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), audio.currentTime + dur);
    g.gain.value = vol || 0.05;
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + dur);
  }

  function noiseBurst(dur, vol) {
    if (!audio || muted) return;
    const n = audio.createBuffer(1, audio.sampleRate * dur, audio.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = audio.createBufferSource();
    const g = audio.createGain();
    const f = audio.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1100;
    s.buffer = n;
    g.gain.value = vol || 0.07;
    s.connect(f);
    f.connect(g);
    g.connect(audio.destination);
    s.start();
  }

  const sfx = {
    jump: () => beep(380, 0.14, "square", 0.045, 140),
    shoot: (w) => {
      if (w.plasma) beep(880, 0.08, "sawtooth", 0.04, 220);
      else noiseBurst(0.045, 0.06);
      beep(w.plasma ? 420 : 180, 0.05, "square", 0.025);
    },
    special: () => {
      noiseBurst(0.16, 0.1);
      beep(140, 0.2, "sawtooth", 0.06, 60);
    },
    hit: () => beep(220, 0.07, "square", 0.05, 80),
    hurt: () => {
      beep(150, 0.18, "sawtooth", 0.07, 60);
      shake = 10;
    },
    coin: () => beep(880, 0.08, "square", 0.045, 1320),
    kill: () => beep(300, 0.14, "triangle", 0.05, 90),
    pickup: () => beep(520, 0.12, "square", 0.045, 780),
    empty: () => beep(90, 0.05, "square", 0.035),
    win: () => {
      beep(523, 0.15, "square", 0.055);
      setTimeout(() => beep(659, 0.15, "square", 0.055), 140);
      setTimeout(() => beep(784, 0.3, "square", 0.06), 280);
    },
    switch: () => beep(640, 0.06, "square", 0.035),
    emerge: () => beep(70, 0.22, "sawtooth", 0.045, 36),
    alarm: () => {
      beep(880, 0.07, "sawtooth", 0.07, 1200);
      setTimeout(() => beep(1020, 0.07, "sawtooth", 0.07, 1500), 60);
    },
    greenFire: () => {
      beep(620, 0.08, "sawtooth", 0.04, 280);
      noiseBurst(0.03, 0.035);
    },
    bossDash: () => {
      noiseBurst(0.18, 0.12);
      beep(95, 0.25, "sawtooth", 0.08, 40);
    },
    overheat: () => {
      beep(320, 0.35, "sine", 0.06, 120);
      noiseBurst(0.12, 0.04);
    },
    laserBeam: () => beep(120, 0.4, "sawtooth", 0.08, 40),
    tractorBeam: () => beep(440, 0.25, "sine", 0.06, 660),
    stunOrb: () => beep(880, 0.12, "triangle", 0.07, 220),
    stunShock: () => noiseBurst(0.12, 0.05),
  };

  function fitCanvas() {
    const ww = window.innerWidth - 24;
    const wh = window.innerHeight - 24;
    const scale = Math.max(1, Math.min(ww / VIEW_W, wh / VIEW_H));
    canvas.style.width = Math.floor(VIEW_W * scale) + "px";
    canvas.style.height = Math.floor(VIEW_H * scale) + "px";
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener("resize", fitCanvas);
  fitCanvas();

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(k)) e.preventDefault();
    if (k === "enter" || k === " ") {
      if (state === "menu") startGame(currentLevel || 1);
      else if (state === "level_clear") startGame(2);
      else if (state === "level_clear_2") startGame(3);
      else if (state === "dead" && lives <= 0) startGame(currentLevel || 1);
      else if (state === "win") startGame(1);
    }
    if (k === "1" && (state === "menu" || state === "dead" || state === "win" || state.startsWith("level_clear"))) startGame(1);
    if (k === "2" && (state === "menu" || state === "dead" || state === "win" || state.startsWith("level_clear"))) startGame(2);
    if (k === "3" && (state === "menu" || state === "dead" || state === "win" || state.startsWith("level_clear"))) startGame(3);
    if (k === "p" && state === "play") {
      state = "pause";
      pauseBGM();
    } else if (k === "p" && state === "pause") {
      state = "play";
      playBGM();
    }
    if (k === "m") {
      muted = !muted;
      if (bgm) bgm.muted = muted;
    }
    if (k === "e" && state === "play") cycleWeapon();
    if (k === "r" && (state === "dead" || state === "win" || state.startsWith("level_clear"))) startGame(currentLevel);
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * VIEW_W;
    mouse.y = ((e.clientY - r.top) / r.height) * VIEW_H;
  });
  canvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    ensureAudio();
    if (e.button === 0) {
      mouse.left = true;
      mouse.leftClick = true;
    }
    if (e.button === 2) {
      mouse.right = true;
      mouse.rightClick = true;
    }
    if (state === "menu") startGame();
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  function tileAt(tx, ty) {
    if (ty < 0 || ty >= worldH || tx < 0 || tx >= worldW) return T.EMPTY;
    return tiles[ty][tx];
  }
  function setTile(tx, ty, v) {
    if (ty < 0 || ty >= worldH || tx < 0 || tx >= worldW) return;
  function makePlayer() {
    return {
      x: 3 * TILE,
      y: groundY * TILE - PHYS.PLAYER_H,
      vx: 0,
      vy: 0,
      w: PHYS.PLAYER_W,
      h: PHYS.PLAYER_H,
      onGround: false,
      crouch: false,
      facing: 1,
      hp: 6,
      maxHp: 6,
      inv: 0,
      coyote: 0,
      jumpBuf: 0,
      weapon: 0,
      ammo: WEAPONS.map((w) => w.maxAmmo),
      cool: 0,
      charge: 0,
      charging: false,
      anim: 0,
      dead: false,
      t: 0,
      stunTimer: 0,
      trapped: false,
      grabEscape: 0,
    };
  }

  function startGame(lvlNum) {
    if (lvlNum !== undefined) currentLevel = lvlNum;
    else currentLevel = currentLevel || 1;
    ensureAudio();
    if (audio && audio.state === "suspended") audio.resume();
    const lvl = L.buildLevel(currentLevel);
    tiles = lvl.tiles;
    tileMeta = lvl.tileMeta;
    lavaSpawns = lvl.lavaSpawns || [];
    zones = lvl.zones || [];
    spawns = lvl.spawns || null;
    worldW = lvl.worldW;
    worldH = lvl.worldH;
    groundY = lvl.groundY;
    doorX = lvl.doorX;
    doorY = lvl.doorY || (groundY - 1) * TILE;
    isVerticalLevel = !!lvl.isVertical;
    levelName = lvl.name || ("NIVEL " + currentLevel);
    player = makePlayer();

    if (currentLevel === 3) {
      player.x = 18 * TILE;
      player.y = 175 * TILE - PHYS.PLAYER_H;
      risingLavaY = 179 * TILE;
      risingLavaSpeed = 0.42;
    } else {
      risingLavaY = 999999;
      risingLavaSpeed = 0;
    }

    enemies = [];
    bullets = [];
    particles = [];
    pickups = [];
    floating = [];
    if (currentLevel === 1) {
      coins = 0;
      kills = 0;
      lives = 4;
    }
    winT = 0;
    seaKingSpawned = false;
    shake = 0;
    state = "play";
    snapCam();
    spawnYaelEnemies();
  }

  function snapCam() {
    cam.x = clamp(player.x - VIEW_W * 0.38, 0, Math.max(0, worldW * TILE - VIEW_W));
    cam.y = clamp(player.y - VIEW_H * 0.62, 0, Math.max(0, worldH * TILE - VIEW_H));
  }

  function spawnYaelEnemies() {
    if (currentLevel === 1) {
      if (spawns && spawns.comun) {
        spawnEnemy("shark", spawns.comun.tileX * TILE, groundY * TILE);
      }
      if (spawns && spawns.boss) {
        spawnEnemy("seaking", spawns.boss.tileX * TILE, groundY * TILE);
      }
    } else if (currentLevel === 2) {
      if (spawns && spawns.radstars) {
        for (const rs of spawns.radstars) {
          spawnEnemy("radstar", rs.tileX * TILE, rs.tileY * TILE);
        }
      }
      if (spawns && spawns.boss) {
        spawnEnemy("radboss", spawns.boss.tileX * TILE, groundY * TILE);
      }
    } else if (currentLevel === 3) {
      if (spawns && spawns.towerEnemies) {
        for (const te of spawns.towerEnemies) {
          spawnEnemy(te.type, te.tileX * TILE, te.tileY * TILE);
        }
      }
      if (spawns && spawns.boss) {
        spawnEnemy("alien_ship", spawns.boss.tileX * TILE, spawns.boss.tileY * TILE);
      }
    }
  }

  function cycleWeapon() {
    if (!player || player.dead) return;
    player.weapon = (player.weapon + 1) % WEAPONS.length;
    player.cool = 8;
    player.charge = 0;
    player.charging = false;
    sfx.switch();
    floatText(player.x, player.y - 20, WEAPONS[player.weapon].short, "#5cf6ff");
  }

  function mouseWorld() {
    return { x: mouse.x + cam.x, y: mouse.y + cam.y };
  }
  function bodyBox(p) {
    return { x: p.x, y: p.y, w: p.w, h: p.h };
  }
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function tilesTouching(box) {
    const x0 = Math.floor(box.x / TILE);
    const y0 = Math.floor(box.y / TILE);
    const x1 = Math.floor((box.x + box.w - 0.01) / TILE);
    const y1 = Math.floor((box.y + box.h - 0.01) / TILE);
    const out = [];
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) out.push({ tx, ty, id: tileAt(tx, ty) });
    }
    return out;
  }

  function bumpBlock() {}

  function blocksH(id) {
    return solid(id) || id === T.LAVA;
  }

  function moveActor(e) {
    const boxH = { x: e.x + e.vx, y: e.y, w: e.w, h: e.h };
    for (const t of tilesTouching(boxH)) {
      if (!blocksH(t.id)) continue;
      const rx = t.tx * TILE;
      if (e.vx > 0) e.x = rx - e.w;
      else if (e.vx < 0) e.x = rx + TILE;
      e.vx = 0;
    }
    e.x += e.vx;

    e.onGround = false;
    const boxV = { x: e.x, y: e.y + e.vy, w: e.w, h: e.h };
    for (const t of tilesTouching(boxV)) {
      if (t.id === T.LAVA) e.inLava = true;
      const ry = t.ty * TILE;
      if (oneWay(t.id)) {
        if (e.vy >= 0 && e.y + e.h <= ry + 12) {
          e.y = ry - e.h;
          e.vy = 0;
          e.onGround = true;
        }
        continue;
      }
      if (!blocksH(t.id)) continue;
      if (e.vy > 0) {
        e.y = ry - e.h;
        e.vy = 0;
        e.onGround = true;
      } else if (e.vy < 0) {
        e.y = ry + TILE;
        e.vy = 0;
        bumpBlock();
      }
    }
    e.y += e.vy;
    if (e.x < 0) {
      e.x = 0;
      e.vx = 0;
    }
    if (e.x + e.w > worldW * TILE) {
      e.x = worldW * TILE - e.w;
      e.vx = 0;
    }
    if (e.y > worldH * TILE + 80) e.fell = true;
  }

  function gunPos() {
    const b = bodyBox(player);
    return { x: b.x + b.w / 2, y: b.y + (player.crouch ? 10 : 14) };
  }

  function spawnBullet(x, y, ang, extra) {
    const w = WEAPONS[player.weapon];
    bullets.push({
      x,
      y,
      vx: Math.cos(ang) * (extra.speed || w.speed),
      vy: Math.sin(ang) * (extra.speed || w.speed),
      r: extra.r || w.r,
      dmg: extra.dmg || w.dmg,
      life: extra.life || 50,
      owner: "player",
      plasma: extra.plasma || w.plasma || false,
      pierce: extra.pierce || 0,
      explode: extra.explode || 0,
      color: extra.color || (w.plasma ? "#c77dff" : "#fff3bf"),
      hit: [],
    });
  }

  function fireWeapon(special) {
    const w = WEAPONS[player.weapon];
    if (player.cool > 0) return;
    const cost = special ? w.specialAmmo : w.pellets;
    if (player.ammo[player.weapon] < cost) {
      sfx.empty();
      player.cool = 12;
      return;
    }
    player.ammo[player.weapon] -= cost;
    player.cool = special ? w.cooldown * 1.6 : w.cooldown;
    const g = gunPos();
    const m = mouseWorld();
    const base = angTo(g.x, g.y, m.x, m.y);
    shake = Math.max(shake, special ? 8 : w.kick * 3);

    if (special && w.id === "ar") {
      for (let i = 0; i < 5; i++) spawnBullet(g.x, g.y, base + rand(-0.28, 0.28), { dmg: 16, speed: 12, r: 5, explode: 28, color: "#f4a261", life: 40 });
      sfx.special();
    } else if (special && w.id === "magnum") {
      spawnBullet(g.x, g.y, base, { dmg: 52, speed: 24, r: 5, pierce: 4, life: 70, color: "#ffe066" });
      sfx.special();
    } else if (special && w.id === "shotgun") {
      for (let i = 0; i < 12; i++) spawnBullet(g.x, g.y, base + rand(-0.2, 0.2), { dmg: 14, speed: rand(14, 18), r: 3, life: 18, color: "#ffd166" });
      sfx.special();
    } else if (special && w.id === "plasma") {
      spawnBullet(g.x, g.y, base, { dmg: 36, speed: 8, r: 11, explode: 56, plasma: true, life: 70, color: "#e0aaff" });
      sfx.special();
    } else {
      for (let i = 0; i < w.pellets; i++) spawnBullet(g.x, g.y, base + rand(-w.spread, w.spread), { life: w.id === "shotgun" ? 16 : 55 });
      sfx.shoot(w);
    }
    burst(g.x + Math.cos(base) * 18, g.y + Math.sin(base) * 18, w.accent, special ? 12 : 5);
    player.vx -= Math.cos(base) * (special ? 1.2 : w.kick * 0.3);
  }

  function explode(x, y, r, dmg) {
    burst(x, y, "#ff9f1c", 22);
    burst(x, y, "#fff", 10);
    shake = Math.max(shake, 12);
    for (const en of enemies) {
      if (en.dead) continue;
      if (dist(x, y, en.x + en.w / 2, en.y + en.h / 2) < r + 10) hurtEnemy(en, dmg);
    }
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      particles.push({ x, y, vx: rand(-3, 3), vy: rand(-4, 1), life: irand(12, 28), max: 28, color, s: rand(2, 5), g: 0.12 });
    }
  }

  function floatText(x, y, text, color) {
    floating.push({ x, y, text, color, life: 50 });
  }

  const ENEMY_TYPES = {
    shark: { name: "Gyojin Tiburon", hp: 40, w: 42, h: 30, speed: 1.45, dmg: 1, score: 200, spit: false },
    octopus: { name: "Gyojin Pulpo", hp: 28, w: 36, h: 30, speed: 0.95, dmg: 1, score: 250, spit: true },
    eel: { name: "Anguila Magma", hp: 20, w: 48, h: 18, speed: 2.2, dmg: 1, score: 180, spit: false },
    crab: { name: "Cangrejo Lava", hp: 62, w: 48, h: 28, speed: 0.75, dmg: 1, score: 300, spit: false },
    seaking: { name: "Rey Marino", hp: 200, w: 72, h: 40, speed: 0.6, dmg: 2, score: 2000, spit: true, boss: true },
    radstar: { name: "Estrella Radiactiva", hp: 30, w: 44, h: 44, speed: 1.8, dmg: 1, score: 350, flying: true, greenFire: true },
    radboss: { name: "Titan Radiactivo", hp: 950, w: 116, h: 96, speed: 0.8, dmg: 2, score: 6500, boss: true, heavy: true },
  };

  function spawnEnemy(type, x, y) {
    const d = ENEMY_TYPES[type];
    const isFlying = !!d.flying;
    enemies.push({
      type,
      x: x - d.w / 2,
      y: isFlying ? y : y - d.h,
      baseY: y,
      w: d.w,
      h: d.h,
      vx: 0,
      vy: isFlying ? 0 : -2,
      hp: d.hp,
      maxHp: d.hp,
      facing: Math.random() < 0.5 ? -1 : 1,
      state: isFlying ? "hunt" : "emerge",
      t: 0,
      cool: irand(20, 50),
      phaseTimer: 0,
      onGround: false,
      dead: false,
      inLava: false,
      anim: 0,
      ignoreLava: true,
      flash: 0,
    });
    if (isFlying) {
      burst(x, y, "#39ff14", 10);
    } else {
      sfx.emerge();
      burst(x, y, "#ff6b00", 14);
    }
  }

  function hurtEnemy(en, dmg) {
    if (en.dead || en.state === "emerge") return;
    let finalDmg = dmg;
    if (en.type === "radboss") {
      if (en.state === "overheat") {
        finalDmg = Math.floor(dmg * 2);
        floatText(en.x + en.w / 2, en.y - 12, "¡CRITICO! " + finalDmg, "#5cf6ff");
        burst(en.x + en.w / 2, en.y + en.h / 2, "#5cf6ff", 8);
        sfx.hit();
      } else {
        finalDmg = Math.max(1, Math.floor(dmg * 0.35));
        floatText(en.x + en.w / 2, en.y - 12, "ESCUDO " + finalDmg, "#8b9bb4");
        sfx.hit();
      }
    } else {
      floatText(en.x + en.w / 2, en.y, "" + finalDmg, "#fff");
      sfx.hit();
    }
    en.hp -= finalDmg;
    en.flash = 6;
    if (en.hp <= 0) killEnemy(en);
  }

  function killEnemy(en) {
    en.dead = true;
    en.t = 0;
    kills++;
    coins += ENEMY_TYPES[en.type].score / 10;
    sfx.kill();
    const col = en.type === "radstar" ? "#39ff14" : (en.type === "radboss" ? "#ff7b00" : "#7bed9f");
    burst(en.x + en.w / 2, en.y + en.h / 2, col, en.type === "radboss" ? 36 : 16);
    if (Math.random() < 0.65 || ENEMY_TYPES[en.type].boss) {
      const dropCount = ENEMY_TYPES[en.type].boss ? 3 : 1;
      for (let i = 0; i < dropCount; i++) {
        pickups.push({
          x: en.x + en.w / 2 + (i - 1) * 16,
          y: en.y,
          vy: -3 - i,
          kind: Math.random() < 0.4 ? "heart" : "ammo",
          weapon: irand(0, 3),
          life: 420,
        });
      }
    }
  }

  function hurtPlayer(dmg) {
    if (player.inv > 0 || player.dead) return;
    player.hp -= dmg;
    player.inv = 80;
    sfx.hurt();
    burst(player.x + player.w / 2, player.y + player.h / 2, "#ef233c", 12);
    if (player.hp <= 0) {
      player.dead = true;
      player.t = 0;
      lives--;
      burst(player.x + 11, player.y + 18, "#fff", 20);
    }
  }

  function holdingJump() {
    return !!(keys.w || keys.arrowup || keys[" "]);
  }

  function updatePlayer() {
    const p = player;
    if (p.dead) {
      p.t++;
      p.vy += PHYS.GRAVITY * 0.5;
      p.y += p.vy;
      if (p.t > 90) {
        if (lives > 0) {
          p.dead = false;
          p.hp = p.maxHp;
          let rx = Math.max(3, Math.floor((cam.x + 40) / TILE));
          while (rx > 2 && tileAt(rx, groundY) !== T.GRASS) rx--;
          p.x = rx * TILE;
          p.y = groundY * TILE - PHYS.PLAYER_H;
          p.h = PHYS.PLAYER_H;
          p.crouch = false;
          p.vx = 0;
          p.vy = 0;
          p.inv = 130;
          snapCam();
        } else state = "dead";
      }
      return;
    }

    if (p.stunTimer > 0) {
      p.stunTimer--;
      if (Math.random() < 0.4) {
        particles.push({
          x: p.x + rand(0, p.w),
          y: p.y + rand(0, p.h),
          vx: rand(-1, 1),
          vy: rand(-1, 1),
          life: 8,
          max: 8,
          color: Math.random() < 0.5 ? "#5cf6ff" : "#ffe600",
          s: 3,
          g: 0,
        });
      }
    }

    const isStunned = p.stunTimer > 0;
    const isTrapped = p.trapped;

    const wantCrouch = !isStunned && !isTrapped && !!(keys.s || keys.arrowdown) && p.onGround;
    if (wantCrouch && !p.crouch) {
      p.y += PHYS.PLAYER_H - PHYS.CROUCH_H;
      p.h = PHYS.CROUCH_H;
      p.crouch = true;
    } else if (!wantCrouch && p.crouch) {
      const test = { x: p.x, y: p.y - (PHYS.PLAYER_H - PHYS.CROUCH_H), w: p.w, h: PHYS.PLAYER_H };
      let blocked = false;
      for (const t of tilesTouching(test)) if (blocksH(t.id)) blocked = true;
      if (!blocked) {
        p.y -= PHYS.PLAYER_H - PHYS.CROUCH_H;
        p.h = PHYS.PLAYER_H;
        p.crouch = false;
      }
    }

    const max = p.crouch ? PHYS.CROUCH_RUN : PHYS.RUN;
    const acc = p.onGround ? PHYS.ACC : PHYS.AIR_ACC;
    let ax = 0;
    if (!isStunned && !isTrapped) {
      if (keys.a || keys.arrowleft) ax -= 1;
      if (keys.d || keys.arrowright) ax += 1;
    }
    if (ax !== 0) p.vx += ax * acc;
    else p.vx *= p.onGround ? PHYS.FRICTION : PHYS.AIR_FRICTION;
    p.vx = clamp(p.vx, -max, max);

    if (!isStunned && !isTrapped && holdingJump()) p.jumpBuf = PHYS.JUMP_BUF;
    if (p.onGround) p.coyote = PHYS.COYOTE;

    let jumped = false;
    if (!isStunned && !isTrapped && p.jumpBuf > 0 && p.coyote > 0 && !p.crouch) {
      p.vy = PHYS.JUMP;
      p.onGround = false;
      p.jumpBuf = 0;
      p.coyote = 0;
      jumped = true;
      sfx.jump();
    }

    if (!jumped && !isTrapped) {
      if (!holdingJump() && p.vy < -3.2) p.vy *= 0.52;
      const g = p.vy < 0 && holdingJump() ? PHYS.HOLD_GRAV : PHYS.GRAVITY;
      p.vy += g;
    }
    if (p.vy > PHYS.MAX_FALL) p.vy = PHYS.MAX_FALL;

    p.inLava = false;
    p.fell = false;
    if (!isTrapped) moveActor(p);

    if (currentLevel === 3) {
      if (risingLavaY > 26 * TILE) {
        risingLavaY -= risingLavaSpeed;
      }
      if (p.y + p.h >= risingLavaY) {
        p.inLava = true;
      }
    }

    if (p.inLava) {
      hurtPlayer(1);
      p.vy = -9.5;
      burst(p.x + 11, p.y + p.h, "#ff6b00", 8);
    }
    if (p.fell && !p.dead) {
      p.hp = 0;
      p.dead = true;
      p.t = 0;
      lives--;
      sfx.hurt();
    }

    const m = mouseWorld();
    p.facing = m.x >= p.x + p.w / 2 ? 1 : -1;
    if (p.inv > 0) p.inv--;
    if (p.cool > 0) p.cool--;
    if (p.jumpBuf > 0) p.jumpBuf--;
    if (p.coyote > 0) p.coyote--;
    p.anim += Math.abs(p.vx) * 0.16 + 0.06;

    if (!isStunned) {
      if (mouse.right && !p.charging) {
        p.charging = true;
        p.charge = 0;
      }
      if (p.charging && mouse.right) p.charge = Math.min(1, p.charge + 0.02);
      if (p.charging && !mouse.right) {
        if (p.charge >= 0.85) fireWeapon(true);
        else if (p.charge >= 0.3) fireWeapon(false);
        p.charging = false;
        p.charge = 0;
      }

      const w = WEAPONS[p.weapon];
      if (mouse.left && !p.charging) {
        if (w.automatic) fireWeapon(false);
        else if (mouse.leftClick) fireWeapon(false);
      }
    }

    for (const t of tilesTouching(bodyBox(p))) {
      if (t.id === T.DOOR && !p.dead) {
        if (currentLevel === 1) {
          state = "level_clear";
          winT = 0;
          sfx.win();
        } else if (currentLevel === 2) {
          state = "level_clear_2";
          winT = 0;
          sfx.win();
        } else {
          state = "win";
          winT = 0;
          sfx.win();
        }
      }
    }
  }

  function updateEnemies() {
    for (const en of enemies) {
      if (en.dead) {
        en.t++;
        en.vy += 0.3;
        en.y += en.vy;
        en.x += en.vx;
        continue;
      }
      en.t++;
      en.anim += 0.18;
      if (en.flash > 0) en.flash--;
      const def = ENEMY_TYPES[en.type];

      if (en.state === "emerge") {
        en.y -= 0.95;
        en.vy = 0;
        burst(en.x + en.w / 2, en.y + en.h, "#ff6b00", 1);
        if (en.t > 42) {
          en.state = "hunt";
          en.ignoreLava = en.type === "eel" || en.type === "seaking" || en.type === "radboss" || en.type === "alien_ship";
        }
        continue;
      }

      const pcx = player.x + player.w / 2;
      const pcy = player.y + player.h / 2;
      const ecx = en.x + en.w / 2;
      const ecy = en.y + en.h / 2;
      const dx = pcx - ecx;
      en.facing = dx >= 0 ? 1 : -1;

      if (en.type === "alien_ship") {
        // Boss Nave Alienígena de la Cima de la Torre
        en.phaseTimer++;

        if (en.state === "hunt" || en.state === "hover") {
          const targetY = clamp(pcy - 120 + Math.sin(en.t * 0.06) * 30, 8 * TILE, 22 * TILE);
          const targetX = clamp(pcx - en.w / 2 + Math.cos(en.t * 0.04) * 80, 4 * TILE, (worldW - 6) * TILE);
          en.x = lerp(en.x, targetX, 0.05);
          en.y = lerp(en.y, targetY, 0.05);

          if (en.cool <= 0) {
            const a = angTo(ecx, en.y + en.h, pcx, pcy);
            for (let i = -1; i <= 1; i += 2) {
              bullets.push({
                x: ecx + i * 36,
                y: en.y + en.h - 6,
                vx: Math.cos(a + i * 0.1) * 5.8,
                vy: Math.sin(a + i * 0.1) * 5.8,
                r: 6,
                dmg: 1,
                life: 90,
                owner: "enemy",
                plasma: true,
                color: "#5cf6ff",
                hit: [],
              });
            }
            sfx.greenFire();
            en.cool = 55;
          }

          if (en.phaseTimer > 120) {
            en.phaseTimer = 0;
            const r = Math.random();
            if (r < 0.38) {
              en.state = "laser";
              sfx.alarm();
              floatText(ecx, en.y - 20, "¡ALERTA: RAYO LASER VERTICAL!", "#ef233c");
            } else if (r < 0.72) {
              en.state = "tractor";
              sfx.tractorBeam();
              floatText(ecx, en.y - 20, "¡CUIDADO: RAYO TRACTOR!", "#5cf6ff");
            } else {
              en.state = "stun_orb";
              sfx.stunOrb();
              floatText(ecx, en.y - 20, "¡ORBE PARALIZANTE!", "#ffe600");
            }
          }
        } else if (en.state === "laser") {
          if (en.phaseTimer < 45) {
            en.x = lerp(en.x, pcx - en.w / 2, 0.12);
            if (en.phaseTimer % 10 === 0) sfx.alarm();
            particles.push({
              x: ecx + rand(-3, 3),
              y: en.y + en.h + rand(0, 380),
              vx: 0,
              vy: 3,
              life: 6,
              max: 6,
              color: "#ef233c",
              s: 2,
              g: 0,
            });
          } else if (en.phaseTimer < 95) {
            if (en.phaseTimer === 45) sfx.laserBeam();
            shake = Math.max(shake, 6);
            for (let i = 0; i < 4; i++) {
              particles.push({
                x: ecx + rand(-16, 16),
                y: en.y + en.h + rand(0, 420),
                vx: rand(-0.5, 0.5),
                vy: rand(8, 16),
                life: 10,
                max: 10,
                color: Math.random() < 0.5 ? "#fff" : "#ef233c",
                s: rand(3, 7),
                g: 0,
              });
            }
            if (Math.abs(pcx - ecx) < 26 && player.y > en.y + en.h && player.y < en.y + 450) {
              hurtPlayer(1);
            }
          } else {
            en.state = "hover";
            en.phaseTimer = 0;
            en.cool = 40;
          }
        } else if (en.state === "tractor") {
          if (en.phaseTimer < 35) {
            en.x = lerp(en.x, pcx - en.w / 2, 0.08);
            en.y = lerp(en.y, pcy - 120, 0.08);
            for (let i = 0; i < 3; i++) {
              particles.push({
                x: ecx + rand(-30, 30),
                y: en.y + en.h + rand(0, 150),
                vx: rand(-1, 1),
                vy: rand(-3, -1),
                life: 12,
                max: 12,
                color: "#5cf6ff",
                s: 3,
                g: -0.05,
              });
            }
          } else if (en.phaseTimer < 140) {
            const inTractorBeam = Math.abs(pcx - ecx) < 42 && player.y > en.y && player.y < en.y + 190;
            if (inTractorBeam && !player.trapped) {
              player.trapped = true;
              player.grabEscape = 0;
              sfx.tractorBeam();
            }
            if (player.trapped) {
              player.x = lerp(player.x, ecx - player.w / 2, 0.2);
              player.y = lerp(player.y, en.y + en.h + 12, 0.2);
              player.vy = 0;
              player.vx = 0;

              const targetLedge = pcx < (worldW * TILE) / 2 ? 2 * TILE : (worldW - 5) * TILE;
              en.x = lerp(en.x, targetLedge, 0.04);

              if (keys.w || keys.arrowup || keys[" "] || mouse.left || mouse.right) {
                player.grabEscape++;
                burst(player.x + player.w / 2, player.y + player.h / 2, "#5cf6ff", 2);
              }
              if (player.grabEscape > 25 || en.x < 3 * TILE || en.x > (worldW - 6) * TILE) {
                player.trapped = false;
                player.vx = (en.x < (worldW * TILE) / 2 ? -6 : 6);
                player.vy = -4;
                floatText(player.x, player.y - 20, "¡LIBERADO!", "#5cf6ff");
                en.state = "hover";
                en.phaseTimer = 0;
                en.cool = 50;
              }
            } else {
              en.x = lerp(en.x, pcx - en.w / 2, 0.04);
            }
          } else {
            player.trapped = false;
            en.state = "hover";
            en.phaseTimer = 0;
            en.cool = 40;
          }
        } else if (en.state === "stun_orb") {
          const a = angTo(ecx, en.y + en.h, pcx, pcy);
          for (let i = -0.5; i <= 0.5; i += 1) {
            bullets.push({
              x: ecx,
              y: en.y + en.h,
              vx: Math.cos(a + i * 0.22) * 5.2,
              vy: Math.sin(a + i * 0.22) * 5.2,
              r: 8,
              dmg: 1,
              life: 110,
              owner: "enemy",
              stunOrb: true,
              color: "#ffe600",
              hit: [],
            });
          }
          burst(ecx, en.y + en.h, "#ffe600", 12);
          en.state = "hover";
          en.phaseTimer = 0;
          en.cool = 70;
        }
      } else if (en.type === "radstar") {
        const distP = dist(pcx, pcy, ecx, ecy);
        const targetY = clamp(pcy - 40 + Math.sin(en.t * 0.07) * 45, TILE * 2, (groundY - 1) * TILE);
        en.y = lerp(en.y, targetY, 0.04);
        if (distP > 140) {
          en.vx = Math.cos(angTo(ecx, ecy, pcx, targetY)) * (def.speed * 0.9);
          en.x += en.vx;
        } else {
          en.vx = 0;
        }
        if (en.cool <= 0 && distP < 460) {
          const a = angTo(ecx, ecy, pcx, pcy);
          bullets.push({
            x: ecx,
            y: ecy,
            vx: Math.cos(a) * 5.6,
            vy: Math.sin(a) * 5.6,
            r: 6,
            dmg: 1,
            life: 85,
            owner: "enemy",
            greenFire: true,
            color: "#39ff14",
            hit: [],
          });
          sfx.greenFire();
          burst(ecx, ecy, "#39ff14", 6);
          en.cool = irand(65, 105);
        }
      } else if (en.type === "radboss") {
        en.vy += PHYS.GRAVITY * 0.8;
        if (en.vy > PHYS.MAX_FALL) en.vy = PHYS.MAX_FALL;

        if (en.state === "hunt" || en.state === "walk") {
          en.vx = en.facing * def.speed;
          en.phaseTimer++;

          if (en.cool <= 0 && Math.abs(dx) < 560) {
            const a = angTo(ecx, en.y + 35, pcx, player.y + 12);
            bullets.push({
              x: ecx,
              y: en.y + 35,
              vx: Math.cos(a) * 5.8,
              vy: Math.sin(a) * 5.8,
              r: 8,
              dmg: 1,
              life: 90,
              owner: "enemy",
              orangeFire: true,
              color: "#ff7b00",
              hit: [],
            });
            en.cool = 65;
            burst(ecx, en.y + 35, "#ff7b00", 6);
          }

          if (en.phaseTimer > 180 && Math.abs(dx) < 600) {
            en.state = "charge";
            en.phaseTimer = 0;
            en.vx = 0;
            sfx.alarm();
            floatText(ecx, en.y - 20, "¡ALERTA: SOBRECARGA!", "#ffaa00");
          }
        } else if (en.state === "charge") {
          en.phaseTimer++;
          en.vx = 0;
          en.flash = 2;
          if (en.phaseTimer % 18 === 0) {
            sfx.alarm();
            shake = Math.max(shake, 4);
          }
          burst(ecx + rand(-35, 35), en.y + rand(15, 60), "#ff7b00", 3);

          if (en.phaseTimer >= 75) {
            en.state = "attack";
            en.phaseTimer = 0;
            en.facing = dx >= 0 ? 1 : -1;
            en.vx = en.facing * 12.0;
            shake = 12;
            sfx.bossDash();
            const a = angTo(ecx, en.y + 35, pcx, player.y + 10);
            for (let i = -2; i <= 2; i++) {
              bullets.push({
                x: ecx,
                y: en.y + 35,
                vx: Math.cos(a + i * 0.18) * 8.5,
                vy: Math.sin(a + i * 0.18) * 8.5,
                r: 8,
                dmg: 1,
                life: 75,
                owner: "enemy",
                orangeFire: true,
                color: "#ff3c00",
                hit: [],
              });
            }
          }
        } else if (en.state === "attack") {
          en.phaseTimer++;
          burst(ecx, en.y + en.h - 6, "#ff3c00", 3);
          if (en.phaseTimer >= 26) {
            en.state = "overheat";
            en.phaseTimer = 0;
            en.vx = 0;
            sfx.overheat();
            floatText(ecx, en.y - 20, "¡NUCLEO EXPUESTO (2X DANO)!", "#5cf6ff");
          }
        } else if (en.state === "overheat") {
          en.phaseTimer++;
          en.vx = 0;
          if (en.phaseTimer % 10 === 0) {
            burst(ecx, en.y + 35, "#5cf6ff", 4);
            burst(ecx, en.y + 35, "#fff", 3);
          }
          if (en.phaseTimer >= 160) {
            en.state = "walk";
            en.phaseTimer = 0;
            en.cool = 40;
            floatText(ecx, en.y - 20, "ARMADURA RESTAURADA", "#8b9bb4");
          }
        }
        moveActor(en);
      } else if (en.type === "eel") {
        en.vx = en.facing * def.speed * 1.35;
        en.vy += 0.18;
        if (en.inLava) en.vy = -1.4;
        if (Math.abs(dx) < 180 && Math.abs(player.y - en.y) < 90 && en.t % 55 === 0) en.vy = -7;
        moveActor(en);
      } else if (en.type === "seaking") {
        en.vx = en.facing * def.speed;
        en.vy += PHYS.GRAVITY * 0.35;
        if (en.cool <= 0) {
          const a = angTo(ecx, en.y + 16, pcx, player.y + 10);
          for (let i = -1; i <= 1; i++) {
            bullets.push({
              x: ecx,
              y: en.y + 18,
              vx: Math.cos(a + i * 0.2) * 5.8,
              vy: Math.sin(a + i * 0.2) * 5.8,
              r: 7,
              dmg: 1,
              life: 90,
              owner: "enemy",
              plasma: false,
              pierce: 0,
              explode: 0,
              color: "#ff6b00",
              hit: [],
            });
          }
          en.cool = 70;
          sfx.emerge();
        }
        moveActor(en);
      } else {
        en.vx = en.facing * def.speed;
        en.vy += PHYS.GRAVITY;
        if (en.vy > PHYS.MAX_FALL) en.vy = PHYS.MAX_FALL;
        if (en.onGround && Math.abs(dx) < 240 && player.y + 20 < en.y && Math.random() < 0.025) en.vy = -10;
        if (def.spit && en.cool <= 0 && Math.abs(dx) < 320) {
          const a = angTo(ecx, en.y + 12, pcx, player.y + 12);
          bullets.push({
            x: ecx,
            y: en.y + 12,
            vx: Math.cos(a) * 6.2,
            vy: Math.sin(a) * 6.2,
            r: 6,
            dmg: 1,
            life: 80,
            owner: "enemy",
            plasma: false,
            pierce: 0,
            explode: 0,
            color: "#6c2bd9",
            hit: [],
          });
          en.cool = 55;
        }
        moveActor(en);
      }

      if (en.cool > 0) en.cool--;
      en.inLava = false;
      if (en.inLava && !en.ignoreLava) {
        en.vy = -5.5;
      }

      if (!player.dead && en.state !== "emerge" && overlap(bodyBox(player), en)) {
        hurtPlayer(def.dmg);
        player.vx += en.facing * 3.2;
      }
    }
    enemies = enemies.filter((e) => !(e.dead && e.t > 50) && e.y < worldH * TILE + 200);
  }

  function updateBullets() {
    for (const b of bullets) {
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      if (b.plasma) {
        b.vy *= 0.99;
        particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 8, max: 8, color: b.color, s: b.r, g: 0 });
      }
      if (b.greenFire) {
        particles.push({ x: b.x + rand(-2, 2), y: b.y + rand(-2, 2), vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), life: 7, max: 7, color: "#39ff14", s: 3, g: 0 });
      }
      if (b.orangeFire) {
        particles.push({ x: b.x + rand(-3, 3), y: b.y + rand(-3, 3), vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), life: 8, max: 8, color: "#ff7b00", s: 4, g: 0.05 });
      }
      if (b.stunOrb) {
        particles.push({
          x: b.x + rand(-3, 3),
          y: b.y + rand(-3, 3),
          vx: rand(-0.5, 0.5),
          vy: rand(-0.5, 0.5),
          life: 8,
          max: 8,
          color: Math.random() < 0.5 ? "#5cf6ff" : "#ffe600",
          s: 4,
          g: 0,
        });
      }
      const box = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
      let hitTile = false;
      for (const t of tilesTouching(box)) {
        if (solid(t.id) || t.id === T.DOOR) {
          hitTile = true;
          break;
        }
      }
      if (hitTile) {
        b.life = 0;
        if (b.explode) explode(b.x, b.y, b.explode, b.dmg);
        else burst(b.x, b.y, b.color, 4);
        continue;
      }
      if (b.owner === "player") {
        for (const en of enemies) {
          if (en.dead || en.state === "emerge") continue;
          if (b.hit.includes(en)) continue;
          if (b.x > en.x && b.x < en.x + en.w && b.y > en.y && b.y < en.y + en.h) {
            hurtEnemy(en, b.dmg);
            b.hit.push(en);
            burst(b.x, b.y, b.color, 6);
            if (b.explode) {
              explode(b.x, b.y, b.explode, Math.floor(b.dmg * 0.6));
              b.life = 0;
            } else if (b.pierce > 0) b.pierce--;
            else b.life = 0;
            break;
          }
        }
      } else if (!player.dead) {
        const pb = bodyBox(player);
        if (b.x > pb.x && b.x < pb.x + pb.w && b.y > pb.y && b.y < pb.y + pb.h) {
          hurtPlayer(b.dmg);
          if (b.stunOrb) {
            player.stunTimer = 120; // 2 segundos (120 frames)
            sfx.stunShock();
            floatText(player.x + 11, player.y - 20, "¡PARALIZADO (2s)!", "#ffe600");
            burst(player.x + 11, player.y + 18, "#ffe600", 14);
          }
          b.life = 0;
          burst(b.x, b.y, b.color, 6);
        }
      }
    }
    bullets = bullets.filter((b) => b.life > 0 && b.x > cam.x - 40 && b.x < cam.x + VIEW_W + 40 && b.y > cam.y - 40 && b.y < cam.y + VIEW_H + 40);
  }

  function updateParticles() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.life--;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const f of floating) {
      f.y -= 0.7;
      f.life--;
    }
    floating = floating.filter((f) => f.life > 0);
    for (const u of pickups) {
      u.vy += 0.2;
      if (u.vy > 4) u.vy = 4;
      u.y += u.vy;
      u.life--;
      const box = { x: u.x - 8, y: u.y - 8, w: 16, h: 16 };
      for (const t of tilesTouching(box)) {
        if (solid(t.id) || oneWay(t.id) || t.id === T.LAVA) {
          u.y = t.ty * TILE - 8;
          u.vy = 0;
        }
      }
      if (!player.dead && dist(u.x, u.y, player.x + 11, player.y + 16) < 26) {
        if (u.kind === "heart") {
          player.hp = Math.min(player.maxHp, player.hp + 1);
          floatText(u.x, u.y, "+VIDA", "#ef233c");
        } else {
          player.ammo[u.weapon] = Math.min(WEAPONS[u.weapon].maxAmmo, player.ammo[u.weapon] + Math.floor(WEAPONS[u.weapon].maxAmmo * 0.45));
          floatText(u.x, u.y, WEAPONS[u.weapon].short, WEAPONS[u.weapon].accent);
        }
        sfx.pickup();
        u.life = 0;
      }
    }
    pickups = pickups.filter((u) => u.life > 0);
  }

  function updateSpawns() {
    if (currentLevel === 1 && lavaSpawns) {
      const alive = enemies.filter((e) => !e.dead).length;
      for (const s of lavaSpawns) {
        if (s.x < cam.x - 60 || s.x > cam.x + VIEW_W + 60) continue;
        s.t--;
        if (s.t <= 0 && alive < 7) {
          const types = ["shark", "octopus", "eel", "crab"];
          spawnEnemy(types[irand(0, types.length - 1)], s.x + rand(-24, 24), s.y);
          s.t = irand(100, 200);
        }
      }
    }
  }

  function updateCam() {
    const tx = player.x - VIEW_W * 0.38;
    const ty = player.y - VIEW_H * 0.62;
    cam.x = lerp(cam.x, tx, 0.14);
    cam.y = lerp(cam.y, ty, 0.1);
    cam.x = clamp(cam.x, 0, worldW * TILE - VIEW_W);
    cam.y = clamp(cam.y, 0, Math.max(0, worldH * TILE - VIEW_H));
    if (shake > 0) {
      cam.x += rand(-shake, shake);
      cam.y += rand(-shake, shake) * 0.5;
      shake *= 0.82;
      if (shake < 0.3) shake = 0;
    }
  }

  function update() {
    time++;
    if (state === "pause" || state === "menu" || state === "dead") return;
    if (state === "win") {
      winT++;
      return;
    }
    updatePlayer();
    updateEnemies();
    updateBullets();
    updateParticles();
    updateSpawns();
    updateCam();
    mouse.leftClick = false;
    mouse.rightClick = false;
  }

  function sky() {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, "#07060f");
    g.addColorStop(0.45, "#14081c");
    g.addColorStop(0.75, "#2a1030");
    g.addColorStop(1, "#4a1d12");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawBg() {
    ctx.fillStyle = "#e8e0c8";
    ctx.beginPath();
    ctx.arc(720 - cam.x * 0.08, 78, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(20,8,28,0.35)";
    ctx.beginPath();
    ctx.arc(736 - cam.x * 0.08, 72, 28, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 40; i++) {
      const x = ((i * 97 - cam.x * 0.12) % (VIEW_W + 20) + VIEW_W + 20) % (VIEW_W + 20);
      const y = 12 + (i * 17) % 120;
      ctx.fillStyle = i % 7 === 0 ? "#5cf6ff" : "#fff";
      ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }

    for (let i = 0; i < 8; i++) {
      const x = ((i * 280 - cam.x * 0.35) % (VIEW_W + 300) + VIEW_W + 300) % (VIEW_W + 300) - 80;
      ctx.fillStyle = i % 2 ? "#12081a" : "#0c0614";
      ctx.beginPath();
      ctx.moveTo(x, VIEW_H);
      ctx.lineTo(x + 40, VIEW_H - 160 - (i % 3) * 40);
      ctx.lineTo(x + 80, VIEW_H - 110);
      ctx.lineTo(x + 120, VIEW_H - 200 - (i % 2) * 30);
      ctx.lineTo(x + 150, VIEW_H);
      ctx.fill();
      ctx.fillStyle = "rgba(92,246,255,0.08)";
      ctx.fillRect(x + 52, VIEW_H - 90, 10, 18);
      ctx.fillRect(x + 108, VIEW_H - 130, 10, 22);
    }

    if (time % 180 < 4) {
      ctx.fillStyle = "rgba(180,200,255,0.12)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawTile(id, tx, ty) {
    const x = tx * TILE - cam.x;
    const y = ty * TILE - cam.y;
    if (x < -TILE || y < -TILE || x > VIEW_W || y > VIEW_H) return;

    if (id === T.GRASS) {
      ctx.fillStyle = "#2a261c";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#3d3828";
      ctx.fillRect(x, y, TILE, 8);
      ctx.fillStyle = "#1a1810";
      ctx.fillRect(x + 6, y + 16, 14, 3);
      ctx.fillRect(x + 28, y + 28, 10, 3);
      ctx.fillStyle = "#5a4a28";
      ctx.fillRect(x, y, TILE, 2);
    } else if (id === T.DIRT) {
      ctx.fillStyle = "#1a1610";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#2c2418";
      ctx.fillRect(x + 10, y + 12, 8, 5);
      ctx.fillRect(x + 30, y + 28, 7, 4);
    } else if (id === T.BRICK) {
      ctx.fillStyle = "#3a3f36";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#2a2e28";
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = "#6a7060";
      ctx.fillRect(x + 4, y + 4, TILE - 8, 4);
      ctx.fillStyle = "#8a9080";
      ctx.fillRect(x + 6, y + 10, 8, 3);
      ctx.fillRect(x + 28, y + 22, 6, 3);
      ctx.fillStyle = "#1a1c18";
      ctx.fillRect(x + 18, y + 16, 12, 14);
    } else if (id === T.BRIDGE) {
      ctx.fillStyle = "#3b0610";
      ctx.fillRect(x, y + 28, TILE, 20);
      ctx.fillStyle = "#c45c12";
      ctx.fillRect(x, y + 32, TILE, 8);
      ctx.fillStyle = "#4a4538";
      ctx.fillRect(x, y, TILE, 18);
      ctx.fillStyle = "#7a7568";
      ctx.fillRect(x, y, TILE, 4);
      ctx.fillStyle = "#2a2818";
      ctx.fillRect(x + 8, y + 8, 6, 6);
      ctx.fillRect(x + 28, y + 8, 6, 6);
      ctx.fillStyle = "#e0b33a";
      ctx.fillRect(x + 10, y + 10, 2, 2);
      ctx.fillRect(x + 30, y + 10, 2, 2);
    } else if (id === T.CRATE) {
      ctx.fillStyle = "#5c4a28";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#c4a35a";
      ctx.strokeStyle = "#2a2010";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.fillRect(x + 8, y + 20, TILE - 16, 6);
      ctx.fillStyle = "#2a2010";
      ctx.fillRect(x + TILE / 2 - 2, y + 8, 4, TILE - 16);
    } else if (id === T.QBLOCK || id === T.USED) {
      ctx.fillStyle = "#5c4a28";
      ctx.fillRect(x, y, TILE, TILE);
    } else if (id === T.LAVA) {
      const w1 = Math.sin(time * 0.09 + tx * 0.7) * 5;
      ctx.fillStyle = "#3b0610";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#d35400";
      ctx.fillRect(x, y + 8 + w1, TILE, TILE);
      ctx.fillStyle = "#ffba08";
      ctx.beginPath();
      ctx.moveTo(x, y + 12 + w1);
      ctx.quadraticCurveTo(x + 12, y + 2 + w1, x + 24, y + 12 + w1);
      ctx.quadraticCurveTo(x + 36, y + 20 + w1, x + TILE, y + 8 + w1);
      ctx.lineTo(x + TILE, y + TILE);
      ctx.lineTo(x, y + TILE);
      ctx.fill();
      ctx.fillStyle = "rgba(108,43,217,0.35)";
      ctx.fillRect(x, y + 20, TILE, 10);
    } else if (id === T.PLATFORM) {
      ctx.fillStyle = "#1c2433";
      ctx.fillRect(x, y, TILE, 12);
      ctx.fillStyle = "#5cf6ff";
      ctx.fillRect(x, y, TILE, 3);
      ctx.fillStyle = "#e0b33a";
      ctx.fillRect(x + 4, y + 8, TILE - 8, 2);
    } else if (id === T.PIPE || id === T.PIPE_TOP) {
      ctx.fillStyle = "#8a7a48";
      ctx.fillRect(x, y + 18, TILE, 30);
      ctx.fillStyle = "#c4b06a";
      ctx.fillRect(x + 4, y + 10, TILE - 8, 16);
      ctx.fillStyle = "#6a5a30";
      ctx.fillRect(x + 8, y + 14, TILE - 16, 8);
      ctx.fillStyle = "#d8c480";
      ctx.fillRect(x, y + 18, TILE, 4);
      if (id === T.PIPE_TOP) {
        ctx.fillStyle = "#c4b06a";
        ctx.fillRect(x - 2, y + 6, TILE + 4, 12);
        ctx.fillStyle = "#6a5a30";
        ctx.fillRect(x + 6, y + 8, TILE - 12, 6);
      }
    } else if (id === T.CASTLE) {
      ctx.fillStyle = "#1a1524";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#2c3a4d";
      ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = "#5cf6ff";
        ctx.fillRect(x + 18, y + 12, 12, 16);
      }
    } else if (id === T.DOOR) {
      ctx.fillStyle = "#07060c";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#9b1d3a";
      roundRect(x + 6, y + 2, TILE - 12, TILE - 2, 6);
      ctx.fill();
      ctx.strokeStyle = "#e0b33a";
      ctx.lineWidth = 2;
      roundRect(x + 6, y + 2, TILE - 12, TILE - 2, 6);
      ctx.stroke();
      ctx.fillStyle = "#5cf6ff";
      ctx.beginPath();
      ctx.arc(x + TILE - 16, y + TILE / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCastleDecor() {
    const cx = (worldW - 16) * TILE - cam.x;
    const top = 5 * TILE - cam.y;
    ctx.fillStyle = "#ef233c";
    ctx.fillRect(cx + 5 * TILE + 18, top - 78, 5, 78);
    ctx.beginPath();
    ctx.moveTo(cx + 5 * TILE + 23, top - 78);
    ctx.lineTo(cx + 5 * TILE + 23, top - 48);
    ctx.lineTo(cx + 5 * TILE + 58, top - 62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5cf6ff";
    ctx.fillText("†", cx + 5 * TILE + 28, top - 56);
  }

  function drawSpawnMarkers() {
    if (!spawns) return;
    const marks = [spawns.comun, spawns.boss];
    for (const s of marks) {
      if (!s) continue;
      const x = s.tileX * TILE + TILE / 2 - cam.x;
      const y = s.tileY * TILE - cam.y;
      if (x < -40 || x > VIEW_W + 40) continue;
      const boss = s.label === "BOSS";
      ctx.strokeStyle = boss ? "#ef233c" : "#5cf6ff";
      ctx.fillStyle = boss ? "rgba(239,35,60,0.18)" : "rgba(92,246,255,0.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - 18, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = boss ? "#ef233c" : "#5cf6ff";
      ctx.font = "bold 11px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(s.label, x, y - 40);
    }
  }

  function blit(img, feetX, feetY, flip) {
    ctx.save();
    ctx.translate(Math.round(feetX), Math.round(feetY));
    if (flip) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    const ox = -Math.round(img.width / 2);
    const oy = -img.height;
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(img, ox, oy);
    ctx.restore();
  }

  function drawPlayer() {
    const p = player;
    if (p.inv > 0 && Math.floor(p.inv / 3) % 2 === 0 && !p.dead) return;
    const feetX = p.x + p.w / 2 - cam.x;
    const feetY = p.y + p.h - cam.y;
    let frame = SPR.player.idle;
    if (p.crouch) frame = SPR.player.crouch;
    else if (!p.onGround) frame = SPR.player.jump;
    else if (Math.abs(p.vx) > 0.5) frame = Math.floor(p.anim) % 2 === 0 ? SPR.player.run1 : SPR.player.run2;

    ctx.save();
    if (p.dead) {
      ctx.translate(feetX, feetY);
      ctx.rotate(Math.min(p.t * 0.08, 1.6));
      ctx.translate(-feetX, -feetY);
    }
    blit(frame, feetX, feetY, p.facing < 0);

    const g = gunPos();
    const m = mouseWorld();
    const ang = Math.atan2(m.y - g.y, m.x - g.x);
    const gun = SPR.guns[WEAPONS[p.weapon].id];
    ctx.save();
    ctx.translate(g.x - cam.x, g.y - cam.y);
    ctx.rotate(ang);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(gun, 6, -gun.height / 2);
    if (p.charging) {
      ctx.strokeStyle = `rgba(92,246,255,${0.35 + p.charge * 0.65})`;
      ctx.lineWidth = 2 + p.charge * 4;
      ctx.beginPath();
      ctx.arc(gun.width + 8, 0, 7 + p.charge * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  function drawEnemy(en) {
    const x = en.x + en.w / 2 - cam.x;
    const y = en.y + en.h - cam.y;
    if (x < -160 || x > VIEW_W + 160 || y < -160 || y > VIEW_H + 160) return;
    const set = SPR[en.type];
    if (!set) return;
    let frame = Math.floor(en.anim) % 2 === 0 ? set.idle : set.walk;

    if (en.type === "alien_ship") {
      if (en.state === "laser") {
        frame = set.laser || set.idle;
        if (en.phaseTimer < 45) {
          // Haz guía de advertencia rojo
          ctx.save();
          ctx.strokeStyle = "rgba(239,35,60,0.75)";
          ctx.setLineDash([8, 6]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 460);
          ctx.stroke();
          ctx.restore();
        } else if (en.phaseTimer < 95) {
          // Columna devastadora de rayo láser vertical
          ctx.save();
          const grad = ctx.createLinearGradient(x - 24, 0, x + 24, 0);
          grad.addColorStop(0, "rgba(239,35,60,0)");
          grad.addColorStop(0.2, "rgba(239,35,60,0.85)");
          grad.addColorStop(0.5, "#ffffff");
          grad.addColorStop(0.8, "rgba(239,35,60,0.85)");
          grad.addColorStop(1, "rgba(239,35,60,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(x - 24, y, 48, 480);
          ctx.restore();
        }
      } else if (en.state === "tractor") {
        frame = set.tractor || set.idle;
        if (en.phaseTimer >= 35 && en.phaseTimer < 140) {
          // Cono de rayo tractor de gravedad
          ctx.save();
          const tgrad = ctx.createLinearGradient(0, y, 0, y + 200);
          tgrad.addColorStop(0, "rgba(92,246,255,0.75)");
          tgrad.addColorStop(1, "rgba(92,246,255,0.12)");
          ctx.fillStyle = tgrad;
          ctx.beginPath();
          ctx.moveTo(x - 18, y + 2);
          ctx.lineTo(x + 18, y + 2);
          ctx.lineTo(x + 55, y + 200);
          ctx.lineTo(x - 55, y + 200);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      } else if (en.state === "stun_orb") {
        frame = set.stun || set.idle;
      }
    } else if (en.type === "radstar") {
      if (en.cool < 16 && set.shoot) frame = set.shoot;
    } else if (en.type === "radboss") {
      if (en.state === "charge" && set.charge) frame = set.charge;
      else if (en.state === "attack" && set.attack) frame = set.attack;
      else if (en.state === "overheat" && set.overheat) frame = set.overheat;
    }

    ctx.save();
    if (en.dead) {
      ctx.translate(x, y);
      ctx.rotate(en.t * 0.1);
      ctx.translate(-x, -y);
    }
    if (en.flash > 0) ctx.globalAlpha = 0.4;
    if (en.state === "emerge") ctx.globalAlpha = Math.min(1, en.t / 24);

    if (en.type === "radboss" && en.state === "overheat") {
      ctx.shadowColor = "#5cf6ff";
      ctx.shadowBlur = 14;
    } else if (en.type === "radboss" && en.state === "charge") {
      ctx.shadowColor = "#ff7b00";
      ctx.shadowBlur = 18;
    } else if (en.type === "alien_ship") {
      ctx.shadowColor = "#5cf6ff";
      ctx.shadowBlur = 16;
    }

    blit(frame, x, y, en.facing < 0);
    ctx.restore();

    if (!en.dead && !ENEMY_TYPES[en.type].boss && en.hp < en.maxHp) {
      const bw = en.w;
      const hx = en.x - cam.x;
      const hy = en.y - cam.y - 8;
      ctx.fillStyle = "#111";
      ctx.fillRect(hx, hy, bw, 4);
      ctx.fillStyle = en.type === "radstar" ? "#39ff14" : "#ef233c";
      ctx.fillRect(hx, hy, bw * (en.hp / en.maxHp), 4);
    }
  }

  function drawBullets() {
    for (const b of bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x - cam.x, b.y - cam.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      if (b.plasma || b.explode || b.greenFire || b.orangeFire || b.stunOrb) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.arc(b.x - cam.x, b.y - cam.y, b.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - cam.x, p.y - cam.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    for (const f of floating) {
      ctx.globalAlpha = Math.min(1, f.life / 20);
      ctx.fillStyle = f.color;
      ctx.font = "bold 12px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x - cam.x, f.y - cam.y);
    }
    ctx.globalAlpha = 1;
    for (const u of pickups) {
      const x = u.x - cam.x;
      const y = u.y - cam.y + Math.sin(time * 0.15) * 2;
      if (u.kind === "heart") {
        ctx.fillStyle = "#ef233c";
        ctx.fillRect(x - 6, y - 4, 5, 5);
        ctx.fillRect(x + 1, y - 4, 5, 5);
        ctx.fillRect(x - 4, y, 8, 6);
      } else {
        ctx.fillStyle = WEAPONS[u.weapon].color;
        ctx.fillRect(x - 7, y - 5, 14, 10);
        ctx.fillStyle = WEAPONS[u.weapon].accent;
        ctx.fillRect(x - 3, y - 2, 6, 4);
      }
    }
  }

  function drawHUD() {
    const p = player;
    const w = WEAPONS[p.weapon];
    ctx.fillStyle = "rgba(7,6,12,0.62)";
    ctx.fillRect(12, 12, 318, 82);
    ctx.strokeStyle = "#e0b33a";
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 318, 82);
    ctx.fillStyle = "#5cf6ff";
    ctx.font = "bold 14px Courier New";
    ctx.textAlign = "left";
    ctx.fillText("YAEL  [" + (levelName.split(":")[0] || "NIVEL 1") + "]", 24, 32);
    for (let i = 0; i < p.maxHp; i++) {
      ctx.fillStyle = i < p.hp ? "#ef233c" : "#2a1014";
      const hx = 86 + i * 20;
      ctx.fillRect(hx, 20, 7, 7);
      ctx.fillRect(hx + 7, 20, 7, 7);
      ctx.fillRect(hx + 2, 25, 11, 9);
    }
    ctx.fillStyle = "#e0b33a";
    ctx.fillText("RELIQUIAS " + (coins | 0), 24, 54);
    ctx.fillStyle = "#8b9bb4";
    ctx.fillText("VIDAS " + lives, 180, 54);
    ctx.fillStyle = w.accent;
    ctx.fillText(w.short + "  " + p.ammo[p.weapon] + "/" + w.maxAmmo, 24, 76);

    if (p.stunTimer > 0) {
      ctx.fillStyle = "#ffe600";
      ctx.font = "bold 11px Courier New";
      ctx.fillText("¡PARALIZADO!", 220, 76);
    }

    ctx.fillStyle = "rgba(7,6,12,0.62)";
    ctx.fillRect(VIEW_W - 268, 12, 256, 64);
    ctx.strokeStyle = w.color;
    ctx.strokeRect(VIEW_W - 268, 12, 256, 64);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.font = "bold 12px Courier New";
    ctx.fillText(w.name, VIEW_W - 24, 32);
    ctx.fillStyle = "#8b9bb4";
    ctx.font = "10px Courier New";
    ctx.fillText("E cambiar  |  RMB especial", VIEW_W - 24, 48);
    ctx.fillStyle = "#222";
    ctx.fillRect(VIEW_W - 256, 56, 232, 10);
    ctx.fillStyle = p.charging ? "#5cf6ff" : "#333";
    ctx.fillRect(VIEW_W - 256, 56, 232 * p.charge, 10);
    ctx.fillStyle = "#e0b33a";
    ctx.textAlign = "left";
    ctx.font = "9px Courier New";
    ctx.fillText(w.specialName, VIEW_W - 254, 64);

    let zname = "SECTOR";
    let distText = "";
    if (isVerticalLevel) {
      const zy = Math.floor(player.y / TILE);
      for (let i = 0; i < zones.length; i++) {
        if (zy >= zones[i].y0 && zy < zones[i].y1) zname = zones[i].name;
      }
      const remainH = Math.max(0, player.y - (doorY || 19 * TILE));
      distText = zname + "  ·  " + Math.floor(remainH / TILE) + " m hacia la cima ↑";
    } else {
      const remain = Math.max(0, doorX - player.x);
      const zx = Math.floor(player.x / TILE);
      for (let i = 0; i < zones.length; i++) {
        if (zx >= zones[i].x0 && zx < zones[i].x1) zname = zones[i].name;
      }
      distText = zname + "  ·  " + Math.floor(remain / TILE) + " m  →";
    }

    ctx.fillStyle = "rgba(7,6,12,0.65)";
    ctx.fillRect(VIEW_W / 2 - 170, 12, 340, 22);
    ctx.fillStyle = "#5cf6ff";
    ctx.textAlign = "center";
    ctx.font = "bold 11px Courier New";
    ctx.fillText(distText, VIEW_W / 2, 28);

    // Barra de Vida de Boss Activo
    const activeBoss = enemies.find((e) => !e.dead && ENEMY_TYPES[e.type].boss);
    if (activeBoss) {
      const bw = 420;
      const bx = VIEW_W / 2 - bw / 2;
      const by = 40;
      ctx.fillStyle = "rgba(7,6,12,0.85)";
      ctx.fillRect(bx, by, bw, 22);
      const isOverheated = activeBoss.type === "radboss" && activeBoss.state === "overheat";
      const isCharging = activeBoss.type === "radboss" && activeBoss.state === "charge";
      ctx.strokeStyle = isOverheated ? "#5cf6ff" : (isCharging ? "#ffe600" : (activeBoss.type === "alien_ship" ? "#5cf6ff" : (activeBoss.type === "radboss" ? "#ff7b00" : "#ef233c")));
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, 22);

      const hpRatio = clamp(activeBoss.hp / activeBoss.maxHp, 0, 1);
      ctx.fillStyle = isOverheated ? "#5cf6ff" : (isCharging ? "#ffe600" : (activeBoss.type === "alien_ship" ? "#00f0ff" : (activeBoss.type === "radboss" ? "#ff3c00" : "#ef233c")));
      ctx.fillRect(bx + 2, by + 2, (bw - 4) * hpRatio, 18);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px Courier New";
      ctx.textAlign = "center";
      let statusTag = "";
      if (activeBoss.type === "radboss") {
        if (isOverheated) statusTag = " [¡NUCLEO EXPUESTO! 2X DANO]";
        else if (isCharging) statusTag = " [¡ALERTA: SOBRECARGA!]";
        else statusTag = " [ARMADURA ACTIVA: 35% DANO]";
      } else if (activeBoss.type === "alien_ship") {
        if (activeBoss.state === "laser") statusTag = " [¡RAYO LASER VERTICAL!]";
        else if (activeBoss.state === "tractor") statusTag = " [¡RAYO TRACTOR DE GRAVEDAD!]";
        else if (activeBoss.state === "stun_orb") statusTag = " [¡ORBE PARALIZANTE!]";
        else statusTag = " [ESCUDOS DE PLASMA]";
      }
      ctx.fillText(ENEMY_TYPES[activeBoss.type].name.toUpperCase() + statusTag, VIEW_W / 2, by + 15);
    }

    ctx.strokeStyle = p.charging ? "#5cf6ff" : "#e0b33a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mouse.x - 10, mouse.y);
    ctx.lineTo(mouse.x - 3, mouse.y);
    ctx.moveTo(mouse.x + 3, mouse.y);
    ctx.lineTo(mouse.x + 10, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 10);
    ctx.lineTo(mouse.x, mouse.y - 3);
    ctx.moveTo(mouse.x, mouse.y + 3);
    ctx.lineTo(mouse.x, mouse.y + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 11 + p.charge * 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  function panel(title, lines) {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#07060c";
    roundRect(VIEW_W / 2 - 320, 50, 640, 440, 6);
    ctx.fill();
    ctx.strokeStyle = "#e0b33a";
    ctx.lineWidth = 3;
    roundRect(VIEW_W / 2 - 320, 50, 640, 440, 6);
    ctx.stroke();
    ctx.strokeStyle = "#5cf6ff";
    ctx.lineWidth = 1;
    roundRect(VIEW_W / 2 - 314, 56, 628, 428, 4);
    ctx.stroke();
    ctx.fillStyle = "#5cf6ff";
    ctx.font = "bold 30px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(title, VIEW_W / 2, 108);
    ctx.fillStyle = "#e0b33a";
    ctx.font = "bold 14px Courier New";
    ctx.fillText("PROTOCOLO BELMONT", VIEW_W / 2, 134);
    ctx.fillStyle = "#d0d6e0";
    ctx.font = "13px Courier New";
    let yy = 175;
    for (const ln of lines) {
      ctx.fillText(ln, VIEW_W / 2, yy);
      yy += 22;
    }
  }

  function draw() {
    sky();
    if (state === "menu") {
      drawBg();
      panel("YAEL — PROTOCOLO BELMONT", [
        "Armadura MJOLNIR. Fuego Radiactivo. Lava Viva.",
        "Cruza los tres sectores y destruye a las amenazas alienigenas.",
        "",
        "NIVEL 1: Castillo & Gyojin de Lava (Rey Marino)",
        "NIVEL 2: Reactor Radiactivo (Estrellas & Titan Colosal)",
        "NIVEL 3: Torre del Cataclismo (Lava Ascendente & Nave Nodriza)",
        "",
        "CONTROLES:",
        "A / D: Moverse    S: Agacharse    W / Espacio: Saltar",
        "Mouse: Apuntar    Clic Izq: Disparar    Clic Der: Especial",
        "E: Cambiar Arma   P: Pausa        M: Silencio",
        "",
        "ENTER o Clic para Empezar  |  Presiona 1, 2 o 3 para elegir Nivel",
      ]);
      return;
    }

    drawBg();
    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const x1 = Math.min(worldW - 1, Math.floor((cam.x + VIEW_W) / TILE) + 1);
    const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const y1 = Math.min(worldH - 1, Math.floor((cam.y + VIEW_H) / TILE) + 1);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = tileAt(tx, ty);
        if (id) drawTile(id, tx, ty);
      }
    }
    drawCastleDecor();
    for (const en of enemies) drawEnemy(en);
    drawPlayer();
    drawBullets();
    drawParticles();

    if (currentLevel === 3 && risingLavaY < worldH * TILE) {
      const ly = risingLavaY - cam.y;
      if (ly < VIEW_H) {
        ctx.fillStyle = "rgba(255, 60, 0, 0.88)";
        ctx.fillRect(0, Math.max(0, ly), VIEW_W, VIEW_H - Math.max(0, ly));
        ctx.fillStyle = "#ffe600";
        for (let i = 0; i < VIEW_W; i += 16) {
          const wy = ly + Math.sin(time * 0.2 + i * 0.08) * 4;
          ctx.fillRect(i, wy, 16, 5);
        }
      }
    }

    drawHUD();

    if (state === "pause") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#5cf6ff";
      ctx.font = "bold 40px Courier New";
      ctx.textAlign = "center";
      ctx.fillText("PAUSA", VIEW_W / 2, VIEW_H / 2);
    }
    if (state === "level_clear") {
      panel("¡NIVEL 1 SUPERADO!", [
        "Has atravesado la fortaleza y vencido al Rey Marino.",
        "Siguiente mision: REACTOR RADIACTIVO (NIVEL 2).",
        "",
        "¡Cuidado con las Estrellas Radiactivas voladoras!",
        "El Titan Naranja tiene armadura pesada (35% dano).",
        "¡Espera su ataque telegrafiado y castiga su nucleo (2X dano)!",
        "",
        "Reliquias acumuladas: " + (coins | 0) + "    Bajas: " + kills,
        "",
        "Presiona ENTER o ESPACIO para avanzar al Nivel 2",
      ]);
    }
    if (state === "level_clear_2") {
      panel("¡NIVEL 2 SUPERADO!", [
        "El Titan Radiactivo ha sido derrotado y el reactor apagado.",
        "Siguiente mision: LA TORRE DEL CATACLISMO (NIVEL 3).",
        "",
        "¡ALERTA: LA LAVA SUBE POR LA TORRE!",
        "Escala rápidamente los 10 pisos hasta la azotea.",
        "En la cima, destruye a la Nave Nodriza Alienigena.",
        "¡Esquiva su Laser Vertical, Rayo Tractor y Orbes Paralizantes!",
        "",
        "Reliquias acumuladas: " + (coins | 0) + "    Bajas: " + kills,
        "",
        "Presiona ENTER o ESPACIO para avanzar al Nivel 3",
      ]);
    }
    if (state === "dead") {
      panel("CAIDA EN COMBATE", [
        "Yael cayo en " + levelName,
        "Reliquias: " + (coins | 0) + "    Bajas: " + kills,
        "",
        "ENTER o R para reintentar este nivel",
        "Presiona 1 para Nivel 1  |  2 para Nivel 2  |  3 para Nivel 3",
      ]);
    }
    if (state === "win") {
      panel("¡VICTORIA TOTAL!", [
        "Protocolo Belmont completado con exito rotundo.",
        "La Nave Nodriza ha sido destruida y la Tierra esta a salvo.",
        "",
        "Reliquias totales: " + (coins | 0) + "    Bajas: " + kills,
        "Vidas restantes: " + lives,
        "",
        "ENTER o R para reiniciar la campaña (1, 2 o 3)",
      ]);
    }
  }

  let last = 0;
  let acc = 0;
  const STEP = 1000 / 60;
  function loop(t) {
    if (!last) last = t;
    acc += Math.min(48, t - last);
    last = t;
    while (acc >= STEP) {
      update();
      acc -= STEP;
    }
    draw();
    requestAnimationFrame(loop);
  }

  const urlParams = new URLSearchParams(location.search);
  const urlLvl = parseInt(urlParams.get("lvl") || urlParams.get("level") || "1", 10);
  if (/\bplay=1\b/.test(location.search)) startGame(urlLvl || 1);
  draw();
  requestAnimationFrame(loop);
})();
