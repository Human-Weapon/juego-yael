"use strict";

const fs = require("fs");
const vm = require("vm");
const L = require("./level.js");

const gradient = { addColorStop() {} };
const ctx = new Proxy({}, {
  get(target, key) {
    if (key === "createLinearGradient") return () => gradient;
    if (key === "measureText") return () => ({ width: 0 });
    if (!(key in target)) target[key] = () => {};
    return target[key];
  },
  set(target, key, value) { target[key] = value; return true; },
});
const canvas = { style: {}, width: 960, height: 540, getContext: () => ctx, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) };
const storage = new Map([["yael_campaign_unlocked", "20"]]);
const windowMock = {
  YAEL_LEVEL: L, YAEL_SPRITES: { get: () => ({ guns: {} }) }, innerWidth: 1280, innerHeight: 720,
  addEventListener() {},
  localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)) },
};
const source = fs.readFileSync("./game.js", "utf8");
const marker = "  requestAnimationFrame(loop);\n})();";
if (!source.includes(marker)) throw new Error("No se encontró el punto de instrumentación de game.js");
const instrumented = source.replace(marker, `  requestAnimationFrame(loop);
  globalThis.__YAEL_ARSENAL_TEST__ = {
    WEAPONS, SPECIALS,
    reset() {
      highestUnlockedLevel = CAMPAIGN.length;
      unlockedWeapons = [0]; unlockedSpecials = [0]; equippedWeapons = [0]; equippedSpecials = [0]; claimedBossRewards = [];
      startGame(1); enemies = []; bullets = []; gadgets = []; particles = []; pickups = []; floating = [];
      player.inv = 999999; mouse.x = 800; mouse.y = 250; mouse.left = mouse.right = mouse.leftClick = mouse.rightClick = false;
    },
    player() { return player; },
    bullets() { return bullets; },
    gadgets() { return gadgets; },
    equipAll() { unlockedWeapons = WEAPONS.map((_, i) => i); unlockedSpecials = SPECIALS.map((_, i) => i); equippedWeapons = [0,1]; equippedSpecials = [0,1]; },
    setWeapon(i) { player.weapon = i; player.cool = 0; player.reloading = false; },
    setSpecial(i) { player.special = i; player.specialCool = 0; },
    fire() { fireWeapon(); },
    special() { useSpecial(); },
    tickPlayer(n) { for (let i=0;i<n;i++) updatePlayer(); },
    clearProjectiles() { bullets=[]; gadgets=[]; },
    reward(level) { return awardBossUnlock(level); },
    arsenal() { return { unlockedWeapons:[...unlockedWeapons], unlockedSpecials:[...unlockedSpecials], claimed:[...claimedBossRewards] }; },
    toggle(column,index) { toggleLoadoutItem(column,index); },
    equipped() { return { weapons:[...equippedWeapons], specials:[...equippedSpecials] }; },
  };
})();`);

class AudioMock { play(){ return Promise.resolve(); } pause(){} }
const sandbox = { window: windowMock, document: { getElementById: () => canvas }, location: { search: "" }, URLSearchParams, Audio: AudioMock, requestAnimationFrame(){}, setTimeout(){}, console, Math };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(instrumented, sandbox, { filename: "game.js" });
const a = sandbox.__YAEL_ARSENAL_TEST__;
let failures = 0;
const check = (condition, message) => condition ? console.log("OK  ", message) : (failures++, console.error("FAIL", message));

check(a.WEAPONS.length === 6, "hay exactamente seis armas principales");
check(a.SPECIALS.length === 5, "hay exactamente cinco especiales");
check(a.WEAPONS.map((w) => w.magazine).slice(0,5).join(",") === "12,24,30,6,1", "los cinco cargadores coinciden con la especificación");
check(a.WEAPONS[5].heatPerShot > 0 && !Number.isFinite(a.WEAPONS[5].magazine), "la minigun usa calor en vez de cargador");
check(a.WEAPONS[0].reload < a.WEAPONS[1].reload && a.WEAPONS[1].reload < a.WEAPONS[2].reload && a.WEAPONS[2].reload < a.WEAPONS[3].reload && a.WEAPONS[3].reload < a.WEAPONS[4].reload, "los tiempos de recarga escalan de Desert a Cañón");
check(a.WEAPONS[1].falloff && a.WEAPONS[1].falloff.min < 0.5, "el subfusil pierde daño con la distancia");

a.reset();
for (let weapon = 0; weapon < 5; weapon++) {
  a.setWeapon(weapon);
  const before = a.player().ammo[weapon];
  a.fire();
  check(a.player().ammo[weapon] === before - 1, `${a.WEAPONS[weapon].name} consume una bala del cargador`);
}
a.setWeapon(0); a.player().ammo[0] = 1; a.fire();
check(a.player().reloading, "el cargador vacío inicia recarga automática");
a.tickPlayer(a.WEAPONS[0].reload + 1);
check(a.player().ammo[0] === 12 && !a.player().reloading, "la Desert termina su recarga con 12 tiros");

a.setWeapon(5);
for (let i=0;i<40;i++) { a.player().cool=0; a.fire(); }
check(a.player().overheated && a.player().heat >= 99, "la minigun se sobrecalienta con fuego sostenido");

a.clearProjectiles();
for (let i=0;i<a.SPECIALS.length;i++) { a.setSpecial(i); a.special(); }
const gadgetTypes = new Set(a.gadgets().map((g) => g.type));
check(gadgetTypes.has("grenade") && a.gadgets().find((g)=>g.type==="grenade").bounce > 0, "la granada posee rebote y gravedad");
check(gadgetTypes.has("sticky") && a.gadgets().find((g)=>g.type==="sticky").sticky, "la granada pegajosa puede adherirse");
check(gadgetTypes.has("hook") && a.gadgets().find((g)=>g.type==="hook").hook, "el gancho crea una cuerda física");
check(a.player().parryTimer > 0, "la espada abre una ventana de parry");
check(gadgetTypes.has("inertia_gel") && a.gadgets().find((g)=>g.type==="inertia_gel").gel, "el Gel de inercia genera su efecto propio");

a.reset();
check(a.arsenal().unlockedWeapons.join(",") === "0" && a.arsenal().unlockedSpecials.join(",") === "0", "el primer nivel empieza sólo con Desert y granada");
const firstReward = a.reward(1);
const countsAfterFirst = a.arsenal().unlockedWeapons.length + a.arsenal().unlockedSpecials.length;
const repeatedReward = a.reward(1);
check(firstReward && countsAfterFirst === 3, "el primer boss entrega exactamente un desbloqueo");
check(repeatedReward === null && a.arsenal().unlockedWeapons.length + a.arsenal().unlockedSpecials.length === countsAfterFirst, "repetir un nivel no entrega otra recompensa");
for (let level=2;level<=12;level++) a.reward(level);
check(a.arsenal().unlockedWeapons.length === 6 && a.arsenal().unlockedSpecials.length === 5, "los bosses terminan desbloqueando todo el arsenal sin duplicados");

a.equipAll();
a.toggle(0,2); a.toggle(0,3); a.toggle(0,4);
a.toggle(1,2); a.toggle(1,3); a.toggle(1,4);
check(a.equipped().weapons.length === 2 && a.equipped().specials.length === 2, "el equipamiento nunca supera dos armas y dos especiales");

if (failures) { console.error(`\nARSENAL CHECK FAILED: ${failures} problema(s)`); process.exitCode = 1; }
else console.log("\nARSENAL CHECK PASSED");
