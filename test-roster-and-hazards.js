"use strict";

const fs = require("fs");
const vm = require("vm");
const L = require("./level.js");

const gradient = { addColorStop() {} };
const ctx = new Proxy({}, { get(t, k) { if (k === "createLinearGradient") return () => gradient; if (k === "measureText") return () => ({ width: 0 }); if (!(k in t)) t[k] = () => {}; return t[k]; }, set(t, k, v) { t[k] = v; return true; } });
const canvas = { style: {}, width: 960, height: 540, getContext: () => ctx, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) };
const storage = new Map([["yael_campaign_unlocked", "20"]]);
const windowMock = {
  YAEL_LEVEL: L,
  YAEL_SPRITES: { get: () => ({ guns: {}, heroes: {}, scenery: {}, gel: {} }) },
  innerWidth: 1280,
  innerHeight: 720,
  addEventListener(name, fn) {
    if (name === "keydown") this.__YAEL_KEYDOWN__ = fn;
    if (name === "keyup") this.__YAEL_KEYUP__ = fn;
  },
  localStorage: { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, String(v)) },
};
const source = fs.readFileSync("./game.js", "utf8");
const marker = "  requestAnimationFrame(loop);\n})();";
if (!source.includes(marker)) throw new Error("No se encontró el punto de instrumentación");
const instrumented = source.replace(marker, `  requestAnimationFrame(loop);
  globalThis.__YAEL_ROSTER_TEST__ = {
    roster(index) { highestUnlockedLevel=CAMPAIGN.length; selectedCharacter=index; startGame(1); return { id:player.character, hp:player.maxHp, run:player.move.run, acc:player.move.acc, airAcc:player.move.airAcc, jump:player.move.jump, gravity:player.move.gravity, maxFall:player.move.maxFall, climb:player.move.climb, airJumps:player.move.airJumps || 0, reloadMultiplier:player.move.reloadMultiplier || 1, damageMultiplier:player.move.damageMultiplier || 1, ammoMultiplier:player.move.ammoMultiplier || 1 }; },
    doubleJump() {
      highestUnlockedLevel=CAMPAIGN.length; selectedCharacter=1; startGame(1);
      player.onGround=false; player.coyote=0; player.airJumpsLeft=1; player.jumpHeld=false; player.jumpBuf=0; keys.w=true;
      updatePlayer(); const first={vy:player.vy,left:player.airJumpsLeft};
      keys.w=false; updatePlayer(); const beforeSecond=player.vy;
      keys.w=true; updatePlayer(); const second={vy:player.vy,left:player.airJumpsLeft}; keys.w=false;
      return {first,beforeSecond,second};
    },
    spaceJump() {
      highestUnlockedLevel=CAMPAIGN.length; selectedCharacter=0; startGame(1);
      player.onGround=true; player.coyote=0; player.vy=0; player.jumpHeld=false; player.jumpBuf=0;
      window.__YAEL_KEYDOWN__({ key:" ", code:"Space", preventDefault(){} });
      updatePlayer();
      const result={vy:player.vy,onGround:player.onGround};
      window.__YAEL_KEYUP__({ key:" ", code:"Space" });
      return result;
    },
    reloadProbe(index) {
      highestUnlockedLevel=CAMPAIGN.length; selectedCharacter=index; startGame(1);
      player.weapon=0; player.ammo[0]=0; beginReload();
      return { duration:player.reloadTimer, capacity:magazineCapacity(WEAPONS[0], player.move), reloadDuration:player.reloadDuration };
    },
    damageProbe(index) {
      highestUnlockedLevel=CAMPAIGN.length; selectedCharacter=index; startGame(1);
      bullets=[]; player.weapon=0;
      return spawnBullet(player.x, player.y, 0, { dmg:WEAPONS[0].dmg }).dmg;
    },
    dashProbe(index) {
      highestUnlockedLevel=CAMPAIGN.length; selectedCharacter=index; startGame(1); enemies=[];
      if (typeof startDash !== "function") return { available:false };
      player.x=160; player.y=360; player.onGround=false; player.vx=0; player.vy=0;
      tiles=Array.from({length:worldH},()=>Array(worldW).fill(T.EMPTY));
      const before=player.x;
      window.__YAEL_KEYDOWN__({key:"d",code:"KeyD",repeat:false,preventDefault(){}});
      window.__YAEL_KEYUP__({key:"d",code:"KeyD"});
      window.__YAEL_KEYDOWN__({key:"d",code:"KeyD",repeat:false,preventDefault(){}});
      const started={timer:player.dashTimer,move:player.dashMoveTimer,inv:player.dashTimer>0};
      hurtPlayer(1);
      const hpAfterHit=player.hp;
      for(let i=0;i<Math.min(8,player.dashMoveTimer||0);i++) updatePlayer();
      return { available:true, started, distance:player.x-before, hpAfterHit, cooldown:player.dashCool };
    },
    heavyDashImpact() {
      highestUnlockedLevel=CAMPAIGN.length; selectedCharacter=2; startGame(1); enemies=[];
      if (typeof startDash !== "function") return { available:false };
      tiles=Array.from({length:worldH},()=>Array(worldW).fill(T.EMPTY));
      player.x=160; player.y=360; player.onGround=false; player.vx=0; player.vy=0;
      spawnEnemy("piranha",250,360); const target=enemies[0]; target.y=360; target.vx=0; target.state="hunt";
      const before=target.hp; startDash(1);
      for(let i=0;i<8;i++) updatePlayer();
      return { available:true, damage:before-target.hp, knockback:target.vx, distance:player.x-160, cooldown:player.dashCool };
    },
    heavyClimb() { worldW=4; worldH=4; tiles=Array.from({length:4},()=>Array(4).fill(T.EMPTY)); tiles[1][1]=T.BRICK; const p={x:48,y:48,w:22,h:36,vx:0,vy:0}; const climbed=tryHeavyClimb(p,1,3.1); return {climbed,x:p.x,y:p.y}; },
    heavyCrateWall() {
      highestUnlockedLevel=CAMPAIGN.length; selectedCharacter=2; startGame(1);
      worldW=12; worldH=12; groundY=9; tiles=Array.from({length:worldH},()=>Array(worldW).fill(T.EMPTY));
      for(let x=0;x<worldW;x++) tiles[9][x]=T.GRASS;
      tiles[8][5]=T.CRATE; tiles[7][5]=T.CRATE;
      player.x=5*TILE-player.w-1; player.y=9*TILE-player.h; player.vx=0; player.vy=0; player.onGround=true;
      keys.d=true;
      for(let i=0;i<64;i++) updatePlayer();
      keys.d=false;
      return {x:player.x,y:player.y,passed:player.x>6*TILE};
    },
    enemyLowStep() {
      worldW=12; worldH=12; tiles=Array.from({length:worldH},()=>Array(worldW).fill(T.EMPTY));
      for(let x=0;x<worldW;x++) tiles[9][x]=T.GRASS;
      tiles[8][5]=T.CRATE;
      const enemy={x:4*TILE,y:9*TILE-34,w:34,h:34,vx:0,vy:0,onGround:true,canStepUp:true};
      for(let i=0;i<72;i++) {
        enemy.vx=2.4;
        enemy.vy=Math.min(8,enemy.vy+0.42);
        if(typeof tryEnemyStepUp === "function") tryEnemyStepUp(enemy);
        moveActor(enemy);
      }
      return {x:enemy.x,y:enemy.y,passed:enemy.x>6*TILE};
    },
    enemyTallWall() {
      worldW=12; worldH=12; tiles=Array.from({length:worldH},()=>Array(worldW).fill(T.EMPTY));
      for(let x=0;x<worldW;x++) tiles[9][x]=T.GRASS;
      tiles[8][5]=T.CRATE; tiles[7][5]=T.CRATE;
      const enemy={x:4*TILE,y:9*TILE-34,w:34,h:34,vx:0,vy:0,onGround:true,canStepUp:true};
      for(let i=0;i<72;i++) { enemy.vx=2.4; enemy.vy=Math.min(8,enemy.vy+0.42); tryEnemyStepUp(enemy); moveActor(enemy); }
      return {x:enemy.x,blocked:enemy.x<5*TILE};
    },
    specs() { return { shotgun:WEAPONS.find(w=>w.id==="fire_shotgun").dmg, gel:SPECIALS.find(s=>s.id==="inertia_gel").puddleRadius }; }
  };
})();`);
class AudioMock { play() { return Promise.resolve(); } pause() {} }
const sandbox = { window: windowMock, document: { getElementById: () => canvas }, location: { search: "" }, URLSearchParams, Audio: AudioMock, requestAnimationFrame() {}, setTimeout() {}, console, Math };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(instrumented, sandbox, { filename: "game.js" });
const api = sandbox.__YAEL_ROSTER_TEST__;
let failures = 0;
const check = (condition, message, detail) => condition ? console.log("OK  ", message) : (failures++, console.error("FAIL", message, detail || ""));

const classic = api.roster(0);
const agile = api.roster(1);
const heavy = api.roster(2);
check(classic.hp === 7 && classic.jump < -10 && classic.jump > -14, "Clásico: 7 corazones y salto moderado", JSON.stringify(classic));
check(agile.hp === 2 && agile.run >= classic.run * 2 && agile.acc >= classic.acc * 1.8 && agile.airAcc >= classic.airAcc * 1.8 && Math.abs(agile.jump) > Math.abs(classic.jump) && agile.gravity >= classic.gravity * 1.8 && agile.maxFall >= classic.maxFall * 1.8, "Ágil: movilidad general duplicada para esquivar", JSON.stringify(agile));
check(agile.reloadMultiplier === 1 / 2.6, "Ágil: recarga 2.6× más rápida", JSON.stringify(agile));
check(agile.airJumps === 1 && classic.airJumps === 0 && heavy.airJumps === 0, "Ágil: doble salto exclusivo", JSON.stringify({ agile, classic, heavy }));
const agileJump = api.doubleJump();
check(agileJump.first.vy < -10 && agileJump.first.left === 0 && agileJump.second.left === 0 && agileJump.second.vy > -15, "Ágil: el segundo impulso aéreo se consume una sola vez", JSON.stringify(agileJump));
const spaceJump = api.spaceJump();
check(spaceJump.vy < -10 && !spaceJump.onGround, "la barra espaciadora activa el salto", JSON.stringify(spaceJump));
check(heavy.hp === 16 && heavy.run < classic.run && heavy.jump === 0 && heavy.climb && heavy.ammoMultiplier === 2, "Pesado: 16 corazones, munición doble y sin salto", JSON.stringify(heavy));
const classicReload = api.reloadProbe(0);
const agileReload = api.reloadProbe(1);
const heavyReload = api.reloadProbe(2);
check(agileReload.duration === Math.round(classicReload.duration / 2.6) && agileReload.reloadDuration === agileReload.duration, "Ágil recarga en 1/2.6 de los fotogramas", JSON.stringify({ classicReload, agileReload }));
const classicDamage = api.damageProbe(0);
const agileDamage = api.damageProbe(1);
check(agile.damageMultiplier === 0.75 && agileDamage === Math.round(classicDamage * 0.75), "Ágil inflige 25% menos daño con sus armas", JSON.stringify({ classicDamage, agileDamage, agile }));
check(heavyReload.capacity === 24, "Pesado carga el doble de munición por cargador", JSON.stringify(heavyReload));
const agileDash = api.dashProbe(1);
check(agileDash.available && agileDash.started.inv && agileDash.distance > 45 && agileDash.hpAfterHit === agile.hp && agileDash.cooldown > 0, "doble D activa dash aéreo invulnerable", JSON.stringify(agileDash));
const heavyDash = api.heavyDashImpact();
check(heavyDash.available && heavyDash.distance > agileDash.distance && heavyDash.damage > 0 && heavyDash.knockback > 0 && heavyDash.cooldown > agileDash.cooldown, "Pesado: dash largo daña y empuja", JSON.stringify(heavyDash));
const climb = api.heavyClimb();
check(climb.climbed && climb.y < 48, "Pesado escala un obstáculo sólido real", JSON.stringify(climb));
const crateWall = api.heavyCrateWall();
check(crateWall.passed, "Pesado supera un muro doble de cajas como el del mapa", JSON.stringify(crateWall));
const enemyStep = api.enemyLowStep();
check(enemyStep.passed, "enemigo terrestre supera una caja baja sin atravesar muros", JSON.stringify(enemyStep));
const enemyTallWall = api.enemyTallWall();
check(enemyTallWall.blocked, "enemigo terrestre no atraviesa un muro alto de cajas", JSON.stringify(enemyTallWall));
const specs = api.specs();
check(specs.shotgun >= 30, "La escopeta recompensa el combate a quemarropa", JSON.stringify(specs));
check(specs.gel >= 46, "El Gel de inercia tiene un área de resbalón ampliada", JSON.stringify(specs));
const alien = L.buildLevel(17);
const nonAlien = L.buildLevel(16);
check(alien.lavaChase === true && !nonAlien.lavaChase, "El nivel alienígena activa la persecución de lava", JSON.stringify({ alien: alien.lavaChase, nonAlien: nonAlien.lavaChase }));
for (const file of ["heroes-atlas-v1.png", "heroes-actions-v1.png", "seaking-frames-v1.png", "scenery-atlas-v1.png", "inertia-gel-frames-v1.png"]) {
  check(fs.existsSync("assets/sprites/" + file), "Asset de imagen presente: " + file);
}

if (failures) { console.error(`\nROSTER AND HAZARDS CHECK FAILED: ${failures} problema(s)`); process.exitCode = 1; }
else console.log("\nROSTER AND HAZARDS CHECK PASSED");
