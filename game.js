(() => {
  "use strict";

  const L = window.YAEL_LEVEL;
  const SPR = window.YAEL_SPRITES.get();
  const { TILE, PHYS, T, solid, oneWay } = L;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const VIEW_W = 960;
  const VIEW_H = 540;
  const CAMPAIGN = L.CAMPAIGN_LEVELS || [];

  const WEAPONS = [
    {
      id: "desert", name: "PISTOLA DESERT", short: "DESERT", color: "#9a7b37", accent: "#ffe29a",
      dmg: 24, speed: 20, spread: 0.012, cooldown: 19, magazine: 12, reload: 62, automatic: false,
      pellets: 1,
      r: 4, kick: 1.25,
    },
    {
      id: "smg", name: "SUBFUSIL", short: "VIBORA", color: "#34515e", accent: "#86d7f1",
      dmg: 9, speed: 18, spread: 0.075, cooldown: 4, magazine: 24, reload: 84, automatic: true,
      pellets: 1, r: 3, kick: 0.18, falloff: { start: 150, end: 650, min: 0.32 },
    },
    {
      id: "plasma", name: "FUSIL DE PLASMA", short: "PLASMA", color: "#6927a8", accent: "#e0aaff",
      dmg: 15, speed: 13, spread: 0.025, cooldown: 7, magazine: 30, reload: 154, automatic: true,
      pellets: 1, r: 5, kick: 0.28, plasma: true,
    },
    {
      id: "fire_shotgun", name: "ESCOPETA DE FUEGO", short: "INFERNO", color: "#7b2611", accent: "#ff8c42",
      dmg: 30, speed: 13, spread: 0.25, cooldown: 42, magazine: 6, reload: 182, automatic: false,
      pellets: 8, r: 3, kick: 2.3, rangeLife: 18, fire: true,
    },
    {
      id: "cannon", name: "CAÑON", short: "TITAN", color: "#3b4148", accent: "#ffe066",
      dmg: 95, speed: 10, spread: 0.004, cooldown: 58, magazine: 1, reload: 265, automatic: false,
      pellets: 1, r: 9, kick: 3.4, explode: 68,
    },
    {
      id: "minigun", name: "MINIGUN", short: "TORMENTA", color: "#394852", accent: "#f2f4f3",
      dmg: 6, speed: 19, spread: 0.105, cooldown: 2, magazine: Infinity, reload: 0, automatic: true,
      pellets: 1, r: 2.6, kick: 0.12, heatPerShot: 3.4, coolRate: 0.42,
    },
  ];

  const SPECIALS = [
    { id: "grenade", name: "GRANADA", short: "FRAG", color: "#9cab65", cooldown: 54, dmg: 62, fuse: 115, bounce: 0.58, gravity: 0.34, explode: 72 },
    { id: "sticky", name: "GRANADA PEGAJOSA", short: "PEGAJOSA", color: "#54d6ff", cooldown: 78, dmg: 78, fuse: 105, gravity: 0.3, explode: 78, sticky: true },
    { id: "hook", name: "GANCHO DE ARRASTRE", short: "GANCHO", color: "#d0d6e0", cooldown: 48, gravity: 0.08, hook: true },
    { id: "sword", name: "ESPADA DE PARADA", short: "PARRY", color: "#ffe600", cooldown: 30, sword: true, dmg: 24, parryFrames: 12 },
    { id: "inertia_gel", name: "GEL DE INERCIA", short: "GEL", color: "#72f1b8", cooldown: 96, gravity: 0.38, gel: true, puddleRadius: 46 },
  ];

  // Cada personaje modifica el manejo, no sólo el retrato. El clásico se
  // mantiene como referencia de control; Ágil gana verticalidad a cambio de
  // supervivencia y Pesado sustituye por completo el salto por escalada.
  const CHARACTERS = [
    { id: "classic", name: "CLASICO", title: "YAEL CLASICO", maxHp: 5, run: 1, acc: 1, airAcc: 1, jump: -12.1, holdGravity: 0.36, gravity: 0.42, maxFall: 11.2, climb: false, color: "#ffe29a", description: "5 corazones · salto controlado" },
    { id: "agile", name: "AGIL", title: "SCOUT AGIL", maxHp: 2, run: 1.28, acc: 1.18, airAcc: 1.22, jump: -15.4, holdGravity: 0.45, gravity: 0.56, maxFall: 14.2, airJumps: 1, climb: false, color: "#5cf6ff", description: "2 corazones · veloz · doble salto" },
    { id: "heavy", name: "PESADO", title: "ESCALADOR PESADO", maxHp: 8, run: 0.72, acc: 0.78, airAcc: 0.55, jump: 0, holdGravity: 0.4, gravity: 0.45, maxFall: 10, climb: true, climbSpeed: 3.1, color: "#ff9f1c", description: "8 corazones · escala, no salta" },
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
  // Amenazas persistentes de los jefes. No son proyectiles: dejan zonas,
  // rayos y barridos anunciados que cambian la ruta segura de cada arena.
  let bossHazards = [];
  let gadgets = [];
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
  let audio = null;
  let muted = false;
  let doorX = 0;
  let doorY = 0;
  let groundY = 13;
  let risingLavaY = 999999;
  let risingLavaSpeed = 0;
  let verticalHazard = false;
  let risingLavaX = -999999;
  let lavaChase = false;
  let isVerticalLevel = false;
  let levelData = null;
  let bossSpawnData = null;
  let bossSpawned = false;
  let bossDefeated = false;
  let checkpointIndex = 0;
  let highestUnlockedLevel = 1;
  let menuPage = 0;
  let unlockedWeapons = [0];
  let unlockedSpecials = [0];
  let equippedWeapons = [0];
  let equippedSpecials = [0];
  let claimedBossRewards = [];
  let pendingReward = null;
  let loadoutTargetLevel = 1;
  let loadoutColumn = 0;
  let loadoutCursor = 0;
  let selectedCharacter = 0;
  let characterCursor = 0;
  let characterTargetLevel = 1;

  function loadCampaignProgress() {
    try {
      const saved = Number(window.localStorage.getItem("yael_campaign_unlocked"));
      if (Number.isFinite(saved)) highestUnlockedLevel = clamp(Math.floor(saved), 1, Math.max(1, CAMPAIGN.length));
    } catch (err) {
      highestUnlockedLevel = 1;
    }
    try {
      const arsenal = JSON.parse(window.localStorage.getItem("yael_arsenal_v2") || "{}");
      const validList = (value, max, fallback) => Array.isArray(value)
        ? [...new Set(value.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < max))]
        : fallback.slice();
      unlockedWeapons = validList(arsenal.unlockedWeapons, WEAPONS.length, [0]);
      unlockedSpecials = validList(arsenal.unlockedSpecials, SPECIALS.length, [0]);
      if (!unlockedWeapons.includes(0)) unlockedWeapons.unshift(0);
      if (!unlockedSpecials.includes(0)) unlockedSpecials.unshift(0);
      equippedWeapons = validList(arsenal.equippedWeapons, WEAPONS.length, [0]).filter((i) => unlockedWeapons.includes(i)).slice(0, 2);
      equippedSpecials = validList(arsenal.equippedSpecials, SPECIALS.length, [0]).filter((i) => unlockedSpecials.includes(i)).slice(0, 2);
      claimedBossRewards = validList(arsenal.claimedBossRewards, CAMPAIGN.length + 1, []);
      selectedCharacter = Number.isInteger(arsenal.selectedCharacter) && arsenal.selectedCharacter >= 0 && arsenal.selectedCharacter < CHARACTERS.length ? arsenal.selectedCharacter : 0;
      if (!equippedWeapons.length) equippedWeapons = [0];
      if (!equippedSpecials.length) equippedSpecials = [0];
    } catch (err) {}
  }

  function saveCampaignProgress() {
    try {
      window.localStorage.setItem("yael_campaign_unlocked", String(highestUnlockedLevel));
      window.localStorage.setItem("yael_arsenal_v2", JSON.stringify({
        unlockedWeapons, unlockedSpecials, equippedWeapons, equippedSpecials, claimedBossRewards, selectedCharacter,
      }));
    } catch (err) {}
  }

  function awardBossUnlock(levelNum) {
    if (claimedBossRewards.includes(levelNum)) return null;
    claimedBossRewards.push(levelNum);
    const pool = [];
    for (let i = 1; i < WEAPONS.length; i++) if (!unlockedWeapons.includes(i)) pool.push({ kind: "weapon", index: i, name: WEAPONS[i].name });
    for (let i = 1; i < SPECIALS.length; i++) if (!unlockedSpecials.includes(i)) pool.push({ kind: "special", index: i, name: SPECIALS[i].name });
    if (!pool.length) {
      saveCampaignProgress();
      return null;
    }
    // Aleatorio estable: un boss conserva su recompensa incluso si se vuelve
    // a jugar y el conjunto restante cambia en otra partida.
    const reward = pool[Math.abs((levelNum * 37 + highestUnlockedLevel * 17 + pool.length * 11) % pool.length)];
    if (reward.kind === "weapon") unlockedWeapons.push(reward.index);
    else unlockedSpecials.push(reward.index);
    pendingReward = reward;
    saveCampaignProgress();
    return reward;
  }

  function unlockNextLevel() {
    if (currentLevel >= highestUnlockedLevel && currentLevel < CAMPAIGN.length) {
      highestUnlockedLevel = currentLevel + 1;
      saveCampaignProgress();
    }
  }

  function levelIsUnlocked(num) {
    return num >= 1 && num <= highestUnlockedLevel;
  }

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

  let menuSelectedLevel = 1;

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(k)) e.preventDefault();

    if (state === "menu") {
      if (k === "arrowleft" || k === "a") {
        menuSelectedLevel = menuSelectedLevel === 1 ? Math.max(1, CAMPAIGN.length) : menuSelectedLevel - 1;
        menuPage = Math.floor((menuSelectedLevel - 1) / 4);
        sfx.switch();
        return;
      }
      if (k === "arrowright" || k === "d") {
        menuSelectedLevel = menuSelectedLevel === Math.max(1, CAMPAIGN.length) ? 1 : menuSelectedLevel + 1;
        menuPage = Math.floor((menuSelectedLevel - 1) / 4);
        sfx.switch();
        return;
      }
      if (k === "enter" || k === " ") {
        if (levelIsUnlocked(menuSelectedLevel)) openCharacterSelect(menuSelectedLevel);
        else sfx.alarm();
        return;
      }
    }

    if (state === "character_select") {
      if (k === "arrowleft" || k === "a") { characterCursor = (characterCursor + CHARACTERS.length - 1) % CHARACTERS.length; sfx.switch(); }
      else if (k === "arrowright" || k === "d") { characterCursor = (characterCursor + 1) % CHARACTERS.length; sfx.switch(); }
      else if (k === "1" || k === "2" || k === "3") { characterCursor = Number(k) - 1; sfx.switch(); }
      else if (k === "enter" || k === " ") confirmCharacterSelect();
      else if (k === "escape") state = "menu";
      return;
    }

    if (state === "loadout") {
      const list = loadoutColumn === 0 ? WEAPONS : SPECIALS;
      if (k === "arrowleft" || k === "a") { loadoutColumn = 0; loadoutCursor = Math.min(loadoutCursor, WEAPONS.length - 1); sfx.switch(); }
      else if (k === "arrowright" || k === "d") { loadoutColumn = 1; loadoutCursor = Math.min(loadoutCursor, SPECIALS.length - 1); sfx.switch(); }
      else if (k === "arrowup" || k === "w") { loadoutCursor = (loadoutCursor - 1 + list.length) % list.length; sfx.switch(); }
      else if (k === "arrowdown" || k === "s") { loadoutCursor = (loadoutCursor + 1) % list.length; sfx.switch(); }
      else if (k === " ") toggleLoadoutItem(loadoutColumn, loadoutCursor);
      else if (k === "enter") confirmLoadout();
      else if (k === "escape") state = "menu";
      return;
    }

    if (k === "enter" || k === " ") {
      if (state === "level_clear" || state === "level_clear_2") openCharacterSelect(Math.min(CAMPAIGN.length, currentLevel + 1));
      else if (state === "dead" && lives <= 0) startGame(currentLevel || 1);
      else if (state === "win") startGame(1);
    }
    if (/^[0-9]$/.test(k) && (state === "dead" || state === "win" || state.startsWith("level_clear"))) {
      const requested = k === "0" ? 10 : Number(k);
      if (requested <= CAMPAIGN.length) startGame(requested);
    }
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
    if (k === "q" && state === "play") cycleSpecial();
    if (k === "r" && state === "play") beginReload();
    if (k === "r" && (state === "dead" || state === "win" || state.startsWith("level_clear"))) startGame(currentLevel);
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  function menuLevelAt(x, y) {
    if (y < 116 || y > 410) return 0;
    const col = Math.floor((x - 28) / 228);
    if (col < 0 || col > 3) return 0;
    const num = menuPage * 4 + col + 1;
    return num <= CAMPAIGN.length ? num : 0;
  }

  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * VIEW_W;
    mouse.y = ((e.clientY - r.top) / r.height) * VIEW_H;

    if (state === "menu") {
      const hovered = menuLevelAt(mouse.x, mouse.y);
      if (hovered) menuSelectedLevel = hovered;
    }
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
    if (state === "menu") {
      const selected = menuLevelAt(mouse.x, mouse.y);
      if (selected) {
        menuSelectedLevel = selected;
        if (levelIsUnlocked(selected)) openCharacterSelect(selected);
      } else if (mouse.y >= 420 && mouse.y <= 458 && levelIsUnlocked(menuSelectedLevel)) {
        openCharacterSelect(menuSelectedLevel);
      }
    } else if (state === "character_select") {
      const index = Math.floor((mouse.x - 54) / 290);
      if (mouse.y >= 126 && mouse.y <= 420 && index >= 0 && index < CHARACTERS.length) {
        characterCursor = index;
        confirmCharacterSelect();
      }
    } else if (state === "loadout") {
      if (mouse.y >= 118 && mouse.y < 442) {
        const column = mouse.x < VIEW_W / 2 ? 0 : 1;
        const index = Math.floor((mouse.y - 118) / 52);
        const max = column === 0 ? WEAPONS.length : SPECIALS.length;
        if (index >= 0 && index < max) { loadoutColumn = column; loadoutCursor = index; toggleLoadoutItem(column, index); }
      } else if (mouse.y >= 468 && mouse.y <= 516) confirmLoadout();
    }
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
    const character = CHARACTERS[selectedCharacter] || CHARACTERS[0];
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
      character: character.id,
      characterIndex: selectedCharacter,
      hp: character.maxHp,
      maxHp: character.maxHp,
      move: character,
      inv: 0,
      coyote: 0,
      jumpBuf: 0,
      jumpHeld: false,
      airJumpsLeft: character.airJumps || 0,
      weapon: equippedWeapons[0] || 0,
      special: equippedSpecials[0] || 0,
      ammo: WEAPONS.map((w) => w.magazine),
      cool: 0,
      reloading: false,
      reloadTimer: 0,
      heat: 0,
      overheated: false,
      specialCool: 0,
      parryTimer: 0,
      hook: null,
      anim: 0,
      dead: false,
      t: 0,
      stunTimer: 0,
      trapped: false,
      grabEscape: 0,
      climbing: false,
    };
  }

  function startGame(lvlNum) {
    const requestedLevel = lvlNum === undefined ? (currentLevel || 1) : Number(lvlNum);
    const safeLevel = clamp(Math.floor(Number.isFinite(requestedLevel) ? requestedLevel : 1), 1, Math.max(1, CAMPAIGN.length));
    if (!levelIsUnlocked(safeLevel)) {
      menuSelectedLevel = Math.min(Math.max(1, highestUnlockedLevel), Math.max(1, CAMPAIGN.length));
      menuPage = Math.floor((menuSelectedLevel - 1) / 4);
      return;
    }
    currentLevel = safeLevel;
    ensureAudio();
    if (audio && audio.state === "suspended") audio.resume();
    const lvl = L.buildLevel(currentLevel);
    levelData = lvl;
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
    verticalHazard = !!lvl.verticalHazard || (isVerticalLevel && lvl.verticalHazard !== false && lvl.levelNum === 19);
    lavaChase = !!lvl.lavaChase;
    levelName = lvl.name || ("NIVEL " + currentLevel);
    bossSpawnData = lvl.bossSpawn || (lvl.spawns && lvl.spawns.boss) || null;
    bossSpawned = false;
    bossDefeated = false;
    checkpointIndex = 0;
    player = makePlayer();

    if (isVerticalLevel) {
      player.x = (lvl.verticalStartX === undefined ? 18 : lvl.verticalStartX) * TILE;
      const startY = lvl.verticalStartY === undefined ? 175 : lvl.verticalStartY;
      player.y = startY * TILE - PHYS.PLAYER_H;
      risingLavaY = verticalHazard ? (startY + 4) * TILE : 999999;
      risingLavaSpeed = verticalHazard ? 0.92 : 0;
    } else {
      risingLavaY = 999999;
      risingLavaSpeed = 0;
      risingLavaX = lavaChase ? 0 : -999999;
    }

    enemies = [];
    bullets = [];
    bossHazards = [];
    gadgets = [];
    particles = [];
    pickups = [];
    floating = [];
    if (lives <= 0 || state === "menu" || state === "win" || currentLevel === 1) {
      lives = 4;
    }
    winT = 0;
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
    if (levelData && levelData.enemySpawns) {
      for (const spawn of levelData.enemySpawns) {
        spawnEnemy(spawn.type, spawn.tileX * TILE, spawn.tileY * TILE);
      }
    } else if (spawns && spawns.radstars) {
      for (const rs of spawns.radstars) {
        spawnEnemy("radstar", rs.tileX * TILE, rs.tileY * TILE);
      }
    } else if (spawns && spawns.towerEnemies) {
      for (const te of spawns.towerEnemies) {
        spawnEnemy(te.type, te.tileX * TILE, te.tileY * TILE);
      }
    } else if (spawns && spawns.comun) {
      spawnEnemy(spawns.comun.type || "shark", spawns.comun.tileX * TILE, groundY * TILE);
    }
  }

  function cycleWeapon() {
    if (!player || player.dead) return;
    const slot = equippedWeapons.indexOf(player.weapon);
    player.weapon = equippedWeapons[(slot + 1) % equippedWeapons.length];
    player.cool = 8;
    player.reloading = false;
    sfx.switch();
    floatText(player.x, player.y - 20, WEAPONS[player.weapon].short, "#5cf6ff");
  }

  function cycleSpecial() {
    if (!player || player.dead) return;
    const slot = equippedSpecials.indexOf(player.special);
    player.special = equippedSpecials[(slot + 1) % equippedSpecials.length];
    sfx.switch();
    floatText(player.x, player.y - 20, SPECIALS[player.special].short, SPECIALS[player.special].color);
  }

  function openCharacterSelect(levelNum) {
    characterTargetLevel = clamp(levelNum, 1, CAMPAIGN.length);
    characterCursor = selectedCharacter;
    mouse.left = mouse.right = false;
    state = "character_select";
  }

  function confirmCharacterSelect() {
    selectedCharacter = characterCursor;
    saveCampaignProgress();
    openLoadout(characterTargetLevel);
  }

  function openLoadout(levelNum) {
    loadoutTargetLevel = clamp(levelNum, 1, CAMPAIGN.length);
    loadoutColumn = 0;
    loadoutCursor = 0;
    mouse.left = mouse.right = false;
    state = "loadout";
  }

  function toggleLoadoutItem(column, index) {
    const unlocked = column === 0 ? unlockedWeapons : unlockedSpecials;
    const equipped = column === 0 ? equippedWeapons : equippedSpecials;
    if (!unlocked.includes(index)) { sfx.alarm(); return; }
    const at = equipped.indexOf(index);
    if (at >= 0) {
      if (equipped.length > 1) equipped.splice(at, 1);
    } else if (equipped.length < 2) equipped.push(index);
    else equipped.shift(), equipped.push(index);
    saveCampaignProgress();
    sfx.switch();
  }

  function confirmLoadout() {
    if (!equippedWeapons.length || !equippedSpecials.length) { sfx.alarm(); return; }
    mouse.left = mouse.right = mouse.leftClick = mouse.rightClick = false;
    saveCampaignProgress();
    startGame(loadoutTargetLevel);
  }

  function beginReload() {
    if (!player || player.dead || player.reloading) return;
    const w = WEAPONS[player.weapon];
    if (!Number.isFinite(w.magazine) || player.ammo[player.weapon] >= w.magazine) return;
    player.reloading = true;
    player.reloadTimer = w.reload;
    player.cool = Math.max(player.cool, 8);
    floatText(player.x + player.w / 2, player.y - 16, "RECARGANDO", w.accent);
    sfx.switch();
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

  // Un proyectil rápido no puede limitarse a comprobar su punto final: el
  // Titán puede cruzar una hitbox estrecha entre dos fotogramas. Se recorre
  // su tramo de movimiento con una separación menor que su radio.
  function bulletTouchesBox(b, box) {
    const fromX = b.prevX === undefined ? b.x - b.vx : b.prevX;
    const fromY = b.prevY === undefined ? b.y - b.vy : b.prevY;
    const travel = Math.max(Math.abs(b.x - fromX), Math.abs(b.y - fromY));
    const steps = Math.max(1, Math.ceil(travel / Math.max(2, b.r * 0.5)));
    const pad = b.r * 0.35;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(fromX, b.x, t);
      const y = lerp(fromY, b.y, t);
      if (x > box.x - pad && x < box.x + box.w + pad && y > box.y - pad && y < box.y + box.h + pad) return true;
    }
    return false;
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
    // La lava daña al tocarla, pero jamás puede formar una pared lateral.
    // Tratarla como sólido impedía caer en fosos y detenía al jugador ante
    // bordes que visualmente estaban abiertos.
    return solid(id);
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
      prevX: x,
      prevY: y,
      originX: x,
      originY: y,
      vx: Math.cos(ang) * (extra.speed || w.speed),
      vy: Math.sin(ang) * (extra.speed || w.speed),
      r: extra.r || w.r,
      dmg: extra.dmg || w.dmg,
      life: extra.life || 50,
      owner: "player",
      plasma: extra.plasma || w.plasma || false,
      pierce: extra.pierce || 0,
      explode: extra.explode || 0,
      falloff: extra.falloff || w.falloff || null,
      orangeFire: extra.orangeFire || w.fire || false,
      color: extra.color || (w.plasma ? "#c77dff" : "#fff3bf"),
      hit: [],
    });
  }

  function fireWeapon() {
    const w = WEAPONS[player.weapon];
    if (player.cool > 0 || player.reloading || (w.id === "minigun" && player.overheated)) return;
    if (Number.isFinite(w.magazine) && player.ammo[player.weapon] <= 0) {
      beginReload();
      return;
    }
    player.cool = w.cooldown;
    if (Number.isFinite(w.magazine)) player.ammo[player.weapon]--;
    if (w.heatPerShot) {
      player.heat = Math.min(100, player.heat + w.heatPerShot);
      if (player.heat >= 100) {
        player.overheated = true;
        floatText(player.x, player.y - 20, "¡SOBRECALENTADA!", "#ff6b35");
      }
    }
    const g = gunPos();
    const m = mouseWorld();
    const base = angTo(g.x, g.y, m.x, m.y);
    shake = Math.max(shake, w.kick * 3);
    for (let i = 0; i < w.pellets; i++) {
      spawnBullet(g.x, g.y, base + rand(-w.spread, w.spread), {
        life: w.rangeLife || (w.id === "cannon" ? 80 : 55),
        explode: w.explode || 0,
        color: w.fire ? (i % 2 ? "#ff3c00" : "#ffba08") : undefined,
        orangeFire: !!w.fire,
      });
    }
    sfx.shoot(w);
    burst(g.x + Math.cos(base) * 18, g.y + Math.sin(base) * 18, w.accent, w.id === "cannon" ? 14 : 5);
    player.vx -= Math.cos(base) * w.kick * 0.3;
    if (Number.isFinite(w.magazine) && player.ammo[player.weapon] <= 0) beginReload();
  }

  function useSpecial() {
    const s = SPECIALS[player.special];
    if (!s || player.specialCool > 0 || player.dead) return;
    const g = gunPos();
    const m = mouseWorld();
    const aim = angTo(g.x, g.y, m.x, m.y);
    player.specialCool = s.cooldown;
    if (s.sword) {
      player.parryTimer = s.parryFrames;
      const reach = 62;
      for (const en of enemies) {
        if (en.dead || en.state === "emerge") continue;
        const ex = en.x + en.w / 2, ey = en.y + en.h / 2;
        const angleDiff = Math.abs(Math.atan2(Math.sin(angTo(g.x, g.y, ex, ey) - aim), Math.cos(angTo(g.x, g.y, ex, ey) - aim)));
        if (dist(g.x, g.y, ex, ey) <= reach && angleDiff < 0.9) hurtEnemy(en, s.dmg);
      }
      burst(g.x + Math.cos(aim) * 32, g.y + Math.sin(aim) * 32, s.color, 9);
      sfx.special();
      return;
    }
    const speed = s.hook ? 13 : 8.2;
    gadgets.push({
      type: s.id, x: g.x, y: g.y, vx: Math.cos(aim) * speed, vy: Math.sin(aim) * speed - (s.hook ? 0 : 1.8),
      r: s.hook ? 6 : 9, life: s.hook ? 170 : (s.fuse || 360), fuse: s.fuse || 0,
      gravity: s.gravity || 0, bounce: s.bounce || 0, dmg: s.dmg || 0, explode: s.explode || 0,
      sticky: !!s.sticky, hook: !!s.hook, gel: !!s.gel, puddleRadius: s.puddleRadius || 34, color: s.color, state: "flying", target: null,
      hitTargets: [],
    });
    player.hook = s.hook ? gadgets[gadgets.length - 1] : null;
    sfx.special();
  }

  function updateGadgets() {
    for (const g of gadgets) {
      g.life--;
      if (g.fuse > 0) g.fuse--;

      if (g.state === "stuckEnemy" && g.target && !g.target.dead) {
        g.x = g.target.x + g.target.w / 2;
        g.y = g.target.y + g.target.h * 0.35;
      } else if (g.state === "hookedEnemy" && g.target && !g.target.dead) {
        g.x = g.target.x + g.target.w / 2;
        g.y = g.target.y + g.target.h / 2;
        if (mouse.right) {
          const def = ENEMY_TYPES[g.target.type];
          if (def && def.boss) {
            const a = angTo(player.x, player.y, g.x, g.y);
            player.vx += Math.cos(a) * 0.72;
            player.vy += Math.sin(a) * 0.55;
          } else {
            const a = angTo(g.x, g.y, player.x + player.w / 2, player.y + player.h / 2);
            g.target.vx += Math.cos(a) * 0.9;
            g.target.vy += Math.sin(a) * 0.65;
            g.target.stunTimer = Math.max(g.target.stunTimer || 0, 4);
          }
        } else g.life = 0;
      } else if (g.state === "hookedEnemy") {
        g.life = 0;
      } else if (g.state === "hookedTile") {
        if (mouse.right) {
          const a = angTo(player.x + player.w / 2, player.y + player.h / 2, g.x, g.y);
          player.vx += Math.cos(a) * 0.78;
          player.vy += Math.sin(a) * 0.62;
        } else g.life = 0;
      } else if (g.state === "puddle") {
        for (const en of enemies) {
          if (en.dead || ENEMY_TYPES[en.type]?.flying) continue;
          if (Math.abs(en.x + en.w / 2 - g.x) < g.puddleRadius && Math.abs(en.y + en.h - g.y) < 28) {
            en.slipTimer = 135;
            en.vx = (en.facing || 1) * 6.5;
            en.lastDecision = "slipping_inertia_gel";
            g.life = 0;
            burst(g.x, g.y, g.color, 14);
            break;
          }
        }
      } else if (g.state === "flying") {
        g.vy += g.gravity;
        g.x += g.vx;
        g.y += g.vy;
        let enemyHit = null;
        for (const en of enemies) {
          if (!en.dead && en.state !== "emerge" && g.x > en.x && g.x < en.x + en.w && g.y > en.y && g.y < en.y + en.h) { enemyHit = en; break; }
        }
        if (enemyHit) {
          if (g.hook) { g.state = "hookedEnemy"; g.target = enemyHit; g.vx = g.vy = 0; }
          else if (g.sticky) { g.state = "stuckEnemy"; g.target = enemyHit; g.vx = g.vy = 0; }
          else if (!g.gel) {
            const hitTargets = g.hitTargets || (g.hitTargets = []);
            if (!hitTargets.includes(enemyHit)) {
              hitTargets.push(enemyHit);
              hurtEnemy(enemyHit, Math.max(4, Math.floor(g.dmg * 0.2)));
              // Sacar el proyectil del volumen evita que el mismo contacto se
              // procese en cada fotograma mientras comienza el rebote.
              g.x -= g.vx;
              g.y -= g.vy;
              g.vx *= -0.45;
              g.vy = -Math.abs(g.vy) * 0.45;
            }
          }
        }
        const hitSurface = tilesTouching({ x: g.x - g.r, y: g.y - g.r, w: g.r * 2, h: g.r * 2 }).some((t) => solid(t.id) || oneWay(t.id) || t.id === T.DOOR);
        if (hitSurface) {
          if (g.hook) { g.state = "hookedTile"; g.vx = g.vy = 0; }
          else if (g.sticky) { g.state = "stuckTile"; g.vx = g.vy = 0; }
          else if (g.gel) { g.state = "puddle"; g.y -= 8; g.vx = g.vy = 0; g.life = 420; }
          else { g.y -= g.vy; g.vy = -Math.abs(g.vy) * g.bounce; g.vx *= 0.72; }
        }
      }

      if (g.fuse === 0 && g.explode && g.type !== "hook") {
        explode(g.x, g.y, g.explode, g.dmg);
        g.life = 0;
        g.fuse = -1;
      }
    }
    gadgets = gadgets.filter((g) => g.life > 0 && g.y < worldH * TILE + 160);
    if (player.hook && !gadgets.includes(player.hook)) player.hook = null;
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
    seaking: { name: "Rey Marino", hp: 460, w: 78, h: 44, speed: 0.72, dmg: 2, score: 4200, spit: true, boss: true },
    radstar: { name: "Estrella Radiactiva", hp: 30, w: 44, h: 44, speed: 1.8, dmg: 1, score: 350, flying: true, greenFire: true },
    radboss: { name: "Titan Radiactivo", hp: 950, w: 116, h: 96, speed: 0.8, dmg: 2, score: 6500, boss: true, heavy: true },
    alien_ship: { name: "Nave Nodriza Alienigena", hp: 1200, w: 128, h: 64, speed: 2.2, dmg: 2, score: 9000, boss: true, flying: true },
    piranha: { name: "Piraña de Puerto", hp: 22, w: 30, h: 22, speed: 2.35, dmg: 1, score: 170, behavior: "runner", color: "#f4d35e" },
    firebat: { name: "Murcielago de Fuego", hp: 24, w: 34, h: 24, speed: 1.7, dmg: 1, score: 220, flying: true, behavior: "flyer", color: "#ff6b35" },
    turret: { name: "Torreta Centinela", hp: 52, w: 34, h: 38, speed: 0, dmg: 1, score: 260, behavior: "turret", color: "#94d2bd" },
    shield: { name: "Guardia de Escudo", hp: 74, w: 30, h: 36, speed: 0.58, dmg: 2, score: 360, behavior: "shield", color: "#5cf6ff" },
    mine: { name: "Mina Perseguidora", hp: 18, w: 24, h: 24, speed: 1.65, dmg: 2, score: 190, behavior: "mine", color: "#ffba08" },
    drone: { name: "Dron de Asalto", hp: 34, w: 36, h: 26, speed: 1.4, dmg: 1, score: 280, flying: true, behavior: "shooter", color: "#c77dff" },
    sniper: { name: "Francotirador de Plasma", hp: 30, w: 28, h: 38, speed: 0.3, dmg: 2, score: 330, behavior: "sniper", color: "#00f0ff" },
    slime: { name: "Limo Radiactivo", hp: 48, w: 38, h: 24, speed: 0.52, dmg: 1, score: 240, behavior: "split", color: "#70e000" },
    spore: { name: "Espora Flotante", hp: 26, w: 30, h: 30, speed: 0.8, dmg: 1, score: 270, flying: true, behavior: "spore", color: "#ccff33" },
    mutant: { name: "Mutante Inestable", hp: 68, w: 44, h: 42, speed: 1.1, dmg: 2, score: 420, behavior: "charger", color: "#ff3c00" },
    teleporter: { name: "Saltador Cuantico", hp: 38, w: 32, h: 38, speed: 1.1, dmg: 1, score: 390, behavior: "teleporter", color: "#e0aaff" },
    xeno_scout: { name: "Explorador Xeno", hp: 42, w: 36, h: 30, speed: 1.75, dmg: 1, score: 360, flying: true, behavior: "strafer", color: "#5cf6ff" },
    tractor_unit: { name: "Unidad Tractora", hp: 58, w: 36, h: 36, speed: 0.7, dmg: 1, score: 460, behavior: "tractor", color: "#bde0fe" },
    mimic: { name: "Mimico de Portal", hp: 64, w: 42, h: 38, speed: 1.3, dmg: 2, score: 520, behavior: "mimic", color: "#ff7b00" },
    hammer_shark: { name: "Martillo Escualo", hp: 420, w: 86, h: 58, speed: 1.2, dmg: 2, score: 2400, boss: true, behavior: "boss", bossPattern: "hammer", color: "#ff6b35" },
    sewer_kraken: { name: "Kraken Menor", hp: 500, w: 92, h: 70, speed: 0.9, dmg: 2, score: 2800, boss: true, behavior: "boss", bossPattern: "kraken", color: "#6c2bd9" },
    siren_warlord: { name: "Sirena de Guerra", hp: 560, w: 88, h: 66, speed: 1.1, dmg: 2, score: 3000, boss: true, behavior: "boss", bossPattern: "siren", color: "#ef233c" },
    magma_eel_lord: { name: "Anguila Volcanica", hp: 620, w: 104, h: 48, speed: 1.5, dmg: 2, score: 3400, boss: true, behavior: "boss", bossPattern: "volcano", color: "#ff7b00" },
    crab_tank: { name: "Tanque Cangrejo", hp: 700, w: 112, h: 70, speed: 0.65, dmg: 3, score: 3800, boss: true, behavior: "boss", bossPattern: "tank", color: "#94d2bd" },
    ferro_worm: { name: "Gusano Ferrico", hp: 760, w: 118, h: 52, speed: 1.8, dmg: 2, score: 4200, boss: true, behavior: "boss", bossPattern: "worm", color: "#d0d6e0" },
    admiral_octopus: { name: "Almirante Pulpo", hp: 820, w: 106, h: 76, speed: 0.85, dmg: 2, score: 4500, boss: true, behavior: "boss", bossPattern: "admiral", color: "#c77dff" },
    ash_golem: { name: "Golem del Bastion", hp: 900, w: 120, h: 96, speed: 0.5, dmg: 3, score: 5000, boss: true, behavior: "boss", bossPattern: "golem", color: "#8d99ae" },
    magma_emperor: { name: "Emperador Cangrejo", hp: 980, w: 124, h: 86, speed: 0.9, dmg: 3, score: 5600, boss: true, behavior: "boss", bossPattern: "emperor", color: "#ff3c00" },
    spore_hydra: { name: "Hidra de Esporas", hp: 1040, w: 118, h: 92, speed: 0.75, dmg: 3, score: 6000, boss: true, behavior: "boss", bossPattern: "hydra", color: "#70e000" },
    gamma_excavator: { name: "Excavador Gamma", hp: 1100, w: 130, h: 82, speed: 0.95, dmg: 3, score: 6400, boss: true, behavior: "boss", bossPattern: "excavator", color: "#ffba08" },
    isotope_doctor: { name: "Doctor Isotopo", hp: 1160, w: 88, h: 96, speed: 1.2, dmg: 2, score: 7000, boss: true, behavior: "boss", bossPattern: "doctor", color: "#e0aaff" },
    atomic_locomotive: { name: "Locomotora Atomica", hp: 1220, w: 144, h: 86, speed: 1.7, dmg: 3, score: 7400, boss: true, behavior: "boss", bossPattern: "locomotive", color: "#ffe066" },
    omega_sentinel: { name: "Centinela Omega", hp: 1300, w: 106, h: 98, speed: 1.0, dmg: 3, score: 8000, boss: true, behavior: "boss", bossPattern: "sentinel", color: "#00f0ff" },
    xeno_carrier: { name: "Portanaves Xeno", hp: 1380, w: 148, h: 82, speed: 1.4, dmg: 3, score: 8500, boss: true, behavior: "boss", bossPattern: "carrier", flying: true, color: "#5cf6ff" },
    tri_oracle: { name: "Oraculo Tricefalo", hp: 1460, w: 124, h: 98, speed: 1.1, dmg: 3, score: 9000, boss: true, behavior: "boss", bossPattern: "oracle", flying: true, color: "#c77dff" },
    cataclysm_architect: { name: "Arquitecto del Cataclismo", hp: 1800, w: 150, h: 112, speed: 1.25, dmg: 4, score: 15000, boss: true, behavior: "boss", bossPattern: "architect", flying: true, color: "#ffe600" },
  };

  // Los bosses nuevos no comparten una rotación fija. Cada perfil combina
  // movimiento, temperamento y tres técnicas que compiten según distancia,
  // altura, velocidad del jugador, fase y memoria de ataques recientes.
  const BOSS_PERSONALITIES = {
    hammer: {
      style: "aggressive",
      signature: "estela_de_embestida",
      attacks: [
        { id: "hammer_ram", label: "EMBESTIDA ROMPEMUELLES", kind: "dash", range: "far", count: 3 },
        { id: "harbor_shockwave", label: "MAREA DE IMPACTO", kind: "fan", range: "near", count: 5, ground: true },
        { id: "anchor_harpoon", label: "ARPON DE ANCLA", kind: "snipe", range: "far", predictive: true },
      ],
    },
    kraken: {
      style: "zoning",
      signature: "charcos_de_tinta",
      attacks: [
        { id: "tentacle_cage", label: "JAULA DE TENTACULOS", kind: "wall", range: "near", count: 6 },
        { id: "sewer_ink", label: "TINTA SEPTICA", kind: "lob", range: "mid", count: 4, explode: 30 },
        { id: "undertow", label: "REMOLINO DE DESAGUE", kind: "radial", range: "near", count: 10 },
      ],
    },
    siren: {
      style: "reactive",
      signature: "columnas_sonicas",
      attacks: [
        { id: "war_chant", label: "CANTO DE GUERRA", kind: "radial", range: "near", count: 8, stun: true },
        { id: "sonic_lance", label: "LANZA SONICA", kind: "snipe", range: "far", predictive: true },
        { id: "charm_crossfire", label: "CORO CRUZADO", kind: "cross", range: "mid", count: 6 },
      ],
    },
    volcano: {
      style: "skirmisher",
      signature: "erupciones_del_suelo",
      attacks: [
        { id: "lava_breach", label: "BRECHA VOLCANICA", kind: "dash", range: "far", count: 4, fire: true },
        { id: "eruption_rain", label: "LLUVIA DE ESCORIA", kind: "rain", range: "mid", count: 7, fire: true },
        { id: "magma_coil", label: "ESPIRAL DE MAGMA", kind: "spiral", range: "near", count: 9, fire: true },
      ],
    },
    tank: {
      style: "fortress",
      signature: "bateria_de_sitio",
      attacks: [
        { id: "cannon_salvo", label: "SALVA DE CANON", kind: "lob", range: "far", count: 5, explode: 34 },
        { id: "armor_charge", label: "CARGA BLINDADA", kind: "dash", range: "mid", count: 3 },
        { id: "mortar_ring", label: "ANILLO DE MORTEROS", kind: "radial", range: "near", count: 12, explode: 20 },
      ],
    },
    worm: {
      style: "ambusher",
      signature: "emboscada_subterranea",
      attacks: [
        { id: "tunnel_rush", label: "ASALTO SUBTERRANEO", kind: "dash", range: "far", count: 4 },
        { id: "rail_spikes", label: "ESPINAS DE RIEL", kind: "fan", range: "mid", count: 7, predictive: true },
        { id: "magnetic_burst", label: "PULSO MAGNETICO", kind: "tractor", range: "near", count: 3, stun: true },
      ],
    },
    admiral: {
      style: "commander",
      signature: "andanada_de_cubierta",
      attacks: [
        { id: "broadside", label: "ANDANADA DE BABOR", kind: "fan", range: "mid", count: 8 },
        { id: "depth_charge", label: "CARGAS DE PROFUNDIDAD", kind: "minefield", range: "near", count: 6, explode: 30 },
        { id: "command_volley", label: "FUEGO DE ESCUADRA", kind: "cross", range: "far", count: 8, predictive: true },
      ],
    },
    golem: {
      style: "fortress",
      signature: "meteoros_y_onda",
      attacks: [
        { id: "bastion_slam", label: "GOLPE DE BASTION", kind: "shockwave", range: "near", count: 6 },
        { id: "stone_wall", label: "MURALLA DE CENIZA", kind: "wall", range: "mid", count: 7 },
        { id: "ash_meteor", label: "METEOROS DE CENIZA", kind: "rain", range: "far", count: 7, explode: 28 },
      ],
    },
    emperor: {
      style: "duelist",
      signature: "anillo_de_pinzas",
      attacks: [
        { id: "royal_spiral", label: "ESPIRAL IMPERIAL", kind: "spiral", range: "mid", count: 12, fire: true },
        { id: "claw_charge", label: "PINZA DEL EMPERADOR", kind: "dash", range: "far", count: 4 },
        { id: "magma_crown", label: "CORONA DE MAGMA", kind: "radial", range: "near", count: 14, fire: true },
      ],
    },
    hydra: {
      style: "zoning",
      signature: "triple_mordida_de_esporas",
      attacks: [
        { id: "triple_venom", label: "TRIPLE VENENO", kind: "fan", range: "mid", count: 6, poison: true },
        { id: "spore_bloom", label: "FLORACION DE ESPORAS", kind: "lob", range: "near", count: 5, explode: 38, poison: true },
        { id: "regrowth_barrage", label: "BARRERA REGENERATIVA", kind: "rain", range: "far", count: 8, poison: true },
      ],
    },
    excavator: {
      style: "aggressive",
      signature: "carril_de_taladro",
      attacks: [
        { id: "drill_charge", label: "TALADRO GAMMA", kind: "dash", range: "far", count: 5 },
        { id: "gamma_mortar", label: "MORTERO GAMMA", kind: "lob", range: "mid", count: 5, explode: 40 },
        { id: "debris_fan", label: "ABANICO DE ESCOMBROS", kind: "fan", range: "near", count: 9, explode: 18 },
      ],
    },
    doctor: {
      style: "teleporter",
      signature: "piscinas_mutagenas",
      attacks: [
        { id: "quantum_swap", label: "INTERCAMBIO CUANTICO", kind: "teleport", range: "near", count: 5 },
        { id: "isotope_ray", label: "RAYO ISOTOPO", kind: "snipe", range: "far", predictive: true, stun: true },
        { id: "mutation_field", label: "CAMPO DE MUTACION", kind: "radial", range: "mid", count: 11, poison: true },
      ],
    },
    locomotive: {
      style: "aggressive",
      signature: "carga_sobre_rieles",
      attacks: [
        { id: "express_charge", label: "EXPRES ATOMICO", kind: "dash", range: "far", count: 5, fire: true },
        { id: "steam_barrage", label: "BARRERA DE VAPOR", kind: "fan", range: "near", count: 9 },
        { id: "track_bombardment", label: "BOMBARDEO DE VIAS", kind: "rain", range: "mid", count: 8, explode: 26 },
      ],
    },
    sentinel: {
      style: "reactive",
      signature: "rejilla_omega",
      attacks: [
        { id: "omega_beam", label: "RAYO OMEGA", kind: "snipe", range: "far", predictive: true },
        { id: "cross_protocol", label: "PROTOCOLO CRUZADO", kind: "cross", range: "mid", count: 8 },
        { id: "security_ring", label: "ANILLO DE SEGURIDAD", kind: "radial", range: "near", count: 12, stun: true },
      ],
    },
    carrier: {
      style: "commander",
      signature: "corredor_de_cazas",
      attacks: [
        { id: "fighter_screen", label: "PANTALLA DE CAZAS", kind: "summon", range: "far", count: 4, minion: "xeno_scout" },
        { id: "plasma_broadside", label: "ANDANADA DE PLASMA", kind: "fan", range: "mid", count: 9, plasma: true },
        { id: "tractor_lock", label: "FIJACION TRACTORA", kind: "tractor", range: "near", count: 4, stun: true },
      ],
    },
    oracle: {
      style: "predictive",
      signature: "ecos_del_futuro",
      attacks: [
        { id: "past_volley", label: "ECO DEL PASADO", kind: "fan", range: "near", count: 7 },
        { id: "present_prison", label: "PRISION DEL PRESENTE", kind: "wall", range: "mid", count: 8, stun: true },
        { id: "future_strike", label: "GOLPE DEL FUTURO", kind: "snipe", range: "far", predictive: true, plasma: true },
      ],
    },
    architect: {
      style: "adaptive",
      signature: "rejilla_del_cataclismo",
      attacks: [
        { id: "reality_spiral", label: "ESPIRAL DE REALIDAD", kind: "spiral", range: "mid", count: 14, plasma: true },
        { id: "zero_collapse", label: "COLAPSO CERO", kind: "radial", range: "near", count: 16, explode: 24 },
        { id: "cataclysm_grid", label: "RETICULA DEL CATACLISMO", kind: "wall", range: "far", count: 10, predictive: true, stun: true },
        { id: "last_geometry", label: "GEOMETRIA FINAL", kind: "cataclysm", range: "mid", count: 18, plasma: true, final: true },
      ],
    },
  };

  function spawnEnemy(type, x, y) {
    const d = ENEMY_TYPES[type];
    if (!d) return;
    const isFlying = !!d.flying;
    const hpScale = d.boss ? 1.9 + currentLevel * 0.12 : 1.18 + Math.max(0, currentLevel - 1) * 0.075;
    const scaledHp = Math.max(d.hp, Math.round(d.hp * hpScale));
    const aggression = d.boss ? 1.24 + currentLevel * 0.032 : 1.08 + Math.max(0, currentLevel - 1) * 0.05;
    enemies.push({
      type,
      behavior: d.behavior || null,
      bossPattern: d.bossPattern || null,
      x: x - d.w / 2,
      y: isFlying ? y : y - d.h,
      baseY: y,
      w: d.w,
      h: d.h,
      vx: 0,
      vy: isFlying ? 0 : -2,
      hp: scaledHp,
      maxHp: scaledHp,
      aggression,
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
      color: d.color || "#7bed9f",
      phase: 1,
      shielded: false,
      currentAttack: null,
      lastAttackId: null,
      attackHistory: [],
      attackUsage: Object.create(null),
      signatureRush: 0,
      lastSignature: null,
      lastDecision: "emerge",
    });
    if (isFlying) {
      burst(x, y, type === "alien_ship" ? "#5cf6ff" : "#39ff14", 12);
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
    } else if (en.behavior === "shield" && en.shielded) {
      finalDmg = Math.max(1, Math.floor(dmg * 0.35));
      floatText(en.x + en.w / 2, en.y - 12, "ESCUDO " + finalDmg, "#5cf6ff");
      sfx.hit();
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
    coins += (ENEMY_TYPES[en.type] ? ENEMY_TYPES[en.type].score : 200) / 10;
    sfx.kill();
    if (ENEMY_TYPES[en.type] && ENEMY_TYPES[en.type].boss) {
      bossDefeated = true;
      unlockNextLevel();
      const reward = awardBossUnlock(currentLevel);
      floatText(en.x + en.w / 2, en.y - 32, "¡JEFE DERROTADO! PORTAL ABIERTO", "#ffe600");
      if (reward) floatText(en.x + en.w / 2, en.y - 54, "DESBLOQUEADO: " + reward.name, reward.kind === "weapon" ? "#5cf6ff" : "#72f1b8");
    }
    const col = en.type === "radstar" ? "#39ff14" : (en.type === "radboss" ? "#ff7b00" : (en.type === "alien_ship" ? "#5cf6ff" : "#7bed9f"));
    burst(en.x + en.w / 2, en.y + en.h / 2, col, en.type === "radboss" ? 36 : (en.type === "alien_ship" ? 50 : 16));
    if (en.type === "alien_ship") {
      floatText(en.x + en.w / 2, en.y - 20, "¡NAVE NODRIZA DESTRUIDA! ¡ESCAPA POR EL PORTAL!", "#5cf6ff");
      shake = 22;
    }
    if (Math.random() < 0.65 || (ENEMY_TYPES[en.type] && ENEMY_TYPES[en.type].boss)) {
      const dropCount = ENEMY_TYPES[en.type] && ENEMY_TYPES[en.type].boss ? 4 : 1;
      for (let i = 0; i < dropCount; i++) {
        pickups.push({
          x: en.x + en.w / 2 + (i - 1) * 16,
          y: en.y,
          vy: -3 - i,
          kind: Math.random() < 0.4 ? "heart" : "coolant",
          weapon: equippedWeapons[irand(0, equippedWeapons.length - 1)],
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

  function respawnPlayer() {
    const p = player;
    p.dead = false;
    p.hp = p.maxHp;
    p.h = PHYS.PLAYER_H;
    p.crouch = false;
    p.vx = 0;
    p.vy = 0;
    p.inv = 160;
    p.inLava = false;
    p.trapped = false;
    p.stunTimer = 0;

    if (isVerticalLevel) {
      // Encontrar el piso seguro más cercano a donde murió el jugador
      const towerFloors = (levelData && levelData.verticalFloors) || [30, 48, 62, 76, 90, 104, 118, 130, 142, 154, 166, 175];
      const checkpointFloor = levelData && levelData.checkpoints && checkpointIndex > 0 ? levelData.checkpoints[checkpointIndex - 1] : null;
      const targetY = Math.floor(p.y / TILE);
      let bestFloor = checkpointFloor || (levelData && levelData.verticalStartY) || 175;
      if (!checkpointFloor) {
        for (const fy of towerFloors) {
          if (fy >= targetY) {
            bestFloor = fy;
            break;
          }
        }
      }
      p.x = ((levelData && levelData.verticalStartX) === undefined ? 18 : levelData.verticalStartX) * TILE;
      p.y = bestFloor * TILE - PHYS.PLAYER_H;
      // Retrasar la lava para que quede siempre al menos 8 tiles por debajo del jugador
      if (verticalHazard) risingLavaY = Math.max(risingLavaY, (bestFloor + 8) * TILE);
    } else {
      const checkpointX = levelData && levelData.checkpoints && checkpointIndex > 0 ? levelData.checkpoints[checkpointIndex - 1] : null;
      let rx = checkpointX || Math.max(3, Math.floor((cam.x + 40) / TILE));
      while (rx > 2 && (tileAt(rx, groundY) === T.EMPTY || tileAt(rx, groundY) === T.LAVA)) rx--;
      p.x = rx * TILE;
      p.y = groundY * TILE - PHYS.PLAYER_H;
    }
    if (lavaChase) {
      risingLavaX += 3.05;
      if (p.x + p.w < risingLavaX + 18) {
        p.inLava = true;
        hurtPlayer(1);
        p.vx = Math.max(p.vx, 6.8);
        p.vy = -7.5;
        burst(p.x + p.w / 2, p.y + p.h, "#ff6b00", 10);
      }
    }
    snapCam();
  }

  function tryHeavyClimb(p, direction, speed) {
    const frontX = p.x + (direction > 0 ? p.w + 2 : -2);
    const frontTile = Math.floor(frontX / TILE);
    const footTile = Math.floor((p.y + p.h - 2) / TILE);
    const chestTile = Math.floor((p.y + p.h * 0.52) / TILE);
    const wallAhead = solid(tileAt(frontTile, footTile)) || solid(tileAt(frontTile, chestTile));
    if (!wallAhead) return false;
    // Sólo escala si hay aire por encima de su casco. Así no atraviesa techos
    // ni usa la escalada para colarse a través de una estructura cerrada.
    const headTile = Math.floor((p.y - speed - 2) / TILE);
    const bodyTile = Math.floor((p.x + p.w / 2) / TILE);
    if (solid(tileAt(bodyTile, headTile))) return false;
    p.y -= speed;
    p.x += direction * Math.min(1.6, speed * 0.52);
    p.vx = direction * Math.min(1.6, speed * 0.52);
    p.vy = 0;
    return true;
  }

  function updatePlayer() {
    const p = player;
    if (p.dead) {
      p.t++;
      p.vy += PHYS.GRAVITY * 0.5;
      p.y += p.vy;
      if (p.t > 70) {
        if (lives > 0) {
          respawnPlayer();
        } else {
          state = "dead";
        }
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

    const profile = p.move || CHARACTERS[0];
    const max = (p.crouch ? PHYS.CROUCH_RUN : PHYS.RUN) * profile.run;
    const acc = (p.onGround ? PHYS.ACC : PHYS.AIR_ACC) * (p.onGround ? profile.acc : profile.airAcc);
    let ax = 0;
    if (!isStunned && !isTrapped) {
      if (keys.a || keys.arrowleft) ax -= 1;
      if (keys.d || keys.arrowright) ax += 1;
    }
    if (ax !== 0) p.vx += ax * acc;
    else p.vx *= p.onGround ? PHYS.FRICTION : PHYS.AIR_FRICTION;
    p.vx = clamp(p.vx, -max, max);

    const jumpHeld = holdingJump();
    const jumpPressed = jumpHeld && !p.jumpHeld;
    p.jumpHeld = jumpHeld;
    if (!profile.climb && !isStunned && !isTrapped && jumpPressed) p.jumpBuf = PHYS.JUMP_BUF;
    if (p.onGround) {
      p.coyote = PHYS.COYOTE;
      p.airJumpsLeft = profile.airJumps || 0;
    }

    let jumped = false;
    const canGroundJump = p.coyote > 0;
    const canAirJump = !p.onGround && p.airJumpsLeft > 0;
    if (!profile.climb && !isStunned && !isTrapped && p.jumpBuf > 0 && (canGroundJump || canAirJump) && !p.crouch) {
      p.vy = profile.jump;
      p.onGround = false;
      p.jumpBuf = 0;
      p.coyote = 0;
      if (canAirJump && !canGroundJump) {
        p.airJumpsLeft--;
        floatText(p.x + p.w / 2, p.y - 14, "DOBLE SALTO", profile.color);
        burst(p.x + p.w / 2, p.y + p.h, profile.color, 8);
      }
      jumped = true;
      sfx.jump();
    }

    const climbed = profile.climb && !isStunned && !isTrapped && ax !== 0 && tryHeavyClimb(p, Math.sign(ax), profile.climbSpeed);
    p.climbing = climbed;
    if (!jumped && !climbed && !isTrapped) {
      if (!holdingJump() && p.vy < -3.2) p.vy *= 0.52;
      const g = p.vy < 0 && holdingJump() ? profile.holdGravity : profile.gravity;
      p.vy += g;
    }
    if (p.vy > profile.maxFall) p.vy = profile.maxFall;

    p.inLava = false;
    p.fell = false;
    if (!isTrapped && !climbed) moveActor(p);

    if (isVerticalLevel && verticalHazard) {
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

    if (!p.dead && levelData && levelData.checkpoints && levelData.checkpoints.length) {
      const nextCheckpoint = levelData.checkpoints[checkpointIndex];
      const reached = isVerticalLevel
        ? nextCheckpoint !== undefined && p.y <= nextCheckpoint * TILE
        : nextCheckpoint !== undefined && p.x >= nextCheckpoint * TILE;
      if (reached) {
        checkpointIndex++;
        floatText(p.x + p.w / 2, p.y - 28, "PUNTO DE CONTROL " + checkpointIndex, "#5cf6ff");
        sfx.switch();
      }
    }

    const m = mouseWorld();
    p.facing = m.x >= p.x + p.w / 2 ? 1 : -1;
    if (p.inv > 0) p.inv--;
    if (p.cool > 0) p.cool--;
    if (p.specialCool > 0) p.specialCool--;
    if (p.parryTimer > 0) p.parryTimer--;
    if (p.reloading) {
      p.reloadTimer--;
      if (p.reloadTimer <= 0) {
        p.reloading = false;
        p.ammo[p.weapon] = WEAPONS[p.weapon].magazine;
        floatText(p.x + p.w / 2, p.y - 16, "LISTA", WEAPONS[p.weapon].accent);
      }
    }
    if (p.heat > 0) p.heat = Math.max(0, p.heat - WEAPONS[5].coolRate * (mouse.left ? 0.35 : 1));
    if (p.overheated && p.heat <= 32) p.overheated = false;
    if (p.jumpBuf > 0) p.jumpBuf--;
    if (p.coyote > 0) p.coyote--;
    p.anim += Math.abs(p.vx) * 0.16 + 0.06;

    if (!isStunned) {
      if (mouse.rightClick) useSpecial();

      const w = WEAPONS[p.weapon];
      if (mouse.left) {
        if (w.automatic) fireWeapon();
        else if (mouse.leftClick) fireWeapon();
      }
    }

    const touchingDoor = tilesTouching(bodyBox(p)).some((t) => t.id === T.DOOR) ||
      (Math.abs(p.x + p.w / 2 - doorX) < 48 && Math.abs(p.y + p.h / 2 - (doorY || 19 * TILE)) < 60);

    if (touchingDoor && !p.dead) {
      const activeBoss = enemies.find((e) => !e.dead && ENEMY_TYPES[e.type] && ENEMY_TYPES[e.type].boss);
      if (!bossDefeated || activeBoss) {
        if (time % 45 === 0) {
          const bossName = bossSpawnData && ENEMY_TYPES[bossSpawnData.type] ? ENEMY_TYPES[bossSpawnData.type].name : "JEFE";
          floatText(p.x, p.y - 30, "¡DERROTA A " + bossName.toUpperCase() + "!", "#ef233c");
        }
      } else {
        state = currentLevel >= CAMPAIGN.length ? "win" : "level_clear";
        winT = 0;
        sfx.win();
      }
    }
  }

  function spawnEnemyBullet(x, y, angle, options) {
    const o = options || {};
    const speed = o.speed === undefined ? 5.5 : o.speed;
    bullets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: o.r || 6,
      dmg: o.dmg || 1,
      life: o.life || 90,
      owner: "enemy",
      plasma: !!o.plasma,
      pierce: 0,
      explode: o.explode || 0,
      stunOrb: !!o.stunOrb,
      greenFire: !!o.greenFire,
      orangeFire: !!o.orangeFire,
      color: o.color || "#ff6b35",
      hit: [],
    });
  }

  function predictiveAim(fromX, fromY, projectileSpeed, leadFrames) {
    const travel = Math.max(4, Math.min(36, dist(fromX, fromY, player.x + player.w / 2, player.y + player.h / 2) / Math.max(1, projectileSpeed)));
    const lead = Math.min(1, travel / Math.max(1, leadFrames || 18));
    return angTo(fromX, fromY, player.x + player.w / 2 + player.vx * travel * lead, player.y + player.h / 2 + player.vy * travel * lead);
  }

  function groundTactics(en, pace) {
    if (!en.onGround || !en.vx) return null;
    const direction = Math.sign(en.vx) || en.facing || 1;
    const front = Math.floor((en.x + (direction > 0 ? en.w + 6 : -6)) / TILE);
    const feet = Math.floor((en.y + en.h - 2) / TILE);
    const chest = Math.floor((en.y + en.h * 0.52) / TILE);
    const ahead = tileAt(front, feet);
    const underAhead = tileAt(front, feet + 1);
    if (ahead === T.LAVA || underAhead === T.LAVA || (ahead === T.EMPTY && underAhead === T.EMPTY)) {
      en.facing = -direction;
      en.vx = -direction * pace * 0.55;
      return "avoid_hazard";
    }
    if (solid(tileAt(front, chest)) && Math.abs(player.y - en.y) < 110) {
      en.vy = -Math.min(11.2, 8.2 + pace * 0.65);
      return "vault_cover";
    }
    let push = 0;
    for (const ally of enemies) {
      if (ally === en || ally.dead || Math.abs(ally.y - en.y) > 42) continue;
      const delta = (en.x + en.w / 2) - (ally.x + ally.w / 2);
      if (Math.abs(delta) < 32) push += Math.sign(delta || direction) * 0.28;
    }
    if (push) {
      en.vx += push;
      return "space_formation";
    }
    return null;
  }

  function bossRangeScore(range, distanceToPlayer) {
    if (range === "near") return distanceToPlayer < 210 ? 5 : distanceToPlayer < 360 ? 1 : -3;
    if (range === "far") return distanceToPlayer > 390 ? 5 : distanceToPlayer > 250 ? 2 : -3;
    return distanceToPlayer >= 170 && distanceToPlayer <= 500 ? 4 : 1;
  }

  function selectBossAttack(en, def, pcx, pcy, ecx, ecy) {
    const profile = BOSS_PERSONALITIES[def.bossPattern];
    if (!profile) return null;
    const distanceToPlayer = dist(pcx, pcy, ecx, ecy);
    const airborne = !player.onGround || Math.abs(player.vy) > 2;
    const movingFast = Math.abs(player.vx) > PHYS.RUN * 0.65;
    const recent = en.attackHistory || [];
    const usage = en.attackUsage || (en.attackUsage = Object.create(null));
    let best = null;
    let bestScore = -999;
    for (let i = 0; i < profile.attacks.length; i++) {
      const attack = profile.attacks[i];
      let score = bossRangeScore(attack.range, distanceToPlayer);
      if (attack.predictive && movingFast) score += 3;
      if (attack.stun && airborne) score += 2;
      if (attack.kind === "rain" && airborne) score += 2;
      if (attack.kind === "dash" && distanceToPlayer > 280) score += 2;
      if (attack.kind === "radial" && distanceToPlayer < 190) score += 3;
      if (en.phase >= 2 && (attack.explode || attack.plasma || attack.poison)) score += 1.5;
      if (en.phase >= 3 && i === (en.attackHistory.length % profile.attacks.length)) score += 2;
      if (attack.final && en.phase < 4) score -= 80;
      if (attack.final && en.phase >= 4) score += 12;
      if (recent[recent.length - 1] === attack.id) score -= 20;
      else if (recent.includes(attack.id)) score -= 3;
      // Bosses remember their repertoire: context still matters, but an
      // unseen move is strongly preferred over looping the familiar pair.
      score += usage[attack.id] ? -Math.min(5, usage[attack.id] * 1.35) : 7;
      score += Math.random() * 0.75;
      if (score > bestScore) {
        best = attack;
        bestScore = score;
      }
    }
    en.currentAttack = best;
    en.lastAttackId = best.id;
    usage[best.id] = (usage[best.id] || 0) + 1;
    en.attackHistory.push(best.id);
    if (en.attackHistory.length > 3) en.attackHistory.shift();
    return best;
  }

  function bossMovement(en, def, profile, dx, pcx, pcy) {
    const style = profile ? profile.style : "aggressive";
    if (def.flying) {
      const heightOffset = style === "commander" ? 165 : style === "predictive" ? 145 : 110;
      const sway = style === "adaptive" ? 180 : style === "zoning" ? 150 : 105;
      const targetY = clamp(pcy - heightOffset + Math.sin(en.t * 0.045) * 42, 2 * TILE, Math.max(3 * TILE, (groundY - 4) * TILE));
      const targetX = clamp(pcx - en.w / 2 + Math.cos(en.t * 0.032) * sway, 2 * TILE, Math.max(3 * TILE, (worldW - 5) * TILE));
      en.x = lerp(en.x, targetX, style === "adaptive" ? 0.065 : 0.045);
      en.y = lerp(en.y, targetY, 0.045);
      en.lastDecision = Math.abs(dx) < 220 ? "reposition_air" : "intercept_air";
      return;
    }

    let speedFactor = 1;
    if (style === "fortress") speedFactor = Math.abs(dx) < 230 ? -0.28 : 0.75;
    else if (style === "zoning") speedFactor = Math.abs(dx) < 260 ? -0.45 : 0.7;
    else if (style === "duelist") speedFactor = Math.abs(dx) < 150 ? -0.6 : 1.15;
    else if (style === "ambusher") speedFactor = Math.sin(en.t * 0.05) > 0 ? 1.4 : 0.35;
    else if (style === "teleporter") speedFactor = Math.abs(dx) < 190 ? -0.55 : 0.75;
    const rhythm = 0.88 + Math.sin(en.t * 0.09) * 0.2;
    const phasePressure = en.phase >= 4 ? 1.42 : en.phase >= 3 ? 1.22 : 1;
    en.vx = en.facing * def.speed * (en.aggression || 1) * speedFactor * rhythm * phasePressure;
    en.vy += PHYS.GRAVITY * 0.8;
    if (en.vy > PHYS.MAX_FALL) en.vy = PHYS.MAX_FALL;
    moveActor(en);
    en.lastDecision = speedFactor < 0 ? "create_space" : speedFactor === 0 ? "hold_ground" : "pressure";
  }

  function spawnBossHazard(kind, props) {
    bossHazards.push(Object.assign({
      kind,
      x: 0,
      y: groundY * TILE,
      r: 34,
      w: 18,
      delay: 34,
      life: 84,
      dmg: 1,
      color: "#ef233c",
      hitCool: 0,
      label: "PELIGRO",
    }, props || {}));
  }

  function arenaX(x) {
    return clamp(x, 2 * TILE, Math.max(3 * TILE, (worldW - 2) * TILE));
  }

  function arenaY(y) {
    return clamp(y, 2 * TILE, Math.max(3 * TILE, (worldH - 2) * TILE));
  }

  // La firma se dispara además del patrón de balas. Cada jefe obtiene una
  // amenaza persistente distinta que obliga a cambiar de posición, altura o
  // ritmo, y siempre se anuncia antes de hacer daño.
  function triggerBossSignature(en, def, attack, pcx, pcy, ecx, ecy) {
    const profile = BOSS_PERSONALITIES[def.bossPattern];
    if (!profile) return;
    const color = def.color || "#ef233c";
    const floor = arenaY(player.y + player.h + 5);
    const ahead = arenaX(pcx + player.vx * 18);
    const zone = (x, opts) => spawnBossHazard("zone", Object.assign({ x: arenaX(x), y: floor, color, label: profile.signature }, opts || {}));
    const vertical = (x, opts) => spawnBossHazard("beamV", Object.assign({ x: arenaX(x), color, label: profile.signature }, opts || {}));
    const horizontal = (y, opts) => spawnBossHazard("beamH", Object.assign({ y: arenaY(y), color, label: profile.signature }, opts || {}));

    en.lastSignature = profile.signature;
    switch (def.bossPattern) {
      case "hammer":
        en.signatureRush = 18 + en.phase * 2;
        en.signatureRushSpeed = 8.8 + en.phase;
        zone(ecx + en.facing * 90, { r: 42, delay: 18, life: 62, color: "#ff6b35", label: "ESTELA ROMPEMUELLES" });
        break;
      case "kraken":
        zone(pcx - 104, { r: 52, delay: 34, life: 126, color: "#6c2bd9", label: "TINTA SEPTICA" });
        zone(pcx + 104, { r: 52, delay: 48, life: 112, color: "#6c2bd9", label: "TINTA SEPTICA" });
        break;
      case "siren":
        vertical(pcx, { w: 19, delay: 46, life: 72, color: "#ef233c", label: "COLUMNA SONICA" });
        if (en.phase >= 2) vertical(pcx + player.vx * 22 + 92, { w: 15, delay: 58, life: 52, color: "#ff7bac", label: "CORO SONICO" });
        break;
      case "volcano":
        for (const offset of [-116, 0, 116]) zone(ahead + offset, { r: 40, delay: 30 + Math.abs(offset) / 7, life: 76, color: "#ff6b00", label: "ERUPCION" });
        break;
      case "tank":
        horizontal(pcy - 28, { w: 14, delay: 42, life: 48, color: "#94d2bd", label: "BATERIA RASANTE" });
        zone(pcx + en.facing * 120, { r: 36, delay: 56, life: 110, color: "#94d2bd", label: "MORTERO ANCLADO" });
        break;
      case "worm":
        zone(ahead, { r: 58, delay: 52, life: 54, dmg: 2, color: "#d0d6e0", label: "EMERGENCIA SUBTERRANEA" });
        break;
      case "admiral":
        horizontal(pcy - 24, { w: 18, delay: 36, life: 58, color: "#c77dff", label: "ANDANADA DE CUBIERTA" });
        if (en.phase >= 2) horizontal(pcy + 54, { w: 13, delay: 52, life: 44, color: "#c77dff", label: "SEGUNDA BANDA" });
        break;
      case "golem":
        for (const offset of [-92, 0, 92]) spawnBossHazard("meteor", { x: arenaX(ahead + offset), y: arenaY(pcy - 220 - Math.abs(offset) * 0.2), targetY: floor, r: 27, delay: 24 + Math.abs(offset) / 8, life: 104, color: "#8d99ae", label: "METEORO DE CENIZA" });
        break;
      case "emperor":
        spawnBossHazard("ring", { x: ecx, y: ecy, r: 24, maxR: 170, delay: 26, life: 78, color: "#ff3c00", label: "CORONA DE MAGMA" });
        break;
      case "hydra":
        for (const offset of [-80, 0, 80]) zone(ahead + offset, { r: 36, delay: 28 + Math.abs(offset) / 7, life: 94, color: "#70e000", label: "MORDIDA DE ESPORAS" });
        break;
      case "excavator":
        en.signatureRush = 13 + en.phase * 2;
        en.signatureRushSpeed = 9.2 + en.phase;
        horizontal(pcy + 22, { w: 16, delay: 36, life: 55, color: "#ffba08", label: "CARRIL DE TALADRO" });
        break;
      case "doctor":
        zone(pcx - 70, { r: 48, delay: 34, life: 132, color: "#e0aaff", label: "MUTAGENO" });
        zone(pcx + 86, { r: 42, delay: 50, life: 114, color: "#70e000", label: "MUTAGENO" });
        break;
      case "locomotive":
        en.signatureRush = 23 + en.phase * 2;
        en.signatureRushSpeed = 11.6 + en.phase;
        spawnBossHazard("sweep", { x: ecx, y: floor, vx: en.facing * (9.5 + en.phase), r: 30, delay: 16, life: 70, color: "#ffe066", label: "EXPRES ATOMICO" });
        break;
      case "sentinel":
        vertical(pcx - 92, { w: 16, delay: 38, life: 62, color: "#00f0ff", label: "REJILLA OMEGA" });
        vertical(pcx + 92, { w: 16, delay: 52, life: 50, color: "#00f0ff", label: "REJILLA OMEGA" });
        break;
      case "carrier":
        vertical(ahead, { w: 24, delay: 46, life: 66, color: "#5cf6ff", label: "CORREDOR DE CAZAS" });
        if (enemies.filter((ally) => !ally.dead && ally.type === "xeno_scout").length < 3) spawnEnemy("xeno_scout", arenaX(ecx - en.facing * 90), arenaY(ecy + 80));
        break;
      case "oracle":
        zone(pcx, { r: 42, delay: 58, life: 64, color: "#c77dff", label: "ECO DEL FUTURO" });
        zone(ahead, { r: 34, delay: 76, life: 50, color: "#e0aaff", label: "SEGUNDO ECO" });
        break;
      case "architect":
        vertical(pcx - 108, { w: 16, delay: 32, life: 62, color: "#ffe600", label: "REJILLA DEL CATACLISMO" });
        vertical(pcx + 108, { w: 16, delay: 46, life: 52, color: "#ef233c", label: "REJILLA DEL CATACLISMO" });
        horizontal(pcy + 18, { w: 14, delay: 60, life: 44, color: "#ffe600", label: "FRACTURA HORIZONTAL" });
        if (en.phase >= 4) {
          spawnBossHazard("ring", { x: ecx, y: ecy, r: 28, maxR: 210, delay: 26, life: 78, color: "#ffe600", label: "GEOMETRIA FINAL" });
          spawnBossHazard("sweep", { x: ecx, y: floor, vx: en.facing * 10.5, r: 32, delay: 42, life: 68, color: "#ef233c", label: "FRACTURA TERMINAL" });
        }
        break;
    }
    floatText(ecx, en.y - 40, profile.signature.replaceAll("_", " ").toUpperCase(), color);
  }

  function genericEnemyUpdate(en, def, dx, pcx, pcy, ecx, ecy) {
    const aim = predictiveAim(ecx, ecy, 6, 18);
    const behavior = def.behavior;
    const pace = def.speed * (en.aggression || 1);
    en.facing = dx >= 0 ? 1 : -1;

    if (behavior === "boss") {
      const hpRatio = en.hp / en.maxHp;
      const profile = BOSS_PERSONALITIES[def.bossPattern];
      const finalArchitect = def.bossPattern === "architect" && currentLevel === CAMPAIGN.length;
      en.phase = finalArchitect
        ? (hpRatio <= 0.16 ? 4 : hpRatio <= 0.40 ? 3 : hpRatio <= 0.70 ? 2 : 1)
        : (hpRatio <= 0.32 ? 3 : hpRatio <= 0.66 ? 2 : 1);
      if (en.lastPhase && en.phase > en.lastPhase && finalArchitect) {
        triggerBossSignature(en, def, { id: "phase_transition" }, pcx, pcy, ecx, ecy);
        floatText(ecx, en.y - 64, "FASE " + en.phase + " · EL MUNDO SE ROMPE", "#ffe600");
        shake = Math.max(shake, 18);
      }
      en.lastPhase = en.phase;
      if (en.signatureRush > 0) {
        en.signatureRush--;
        en.vx = en.facing * (en.signatureRushSpeed || 9);
        en.vy += PHYS.GRAVITY * 0.7;
        if (en.vy > PHYS.MAX_FALL) en.vy = PHYS.MAX_FALL;
        moveActor(en);
        en.lastDecision = "signature_rush_" + (def.bossPattern || "boss");
        return;
      }
      if (en.state === "telegraph") {
        en.lastDecision = "telegraph_" + ((en.currentAttack && en.currentAttack.id) || "attack");
        en.phaseTimer++;
        en.vx = 0;
        if (en.phaseTimer % 8 === 0) {
          burst(ecx + rand(-en.w * 0.35, en.w * 0.35), en.y + en.h * 0.5, en.color, 3);
          sfx.alarm();
        }
        if (en.phaseTimer >= Math.max(24, 42 - en.phase * 5)) {
          fireBossPattern(en, def, aim, pcx, pcy, ecx, ecy);
          en.state = "recover";
          en.phaseTimer = 0;
          en.cool = Math.max(finalArchitect && en.phase >= 4 ? 26 : 38, 88 - en.phase * 14);
        }
      } else if (en.state === "recover") {
        en.lastDecision = "recover";
        en.phaseTimer++;
        en.vx = 0;
        if (en.phaseTimer >= (finalArchitect && en.phase >= 4 ? 16 : 28)) {
          en.state = "hunt";
          en.phaseTimer = 0;
        }
      } else {
        en.phaseTimer++;
        en.facing = dx >= 0 ? 1 : -1;
        bossMovement(en, def, profile, dx, pcx, pcy);
        if (en.cool <= 0 && Math.abs(dx) < 760) {
          const attack = selectBossAttack(en, def, pcx, pcy, ecx, ecy);
          en.state = "telegraph";
          en.phaseTimer = 0;
          floatText(ecx, en.y - 22, "¡" + ((attack && attack.label) || ("ATAQUE DE " + (def.name || "JEFE"))).toUpperCase() + "!", def.color || "#ffe600");
        }
      }
      return;
    }

    if (behavior === "turret" || behavior === "sniper") {
      const range = behavior === "sniper" ? 720 : 460;
      en.vx = 0;
      en.vy += PHYS.GRAVITY;
      if (en.vy > PHYS.MAX_FALL) en.vy = PHYS.MAX_FALL;
      moveActor(en);
      en.lastDecision = Math.abs(dx) >= range ? "track_target" : (en.cool > 0 ? "reload" : (behavior === "sniper" ? "predict_shot" : "suppress"));
      if (en.cool <= 0 && Math.abs(dx) < range) {
        const shot = behavior === "sniper" ? { dmg: 2, speed: 9, r: 4, life: 120, color: def.color, plasma: true } : { dmg: 1, speed: 5.2, r: 5, color: def.color };
        const shotAim = behavior === "sniper" ? predictiveAim(ecx, en.y + 12, shot.speed, 12) : predictiveAim(ecx, en.y + 12, shot.speed, 26);
        spawnEnemyBullet(ecx, en.y + 12, shotAim, shot);
        if (behavior === "turret") spawnEnemyBullet(ecx, en.y + 12, aim + 0.16, shot);
        en.cool = behavior === "sniper" ? 110 : 72;
      }
      return;
    }

    if (behavior === "spore") {
      // La espora se mantiene a distancia y deja una nube lenta que obliga a
      // cambiar de altura en vez de perseguirla en línea recta.
      const targetY = clamp(pcy - 115 + Math.sin(en.t * 0.055) * 52, TILE * 2, Math.max(3 * TILE, (groundY - 3) * TILE));
      en.x += Math.sign(dx) * pace * (Math.abs(dx) > 260 ? 0.45 : -0.18);
      en.y = lerp(en.y, targetY, 0.035);
      en.lastDecision = Math.abs(dx) > 260 ? "drift_closer" : (en.cool <= 0 ? "seed_cloud" : "keep_distance");
      if (en.cool <= 0 && Math.abs(dx) < 560) {
        spawnEnemyBullet(ecx, ecy, aim, { dmg: 1, speed: 3.1, r: 10, life: 120, color: def.color, explode: 34 });
        en.cool = 118;
      }
      return;
    }

    if (behavior === "strafer") {
      // El explorador xeno cruza la pantalla de lado a lado y dispara en
      // ráfagas; su dirección cambia para que no pueda ser campeado.
      const orbit = Math.sin(en.t * 0.045) * 120;
      const targetY = clamp(pcy - 82 + orbit, TILE * 2, Math.max(3 * TILE, (groundY - 2) * TILE));
      const strafeDirection = Math.sin(en.t * 0.035) >= 0 ? 1 : -1;
      en.lastDecision = strafeDirection > 0 ? "strafe_right" : "strafe_left";
      const squadBias = enemies.filter((ally) => ally !== en && !ally.dead && ally.behavior === "strafer").length % 2 ? 0.7 : 1.25;
      en.x += strafeDirection * pace * squadBias;
      if (en.x < 2 * TILE || en.x > worldW * TILE - en.w - 2 * TILE) en.x = clamp(en.x, 2 * TILE, worldW * TILE - en.w - 2 * TILE);
      en.y = lerp(en.y, targetY, 0.06);
      if (en.cool <= 0 && Math.abs(dx) < 600) {
        spawnEnemyBullet(ecx, ecy, aim - 0.16, { dmg: 1, speed: 7.2, r: 4, color: def.color });
        spawnEnemyBullet(ecx, ecy, aim + 0.16, { dmg: 1, speed: 7.2, r: 4, color: def.color });
        en.cool = 88;
      }
      return;
    }

    if (behavior === "tractor") {
      // La unidad tractora controla el espacio: avanza despacio y lanza una
      // descarga que frena/aturde, en lugar de embestir como un runner.
      en.vx = en.facing * pace;
      en.vy += PHYS.GRAVITY;
      if (en.vy > PHYS.MAX_FALL) en.vy = PHYS.MAX_FALL;
      const tactical = groundTactics(en, pace);
      moveActor(en);
      en.lastDecision = tactical || (Math.abs(dx) < 180 ? "pull_target" : (en.cool <= 0 ? "tractor_orb" : "advance_slowly"));
      if (en.cool <= 0 && Math.abs(dx) < 520) {
        spawnEnemyBullet(ecx, ecy, aim, { dmg: 1, speed: 3.8, r: 8, life: 110, color: def.color, stunOrb: true });
        en.cool = 104;
      }
      if (Math.abs(dx) < 180 && Math.abs(pcy - ecy) < 100 && !player.dead) {
        player.vx += Math.sign(ecx - pcx) * 0.18;
      }
      return;
    }

    if (behavior === "mimic") {
      // El mímico permanece cerca de la ruta y reaparece detrás del jugador
      // antes de disparar una ráfaga corta de emboscada.
      en.vx = en.facing * pace * 0.7;
      en.vy += PHYS.GRAVITY;
      if (en.vy > PHYS.MAX_FALL) en.vy = PHYS.MAX_FALL;
      if (en.t % 170 === 0 && Math.abs(dx) < 620) {
        en.lastDecision = "ambush_behind";
        burst(ecx, ecy, def.color, 14);
        en.x = clamp(pcx - en.facing * rand(150, 240) - en.w / 2, 2 * TILE, worldW * TILE - en.w - 2 * TILE);
        en.y = groundY * TILE - en.h;
        en.vy = -3;
      }
      moveActor(en);
      if (en.lastDecision !== "ambush_behind") en.lastDecision = Math.abs(dx) < 420 ? (en.cool <= 0 ? "ambush_burst" : "circle_prey") : "disguise_stalk";
      if (en.cool <= 0 && Math.abs(dx) < 420) {
        spawnEnemyBullet(ecx, ecy, aim, { dmg: 2, speed: 6.8, r: 5, color: def.color });
        spawnEnemyBullet(ecx, ecy, aim + 0.28, { dmg: 1, speed: 5.4, r: 5, color: def.color });
        spawnEnemyBullet(ecx, ecy, aim - 0.28, { dmg: 1, speed: 5.4, r: 5, color: def.color });
        en.cool = 102;
      }
      return;
    }

    if (def.flying || behavior === "flyer" || behavior === "shooter") {
      const targetY = clamp(pcy - 70 + Math.sin(en.t * 0.07 + en.x) * 35, TILE * 2, Math.max(3 * TILE, (groundY - 2) * TILE));
      en.x += Math.sign(dx) * pace * (Math.abs(dx) > 150 ? 0.65 : 0.2);
      en.y = lerp(en.y, targetY, 0.04);
      en.lastDecision = Math.abs(dx) > 260 ? "intercept" : (behavior === "shooter" && en.cool <= 0 ? "burst_fire" : "orbit");
      if (behavior === "shooter" && en.cool <= 0 && Math.abs(dx) < 520) {
        spawnEnemyBullet(ecx, ecy, aim, { dmg: 1, speed: 5.4, color: def.color });
        spawnEnemyBullet(ecx, ecy, aim + 0.22, { dmg: 1, speed: 5.1, color: def.color });
        en.cool = 82;
      }
      return;
    }

    if (behavior === "mine") {
      en.vx = en.facing * pace;
      en.vy += PHYS.GRAVITY;
      if (en.vy > PHYS.MAX_FALL) en.vy = PHYS.MAX_FALL;
      moveActor(en);
      en.lastDecision = dist(ecx, ecy, pcx, pcy) < 280 ? "prime" : "seek_heat";
      if (dist(ecx, ecy, pcx, pcy) < 42) {
        en.lastDecision = "detonate";
        hurtPlayer(def.dmg);
        burst(ecx, ecy, def.color, 18);
        en.dead = true;
      }
      return;
    }

    if (behavior === "teleporter") {
      en.vx = en.facing * pace;
      en.vy += PHYS.GRAVITY;
      if (en.vy > PHYS.MAX_FALL) en.vy = PHYS.MAX_FALL;
      if (en.t % 150 === 0 && Math.abs(dx) < 520) {
        en.lastDecision = "phase_jump";
        burst(ecx, ecy, def.color, 12);
        en.x = clamp(pcx + rand(-220, 220) - en.w / 2, 2 * TILE, worldW * TILE - en.w - 2 * TILE);
        en.y = clamp(pcy - rand(50, 170), 2 * TILE, (groundY - 1) * TILE);
      }
      moveActor(en);
      if (en.lastDecision !== "phase_jump") en.lastDecision = Math.abs(dx) < 360 ? (en.cool <= 0 ? "quantum_volley" : "phase_stalk") : "close_gap";
      if (en.cool <= 0 && Math.abs(dx) < 360) {
        spawnEnemyBullet(ecx, ecy, aim, { dmg: 1, speed: 6.4, color: def.color, plasma: true });
        en.cool = 64;
      }
      return;
    }

    if (behavior === "charger") {
      if (en.state === "charge") {
        en.lastDecision = "telegraph_charge";
        en.phaseTimer++;
        en.vx = 0;
        if (en.phaseTimer >= 35) {
          en.state = "attack";
          en.phaseTimer = 0;
          en.vx = en.facing * 10;
          sfx.bossDash();
        }
      } else if (en.state === "attack") {
        en.lastDecision = "unstable_dash";
        en.phaseTimer++;
        en.vy += PHYS.GRAVITY;
        moveActor(en);
        if (en.phaseTimer >= 24) {
          en.state = "hunt";
          en.phaseTimer = 0;
        }
      } else {
        en.lastDecision = Math.abs(dx) < 300 && en.cool <= 0 ? "prepare_charge" : "hunt";
        en.vx = en.facing * pace;
        en.vy += PHYS.GRAVITY;
        if (en.vy > PHYS.MAX_FALL) en.vy = PHYS.MAX_FALL;
        moveActor(en);
        if (en.cool <= 0 && Math.abs(dx) < 300) {
          en.state = "charge";
          en.phaseTimer = 0;
          en.cool = 90;
          floatText(ecx, en.y - 16, "¡CARGA!", def.color);
        }
      }
      return;
    }

    // Runner, escudo y cualquier enemigo de campaña no especializado.
    en.vx = en.facing * pace;
    en.vy += PHYS.GRAVITY;
    if (en.vy > PHYS.MAX_FALL) en.vy = PHYS.MAX_FALL;
    if (en.onGround && Math.abs(dx) < 250 && Math.random() < 0.035) en.vy = -10;
    en.shielded = behavior === "shield" && ((dx >= 0 && en.facing === 1) || (dx < 0 && en.facing === -1));
    en.lastDecision = behavior === "shield"
      ? (en.shielded && Math.abs(dx) < 260 ? "shield_advance" : "turn_guard")
      : behavior === "split"
        ? (Math.abs(dx) < 420 && en.cool <= 0 ? "toxic_split" : "ooze_forward")
        : (Math.abs(dx) < 170 ? "pounce" : "chase");
    if (behavior === "split" && en.cool <= 0 && Math.abs(dx) < 420) {
      spawnEnemyBullet(ecx, ecy, aim, { dmg: 1, speed: 4.2, r: 8, color: def.color, explode: 20 });
      en.cool = 120;
    }
    if (behavior === "runner" && en.onGround && en.cool <= 0 && Math.abs(dx) < 190) {
      en.vy = -7.2;
      en.vx = en.facing * pace * 2.35;
      en.lastDecision = "pounce";
      en.cool = 76;
    }
    if (behavior === "shield" && en.cool <= 0 && Math.abs(dx) < 430) {
      // El guardia abre el escudo brevemente para disparar un pulso corto;
      // el jugador puede castigarlo, pero ya no es un obstáculo pasivo.
      en.shielded = false;
      spawnEnemyBullet(ecx, ecy - 4, aim - 0.09, { dmg: 1, speed: 6.1, r: 5, color: def.color, plasma: true });
      spawnEnemyBullet(ecx, ecy - 4, aim + 0.09, { dmg: 1, speed: 6.1, r: 5, color: def.color, plasma: true });
      en.lastDecision = "shield_pulse";
      en.cool = 92;
    }
    const tactical = groundTactics(en, pace);
    if (tactical && behavior !== "shield") en.lastDecision = tactical;
    moveActor(en);
  }

  function fireBossPattern(en, def, aim, pcx, pcy, ecx, ecy) {
    const phase = en.phase || 1;
    const color = def.color || "#ff6b35";
    const attack = en.currentAttack || selectBossAttack(en, def, pcx, pcy, ecx, ecy);
    if (!attack) return;
    const predictedX = pcx + player.vx * (8 + phase * 3);
    const predictedY = pcy + player.vy * (6 + phase * 2);
    const attackAim = attack.predictive ? angTo(ecx, ecy, predictedX, predictedY) : aim;
    const count = Math.max(1, (attack.count || 3) + (phase >= 3 ? 1 : 0));
    const baseOptions = {
      color,
      plasma: !!attack.plasma,
      greenFire: !!attack.poison,
      orangeFire: !!attack.fire,
      stunOrb: !!attack.stun && phase >= 2,
      explode: attack.explode || 0,
    };
    const fire = (angle, options) => spawnEnemyBullet(ecx, ecy, angle, Object.assign({ color }, options || {}));
    switch (attack.kind) {
      case "dash":
        en.vx = en.facing * (9 + phase * 1.8);
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * 0.12;
          fire(attackAim + offset, Object.assign({}, baseOptions, { speed: 7.5 + phase, dmg: 2, r: 7 }));
        }
        break;
      case "fan":
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * (0.11 + phase * 0.012);
          fire(attack.ground ? offset * 0.55 : attackAim + offset, Object.assign({}, baseOptions, { speed: 5.5 + phase * 0.55, dmg: phase >= 3 ? 2 : 1, r: 6 }));
        }
        break;
      case "snipe":
        fire(attackAim, Object.assign({}, baseOptions, { speed: 10 + phase * 1.2, dmg: 2, r: 5, plasma: true }));
        if (phase >= 2) {
          fire(attackAim - 0.07, Object.assign({}, baseOptions, { speed: 8.5, dmg: 1, r: 4 }));
          fire(attackAim + 0.07, Object.assign({}, baseOptions, { speed: 8.5, dmg: 1, r: 4 }));
        }
        break;
      case "radial":
        for (let i = 0; i < count; i++) fire((Math.PI * 2 * i) / count + en.t * 0.008, Object.assign({}, baseOptions, { speed: 4.4 + phase * 0.35, dmg: phase >= 3 ? 2 : 1, r: 7 }));
        break;
      case "spiral":
        for (let i = 0; i < count; i++) fire((Math.PI * 2 * i) / count + en.t * 0.045, Object.assign({}, baseOptions, { speed: 4.2 + (i % 3) * 0.7, dmg: 1, r: 7 }));
        break;
      case "rain":
        for (let i = 0; i < count; i++) {
          const angle = -Math.PI / 2 + (i - (count - 1) / 2) * 0.12;
          fire(angle, Object.assign({}, baseOptions, { speed: 4.6 + (i % 4) * 0.65, dmg: 1, r: 8 }));
        }
        break;
      case "lob":
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * 0.2;
          fire(attackAim + offset - 0.18, Object.assign({}, baseOptions, { speed: 4.1 + i * 0.28, dmg: 2, r: 9, orangeFire: true }));
        }
        break;
      case "wall":
        for (let i = 0; i < count; i++) {
          const offset = (i - (count - 1) / 2) * 0.1;
          fire(attackAim + offset, Object.assign({}, baseOptions, { speed: 5.2 + Math.abs(i - count / 2) * 0.25, dmg: 1, r: 8, stunOrb: !!attack.stun && i % 2 === 0 }));
        }
        break;
      case "cross":
        for (let i = 0; i < count; i++) {
          const angle = i < count / 2 ? attackAim + (i - count / 4) * 0.16 : (Math.PI * 2 * i) / count;
          fire(angle, Object.assign({}, baseOptions, { speed: 5.8 + phase * 0.35, dmg: 1, r: 6 }));
        }
        break;
      case "shockwave":
        for (let i = 0; i < count; i++) {
          const direction = i % 2 === 0 ? 0 : Math.PI;
          fire(direction + (Math.floor(i / 2) - 1) * 0.05, Object.assign({}, baseOptions, { speed: 6.2 + i * 0.35, dmg: 2, r: 10, orangeFire: true }));
        }
        shake = Math.max(shake, 14);
        break;
      case "minefield":
        for (let i = 0; i < count; i++) {
          const angle = Math.PI / 2 + (i - (count - 1) / 2) * 0.14;
          fire(angle, Object.assign({}, baseOptions, { speed: 2.8 + (i % 2), dmg: 2, r: 10, explode: attack.explode || 30, orangeFire: true }));
        }
        break;
      case "tractor":
        for (let i = 0; i < count; i++) fire(attackAim + (i - (count - 1) / 2) * 0.14, Object.assign({}, baseOptions, { speed: 4.2, dmg: 1, r: 9, stunOrb: true }));
        player.vx += Math.sign(ecx - pcx) * (1.2 + phase * 0.4);
        break;
      case "teleport":
        burst(ecx, ecy, color, 20);
        en.x = clamp(pcx + (player.facing || 1) * rand(-240, -150) - en.w / 2, 2 * TILE, worldW * TILE - en.w - 2 * TILE);
        en.y = clamp(pcy - rand(70, 150), 2 * TILE, (groundY - 2) * TILE);
        for (let i = 0; i < count; i++) fire(attackAim + (i - (count - 1) / 2) * 0.2, Object.assign({}, baseOptions, { speed: 6.3, dmg: 1, r: 7, plasma: true }));
        break;
      case "cataclysm":
        // Sólo existe en el último tramo del Arquitecto: combina un abanico
        // veloz con una geometría de arena que se cierra después del aviso.
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + en.t * 0.07;
          fire(angle, Object.assign({}, baseOptions, { speed: 6.4 + (i % 3) * 0.45, dmg: i % 4 === 0 ? 2 : 1, r: 6, stunOrb: i % 5 === 0 }));
        }
        shake = Math.max(shake, 16);
        break;
      case "summon":
        for (let i = 0; i < Math.min(2 + phase, 4); i++) spawnEnemy(attack.minion || "drone", en.x + en.w / 2 + (i - 1) * 58, en.y + en.h + 10);
        for (let i = 0; i < count; i++) fire(attackAim + (i - (count - 1) / 2) * 0.18, Object.assign({}, baseOptions, { speed: 5.6, dmg: 1, r: 6, plasma: true }));
        break;
    }
    triggerBossSignature(en, def, attack, pcx, pcy, ecx, ecy);
    burst(ecx, ecy, color, 12 + phase * 4);
    sfx.greenFire();
    en.currentAttack = null;
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

      if (en.slipTimer > 0) {
        en.slipTimer--;
        en.lastDecision = "slipping_inertia_gel";
        en.vy += PHYS.GRAVITY;
        moveActor(en);
        if (Math.abs(en.vx) < 0.1 || en.fell) en.slipTimer = 0;
        continue;
      }
      if (en.stunTimer > 0) {
        en.stunTimer--;
        en.lastDecision = "hook_stunned";
        continue;
      }

      if (en.state === "emerge") {
        en.y -= 0.95;
        en.vy = 0;
        burst(en.x + en.w / 2, en.y + en.h, "#ff6b00", 1);
        if (en.t > 42) {
          en.state = "hunt";
          en.ignoreLava = !!def.boss || en.type === "eel" || en.type === "seaking" || en.type === "radboss" || en.type === "alien_ship";
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
      } else if (def.behavior) {
        genericEnemyUpdate(en, def, dx, pcx, pcy, ecx, ecy);
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

      if (en.cool > 0) en.cool = Math.max(0, en.cool - (en.aggression || 1));
      en.inLava = false;
      if (en.inLava && !en.ignoreLava) {
        en.vy = -5.5;
      }

      if (!player.dead && en.state !== "emerge" && overlap(bodyBox(player), en)) {
        if (player.parryTimer > 0) {
          hurtEnemy(en, def.dmg);
          player.parryTimer = 0;
          en.vx += en.facing * -5;
          floatText(player.x, player.y - 24, "PARRY", "#ffe600");
        } else {
          hurtPlayer(def.dmg);
          player.vx += en.facing * 3.2;
        }
      }
    }
    enemies = enemies.filter((e) => !(e.dead && e.t > 50) && e.y < worldH * TILE + 200);
  }

  function updateBullets() {
    for (const b of bullets) {
      b.prevX = b.x;
      b.prevY = b.y;
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
          if (bulletTouchesBox(b, en)) {
            let impactDamage = b.dmg;
            if (b.falloff) {
              const traveled = dist(b.originX, b.originY, b.x, b.y);
              const ratio = clamp((traveled - b.falloff.start) / (b.falloff.end - b.falloff.start), 0, 1);
              impactDamage = Math.max(1, Math.round(b.dmg * lerp(1, b.falloff.min, ratio)));
            }
            hurtEnemy(en, impactDamage);
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
        if (bulletTouchesBox(b, pb)) {
          if (player.parryTimer > 0) {
            b.owner = "player";
            b.vx *= -1.2;
            b.vy *= -1.2;
            b.life = Math.max(b.life, 35);
            b.originX = b.x;
            b.originY = b.y;
            b.hit = [];
            b.color = "#ffe600";
            player.parryTimer = 0;
            floatText(player.x, player.y - 22, "DEVUELTO " + b.dmg, "#ffe600");
            sfx.special();
            continue;
          }
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

  function bossHazardTouchesPlayer(h) {
    const pb = bodyBox(player);
    const px = pb.x + pb.w / 2;
    const py = pb.y + pb.h / 2;
    if (h.kind === "beamV") return Math.abs(px - h.x) < h.w / 2 + pb.w / 2;
    if (h.kind === "beamH") return Math.abs(py - h.y) < h.w / 2 + pb.h / 2;
    if (h.kind === "ring") return Math.abs(dist(px, py, h.x, h.y) - h.r) < 16 + Math.max(pb.w, pb.h) * 0.3;
    return dist(px, py, h.x, h.y) < h.r + Math.max(pb.w, pb.h) * 0.35;
  }

  function updateBossHazards() {
    for (const h of bossHazards) {
      if (h.delay > 0) {
        h.delay--;
        continue;
      }

      if (h.kind === "meteor") {
        h.y += 8.5;
        if (h.y >= h.targetY) {
          h.kind = "zone";
          h.y = h.targetY;
          h.r = Math.max(38, h.r * 1.45);
          h.delay = 7;
          h.life = 48;
          shake = Math.max(shake, 7);
          burst(h.x, h.y, h.color, 12);
        }
        continue;
      }

      h.life--;
      if (h.kind === "sweep") h.x += h.vx;
      if (h.kind === "ring") h.r += (h.maxR - h.r) * 0.13;
      if (h.hitCool > 0) h.hitCool--;
      if (!player.dead && h.hitCool <= 0 && bossHazardTouchesPlayer(h)) {
        hurtPlayer(h.dmg || 1);
        h.hitCool = 28;
        burst(player.x + player.w / 2, player.y + player.h / 2, h.color, 8);
      }
    }
    bossHazards = bossHazards.filter((h) => h.life > 0 && h.x > -180 && h.x < worldW * TILE + 180 && h.y > -240 && h.y < worldH * TILE + 240);
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
          const active = WEAPONS[player.weapon];
          if (Number.isFinite(active.magazine)) player.ammo[player.weapon] = active.magazine;
          player.reloading = false;
          player.heat = Math.max(0, player.heat - 45);
          floatText(u.x, u.y, "CARGADOR / REFRIGERANTE", active.accent);
        }
        sfx.pickup();
        u.life = 0;
      }
    }
    pickups = pickups.filter((u) => u.life > 0);
  }

  function updateSpawns() {
    if (bossSpawnData && !bossSpawned && !bossDefeated) {
      const triggerX = bossSpawnData.triggerX === undefined ? bossSpawnData.tileX : bossSpawnData.triggerX;
      const triggerY = bossSpawnData.triggerY === undefined ? bossSpawnData.tileY : bossSpawnData.triggerY;
      const reached = isVerticalLevel
        ? player.y <= triggerY * TILE + 120
        : player.x >= triggerX * TILE;
      if (reached) {
        spawnEnemy(bossSpawnData.type, bossSpawnData.tileX * TILE, bossSpawnData.tileY * TILE);
        bossSpawned = true;
        floatText(player.x + player.w / 2, player.y - 34, "¡ARENA DEL JEFE!", "#ef233c");
        shake = Math.max(shake, 8);
      }
    }

    if (lavaSpawns && lavaSpawns.length) {
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
    if (state === "pause" || state === "menu" || state === "loadout" || state === "dead") return;
    if (state === "win") {
      winT++;
      return;
    }
    updatePlayer();
    updateEnemies();
    updateBossHazards();
    updateBullets();
    updateGadgets();
    updateParticles();
    updateSpawns();
    updateCam();
    mouse.leftClick = false;
    mouse.rightClick = false;
  }

  function sky() {
    const theme = levelData && levelData.theme;
    const skyColors = {
      costa: ["#071522", "#0d2940", "#164c59"],
      alcantarilla: ["#080d1b", "#14203b", "#1e3b4e"],
      inundado: ["#081827", "#123c59", "#176b73"],
      magma: ["#18070b", "#3a1017", "#6b2515"],
      militar: ["#090e16", "#1a2730", "#3a3d2c"],
      metro: ["#080a15", "#1c1b32", "#3b2941"],
      astillero: ["#071525", "#16334a", "#315b65"],
      ceniza: ["#121016", "#2b2225", "#4b3430"],
      coliseo: ["#180609", "#461015", "#7d2b12"],
      toxico: ["#071609", "#143016", "#2e5b28"],
      industrial: ["#0b1115", "#1d2c2d", "#40503c"],
      laboratorio: ["#11091a", "#2b1646", "#553071"],
      nuclear: ["#101a08", "#2d4513", "#5c661a"],
      reactor: ["#0b170c", "#193c20", "#48631d"],
      apagon: ["#04050b", "#111328", "#262c4b"],
      orbital: ["#050b1a", "#122e54", "#2b5f83"],
      flotante: ["#08132a", "#1f3e72", "#5a5db2"],
      torre: ["#07060f", "#14081c", "#2a1030"],
      cataclismo: ["#18060b", "#43102e", "#7d1f31"],
    }[theme] || ["#07060f", "#14081c", "#2a1030"];
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, skyColors[0]);
    g.addColorStop(0.45, skyColors[1]);
    g.addColorStop(0.75, skyColors[2]);
    g.addColorStop(1, skyColors[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawBg() {
    const theme = levelData && levelData.theme;
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

    const px = (seed, spacing) => ((seed * spacing - cam.x * 0.35) % (VIEW_W + spacing) + VIEW_W + spacing) % (VIEW_W + spacing) - 100;
    if (["alcantarilla", "metro"].includes(theme)) {
      // Colectores y arcos sustituyen por completo la silueta montañosa.
      for (let i = 0; i < 7; i++) {
        const x = px(i, 240); ctx.strokeStyle = i % 2 ? "#151c2a" : "#0c111d"; ctx.lineWidth = 24;
        ctx.beginPath(); ctx.arc(x + 100, VIEW_H - 70, 105, Math.PI, 0); ctx.stroke();
        ctx.lineWidth = 7; ctx.strokeStyle = "rgba(92,246,255,0.1)"; ctx.beginPath(); ctx.moveTo(x + 5, VIEW_H - 70); ctx.lineTo(x + 195, VIEW_H - 70); ctx.stroke();
      }
    } else if (["costa", "inundado", "astillero"].includes(theme)) {
      ctx.fillStyle = "rgba(25,105,125,0.18)"; ctx.fillRect(0, VIEW_H - 95, VIEW_W, 95);
      for (let i = 0; i < 7; i++) {
        const x = px(i, 270); ctx.fillStyle = i % 2 ? "#091622" : "#102433";
        ctx.fillRect(x, VIEW_H - 150 - (i % 3) * 28, 95, 150);
        ctx.fillRect(x + 70, VIEW_H - 260, 9, 125); ctx.fillRect(x + 70, VIEW_H - 260, 110, 8);
        ctx.strokeStyle = "rgba(92,246,255,0.14)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 178, VIEW_H - 252); ctx.lineTo(x + 178, VIEW_H - 170); ctx.stroke();
      }
    } else if (["magma", "ceniza", "coliseo"].includes(theme)) {
      const glow = ctx.createLinearGradient(0, VIEW_H - 210, 0, VIEW_H); glow.addColorStop(0, "rgba(255,60,0,0)"); glow.addColorStop(1, "rgba(255,60,0,.28)"); ctx.fillStyle = glow; ctx.fillRect(0, VIEW_H - 230, VIEW_W, 230);
      for (let i = 0; i < 7; i++) { const x=px(i,250); ctx.fillStyle=i%2?"#16080b":"#240b0b"; polyBg([[x,VIEW_H],[x+48,VIEW_H-170-(i%3)*34],[x+72,VIEW_H-115],[x+128,VIEW_H]]); ctx.fillStyle="#6f1b0d";ctx.fillRect(x+48,VIEW_H-169-(i%3)*34,10,30); }
    } else if (["militar", "industrial", "laboratorio", "nuclear", "reactor", "apagon"].includes(theme)) {
      for (let i=0;i<9;i++){ const x=px(i,205); const bh=110+(i%4)*36; ctx.fillStyle=i%2?"#0c151c":"#151d20";ctx.fillRect(x,VIEW_H-bh,142,bh);ctx.fillRect(x+18,VIEW_H-bh-75,18,75);ctx.fillRect(x+92,VIEW_H-bh-110,12,110);ctx.fillStyle="rgba(112,224,0,.1)";for(let y=VIEW_H-bh+18;y<VIEW_H-12;y+=24)ctx.fillRect(x+18,y,12,6); }
    } else if (theme === "toxico") {
      for(let i=0;i<13;i++){const x=px(i,145);ctx.strokeStyle="#102612";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(x,VIEW_H);ctx.quadraticCurveTo(x-25,VIEW_H-120,x+8,VIEW_H-205-(i%3)*22);ctx.stroke();ctx.fillStyle="#193b1b";ctx.beginPath();ctx.ellipse(x+8,VIEW_H-205-(i%3)*22,35,14,0,0,Math.PI*2);ctx.fill();}
    } else if (["orbital", "flotante"].includes(theme)) {
      ctx.fillStyle = theme === "orbital" ? "rgba(92,246,255,.15)" : "rgba(199,125,255,.16)"; ctx.beginPath();ctx.arc(VIEW_W*.72-cam.x*.03,VIEW_H*.35,145,0,Math.PI*2);ctx.fill();
      for(let i=0;i<8;i++){const x=px(i,230), y=260+(i%3)*75;ctx.fillStyle="#101a32";polyBg([[x,y],[x+120,y-20],[x+165,y+8],[x+85,y+45],[x+25,y+30]]);ctx.fillStyle="rgba(92,246,255,.13)";ctx.fillRect(x+35,y-28,70,6);}
    } else if (theme === "cataclismo") {
      for(let i=0;i<9;i++){const x=px(i,190);ctx.strokeStyle=i%2?"#ff3c00":"#c77dff";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,40);ctx.lineTo(x+35,150);ctx.lineTo(x-10,270);ctx.lineTo(x+45,VIEW_H);ctx.stroke();ctx.fillStyle="rgba(255,230,0,.07)";ctx.fillRect(x-8,0,20,VIEW_H);}
    } else {
      for (let i = 0; i < 8; i++) {
        const x = px(i, 280); ctx.fillStyle = i % 2 ? "#12081a" : "#0c0614";
        polyBg([[x,VIEW_H],[x+40,VIEW_H-160-(i%3)*40],[x+80,VIEW_H-110],[x+120,VIEW_H-200-(i%2)*30],[x+150,VIEW_H]]);
      }
    }

    if (time % 180 < 4) {
      ctx.fillStyle = "rgba(180,200,255,0.12)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // Siluetas pintadas del atlas: ruinas, árboles y protecciones anclan cada
    // ruta al tema de su nivel sin añadir cajas de colisión invisibles.
    const sceneryKey = {
      costa: "ruin", inundado: "ruin", astillero: "ruin", militar: "barricade", ceniza: "barricade",
      toxico: "tree", metro: "train", nuclear: "train", industrial: "bunker", reactor: "bunker",
      laboratorio: "arch", orbital: "arch", flotante: "arch", cataclismo: "arch",
    }[theme];
    const prop = sceneryKey && SPR.scenery && SPR.scenery[sceneryKey];
    if (prop && prop.width) {
      for (let i = 0; i < 3; i++) {
        const x = ((i * 360 - cam.x * 0.44) % 1180 + 1180) % 1180 - 120;
        const y = VIEW_H - 184 - (i % 2) * 34;
        ctx.globalAlpha = 0.58;
        ctx.drawImage(prop, x, y);
      }
      ctx.globalAlpha = 1;
    }
  }

  function polyBg(points) {
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath(); ctx.fill();
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
    const marks = [spawns.comun, spawns.boss].filter(Boolean);
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
    const hero = (SPR.heroes && SPR.heroes[p.character]) || SPR.player;
    let frame = hero.idle;
    if (p.climbing && hero.climb) frame = hero.climb;
    else if (p.crouch) frame = hero.crouch;
    else if (!p.onGround) frame = hero.jump;
    else if (mouse.left && hero.fire) frame = hero.fire;
    else if (Math.abs(p.vx) > 0.5) frame = Math.floor(p.anim) % 2 === 0 ? hero.run1 : hero.run2;

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
    const gunSprite = { desert: "magnum", smg: "ar", plasma: "plasma", fire_shotgun: "shotgun", cannon: "cannon", minigun: "minigun" }[WEAPONS[p.weapon].id];
    const gun = gunSprite ? SPR.guns[gunSprite] : null;
    ctx.save();
    ctx.translate(g.x - cam.x, g.y - cam.y);
    ctx.rotate(ang);
    // Mantiene la empuñadura abajo al apuntar a la izquierda. El arma sigue
    // el cursor, pero no queda cabeza abajo por una rotación de 180 grados.
    if (Math.cos(ang) < 0) ctx.scale(1, -1);
    ctx.imageSmoothingEnabled = false;
    if (gun) ctx.drawImage(gun, 6, -gun.height / 2);
    else {
      const w = WEAPONS[p.weapon];
      ctx.fillStyle = "#141820"; ctx.strokeStyle = w.accent; ctx.lineWidth = 2;
      ctx.fillRect(6, -7, w.id === "cannon" ? 38 : 32, 14); ctx.strokeRect(6, -7, w.id === "cannon" ? 38 : 32, 14);
      if (w.id === "minigun") for (let i = -1; i <= 1; i++) ctx.fillRect(34, i * 4 - 1, 18, 2);
      else ctx.fillRect(38, -3, 15, 6);
    }
    if (p.parryTimer > 0) {
      ctx.strokeStyle = "#ffe600"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(28, 0, 30, -0.8, 0.8); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  function drawEnemyHealth(en) {
    if (en.dead || !ENEMY_TYPES[en.type] || ENEMY_TYPES[en.type].boss || en.hp >= en.maxHp) return;
    const bw = en.w;
    const hx = en.x - cam.x;
    const hy = en.y - cam.y - 8;
    ctx.fillStyle = "#111";
    ctx.fillRect(hx, hy, bw, 4);
    ctx.fillStyle = en.type === "radstar" ? "#39ff14" : (en.color || "#ef233c");
    ctx.fillRect(hx, hy, bw * clamp(en.hp / en.maxHp, 0, 1), 4);
  }

  function drawFallbackEnemy(en, def, x, y) {
    const color = en.color || def.color || "#7bed9f";
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y - en.h * 0.5));
    if (en.facing < 0) ctx.scale(-1, 1);
    ctx.globalAlpha = en.flash > 0 ? 0.45 : (en.state === "emerge" ? Math.min(1, en.t / 24) : 1);
    ctx.fillStyle = "#07060c";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "miter";
    const box = (bx, by, bw, bh, fill) => {
      if (fill) ctx.fillStyle = fill;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = "#07060c";
    };
    const orb = (ox, oy, r, fill) => {
      ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2);
      if (fill) ctx.fillStyle = fill;
      ctx.fill(); ctx.stroke(); ctx.fillStyle = "#07060c";
    };
    const poly = (points, fill) => {
      ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath(); if (fill) ctx.fillStyle = fill;
      ctx.fill(); ctx.stroke(); ctx.fillStyle = "#07060c";
    };
    const limb = (x1, y1, x2, y2, width) => {
      ctx.lineWidth = width || 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.lineWidth = 3;
    };
    const eye = (ex, ey, r) => { ctx.fillStyle = en.phase >= 3 ? "#ffe600" : color; ctx.fillRect(ex - r, ey - r, r * 2, r * 2); ctx.fillStyle = "#07060c"; };
    if (def.boss) {
      const w = en.w, h = en.h, p = def.bossPattern;
      if (p === "hammer") {
        poly([[-w*.48,-h*.22],[-w*.14,-h*.34],[w*.34,-h*.18],[w*.48,h*.05],[w*.12,h*.28],[-w*.28,h*.22]], "#152432");
        box(-w*.42,-h*.4,w*.2,h*.18,color); poly([[-w*.05,-h*.2],[w*.1,-h*.5],[w*.18,-h*.14]], color); eye(w*.23,-h*.08,3);
      } else if (p === "kraken") {
        orb(0,-h*.15,h*.32,"#21113b");
        for (let i=-3;i<=3;i++) { const sx=i*w*.1; limb(sx,h*.05,sx+(i%2?10:-10),h*.48,5); }
        eye(-10,-h*.2,3); eye(10,-h*.2,3); box(-w*.24,-h*.5,w*.48,7,color);
      } else if (p === "siren") {
        orb(0,-h*.28,h*.16,"#241018"); poly([[-w*.2,-h*.12],[w*.18,-h*.12],[w*.38,h*.44],[-w*.34,h*.44]],"#33101c");
        poly([[-18,-h*.42],[-9,-h*.62],[0,-h*.43],[9,-h*.62],[18,-h*.42]],color); limb(w*.2,-8,w*.48,-h*.35,4); eye(6,-h*.3,3);
      } else if (p === "volcano" || p === "worm") {
        for (let i=0;i<5;i++) orb(-w*.34+i*w*.17, Math.sin(i*1.8)*h*.13, h*(.24-i*.018), p === "volcano" ? "#39110a" : "#202731");
        poly([[w*.26,-h*.22],[w*.5,0],[w*.25,h*.2]],color); eye(w*.32,-4,3);
        if (p === "worm") for(let i=-2;i<3;i++) limb(i*w*.14,h*.18,i*w*.14+8,h*.43,5);
      } else if (p === "tank") {
        box(-w*.43,-h*.08,w*.72,h*.38,"#172421"); orb(-w*.28,h*.34,10,color); orb(w*.17,h*.34,10,color);
        box(-w*.2,-h*.36,w*.42,h*.28,"#22332f"); limb(w*.08,-h*.25,w*.48,-h*.42,7); poly([[w*.28,0],[w*.5,-h*.12],[w*.4,h*.2]],color); eye(0,-h*.22,3);
      } else if (p === "admiral") {
        orb(0,-h*.18,h*.25,"#241637"); for(let i=-3;i<=3;i++) limb(i*11,0,i*14+(i%2?8:-8),h*.46,5);
        poly([[-w*.28,-h*.42],[0,-h*.62],[w*.28,-h*.42],[w*.18,-h*.32],[-w*.18,-h*.32]],color); eye(-8,-h*.2,3); eye(8,-h*.2,3);
      } else if (p === "golem") {
        box(-w*.28,-h*.34,w*.56,h*.68,"#242329"); box(-w*.48,-h*.18,w*.18,h*.42,"#313039"); box(w*.3,-h*.18,w*.18,h*.42,"#313039");
        box(-w*.22,h*.3,w*.18,h*.2,color); box(w*.04,h*.3,w*.18,h*.2,color); eye(-10,-h*.12,4); eye(10,-h*.12,4);
      } else if (p === "emperor") {
        orb(0,0,h*.31,"#35100c"); poly([[-w*.2,-h*.28],[-w*.1,-h*.55],[0,-h*.34],[w*.12,-h*.58],[w*.22,-h*.25]],color);
        poly([[-w*.28,-8],[-w*.5,-h*.25],[-w*.43,h*.12]],color); poly([[w*.28,-8],[w*.5,-h*.25],[w*.43,h*.12]],color);
        for(let i=-2;i<=2;i++) limb(i*14,h*.18,i*20,h*.46,4); eye(10,-8,4);
      } else if (p === "hydra") {
        box(-w*.3,h*.12,w*.6,h*.28,"#142714");
        for(let i=-1;i<=1;i++){ limb(i*w*.19,h*.16,i*w*.22,-h*.25-(i===0?12:0),9); orb(i*w*.22,-h*.3-(i===0?12:0),h*.14,"#18351b"); eye(i*w*.22+4,-h*.31-(i===0?12:0),3); }
      } else if (p === "excavator") {
        box(-w*.35,-h*.15,w*.55,h*.5,"#302b13"); for(let i=-2;i<=1;i++) orb(-w*.23+i*18,h*.34,8,color);
        poly([[w*.16,-h*.12],[w*.5,0],[w*.16,h*.16]],color); limb(-w*.14,-h*.18,-w*.32,-h*.46,7); box(-w*.38,-h*.5,w*.24,h*.18,"#423b1b"); eye(0,-h*.06,3);
      } else if (p === "doctor") {
        orb(0,-h*.33,h*.15,"#2b1738"); poly([[-w*.24,-h*.16],[w*.24,-h*.16],[w*.38,h*.48],[-w*.38,h*.48]],"#261331");
        box(-w*.38,h*.04,w*.18,h*.28,color); box(w*.2,h*.04,w*.18,h*.28,"#70e000"); eye(7,-h*.34,4); limb(0,-h*.18,0,h*.35,3);
      } else if (p === "locomotive") {
        box(-w*.42,-h*.18,w*.7,h*.48,"#302c18"); box(-w*.32,-h*.48,w*.25,h*.3,"#463f20"); box(w*.08,-h*.38,w*.17,h*.2,color);
        for(let i=-2;i<=2;i++) orb(i*w*.16,h*.34,10,"#1a1810"); poly([[w*.28,-h*.12],[w*.5,h*.12],[w*.26,h*.28]],color); eye(w*.17,-h*.27,4);
      } else if (p === "sentinel") {
        poly([[-w*.3,-h*.34],[0,-h*.52],[w*.3,-h*.34],[w*.4,h*.25],[0,h*.48],[-w*.4,h*.25]],"#102732");
        orb(0,-h*.12,h*.17,color); box(-w*.48,-h*.08,w*.15,h*.43,"#163b4b"); limb(w*.28,-5,w*.5,h*.25,7); eye(0,-h*.12,5);
      } else if (p === "carrier") {
        poly([[-w*.5,0],[-w*.25,-h*.32],[w*.3,-h*.25],[w*.5,0],[w*.22,h*.3],[-w*.32,h*.26]],"#0d2635");
        box(-w*.24,-6,w*.58,12,color); orb(-w*.2,h*.25,8,"#173d50"); orb(w*.22,h*.24,8,"#173d50"); eye(w*.28,-h*.08,4);
      } else if (p === "oracle") {
        poly([[-w*.36,-h*.05],[0,-h*.34],[w*.36,-h*.05],[w*.25,h*.5],[-w*.25,h*.5]],"#25153c");
        for(let i=-1;i<=1;i++){ orb(i*w*.2,-h*.32-(i===0?14:0),h*.15,"#332052"); eye(i*w*.2,-h*.33-(i===0?14:0),4); }
        orb(0,h*.05,9,color);
      } else {
        // El Arquitecto cambia de silueta con la fase: núcleo, órbitas y
        // fragmentos representan que recompone la geometría del escenario.
        poly([[0,-h*.5],[w*.34,-h*.2],[w*.42,h*.24],[0,h*.5],[-w*.42,h*.24],[-w*.34,-h*.2]],"#2b1820");
        ctx.save(); ctx.rotate(en.t*.025); ctx.strokeRect(-w*.48,-h*.3,w*.96,h*.6); ctx.rotate(-en.t*.05); ctx.strokeRect(-w*.32,-h*.48,w*.64,h*.96); ctx.restore();
        orb(0,0,h*.16,color); eye(0,0,5);
      }
    } else {
      const w=en.w,h=en.h,t=en.type;
      if(t==="piranha"){ poly([[-w*.5,0],[-w*.15,-h*.42],[w*.42,-h*.2],[w*.5,0],[w*.34,h*.25],[-w*.15,h*.4]],"#302811"); poly([[-w*.3,0],[-w*.5,-h*.38],[-w*.5,h*.38]],color); eye(w*.22,-4,2); }
      else if(t==="firebat"){ poly([[-w*.48,0],[-w*.22,-h*.48],[0,-h*.14],[w*.22,-h*.48],[w*.48,0],[w*.18,h*.38],[0,h*.1],[-w*.18,h*.38]],"#35110a"); eye(4,-2,2); }
      else if(t==="turret"){ box(-w*.3,-h*.15,w*.6,h*.62,"#192624"); orb(0,-h*.27,w*.24,"#203936"); limb(4,-h*.28,w*.52,-h*.35,6); eye(-4,-h*.29,2); }
      else if(t==="shield"){ box(-w*.18,-h*.45,w*.36,h*.82,"#14232b"); poly([[w*.08,-h*.35],[w*.5,-h*.24],[w*.5,h*.32],[w*.08,h*.4]],"#173f4d"); eye(-2,-h*.25,2); }
      else if(t==="mine"){ orb(0,0,h*.34,"#30260c"); for(let a=0;a<8;a++) limb(Math.cos(a*Math.PI/4)*8,Math.sin(a*Math.PI/4)*8,Math.cos(a*Math.PI/4)*h*.55,Math.sin(a*Math.PI/4)*h*.55,3); eye(0,0,3); }
      else if(t==="drone"){ poly([[-w*.5,0],[-w*.2,-h*.35],[w*.2,-h*.35],[w*.5,0],[w*.2,h*.28],[-w*.2,h*.28]],"#261b34"); orb(0,0,5,color); limb(-w*.25,0,-w*.48,h*.35,3); limb(w*.25,0,w*.48,h*.35,3); }
      else if(t==="sniper"){ box(-w*.2,-h*.45,w*.4,h*.82,"#10252b"); limb(0,-h*.18,w*.65,-h*.36,5); box(-w*.3,h*.3,w*.22,h*.16,color); eye(4,-h*.31,2); }
      else if(t==="slime"){ ctx.beginPath();ctx.moveTo(-w*.5,h*.35);ctx.quadraticCurveTo(-w*.42,-h*.38,0,-h*.45);ctx.quadraticCurveTo(w*.48,-h*.28,w*.5,h*.35);ctx.closePath();ctx.fillStyle="#17320d";ctx.fill();ctx.stroke();eye(8,-2,3); }
      else if(t==="spore"){ orb(0,-h*.12,h*.3,"#1d2c13"); for(let i=-2;i<=2;i++) limb(i*5,h*.1,i*8,h*.48,3); eye(5,-h*.16,2); }
      else if(t==="mutant"){ poly([[-w*.36,-h*.35],[0,-h*.5],[w*.42,-h*.18],[w*.3,h*.45],[-w*.28,h*.42]],"#35110b"); limb(-w*.24,-5,-w*.5,h*.24,7); limb(w*.28,-4,w*.52,-h*.25,8); eye(8,-h*.22,3); }
      else if(t==="teleporter"){ poly([[0,-h*.5],[w*.42,-h*.18],[w*.3,h*.46],[-w*.3,h*.46],[-w*.42,-h*.18]],"#27183a"); ctx.strokeRect(-w*.25,-h*.28,w*.5,h*.5); eye(0,-h*.08,3); }
      else if(t==="xeno_scout"){ poly([[-w*.5,0],[-w*.12,-h*.45],[w*.42,-h*.18],[w*.5,h*.12],[0,h*.38]],"#102932"); box(-w*.12,-4,w*.36,8,color); eye(w*.22,-8,2); }
      else if(t==="tractor_unit"){ orb(0,-h*.05,h*.36,"#182b35"); ctx.beginPath();ctx.arc(0,h*.1,h*.5,0,Math.PI);ctx.stroke();orb(0,-h*.08,5,color); }
      else { box(-w*.46,-h*.4,w*.92,h*.8,"#321a0d"); poly([[-w*.35,-h*.4],[-w*.18,-h*.62],[0,-h*.4],[w*.18,-h*.62],[w*.35,-h*.4]],color); eye(-8,-5,3); eye(8,-5,3); box(-w*.22,h*.08,w*.44,h*.12,color); }
    }
    if (en.state === "telegraph" || en.state === "charge") {
      ctx.strokeStyle = "#ffe600";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(en.w, en.h) * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (en.shielded) {
      ctx.strokeStyle = "#5cf6ff";
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(en.facing * en.w * 0.25, 0, en.h * 0.55, -Math.PI / 2, Math.PI / 2, en.facing < 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemy(en) {
    const x = en.x + en.w / 2 - cam.x;
    const y = en.y + en.h - cam.y;
    if (x < -160 || x > VIEW_W + 160 || y < -160 || y > VIEW_H + 160) return;
    const set = SPR[en.type];
    const def = ENEMY_TYPES[en.type];
    if (!set) {
      if (def) drawFallbackEnemy(en, def, x, y);
      drawEnemyHealth(en);
      return;
    }
    let frame = Math.floor(en.anim) % 2 === 0 ? set.idle : set.walk;

    if (def && def.behavior === "boss") {
      if (en.state === "telegraph" || en.state === "recover" || en.currentAttack) frame = set.shoot || frame;
      else if (Math.abs(en.vx) > 0.18) frame = set.walk || frame;
    } else if (en.lastDecision === "shield_pulse" || (def && (def.behavior === "turret" || def.behavior === "sniper") && en.cool < 18)) {
      frame = set.shoot || frame;
    }

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
    } else if (en.type === "seaking") {
      if (en.cool < 18 && set.shoot) frame = set.shoot;
      else if (Math.abs(en.vx) > 1.1 && set.attack) frame = set.attack;
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

    drawEnemyHealth(en);
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

  function drawBossHazards() {
    for (const h of bossHazards) {
      const x = h.x - cam.x;
      const y = h.y - cam.y;
      const telegraph = h.delay > 0;
      const pulse = 0.72 + Math.sin(time * 0.28) * 0.2;
      ctx.save();
      ctx.globalAlpha = telegraph ? 0.42 + pulse * 0.22 : 0.76;
      ctx.strokeStyle = h.color;
      ctx.fillStyle = h.color;
      ctx.lineWidth = telegraph ? 2 : 4;
      if (telegraph) ctx.setLineDash([7, 5]);

      if (h.kind === "beamV") {
        ctx.fillStyle = telegraph ? "rgba(255,255,255,.08)" : h.color;
        ctx.fillRect(x - h.w / 2, 0, h.w, VIEW_H);
        ctx.strokeRect(x - h.w / 2, 0, h.w, VIEW_H);
      } else if (h.kind === "beamH") {
        ctx.fillStyle = telegraph ? "rgba(255,255,255,.08)" : h.color;
        ctx.fillRect(0, y - h.w / 2, VIEW_W, h.w);
        ctx.strokeRect(0, y - h.w / 2, VIEW_W, h.w);
      } else if (h.kind === "ring") {
        ctx.beginPath();
        ctx.arc(x, y, h.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (h.kind === "meteor") {
        ctx.beginPath();
        ctx.arc(x, y, h.r * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y + h.r);
        ctx.lineTo(x, h.targetY - cam.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, h.r * (telegraph ? 0.78 + pulse * 0.2 : 1), 0, Math.PI * 2);
        if (telegraph) ctx.stroke();
        else {
          ctx.globalAlpha *= 0.36;
          ctx.fill();
          ctx.globalAlpha = 0.95;
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  function drawGadgets() {
    for (const g of gadgets) {
      const x = g.x - cam.x, y = g.y - cam.y;
      if (g.hook) {
        ctx.strokeStyle = "rgba(208,214,224,.8)"; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(player.x + player.w / 2 - cam.x, player.y + player.h / 2 - cam.y); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = g.color; ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x - 6, y - 7); ctx.lineTo(x - 3, y); ctx.lineTo(x - 6, y + 7); ctx.closePath(); ctx.fill();
      } else if (g.state === "puddle") {
        const gelFrame = SPR.gel && (Math.floor(time / 8) % 2 ? SPR.gel.ripple : SPR.gel.puddle);
        if (gelFrame && gelFrame.width) {
          ctx.save();
          ctx.globalAlpha = 0.95;
          ctx.drawImage(gelFrame, x - gelFrame.width / 2, y - gelFrame.height * 0.78);
          ctx.restore();
        } else {
          ctx.fillStyle = "rgba(114,241,184,.65)"; ctx.beginPath(); ctx.ellipse(x, y, g.puddleRadius, 9, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = g.color; ctx.stroke();
        }
      } else {
        ctx.save(); ctx.translate(x, y); ctx.rotate(time * 0.12);
        if (g.gel && SPR.gel && SPR.gel.blob && SPR.gel.blob.width) {
          const blob = SPR.gel.blob;
          ctx.rotate(-time * 0.12);
          ctx.drawImage(blob, -blob.width / 2, -blob.height / 2);
        } else {
          ctx.fillStyle = "#10151a"; ctx.strokeStyle = g.color; ctx.lineWidth = 3; ctx.fillRect(-g.r, -g.r, g.r * 2, g.r * 2); ctx.strokeRect(-g.r, -g.r, g.r * 2, g.r * 2);
        }
        if (g.sticky) { ctx.fillStyle = g.color; ctx.fillRect(-3, -3, 6, 6); }
        ctx.restore();
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
    const ammoText = w.id === "minigun" ? "CALOR " + Math.round(p.heat) + "%" : p.ammo[p.weapon] + "/" + w.magazine + (p.reloading ? " · RECARGANDO" : " · RESERVA ∞");
    ctx.fillText(w.short + "  " + ammoText, 24, 76);

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
    ctx.fillText("E arma · Q especial · R recarga", VIEW_W - 24, 48);
    ctx.fillStyle = "#222";
    ctx.fillRect(VIEW_W - 256, 56, 232, 10);
    const weaponRatio = w.id === "minigun" ? p.heat / 100 : (p.reloading ? 1 - p.reloadTimer / w.reload : p.ammo[p.weapon] / w.magazine);
    ctx.fillStyle = p.overheated ? "#ef233c" : (p.reloading ? "#ffe600" : w.accent);
    ctx.fillRect(VIEW_W - 256, 56, 232 * clamp(weaponRatio, 0, 1), 10);
    const special = SPECIALS[p.special];
    ctx.fillStyle = special.color;
    ctx.textAlign = "left";
    ctx.font = "9px Courier New";
    ctx.fillText("RMB " + special.name + (p.specialCool > 0 ? " · " + Math.ceil(p.specialCool / 60) + "s" : " · LISTO"), VIEW_W - 254, 64);

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
      } else if (ENEMY_TYPES[activeBoss.type].behavior === "boss") {
        statusTag = " [FASE " + (activeBoss.phase || 1) + " · " + (activeBoss.state === "telegraph" ? "ATAQUE ANUNCIADO" : "PATRON ACTIVO") + "]";
      }
      ctx.fillText(ENEMY_TYPES[activeBoss.type].name.toUpperCase() + statusTag, VIEW_W / 2, by + 15);
    }

    ctx.strokeStyle = p.parryTimer > 0 ? "#ffe600" : "#e0b33a";
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
    ctx.arc(mouse.x, mouse.y, 11 + (p.parryTimer > 0 ? 5 : 0), 0, Math.PI * 2);
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

  function drawLegacyLevelSelectMenu() {
    drawBg();

    ctx.fillStyle = "rgba(7, 6, 12, 0.88)";
    roundRect(24, 18, VIEW_W - 48, VIEW_H - 36, 10);
    ctx.fill();
    ctx.strokeStyle = "#e0b33a";
    ctx.lineWidth = 3;
    roundRect(24, 18, VIEW_W - 48, VIEW_H - 36, 10);
    ctx.stroke();

    ctx.fillStyle = "#5cf6ff";
    ctx.font = "bold 30px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("YAEL — PROTOCOLO BELMONT", VIEW_W / 2, 54);

    ctx.fillStyle = "#e0b33a";
    ctx.font = "bold 13px Courier New";
    ctx.fillText("SELECCIONA EL SECTOR DE COMBATE", VIEW_W / 2, 76);

    ctx.fillStyle = "#8b9bb4";
    ctx.font = "11px Courier New";
    ctx.fillText("Usa las Flechas / A-D o haz Clic en una mision para elegir nivel", VIEW_W / 2, 96);

    const cards = [
      {
        num: 1,
        title: "NIVEL 1: CASTILLO",
        sub: "PROTOCOLO BELMONT",
        tag: "TIERRA · 240 TILES",
        boss: "Boss: Rey Marino (Gyojin)",
        desc: ["Fosos de magma ardiente", "Gyojin pulpo, anguila y cangrejo", "Barricadas tácticas de sacos"],
        color: "#ff6b00",
        accent: "#ffa200",
        x: 48,
      },
      {
        num: 2,
        title: "NIVEL 2: REACTOR",
        sub: "SECTOR RADIACTIVO",
        tag: "TOXICO · 260 TILES",
        boss: "Boss: Titan Colosal (950 HP)",
        desc: ["Estrellas de fuego verde", "Ataque telegrafiado con aviso", "Nucleo expuesto (2X dano)"],
        color: "#39ff14",
        accent: "#b4ff39",
        x: 348,
      },
      {
        num: 3,
        title: "NIVEL 3: LA TORRE",
        sub: "TORRE DEL CATACLISMO",
        tag: "VERTICAL · 180 TILES",
        boss: "Boss: Nave Nodriza (1200 HP)",
        desc: ["¡La lava sube sin descanso!", "Laser vertical y rayo tractor", "Orbes de paralisis por 2s"],
        color: "#5cf6ff",
        accent: "#00f0ff",
        x: 648,
      },
    ];

    const cardW = 264;
    const cardH = 290;
    const cardY = 118;

    for (const c of cards) {
      const isSelected = menuSelectedLevel === c.num;

      ctx.save();
      ctx.fillStyle = isSelected ? "rgba(22, 28, 48, 0.95)" : "rgba(12, 14, 24, 0.75)";
      roundRect(c.x, cardY, cardW, cardH, 8);
      ctx.fill();

      ctx.strokeStyle = isSelected ? c.color : "rgba(100, 110, 130, 0.4)";
      ctx.lineWidth = isSelected ? 3.5 : 1.5;
      if (isSelected) {
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 16;
      }
      roundRect(c.x, cardY, cardW, cardH, 8);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = isSelected ? c.color : "#d0d6e0";
      ctx.font = "bold 15px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(c.title, c.x + cardW / 2, cardY + 28);

      ctx.fillStyle = c.accent;
      ctx.font = "bold 11px Courier New";
      ctx.fillText(c.sub, c.x + cardW / 2, cardY + 46);

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(c.x + 16, cardY + 58, cardW - 32, 20);
      ctx.fillStyle = isSelected ? "#fff" : "#8b9bb4";
      ctx.font = "bold 10px Courier New";
      ctx.fillText(c.tag, c.x + cardW / 2, cardY + 72);

      ctx.fillStyle = "#ef233c";
      ctx.font = "bold 11px Courier New";
      ctx.fillText(c.boss, c.x + cardW / 2, cardY + 104);

      ctx.fillStyle = "#d0d6e0";
      ctx.font = "11px Courier New";
      let dy = cardY + 132;
      for (const line of c.desc) {
        ctx.fillText("• " + line, c.x + cardW / 2, dy);
        dy += 20;
      }

      const btnY = cardY + cardH - 46;
      ctx.fillStyle = isSelected ? c.color : "rgba(40, 50, 70, 0.8)";
      roundRect(c.x + 24, btnY, cardW - 48, 30, 5);
      ctx.fill();
      ctx.fillStyle = isSelected ? "#07060c" : "#fff";
      ctx.font = "bold 12px Courier New";
      ctx.fillText(isSelected ? "▶ JUGAR [ " + c.num + " ]" : "PRESIONA [ " + c.num + " ]", c.x + cardW / 2, btnY + 20);
    }

    const mainBtnX = VIEW_W / 2 - 190;
    const mainBtnY = 422;
    const mainBtnW = 380;
    const mainBtnH = 40;
    const hoverMain = mouse.x >= mainBtnX && mouse.x <= mainBtnX + mainBtnW && mouse.y >= mainBtnY && mouse.y <= mainBtnY + mainBtnH;

    ctx.save();
    ctx.fillStyle = hoverMain ? "#ffe600" : "#e0b33a";
    if (hoverMain) {
      ctx.shadowColor = "#ffe600";
      ctx.shadowBlur = 18;
    }
    roundRect(mainBtnX, mainBtnY, mainBtnW, mainBtnH, 6);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#07060c";
    ctx.font = "bold 14px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("INICIAR NIVEL " + menuSelectedLevel + "  (ENTER O CLIC)", VIEW_W / 2, mainBtnY + 25);

    ctx.fillStyle = "#8b9bb4";
    ctx.font = "10px Courier New";
    ctx.fillText("A / D: Moverse   S: Agacharse   W / Espacio: Saltar   E: Armas   P: Pausa   M: Silencio", VIEW_W / 2, 484);
  }

  function drawLevelSelectMenu() {
    drawBg();
    const pageCount = Math.max(1, Math.ceil(CAMPAIGN.length / 4));
    menuPage = clamp(menuPage, 0, pageCount - 1);
    const first = menuPage * 4;
    const visible = CAMPAIGN.slice(first, first + 4);
    const palette = ["#5cf6ff", "#e0b33a", "#ff6b35", "#c77dff", "#39ff14", "#ef233c"];
    const mechanicNames = {
      marea: "MAREA Y COBERTURAS",
      corriente: "CORRIENTES Y MINAS",
      inundacion: "RUTAS INUNDADAS",
      puentes: "PUENTES QUEBRADIZOS",
      cobertura: "COBERTURAS Y TORRETAS",
      trenes: "TRENES EN MOVIMIENTO",
      tormenta: "GRUAS Y DESCARGAS",
      murallas: "MURALLAS DEFENSIVAS",
      oleadas: "OLEADAS DE ARENA",
      gas: "GAS TOXICO",
      prensas: "PRENSAS INDUSTRIALES",
      teletransporte: "SALTOS CUANTICOS",
      convoy: "CONVOY EN MARCHA",
      oscuridad: "VISIBILIDAD REDUCIDA",
      gravedad: "GRAVEDAD VARIABLE",
      viento: "CORRIENTES DE VIENTO",
      sintesis: "SINTESIS DE MECANICAS",
    };

    ctx.fillStyle = "rgba(7, 6, 12, 0.91)";
    roundRect(24, 18, VIEW_W - 48, VIEW_H - 36, 10);
    ctx.fill();
    ctx.strokeStyle = "#e0b33a";
    ctx.lineWidth = 3;
    roundRect(24, 18, VIEW_W - 48, VIEW_H - 36, 10);
    ctx.stroke();

    ctx.fillStyle = "#5cf6ff";
    ctx.font = "bold 26px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("YAEL — PROTOCOLO BELMONT", VIEW_W / 2, 50);
    ctx.fillStyle = "#e0b33a";
    ctx.font = "bold 12px Courier New";
    const selectedAct = Math.floor((menuSelectedLevel - 1) / 5) + 1;
    ctx.fillText("CAMPAÑA · ACTO " + selectedAct + " · PÁGINA " + (menuPage + 1) + "/" + pageCount, VIEW_W / 2, 72);
    ctx.fillStyle = "#8b9bb4";
    ctx.font = "10px Courier New";
    ctx.fillText("Derrota al jefe para desbloquear el siguiente nivel · Flechas / A-D para explorar", VIEW_W / 2, 91);

    const cardW = 200;
    const cardH = 292;
    const cardY = 112;
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const x = 28 + i * 228;
      const selected = menuSelectedLevel === c.num;
      const unlocked = levelIsUnlocked(c.num);
      const color = palette[(c.num - 1) % palette.length];
      ctx.save();
      ctx.fillStyle = selected ? "rgba(22, 28, 48, 0.98)" : "rgba(12, 14, 24, 0.82)";
      roundRect(x, cardY, cardW, cardH, 8);
      ctx.fill();
      ctx.strokeStyle = selected ? color : (unlocked ? "rgba(100, 110, 130, 0.55)" : "rgba(70, 75, 88, 0.4)");
      ctx.lineWidth = selected ? 3 : 1.5;
      if (selected) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
      }
      roundRect(x, cardY, cardW, cardH, 8);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = unlocked ? (selected ? color : "#d0d6e0") : "#626979";
      ctx.font = "bold 12px Courier New";
      ctx.textAlign = "center";
      ctx.fillText("NIVEL " + c.num + ": " + c.title, x + cardW / 2, cardY + 25);
      ctx.fillStyle = unlocked ? color : "#454a58";
      ctx.font = "bold 9px Courier New";
      ctx.fillText(c.tag || ("DIFICULTAD " + c.difficulty), x + cardW / 2, cardY + 44);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x + 12, cardY + 58, cardW - 24, 24);
      ctx.fillStyle = unlocked ? "#fff" : "#626979";
      ctx.font = "bold 10px Courier New";
      ctx.fillText(unlocked ? "JEFE: " + c.bossName : "🔒 BLOQUEADO", x + cardW / 2, cardY + 74);
      ctx.fillStyle = unlocked ? "#d0d6e0" : "#5c6270";
      ctx.font = "10px Courier New";
      ctx.fillText((mechanicNames[c.mechanic] || "ARENA DE COMBATE"), x + cardW / 2, cardY + 112);
      ctx.fillStyle = color;
      ctx.font = "bold 16px Courier New";
      ctx.fillText("◆".repeat(Math.min(5, Math.max(1, c.difficulty || 1))), x + cardW / 2, cardY + 145);
      ctx.fillStyle = "#8b9bb4";
      ctx.font = "9px Courier New";
      const textLines = [
        c.existing ? "MAPA EXISTENTE AMPLIADO" : "MAPA LARGO DE CAMPAÑA",
        "JEFE OBLIGATORIO",
        c.num === CAMPAIGN.length ? "BATALLA FINAL" : "PORTAL AL SIGUIENTE",
      ];
      let ty = cardY + 178;
      for (const line of textLines) {
        ctx.fillText(line, x + cardW / 2, ty);
        ty += 18;
      }
      const btnY = cardY + cardH - 42;
      ctx.fillStyle = selected && unlocked ? color : "rgba(40, 50, 70, 0.8)";
      roundRect(x + 14, btnY, cardW - 28, 28, 5);
      ctx.fill();
      ctx.fillStyle = selected && unlocked ? "#07060c" : "#9aa4b8";
      ctx.font = "bold 10px Courier New";
      ctx.fillText(unlocked ? (selected ? "▶ JUGAR [ENTER]" : "SELECCIONAR") : "COMPLETA EL ANTERIOR", x + cardW / 2, btnY + 18);
    }

    const mainBtnX = VIEW_W / 2 - 190;
    const mainBtnY = 420;
    const mainBtnW = 380;
    const mainBtnH = 38;
    const canStart = levelIsUnlocked(menuSelectedLevel);
    const hoverMain = mouse.x >= mainBtnX && mouse.x <= mainBtnX + mainBtnW && mouse.y >= mainBtnY && mouse.y <= mainBtnY + mainBtnH;
    ctx.save();
    ctx.fillStyle = canStart ? (hoverMain ? "#ffe600" : "#e0b33a") : "#343a4a";
    if (hoverMain && canStart) {
      ctx.shadowColor = "#ffe600";
      ctx.shadowBlur = 16;
    }
    roundRect(mainBtnX, mainBtnY, mainBtnW, mainBtnH, 6);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = canStart ? "#07060c" : "#777f93";
    ctx.font = "bold 13px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(canStart ? "INICIAR NIVEL " + menuSelectedLevel + "  (ENTER O CLIC)" : "NIVEL BLOQUEADO", VIEW_W / 2, mainBtnY + 24);
    ctx.fillStyle = "#8b9bb4";
    ctx.font = "10px Courier New";
    ctx.fillText("Progreso: " + Math.max(0, highestUnlockedLevel - 1) + "/" + CAMPAIGN.length + " jefes derrotados · P: Pausa · M: Silencio", VIEW_W / 2, 480);
  }

  function drawCharacterSelect() {
    drawBg();
    ctx.fillStyle = "rgba(7,6,12,.94)"; roundRect(30, 18, VIEW_W - 60, VIEW_H - 36, 10); ctx.fill();
    ctx.strokeStyle = "#e0b33a"; ctx.lineWidth = 3; roundRect(30, 18, VIEW_W - 60, VIEW_H - 36, 10); ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = "#5cf6ff"; ctx.font = "bold 24px Courier New";
    ctx.fillText("ELEGIR PERSONAJE · NIVEL " + characterTargetLevel, VIEW_W / 2, 56);
    ctx.fillStyle = "#8b9bb4"; ctx.font = "11px Courier New";
    ctx.fillText("← / → ELIGE · 1-3 ATAJO · ENTER CONFIRMA", VIEW_W / 2, 80);
    for (let i = 0; i < CHARACTERS.length; i++) {
      const c = CHARACTERS[i]; const selected = characterCursor === i; const x = 54 + i * 290; const y = 126;
      ctx.fillStyle = selected ? "rgba(30,58,68,.96)" : "rgba(15,18,28,.9)"; roundRect(x, y, 260, 292, 8); ctx.fill();
      ctx.strokeStyle = selected ? c.color : "#343a4a"; ctx.lineWidth = selected ? 4 : 1; roundRect(x, y, 260, 292, 8); ctx.stroke();
      const hero = SPR.heroes && SPR.heroes[c.id]; const frame = hero && (selected ? hero.fire : hero.idle);
      if (frame) ctx.drawImage(frame, x + 106, y + 18, 48, 60);
      ctx.fillStyle = c.color; ctx.font = "bold 17px Courier New"; ctx.fillText((selected ? "▶ " : "") + c.title, x + 130, y + 103);
      ctx.fillStyle = "#fff"; ctx.font = "bold 13px Courier New"; ctx.fillText(c.maxHp + " CORAZONES", x + 130, y + 137);
      ctx.fillStyle = "#aeb8ca"; ctx.font = "11px Courier New"; ctx.fillText(c.description, x + 130, y + 166);
      const speedText = c.climb ? "MOVIMIENTO: LENTO · ESCALADA" : "VELOCIDAD: " + (c.run > 1 ? "ALTA" : "MEDIA") + " · SALTO " + (c.jump < -14 ? "ALTO" : "CONTROLADO");
      ctx.fillStyle = "#8b9bb4"; ctx.font = "10px Courier New"; ctx.fillText(speedText, x + 130, y + 195);
      if (c.climb) { ctx.fillStyle = "#ff9f1c"; ctx.font = "bold 10px Courier New"; ctx.fillText("SIN SALTO · SUBE MUROS", x + 130, y + 220); }
      else if (c.id === "agile") { ctx.fillStyle = "#5cf6ff"; ctx.font = "bold 10px Courier New"; ctx.fillText("CAÍDA RÁPIDA · GRAN ALTURA", x + 130, y + 220); }
      else { ctx.fillStyle = "#ffe29a"; ctx.font = "bold 10px Courier New"; ctx.fillText("EQUILIBRIO Y CONTROL", x + 130, y + 220); }
      if (selected) { ctx.fillStyle = "#ffe600"; ctx.font = "bold 26px Courier New"; ctx.fillText("▶", x + 12, y + 42); }
    }
    const active = CHARACTERS[characterCursor];
    ctx.fillStyle = active.color; roundRect(310, 454, 340, 42, 6); ctx.fill();
    ctx.fillStyle = "#07060c"; ctx.textAlign = "center"; ctx.font = "bold 13px Courier New";
    ctx.fillText("CONFIRMAR " + active.name + " [ENTER]", VIEW_W / 2, 481);
  }

  function drawLoadout() {
    drawBg();
    ctx.fillStyle = "rgba(7,6,12,.94)"; roundRect(30, 18, VIEW_W - 60, VIEW_H - 36, 10); ctx.fill();
    ctx.strokeStyle = "#e0b33a"; ctx.lineWidth = 3; roundRect(30, 18, VIEW_W - 60, VIEW_H - 36, 10); ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = "#5cf6ff"; ctx.font = "bold 23px Courier New";
    ctx.fillText("PREPARAR EQUIPO · NIVEL " + loadoutTargetLevel, VIEW_W / 2, 48);
    ctx.fillStyle = "#8b9bb4"; ctx.font = "10px Courier New";
    ctx.fillText("ELIGE HASTA 2 ARMAS PRINCIPALES Y 2 ESPECIALES · ESPACIO/CLIC EQUIPA", VIEW_W / 2, 69);
    if (pendingReward) { ctx.fillStyle = pendingReward.kind === "weapon" ? "#5cf6ff" : "#72f1b8"; ctx.font = "bold 11px Courier New"; ctx.fillText("NUEVO DESBLOQUEO: " + pendingReward.name, VIEW_W / 2, 88); }

    const drawColumn = (items, unlocked, equipped, column, x, width) => {
      ctx.textAlign = "left"; ctx.fillStyle = column === 0 ? "#ffe29a" : "#72f1b8"; ctx.font = "bold 14px Courier New";
      ctx.fillText(column === 0 ? "ARMAS PRINCIPALES  " + equipped.length + "/2" : "ESPECIALES  " + equipped.length + "/2", x, 108);
      for (let i = 0; i < items.length; i++) {
        const item = items[i], open = unlocked.includes(i), active = equipped.includes(i), selected = loadoutColumn === column && loadoutCursor === i;
        const y = 118 + i * 52;
        ctx.fillStyle = active ? "rgba(35,74,82,.9)" : selected ? "rgba(38,42,60,.95)" : "rgba(15,18,28,.85)";
        roundRect(x, y, width, 44, 5); ctx.fill();
        ctx.strokeStyle = active ? item.accent || item.color : selected ? "#e0b33a" : "#343a4a"; ctx.lineWidth = active ? 3 : 1; roundRect(x, y, width, 44, 5); ctx.stroke();
        ctx.fillStyle = open ? "#fff" : "#626979"; ctx.font = "bold 11px Courier New";
        ctx.fillText((active ? "✓ " : open ? "  " : "🔒 ") + item.name, x + 10, y + 16);
        ctx.fillStyle = open ? "#9aa4b8" : "#454a58"; ctx.font = "9px Courier New";
        let detail;
        if (column === 0) detail = item.id === "minigun" ? "CALOR · CADENCIA EXTREMA" : item.magazine + " TIROS · RECARGA " + (item.reload / 60).toFixed(1) + "s · DAÑO " + item.dmg;
        else if (item.sword) detail = "PARRY " + item.parryFrames + "f · CUERPO A CUERPO " + item.dmg;
        else if (item.hook) detail = "MOVILIDAD · ARRASTRE";
        else if (item.gel) detail = "PARALIZA AL RESBALAR";
        else detail = "DAÑO " + item.dmg + " · FÍSICA PROPIA";
        ctx.fillText(detail, x + 10, y + 33);
        if (selected) {
          ctx.fillStyle = "#ffe600";
          ctx.font = "bold 22px Courier New";
          ctx.fillText("▶", x - 27, y + 30);
          ctx.fillStyle = "rgba(255,230,0,.18)";
          ctx.fillRect(x + width - 6, y + 5, 3, 34);
        }
      }
    };
    drawColumn(WEAPONS, unlockedWeapons, equippedWeapons, 0, 55, 405);
    drawColumn(SPECIALS, unlockedSpecials, equippedSpecials, 1, 500, 405);

    const ready = equippedWeapons.length > 0 && equippedSpecials.length > 0;
    ctx.fillStyle = ready ? "#e0b33a" : "#343a4a"; roundRect(310, 472, 340, 38, 6); ctx.fill();
    ctx.fillStyle = ready ? "#07060c" : "#777f93"; ctx.textAlign = "center"; ctx.font = "bold 13px Courier New";
    ctx.fillText(ready ? "CONFIRMAR Y COMENZAR [ENTER]" : "EQUIPA AL MENOS UNO DE CADA", VIEW_W / 2, 496);
    ctx.fillStyle = "#8b9bb4"; ctx.font = "9px Courier New"; ctx.fillText("←/→ CATEGORÍA · ↑/↓ SELECCIÓN · ESC VOLVER", VIEW_W / 2, 518);
  }

  function draw() {
    sky();
    if (state === "menu") {
      drawLevelSelectMenu();
      return;
    }
    if (state === "character_select") {
      drawCharacterSelect();
      return;
    }
    if (state === "loadout") {
      drawLoadout();
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
    drawBossHazards();
    drawGadgets();
    drawParticles();

    if (isVerticalLevel && verticalHazard && risingLavaY < worldH * TILE) {
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
    if (lavaChase && risingLavaX > cam.x - 80) {
      const lx = risingLavaX - cam.x;
      const glow = ctx.createLinearGradient(lx - 70, 0, lx + 30, 0);
      glow.addColorStop(0, "rgba(255,60,0,0)");
      glow.addColorStop(0.62, "rgba(255,60,0,.35)");
      glow.addColorStop(1, "rgba(255,186,8,.92)");
      ctx.fillStyle = glow;
      ctx.fillRect(Math.max(-80, lx - 70), 0, Math.min(VIEW_W + 80, lx + 70), VIEW_H);
      ctx.fillStyle = "#ffe600";
      for (let y = 0; y < VIEW_H; y += 18) ctx.fillRect(lx + Math.sin(time * 0.2 + y) * 5, y, 6, 13);
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
      const nextCfg = CAMPAIGN[currentLevel] || null;
      panel("¡NIVEL " + currentLevel + " SUPERADO!", [
        "Has vencido a " + ((levelData && levelData.campaign && levelData.campaign.bossName) || "el jefe") + ".",
        nextCfg ? "Siguiente misión: NIVEL " + nextCfg.num + " · " + nextCfg.title + "." : "La campaña está lista para su batalla final.",
        "",
        "El portal está abierto y el siguiente nivel ha sido desbloqueado.",
        pendingReward ? "NUEVO EQUIPO: " + pendingReward.name + "." : "Arsenal completo: no se repiten recompensas al rejugar.",
        "",
        "Reliquias acumuladas: " + (coins | 0) + "    Bajas: " + kills,
        "",
        "Presiona ENTER o ESPACIO para continuar",
      ]);
    }
    if (state === "dead") {
      panel("CAIDA EN COMBATE", [
        "Yael cayo en " + levelName,
        "Reliquias: " + (coins | 0) + "    Bajas: " + kills,
        "",
        "ENTER o R para reintentar desde el ultimo punto de control",
        "Selecciona otro nivel desde la campaña cuando esté desbloqueado",
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
        "ENTER o R para reiniciar la campaña",
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
  loadCampaignProgress();
  menuSelectedLevel = Math.min(Math.max(1, highestUnlockedLevel), Math.max(1, CAMPAIGN.length));
  menuPage = Math.floor((menuSelectedLevel - 1) / 4);
  if (/\bplay=1\b/.test(location.search)) startGame(urlLvl || 1);
  draw();
  requestAnimationFrame(loop);
})();
