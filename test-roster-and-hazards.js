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
    roster(index) { highestUnlockedLevel=CAMPAIGN.length; selectedCharacter=index; startGame(1); return { id:player.character, hp:player.maxHp, run:player.move.run, jump:player.move.jump, gravity:player.move.gravity, climb:player.move.climb, airJumps:player.move.airJumps || 0 }; },
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
    heavyClimb() { worldW=4; worldH=4; tiles=Array.from({length:4},()=>Array(4).fill(T.EMPTY)); tiles[1][1]=T.BRICK; const p={x:48,y:48,w:22,h:36,vx:0,vy:0}; const climbed=tryHeavyClimb(p,1,3.1); return {climbed,x:p.x,y:p.y}; },
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
check(classic.hp === 5 && classic.jump < -10 && classic.jump > -14, "Clásico: 5 corazones y salto moderado", JSON.stringify(classic));
check(agile.hp === 2 && agile.run > classic.run && Math.abs(agile.jump) > Math.abs(classic.jump) && agile.gravity > classic.gravity, "Ágil: frágil, veloz, salto y caída rápidos", JSON.stringify(agile));
check(agile.airJumps === 1 && classic.airJumps === 0 && heavy.airJumps === 0, "Ágil: doble salto exclusivo", JSON.stringify({ agile, classic, heavy }));
const agileJump = api.doubleJump();
check(agileJump.first.vy < -10 && agileJump.first.left === 0 && agileJump.second.left === 0 && agileJump.second.vy > -15, "Ágil: el segundo impulso aéreo se consume una sola vez", JSON.stringify(agileJump));
const spaceJump = api.spaceJump();
check(spaceJump.vy < -10 && !spaceJump.onGround, "la barra espaciadora activa el salto", JSON.stringify(spaceJump));
check(heavy.hp === 8 && heavy.run < classic.run && heavy.jump === 0 && heavy.climb, "Pesado: 8 corazones, lento y sin salto", JSON.stringify(heavy));
const climb = api.heavyClimb();
check(climb.climbed && climb.y < 48, "Pesado escala un obstáculo sólido real", JSON.stringify(climb));
const specs = api.specs();
check(specs.shotgun >= 30, "La escopeta recompensa el combate a quemarropa", JSON.stringify(specs));
check(specs.gel >= 46, "El Gel de inercia tiene un área de resbalón ampliada", JSON.stringify(specs));
const alien = L.buildLevel(17);
const nonAlien = L.buildLevel(16);
check(alien.lavaChase === true && !nonAlien.lavaChase, "El nivel alienígena activa la persecución de lava", JSON.stringify({ alien: alien.lavaChase, nonAlien: nonAlien.lavaChase }));
for (const file of ["heroes-atlas-v1.png", "seaking-frames-v1.png", "scenery-atlas-v1.png", "inertia-gel-frames-v1.png"]) {
  check(fs.existsSync("assets/sprites/" + file), "Asset de imagen presente: " + file);
}

if (failures) { console.error(`\nROSTER AND HAZARDS CHECK FAILED: ${failures} problema(s)`); process.exitCode = 1; }
else console.log("\nROSTER AND HAZARDS CHECK PASSED");
