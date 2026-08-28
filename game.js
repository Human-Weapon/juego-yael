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
  let coins = 0;
  let kills = 0;
  let lives = 4;
  let winT = 0;
  let seaKingSpawned = false;
  let audio = null;
  let muted = false;
  let doorX = 0;
  let groundY = 13;

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

  function ensureAudio() {
    if (audio || muted) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio = new AC();
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
      if (state === "menu") startGame();
      else if (state === "dead" && lives <= 0) startGame();
      else if (state === "win") startGame();
    }
    if (k === "p" && state === "play") state = "pause";
    else if (k === "p" && state === "pause") state = "play";
    if (k === "m") muted = !muted;
    if (k === "e" && state === "play") cycleWeapon();
    if (k === "r" && (state === "dead" || state === "win")) startGame();
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
    tiles[ty][tx] = v;
  }

  function makePlayer() {
    return {
      x: TILE * 3,
      y: groundY * TILE - PHYS.PLAYER_H,
      w: PHYS.PLAYER_W,
      h: PHYS.PLAYER_H,
      vx: 0,
      vy: 0,
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
    };
  }

  function startGame() {
    ensureAudio();
    if (audio && audio.state === "suspended") audio.resume();
    const lvl = L.buildLevel();
    tiles = lvl.tiles;
    tileMeta = lvl.tileMeta;
    lavaSpawns = lvl.lavaSpawns;
    worldW = lvl.worldW;
    worldH = lvl.worldH;
    groundY = lvl.groundY;
    doorX = lvl.doorX;
    player = makePlayer();
    enemies = [];
    bullets = [];
    particles = [];
    pickups = [];
    floating = [];
    coins = 0;
    kills = 0;
    lives = 4;
    winT = 0;
    seaKingSpawned = false;
    shake = 0;
    state = "play";
    snapCam();
    seedLandEnemies();
  }

  function snapCam() {
    cam.x = clamp(player.x - VIEW_W * 0.38, 0, Math.max(0, worldW * TILE - VIEW_W));
    cam.y = clamp(player.y - VIEW_H * 0.62, 0, Math.max(0, worldH * TILE - VIEW_H));
  }

  function seedLandEnemies() {
    const spots = [
      ["shark", 24],
      ["octopus", 38],
      ["crab", 58],
      ["shark", 76],
      ["octopus", 96],
      ["crab", 110],
      ["shark", 124],
    ];
    for (const [type, tx] of spots) {
      const d = ENEMY_TYPES[type];
      enemies.push({
        type,
        x: tx * TILE,
        y: groundY * TILE - d.h,
        w: d.w,
        h: d.h,
        vx: 0,
        vy: 0,
        hp: d.hp,
        maxHp: d.hp,
        facing: -1,
        state: "hunt",
        t: 0,
        cool: 20,
        onGround: true,
        dead: false,
        inLava: false,
        anim: 0,
        ignoreLava: false,
        flash: 0,
      });
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

  function bumpBlock(tx, ty) {
    const id = tileAt(tx, ty);
    if (id === T.QBLOCK) {
      const meta = tileMeta[ty][tx] || { coins: 1 };
      meta.coins--;
      sfx.coin();
      coins++;
      burst(tx * TILE + TILE / 2, ty * TILE, "#e0b33a", 8);
      floatText(tx * TILE + 8, ty * TILE - 10, "+1", "#e0b33a");
      if (meta.coins <= 0) setTile(tx, ty, T.USED);
      else tileMeta[ty][tx] = meta;
    } else if (id === T.BRICK) {
      burst(tx * TILE + TILE / 2, ty * TILE + TILE / 2, "#5c4033", 10);
      setTile(tx, ty, T.EMPTY);
      sfx.hit();
    }
  }

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
        if (e.vy >= 0 && e.y + e.h <= ry + 10) {
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
        if (e === player) bumpBlock(t.tx, t.ty);
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
  };

  function spawnEnemy(type, x, y) {
    const d = ENEMY_TYPES[type];
    enemies.push({
      type,
      x: x - d.w / 2,
      y,
      w: d.w,
      h: d.h,
      vx: 0,
      vy: -2,
      hp: d.hp,
      maxHp: d.hp,
      facing: Math.random() < 0.5 ? -1 : 1,
      state: "emerge",
      t: 0,
      cool: 30,
      onGround: false,
      dead: false,
      inLava: false,
      anim: 0,
      ignoreLava: true,
      flash: 0,
    });
    sfx.emerge();
    burst(x, y, "#ff6b00", 14);
  }

  function hurtEnemy(en, dmg) {
    if (en.dead || en.state === "emerge") return;
    en.hp -= dmg;
    en.flash = 6;
    floatText(en.x + en.w / 2, en.y, "" + dmg, "#fff");
    sfx.hit();
    if (en.hp <= 0) killEnemy(en);
  }

  function killEnemy(en) {
    en.dead = true;
    en.t = 0;
    kills++;
    coins += ENEMY_TYPES[en.type].score / 10;
    sfx.kill();
    burst(en.x + en.w / 2, en.y + en.h / 2, "#7bed9f", 16);
    if (Math.random() < 0.62) {
      pickups.push({
        x: en.x + en.w / 2,
        y: en.y,
        vy: -3,
        kind: Math.random() < 0.35 ? "heart" : "ammo",
        weapon: irand(0, 3),
        life: 420,
      });
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

    const wantCrouch = !!(keys.s || keys.arrowdown) && p.onGround;
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
    if (keys.a || keys.arrowleft) ax -= 1;
    if (keys.d || keys.arrowright) ax += 1;
    if (ax !== 0) p.vx += ax * acc;
    else p.vx *= p.onGround ? PHYS.FRICTION : PHYS.AIR_FRICTION;
    p.vx = clamp(p.vx, -max, max);

    if (holdingJump()) p.jumpBuf = PHYS.JUMP_BUF;
    if (p.onGround) p.coyote = PHYS.COYOTE;

    let jumped = false;
    if (p.jumpBuf > 0 && p.coyote > 0 && !p.crouch) {
      p.vy = PHYS.JUMP;
      p.onGround = false;
      p.jumpBuf = 0;
      p.coyote = 0;
      jumped = true;
      sfx.jump();
    }

    if (!jumped) {
      if (!holdingJump() && p.vy < -3.2) p.vy *= 0.52;
      const g = p.vy < 0 && holdingJump() ? PHYS.HOLD_GRAV : PHYS.GRAVITY;
      p.vy += g;
    }
    if (p.vy > PHYS.MAX_FALL) p.vy = PHYS.MAX_FALL;

    p.inLava = false;
    p.fell = false;
    moveActor(p);

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

    for (const t of tilesTouching(bodyBox(p))) {
      if (t.id === T.DOOR && !p.dead) {
        state = "win";
        winT = 0;
        sfx.win();
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
          en.ignoreLava = en.type === "eel" || en.type === "seaking";
        }
        continue;
      }

      const pcx = player.x + player.w / 2;
      const ecx = en.x + en.w / 2;
      const dx = pcx - ecx;
      en.facing = dx >= 0 ? 1 : -1;

      if (en.type === "eel") {
        en.vx = en.facing * def.speed * 1.35;
        en.vy += 0.18;
        if (en.inLava) en.vy = -1.4;
        if (Math.abs(dx) < 180 && Math.abs(player.y - en.y) < 90 && en.t % 55 === 0) en.vy = -7;
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
      }

      if (en.cool > 0) en.cool--;
      en.inLava = false;
      moveActor(en);
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
          b.life = 0;
          burst(b.x, b.y, b.color, 6);
        }
      }
    }
    bullets = bullets.filter((b) => b.life > 0 && b.x > cam.x - 40 && b.x < cam.x + VIEW_W + 40);
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
    const alive = enemies.filter((e) => !e.dead && e.type !== "seaking").length;
    for (const s of lavaSpawns) {
      if (s.x < cam.x - 60 || s.x > cam.x + VIEW_W + 60) continue;
      s.t--;
      if (s.t <= 0 && alive < 10) {
        const types = ["shark", "octopus", "eel", "crab"];
        spawnEnemy(types[irand(0, types.length - 1)], s.x + rand(-24, 24), s.y);
        s.t = irand(70, 150);
      }
    }
    if (!seaKingSpawned && player.x > 128 * TILE) {
      seaKingSpawned = true;
      spawnEnemy("seaking", 136 * TILE, 13 * TILE);
      floatText(player.x, player.y - 40, "¡REY MARINO!", "#5cf6ff");
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
      ctx.fillStyle = "#1a1524";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#0e6b6b";
      ctx.fillRect(x, y, TILE, 10);
      ctx.fillStyle = "#5cf6ff";
      ctx.fillRect(x, y, TILE, 2);
      ctx.fillStyle = "#2a2038";
      ctx.fillRect(x + 8, y + 18, 6, 6);
      ctx.fillRect(x + 28, y + 30, 8, 5);
    } else if (id === T.DIRT) {
      ctx.fillStyle = "#14101c";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#2a2038";
      ctx.fillRect(x + 10, y + 12, 5, 5);
      ctx.fillRect(x + 30, y + 28, 7, 4);
    } else if (id === T.BRICK) {
      ctx.fillStyle = "#2b2438";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = "#e0b33a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = "#5cf6ff";
      ctx.fillRect(x + TILE / 2 - 3, y + TILE / 2 - 3, 6, 6);
    } else if (id === T.QBLOCK || id === T.USED) {
      ctx.fillStyle = id === T.QBLOCK ? "#3a2a10" : "#1a1520";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = id === T.QBLOCK ? "#e0b33a" : "#5c4033";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.fillStyle = id === T.QBLOCK ? "#5cf6ff" : "#444";
      ctx.font = "bold 26px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(id === T.QBLOCK ? "?" : "x", x + TILE / 2, y + 34);
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
      ctx.fillStyle = "#1a2430";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#5cf6ff";
      ctx.fillRect(x + 6, y, 4, TILE);
      ctx.fillStyle = "#e0b33a";
      ctx.fillRect(x + TILE - 10, y, 4, TILE);
      if (id === T.PIPE_TOP) {
        ctx.fillStyle = "#0e6b6b";
        ctx.fillRect(x - 4, y, TILE + 8, 14);
        ctx.fillStyle = "#5cf6ff";
        ctx.fillRect(x - 4, y, TILE + 8, 3);
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
    if (x < -90 || x > VIEW_W + 90) return;
    const set = SPR[en.type];
    if (!set) return;
    const frame = Math.floor(en.anim) % 2 === 0 ? set.idle : set.walk;
    ctx.save();
    if (en.dead) {
      ctx.translate(x, y);
      ctx.rotate(en.t * 0.1);
      ctx.translate(-x, -y);
    }
    if (en.flash > 0) ctx.globalAlpha = 0.4;
    if (en.state === "emerge") ctx.globalAlpha = Math.min(1, en.t / 24);
    blit(frame, x, y, en.facing < 0);
    ctx.restore();

    if (!en.dead && en.hp < en.maxHp) {
      const bw = en.w;
      const hx = en.x - cam.x;
      const hy = en.y - cam.y - 8;
      ctx.fillStyle = "#111";
      ctx.fillRect(hx, hy, bw, 4);
      ctx.fillStyle = "#ef233c";
      ctx.fillRect(hx, hy, bw * (en.hp / en.maxHp), 4);
    }
  }

  function drawBullets() {
    for (const b of bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x - cam.x, b.y - cam.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      if (b.plasma || b.explode) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(b.x - cam.x, b.y - cam.y, b.r * 0.4, 0, Math.PI * 2);
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
    ctx.fillText("YAEL", 24, 32);
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

    const remain = Math.max(0, doorX - player.x);
    ctx.fillStyle = "rgba(7,6,12,0.55)";
    ctx.fillRect(VIEW_W / 2 - 100, 12, 200, 22);
    ctx.fillStyle = "#5cf6ff";
    ctx.textAlign = "center";
    ctx.font = "bold 11px Courier New";
    ctx.fillText("CASTILLO  " + Math.floor(remain / TILE) + " m  →", VIEW_W / 2, 28);

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
    ctx.fillStyle = "rgba(0,0,0,0.66)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#07060c";
    roundRect(VIEW_W / 2 - 300, 60, 600, 420, 6);
    ctx.fill();
    ctx.strokeStyle = "#e0b33a";
    ctx.lineWidth = 3;
    roundRect(VIEW_W / 2 - 300, 60, 600, 420, 6);
    ctx.stroke();
    ctx.strokeStyle = "#5cf6ff";
    ctx.lineWidth = 1;
    roundRect(VIEW_W / 2 - 294, 66, 588, 408, 4);
    ctx.stroke();
    ctx.fillStyle = "#5cf6ff";
    ctx.font = "bold 34px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(title, VIEW_W / 2, 122);
    ctx.fillStyle = "#e0b33a";
    ctx.font = "bold 14px Courier New";
    ctx.fillText("PROTOCOLO BELMONT", VIEW_W / 2, 148);
    ctx.fillStyle = "#d0d6e0";
    ctx.font = "13px Courier New";
    let yy = 188;
    for (const ln of lines) {
      ctx.fillText(ln, VIEW_W / 2, yy);
      yy += 22;
    }
  }

  function draw() {
    sky();
    if (state === "menu") {
      drawBg();
      panel("YAEL", [
        "Armadura MJOLNIR. Sangre de Belmont. Lava viva.",
        "Llega al castillo. Un arma a la vez.",
        "",
        "A / D  caminar     S  agachar     W  saltar",
        "Mouse  apuntar     Clic izq.  disparar",
        "Clic der.  mantener para especial cargado",
        "E  cambiar arma     P  pausa     M  silencio",
        "",
        "MA5B · Magnum · Escopeta · Plasma",
        "Los gyojin emergen de la lava. El salto llega alto.",
        "",
        "ENTER o clic para empezar",
      ]);
      return;
    }

    drawBg();
    const x0 = Math.floor(cam.x / TILE) - 1;
    const x1 = Math.floor((cam.x + VIEW_W) / TILE) + 1;
    for (let ty = 0; ty < worldH; ty++) {
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
    drawHUD();

    if (state === "pause") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#5cf6ff";
      ctx.font = "bold 40px Courier New";
      ctx.textAlign = "center";
      ctx.fillText("PAUSA", VIEW_W / 2, VIEW_H / 2);
    }
    if (state === "dead") {
      panel("CAIDA", ["Yael cayo ante los gyojin de lava.", "Reliquias: " + (coins | 0) + "    Bajas: " + kills, "", "ENTER o R para reintentar"]);
    }
    if (state === "win") {
      panel("CASTILLO", ["Protocolo cumplido. El portal cede.", "Reliquias: " + (coins | 0) + "    Bajas: " + kills, "", "ENTER o R para otra caceria"]);
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
  if (/\bplay=1\b/.test(location.search)) startGame();
  draw();
  requestAnimationFrame(loop);
})();
