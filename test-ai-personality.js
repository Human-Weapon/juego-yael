"use strict";

const fs = require("fs");
const vm = require("vm");
const L = require("./level.js");

let seed = 0x5a17;
const seededMath = Object.create(Math);
seededMath.random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};

const gradient = { addColorStop() {} };
const ctx = new Proxy(
  {},
  {
    get(target, key) {
      if (key === "createLinearGradient") return () => gradient;
      if (key === "measureText") return () => ({ width: 0 });
      if (!(key in target)) target[key] = () => {};
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  }
);

const canvas = {
  style: {},
  width: 960,
  height: 540,
  getContext: () => ctx,
  addEventListener() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
};

const storage = new Map([["yael_campaign_unlocked", "20"]]);
const windowMock = {
  YAEL_LEVEL: L,
  YAEL_SPRITES: { get: () => ({}) },
  innerWidth: 1280,
  innerHeight: 720,
  addEventListener() {},
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
  },
};

const source = fs.readFileSync("./game.js", "utf8");
const marker = "  requestAnimationFrame(loop);\n})();";
if (!source.includes(marker)) throw new Error("No se encontró el punto de instrumentación de game.js");

const instrumented = source.replace(
  marker,
  `  requestAnimationFrame(loop);
  globalThis.__YAEL_AI_TEST__ = {
    ENEMY_TYPES,
    reset() {
      highestUnlockedLevel = CAMPAIGN.length;
      startGame(1);
      enemies = [];
      bullets = [];
      bossHazards = [];
      particles = [];
      pickups = [];
      floating = [];
      player.hp = player.maxHp;
      player.dead = false;
      player.inv = 999999;
    },
    spawn(type, x, y) {
      spawnEnemy(type, x, y);
      const en = enemies[enemies.length - 1];
      en.state = "hunt";
      en.t = 0;
      en.cool = 0;
      en.phaseTimer = 0;
      return en;
    },
    setPlayer(patch) { Object.assign(player, patch); },
    step() { updateEnemies(); },
    bulletCount() { return bullets.length; },
    signatureProbe(type) {
      this.reset();
      const def=ENEMY_TYPES[type];
      spawnEnemy(type,17*L.TILE,13*L.TILE); const en=enemies[0]; en.state="hunt"; en.t=60;
      const ecx=en.x+en.w/2, ecy=en.y+en.h/2, pcx=player.x+player.w/2, pcy=player.y+player.h/2;
      const attack=BOSS_PERSONALITIES[def.bossPattern].attacks[0];
      triggerBossSignature(en,def,attack,pcx,pcy,ecx,ecy);
      return { signature:BOSS_PERSONALITIES[def.bossPattern].signature, hazards:bossHazards.map(h=>h.kind), labels:bossHazards.map(h=>h.label), rush:en.signatureRush };
    },
    finalArchitectProbe() {
      highestUnlockedLevel=CAMPAIGN.length; startGame(CAMPAIGN.length); enemies=[]; bullets=[]; bossHazards=[];
      spawnEnemy("cataclysm_architect",17*L.TILE,9*L.TILE); const en=enemies[0]; const def=ENEMY_TYPES[en.type];
      en.state="hunt"; en.t=60; en.cool=999; en.hp=en.maxHp*0.12;
      const ecx=en.x+en.w/2, ecy=en.y+en.h/2, pcx=player.x+player.w/2, pcy=player.y+player.h/2;
      genericEnemyUpdate(en,def,pcx-ecx,pcx,pcy,ecx,ecy);
      const attack=BOSS_PERSONALITIES.architect.attacks.find(item=>item.final);
      en.currentAttack=attack; fireBossPattern(en,def,0,pcx,pcy,ecx,ecy);
      return {phase:en.phase, attack:attack && attack.id, bullets:bullets.length, hazards:bossHazards.map(h=>h.label)};
    },
  };
})();`
);

class AudioMock {
  constructor() {
    this.loop = false;
    this.volume = 0;
    this.muted = false;
    this.paused = true;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

const sandbox = {
  window: windowMock,
  document: { getElementById: () => canvas },
  location: { search: "" },
  URLSearchParams,
  Audio: AudioMock,
  requestAnimationFrame() {},
  setTimeout() {},
  console,
  Math: seededMath,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(instrumented, sandbox, { filename: "game.js" });

const ai = sandbox.__YAEL_AI_TEST__;
let failures = 0;
function fail(message) {
  failures++;
  console.error("FAIL", message);
}
function ok(message) {
  console.log("OK  ", message);
}

const newBosses = L.CAMPAIGN_LEVELS.filter((level) => !level.existing).map((level) => level.bossType);
const bossSignatures = new Set();
for (const type of newBosses) {
  const signature = ai.signatureProbe(type);
  if (!signature.signature) fail(`${type}: no declara mecánica de arena propia`);
  else if (bossSignatures.has(signature.signature)) fail(`${type}: comparte la firma ${signature.signature} con otro jefe`);
  else if (!signature.hazards.length && !signature.rush) fail(`${type}: su firma no crea una amenaza jugable`);
  else {
    bossSignatures.add(signature.signature);
    ok(`${type}: firma ${signature.signature} (${signature.hazards.join(", ") || "embestida"})`);
  }
}

for (const type of newBosses) {
  ai.reset();
  ai.setPlayer({ x: 8 * L.TILE, y: 11 * L.TILE, vx: 0, vy: 0, onGround: true });
  const en = ai.spawn(type, 17 * L.TILE, 13 * L.TILE);
  const attacks = [];
  let previousBullets = 0;
  for (let frame = 0; frame < 1100 && attacks.length < 10; frame++) {
    if (frame === 360) en.hp = en.maxHp * 0.58;
    if (frame === 720) en.hp = en.maxHp * 0.24;
    ai.step();
    const bulletCount = ai.bulletCount();
    if (bulletCount > previousBullets) attacks.push(en.lastAttackId || "<sin-identidad>");
    previousBullets = bulletCount;
  }
  const unique = new Set(attacks);
  if (attacks.length < 6) fail(`${type}: solo produjo ${attacks.length} ataques observables`);
  else if (unique.has("<sin-identidad>")) fail(`${type}: sus ataques no tienen identidad táctica`);
  else if (unique.size < 3) fail(`${type}: repite ${[...unique].join(", ")} y no alcanza 3 patrones`);
  else ok(`${type}: ${unique.size} patrones observados en ${attacks.length} ataques`);
}

const finalArchitect = ai.finalArchitectProbe();
if (finalArchitect.phase !== 4 || finalArchitect.attack !== "last_geometry" || finalArchitect.bullets < 18 || !finalArchitect.hazards.includes("GEOMETRIA FINAL")) {
  fail(`Arquitecto final: cuarta fase incompleta (${JSON.stringify(finalArchitect)})`);
} else {
  ok("Arquitecto final: cuarta fase, geometría final y presión reforzada");
}

const newCommons = [
  "piranha",
  "firebat",
  "turret",
  "shield",
  "mine",
  "drone",
  "sniper",
  "slime",
  "spore",
  "mutant",
  "teleporter",
  "xeno_scout",
  "skimmer",
  "bombardier",
  "tractor_unit",
  "mimic",
];

for (const type of newCommons) {
  ai.reset();
  const en = ai.spawn(type, 15 * L.TILE, 13 * L.TILE);
  const decisions = new Set();
  for (let frame = 0; frame < 420; frame++) {
    if (frame < 140) ai.setPlayer({ x: 4 * L.TILE, y: 11 * L.TILE, onGround: true });
    else if (frame < 280) ai.setPlayer({ x: 13 * L.TILE, y: 8 * L.TILE, onGround: false });
    else ai.setPlayer({ x: 20 * L.TILE, y: 11 * L.TILE, onGround: true });
    ai.step();
    if (en.lastDecision) decisions.add(en.lastDecision);
  }
  if (decisions.size < 2) fail(`${type}: no demuestra decisiones reactivas propias (${[...decisions].join(", ") || "ninguna"})`);
  else ok(`${type}: decisiones ${[...decisions].join(", ")}`);
}

if (failures) {
  console.error(`\nAI PERSONALITY CHECK FAILED: ${failures} problema(s)`);
  process.exitCode = 1;
} else {
  console.log("\nAI PERSONALITY CHECK PASSED");
}
