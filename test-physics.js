"use strict";

const fs = require("fs");
const L = require("./level.js");
const { TILE, PHYS, T, solid, oneWay } = L;

function fail(msg) {
  console.error("FAIL:", msg);
  process.exitCode = 1;
}
function ok(msg) {
  console.log("OK  ", msg);
}

function simulateJumpHeight() {
  let vy = PHYS.JUMP;
  let y = 0;
  let minY = 0;
  for (let i = 0; i < 240; i++) {
    const g = vy < 0 ? PHYS.HOLD_GRAV : PHYS.GRAVITY;
    vy += g;
    y += vy;
    if (y < minY) minY = y;
    if (y >= 0 && i > 3) break;
  }
  return -minY;
}

function simulateJumpDist() {
  let vy = PHYS.JUMP;
  let y = 0;
  let x = 0;
  for (let i = 0; i < 300; i++) {
    const g = vy < 0 ? PHYS.HOLD_GRAV : PHYS.GRAVITY;
    vy += g;
    if (vy > PHYS.MAX_FALL) vy = PHYS.MAX_FALL;
    y += vy;
    x += PHYS.RUN;
    if (y >= 0 && i > 3) return x;
  }
  return x;
}

const h = simulateJumpHeight();
const dist = simulateJumpDist();
const tilesHigh = h / TILE;
console.log("=== JUMP METRICS ===");
console.log("Jump height px:", h.toFixed(1), "tiles:", tilesHigh.toFixed(2));
console.log("Jump dist px:", dist.toFixed(1), "tiles:", (dist / TILE).toFixed(2));

if (tilesHigh < 5) fail("Jump too short: " + tilesHigh.toFixed(2) + " tiles");
else ok("Jump reaches " + tilesHigh.toFixed(2) + " tiles (need >= 5)");

if (dist < 6 * TILE) fail("Jump distance too short for 6-tile gaps");
else ok("Air distance " + (dist / TILE).toFixed(2) + " tiles");

function testLevel(levelNum) {
  console.log("\n=== TESTING LEVEL " + levelNum + " ===");
  const lvl = L.buildLevel(levelNum);
  const { tiles, worldW, worldH, doorX } = lvl;
  const boss = lvl.bossSpawn || (lvl.spawns && lvl.spawns.boss);

  if (!boss || !boss.type) fail("No boss spawn in level " + levelNum);
  else if (boss.tileX < 0 || boss.tileX >= worldW || boss.tileY < 0 || boss.tileY >= worldH) fail("Boss spawn outside level " + levelNum);
  else ok("Boss " + boss.type + " is defined inside the map");
  if (lvl.levelNum !== levelNum) fail("Level metadata mismatch: requested " + levelNum + " got " + lvl.levelNum);

  function tileAt(tx, ty) {
    if (ty < 0 || ty >= worldH || tx < 0 || tx >= worldW) return T.EMPTY;
    return tiles[ty][tx];
  }
  function blocksH(id) {
    return solid(id) || id === T.LAVA;
  }

  function moveActor(e) {
    const boxH = { x: e.x + e.vx, y: e.y, w: e.w, h: e.h };
    const x0 = Math.floor(boxH.x / TILE);
    const y0 = Math.floor(boxH.y / TILE);
    const x1 = Math.floor((boxH.x + boxH.w - 0.01) / TILE);
    const y1 = Math.floor((boxH.y + boxH.h - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = tileAt(tx, ty);
        if (!blocksH(id)) continue;
        const rx = tx * TILE;
        if (e.vx > 0) e.x = rx - e.w;
        else if (e.vx < 0) e.x = rx + TILE;
        e.vx = 0;
      }
    }
    e.x += e.vx;
    e.onGround = false;
    const boxV = { x: e.x, y: e.y + e.vy, w: e.w, h: e.h };
    const vx0 = Math.floor(boxV.x / TILE);
    const vy0 = Math.floor(boxV.y / TILE);
    const vx1 = Math.floor((boxV.x + boxV.w - 0.01) / TILE);
    const vy1 = Math.floor((boxV.y + boxV.h - 0.01) / TILE);
    for (let ty = vy0; ty <= vy1; ty++) {
      for (let tx = vx0; tx <= vx1; tx++) {
        const id = tileAt(tx, ty);
        if (id === T.LAVA) e.inLava = true;
        const ry = ty * TILE;
        if (oneWay(id)) {
          if (e.vy >= 0 && e.y + e.h <= ry + 10) {
            e.y = ry - e.h;
            e.vy = 0;
            e.onGround = true;
          }
          continue;
        }
        if (!blocksH(id)) continue;
        if (e.vy > 0) {
          e.y = ry - e.h;
          e.vy = 0;
          e.onGround = true;
        } else if (e.vy < 0) {
          e.y = ry + TILE;
          e.vy = 0;
        }
      }
    }
    e.y += e.vy;
  }

  let doorFound = false;
  for (let y = 0; y < worldH; y++) {
    for (let x = 0; x < worldW; x++) {
      if (tiles[y][x] === T.DOOR) doorFound = true;
    }
  }
  if (!doorFound) fail("No door in level " + levelNum);
  else ok("Door exists at x~" + (doorX / TILE).toFixed(1));

  const p = {
    x: TILE * 3,
    y: lvl.groundY * TILE - PHYS.PLAYER_H,
    w: PHYS.PLAYER_W,
    h: PHYS.PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    inLava: false,
    fell: false,
    coyote: 0,
    jumpBuf: 0,
  };
  let jumps = 0;
  let lavaHits = 0;
  let stuck = 0;
  let lastX = p.x;

  if (lvl.isVertical) {
    // Bot escalador para todos los niveles verticales. Cada mapa declara su
    // ruta de aterrizajes verificable, en vez de asumir que todos son la
    // Torre del Cataclismo.
    p.x = (lvl.verticalStartX === undefined ? 18 : lvl.verticalStartX) * TILE;
    p.y = (lvl.verticalStartY === undefined ? 175 : lvl.verticalStartY) * TILE - PHYS.PLAYER_H;
    let floorIdx = 0;
    const towerGoals = [
      { x: 30 * TILE, fy: 166 },
      { x: 5 * TILE, fy: 154 },
      { x: 30 * TILE, fy: 142 },
      { x: 5 * TILE, fy: 130 },
      { x: 18 * TILE, fy: 118 },
      { x: 30 * TILE, fy: 104 },
      { x: 5 * TILE, fy: 90 },
      { x: 30 * TILE, fy: 76 },
      { x: 5 * TILE, fy: 62 },
      { x: 30 * TILE, fy: 48 },
      { x: 18 * TILE, fy: 30 },
      { x: 17 * TILE, fy: 20 },
    ];
    const floorGoals = lvl.verticalBotGoals || towerGoals;

    for (let frame = 0; frame < 15000; frame++) {
      p.inLava = false;
      p.fell = false;

      const curGoal = floorGoals[floorIdx] || floorGoals[floorGoals.length - 1];
      const dx = curGoal.x - p.x;
      const dy = curGoal.fy * TILE - p.y;

      p.vx = Math.abs(dx) > 3 ? Math.sign(dx) * PHYS.RUN : 0;

      const lookX = Math.floor((p.x + (dx >= 0 ? p.w + 14 : -14)) / TILE);
      const chestY = Math.floor((p.y + p.h * 0.5) / TILE);
      const obstacleAhead = solid(tileAt(lookX, chestY)) || tileAt(lookX, chestY) === T.PIPE_TOP;

      if (p.onGround) p.coyote = PHYS.COYOTE;
      // Saltar si hay obstáculo delante, o si estamos cerca de la abertura y debemos subir
      if (obstacleAhead || (Math.abs(dx) < 70 && dy < 0)) {
        p.jumpBuf = PHYS.JUMP_BUF;
      }
      if (p.jumpBuf > 0 && p.coyote > 0) {
        p.vy = PHYS.JUMP;
        p.onGround = false;
        p.jumpBuf = 0;
        p.coyote = 0;
        jumps++;
      }

      const g = p.vy < 0 ? PHYS.HOLD_GRAV : PHYS.GRAVITY;
      p.vy += g;
      if (p.vy > PHYS.MAX_FALL) p.vy = PHYS.MAX_FALL;

      moveActor(p);
      if (p.coyote > 0) p.coyote--;
      if (p.jumpBuf > 0) p.jumpBuf--;

      if (p.y <= (curGoal.fy + 1) * TILE && Math.abs(dx) < 48) {
        floorIdx++;
      }

      if (p.y <= (lvl.doorY / TILE + 5) * TILE && Math.abs(p.x - lvl.doorX) < 40) {
        ok("Bot reached summit door in " + frame + " frames, jumps=" + jumps);
        break;
      }
      if (frame === 14999) {
        fail("Bot did not reach summit, y=" + (p.y / TILE).toFixed(1) + " floorIdx=" + floorIdx);
      }
    }
    return;
  }

  for (let frame = 0; frame < 9000; frame++) {
    p.inLava = false;
    p.fell = false;
    const look = Math.floor((p.x + p.w + 18) / TILE);
    const feet = Math.floor((p.y + p.h + 2) / TILE);
    const chest = Math.floor((p.y + p.h * 0.45) / TILE);
    const ahead = tileAt(look, feet);
    const wall = solid(tileAt(look, chest)) || solid(tileAt(look, Math.floor(p.y / TILE)));
    const gap = ahead === T.LAVA || ahead === T.EMPTY;
    if (p.onGround) p.coyote = PHYS.COYOTE;
    if (gap || wall) p.jumpBuf = PHYS.JUMP_BUF;
    let jumped = false;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = PHYS.JUMP;
      p.onGround = false;
      p.jumpBuf = 0;
      p.coyote = 0;
      jumped = true;
      jumps++;
    }
    if (!jumped) {
      const g = p.vy < 0 ? PHYS.HOLD_GRAV : PHYS.GRAVITY;
      p.vy += g;
    }
    if (p.vy > PHYS.MAX_FALL) p.vy = PHYS.MAX_FALL;
    p.vx = PHYS.RUN;
    moveActor(p);
    if (p.coyote > 0) p.coyote--;
    if (p.jumpBuf > 0) p.jumpBuf--;
    if (p.inLava) {
      lavaHits++;
      p.vy = -9.5;
    }
    if (p.fell) {
      fail("Bot fell off world at x=" + p.x.toFixed(0));
      break;
    }
    if (Math.abs(p.x - lastX) < 0.2) stuck++;
    else stuck = 0;
    lastX = p.x;
    if (stuck > 90) {
      fail("Bot stuck at x=" + p.x.toFixed(0) + " y=" + p.y.toFixed(0) + " frame " + frame);
      break;
    }
    if (p.x + p.w >= doorX) {
      ok("Bot reached door in " + frame + " frames, jumps=" + jumps + " lavaHits=" + lavaHits);
      break;
    }
    if (frame === 8999) fail("Bot never reached door, x=" + p.x.toFixed(0) + " door=" + doorX);
  }
}

for (let levelNum = 1; levelNum <= L.CAMPAIGN_LEVELS.length; levelNum++) testLevel(levelNum);

console.log("\n=== CAMPAIGN INTEGRITY ===");
const bossTypes = L.CAMPAIGN_LEVELS.map((level) => level.bossType);
if (new Set(bossTypes).size !== L.CAMPAIGN_LEVELS.length) fail("Campaign boss types are not unique");
else ok("20 unique bosses are assigned");

const gameSource = fs.readFileSync("./game.js", "utf8");
for (const bossType of bossTypes) {
  if (!new RegExp("\\b" + bossType + "\\s*:").test(gameSource)) fail("Boss type missing from game.js: " + bossType);
}
if (gameSource.includes("if (!bossDefeated || activeBoss)")) ok("Door remains locked until the boss is defeated");
else fail("Door gate does not enforce boss defeat");
for (const behavior of ["runner", "flyer", "turret", "sniper", "mine", "shield", "spore", "strafer", "tractor", "mimic", "teleporter", "charger", "boss"]) {
  if (gameSource.includes('behavior: "' + behavior + '"')) ok("Enemy behavior registered: " + behavior);
  else fail("Enemy behavior missing: " + behavior);
}

if (!process.exitCode) console.log("\nALL LEVEL PLAYABILITY CHECKS PASSED!");
else console.log("\nSOME CHECKS FAILED!");
