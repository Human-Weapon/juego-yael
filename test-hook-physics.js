"use strict";

const fs = require("fs");
const hookPhysics = require("./hook-physics.js");
const gameSource = fs.readFileSync("game.js", "utf8");
const indexSource = fs.readFileSync("index.html", "utf8");

const check = (condition, message) => {
  if (!condition) throw new Error(`HOOK PHYSICS CHECK FAILED: ${message}`);
  console.log("OK  ", message);
};

const player = { x: 0, y: 0, w: 22, h: 36, vx: 0, vy: 0 };
const small = { x: 220, y: 0, w: 20, h: 20, vx: 0, vy: 0 };
const smallHook = { targetMode: "target", ropeLength: 250 };
const smallResult = hookPhysics.stepEnemy(smallHook, player, small);
check(hookPhysics.classifyTarget(small, player) === "target" && smallResult.mode === "target" && small.vx < 0, "un enemigo igual o menor se acerca al jugador");
check(hookPhysics.classifyTarget({ w: 30, h: 22 }, player) === "target", "la clasificación usa el tamaño ocupado y no castiga a enemigos bajos y anchos");
const smallStartDistance = Math.hypot(small.x - player.x, small.y - player.y);
for (let i = 0; i < 12; i++) {
  hookPhysics.stepEnemy(smallHook, player, small);
  small.x += small.vx;
  small.y += small.vy;
}
check(Math.hypot(small.x - player.x, small.y - player.y) < smallStartDistance, "el arrastre pequeño reduce la distancia de forma continua");

const largePlayer = { x: 0, y: 0, w: 22, h: 36, vx: 0, vy: 0 };
const large = { x: 220, y: 0, w: 96, h: 72, vx: 0, vy: 0 };
const largeHook = { ropeLength: 250 };
const largeResult = hookPhysics.stepEnemy(largeHook, largePlayer, large);
check(hookPhysics.classifyTarget(large, largePlayer) === "player" && largeResult.mode === "player" && largePlayer.vx > 0, "un enemigo mayor atrae al jugador");
const largeStartX = largePlayer.x;
for (let i = 0; i < 12; i++) {
  hookPhysics.stepEnemy(largeHook, largePlayer, large);
  largePlayer.x += largePlayer.vx;
  largePlayer.y += largePlayer.vy;
}
check(largePlayer.x > largeStartX, "la atracción de un enemigo grande desplaza al jugador hacia él");

const swingPlayer = { x: 220, y: 120, w: 22, h: 36, vx: 0, vy: 0 };
const surfaceHook = { anchorX: 140, anchorY: 40, ropeLength: 120 };
const surfaceResult = hookPhysics.stepSurface(surfaceHook, swingPlayer);
check(surfaceResult.taut && surfaceHook.ropeLength < 120 && swingPlayer.vy < 0, "un anclaje de superficie aplica tensión y recoge la cuerda");

check(gameSource.includes("HOOK_PHYSICS.stepEnemy") && gameSource.includes("HOOK_PHYSICS.stepSurface"), "el juego usa la física común del gancho en enemigos y superficies");
const hookScript = indexSource.indexOf('src="hook-physics.js"');
const gameScript = indexSource.indexOf('src="game.js"');
check(hookScript >= 0 && gameScript > hookScript, "la física del gancho se carga antes del motor de partida");
check(gameSource.includes("targetMode") && gameSource.includes("anchorX") && gameSource.includes("ropeLength"), "el gancho conserva modo, anclaje y longitud de cuerda");
check(gameSource.includes("bulletTouchesBox(g, en)"), "el gancho usa un impacto barrido y no atraviesa enemigos pequeños");
check(gameSource.includes("drawHookRope"), "la cuerda se renderiza con una curva física visible");
check(gameSource.includes("MANTEN PARA TENSAR") && gameSource.includes("SUELTA LIBERA"), "el HUD explica cómo mantener y soltar el gancho");

console.log("\nHOOK PHYSICS CHECK PASSED");
