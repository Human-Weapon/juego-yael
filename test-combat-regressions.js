"use strict";

const fs = require("fs");
const vm = require("vm");
const L = require("./level.js");

const gradient = { addColorStop() {} };
const ctx = new Proxy({}, { get(t,k){ if(k==="createLinearGradient") return()=>gradient; if(k==="measureText") return()=>({width:0}); if(!(k in t)) t[k]=()=>{}; return t[k]; }, set(t,k,v){t[k]=v;return true;} });
const canvas = { style:{}, width:960, height:540, getContext:()=>ctx, addEventListener(){}, getBoundingClientRect:()=>({left:0,top:0,width:960,height:540}) };
const storage = new Map([["yael_campaign_unlocked","20"]]);
const windowMock = { YAEL_LEVEL:L, YAEL_SPRITES:{get:()=>({guns:{}})}, innerWidth:1280, innerHeight:720, addEventListener(){}, localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))} };
const source = fs.readFileSync("./game.js","utf8");
const marker = "  requestAnimationFrame(loop);\n})();";
if(!source.includes(marker)) throw new Error("No se encontró el punto de instrumentación");
const instrumented = source.replace(marker, `  requestAnimationFrame(loop);
  globalThis.__YAEL_REGRESSION_TEST__ = {
    collisionProbe(id) {
      worldW=4; worldH=4; tiles=Array.from({length:4},()=>Array(4).fill(T.EMPTY)); tiles[1][1]=id;
      const actor={x:20,y:48,w:22,h:36,vx:10,vy:0,onGround:false}; moveActor(actor); return actor;
    },
    grenadeAgainstLevel2Boss() {
      highestUnlockedLevel=CAMPAIGN.length; startGame(2); enemies=[]; gadgets=[]; bullets=[]; particles=[]; pickups=[]; floating=[];
      tiles=Array.from({length:worldH},()=>Array(worldW).fill(T.EMPTY));
      spawnEnemy("sewer_kraken",300,300); const boss=enemies[0]; boss.state="hunt"; boss.t=50;
      const initial=boss.hp; const s=SPECIALS[0];
      gadgets.push({type:s.id,x:boss.x+boss.w/2,y:boss.y+boss.h/2,vx:0,vy:0,r:9,life:s.fuse,fuse:s.fuse,gravity:0,bounce:s.bounce,dmg:s.dmg,explode:s.explode,sticky:false,hook:false,gel:false,color:s.color,state:"flying",target:null});
      for(let i=0;i<s.fuse+2;i++) updateGadgets();
      return {initial,remaining:boss.hp,dead:boss.dead,damage:initial-boss.hp};
    },
    spawnStats(level,type) {
      highestUnlockedLevel=CAMPAIGN.length; startGame(level); enemies=[]; spawnEnemy(type,300,300); const en=enemies[0];
      return {hp:en.maxHp,aggression:en.aggression||1,base:ENEMY_TYPES[type].hp};
    },
    shieldProbe() {
      highestUnlockedLevel=CAMPAIGN.length; startGame(6); enemies=[]; bullets=[];
      player.x=300; player.y=groundY*TILE-PHYS.PLAYER_H; player.vx=0; player.vy=0;
      spawnEnemy("shield",470,groundY*TILE); const en=enemies[0];
      en.state="hunt"; en.t=60; en.cool=0; en.onGround=true; en.facing=-1;
      const ecx=en.x+en.w/2, ecy=en.y+en.h/2, pcx=player.x+player.w/2, pcy=player.y+player.h/2;
      genericEnemyUpdate(en,ENEMY_TYPES.shield,pcx-ecx,pcx,pcy,ecx,ecy);
      return {w:en.w,h:en.h,shots:bullets.length,decision:en.lastDecision};
    },
    cannonSweepProbe() {
      highestUnlockedLevel=CAMPAIGN.length; startGame(1); enemies=[]; bullets=[];
      tiles=Array.from({length:worldH},()=>Array(worldW).fill(T.EMPTY));
      spawnEnemy("shield",120,300); const target=enemies[0]; target.state="hunt"; target.t=60;
      const before=target.hp;
      bullets.push({x:86,y:target.y+target.h/2,vx:52,vy:0,r:9,dmg:95,life:12,owner:"player",plasma:false,pierce:0,explode:0,color:"#ffe066",hit:[]});
      updateBullets();
      return {before,after:target.hp,damage:before-target.hp};
    },
    weaponMuzzleProbe() {
      highestUnlockedLevel=CAMPAIGN.length; startGame(1); enemies=[]; bullets=[];
      mouse.x=VIEW_W-40; mouse.y=player.y-cam.y+14;
      const results=[];
      for (let i=0;i<WEAPONS.length;i++) {
        player.weapon=i; player.cool=0; player.reloading=false; player.overheated=false; player.heat=0;
        player.ammo[i]=Number.isFinite(WEAPONS[i].magazine) ? WEAPONS[i].magazine : Infinity;
        const anchor=gunPos(); fireWeapon();
        const bullet=bullets[bullets.length-1];
        results.push({id:WEAPONS[i].id,offset:bullet ? Math.hypot(bullet.x-anchor.x,bullet.y-anchor.y) : 0});
      }
      return results;
    }
  };
})();`);
class AudioMock { play(){return Promise.resolve();} pause(){} }
const sandbox={window:windowMock,document:{getElementById:()=>canvas},location:{search:""},URLSearchParams,Audio:AudioMock,requestAnimationFrame(){},setTimeout(){},console,Math}; sandbox.globalThis=sandbox;
vm.createContext(sandbox); vm.runInContext(instrumented,sandbox,{filename:"game.js"});
const api=sandbox.__YAEL_REGRESSION_TEST__;
let failures=0; const check=(c,m,d)=>c?console.log("OK  ",m):(failures++,console.error("FAIL",m,d||""));

const bridge=api.collisionProbe(L.T.BRIDGE);
check(bridge.x===30 && bridge.vx===10,"un puente visualmente delgado no crea pared lateral invisible",JSON.stringify(bridge));
const lava=api.collisionProbe(L.T.LAVA);
check(lava.x===30 && lava.vx===10,"la lava es un peligro atravesable y nunca una pared invisible",JSON.stringify(lava));

const grenade=api.grenadeAgainstLevel2Boss();
check(!grenade.dead && grenade.damage<=100,"una sola granada no mata al boss del nivel 2 ni aplica impactos por frame",JSON.stringify(grenade));

const boss=api.spawnStats(2,"sewer_kraken");
check(boss.hp>=800,"el boss del nivel 2 tiene una reserva de vida apropiada",JSON.stringify(boss));
const common=api.spawnStats(10,"firebat");
check(common.hp>=common.base*1.4 && common.aggression>=1.3,"los enemigos ganan vida y agresividad con la campaña",JSON.stringify(common));

const shield=api.shieldProbe();
check(shield.w<=32 && shield.h<=38,"el guardia de escudo usa una hitbox compacta",JSON.stringify(shield));
check(shield.shots>0,"el guardia de escudo responde con un ataque a distancia",JSON.stringify(shield));

const cannon=api.cannonSweepProbe();
check(cannon.damage===95,"el Titán registra impactos aunque cruce una hitbox en un fotograma",JSON.stringify(cannon));

const muzzle=api.weaponMuzzleProbe();
check(muzzle.length===6 && muzzle.every((shot)=>shot.offset>30),"cada arma nace en la boca visible de su sprite",JSON.stringify(muzzle));

if(failures){console.error(`\nCOMBAT REGRESSION CHECK FAILED: ${failures} problema(s)`);process.exitCode=1;}
else console.log("\nCOMBAT REGRESSION CHECK PASSED");
