"use strict";

const fs = require("fs");
const loading = require("./character-loading.js");
const gameSource = fs.readFileSync("game.js", "utf8");
const spritesSource = fs.readFileSync("sprites.js", "utf8");

const check = (condition, message) => {
  if (!condition) throw new Error(`CHARACTER LOADING CHECK FAILED: ${message}`);
  console.log("OK  ", message);
};

const gate = loading.createGate(3);
check(!loading.advanceGate(gate, false), "la pantalla sigue cargando antes del límite");
check(!loading.advanceGate(gate, false), "un frame pendiente no abre prematuramente la selección");
check(loading.advanceGate(gate, false), "un atlas que no responde no bloquea la selección indefinidamente");

const readyGate = loading.createGate(30);
check(loading.advanceGate(readyGate, false) === false && loading.advanceGate(readyGate, true), "un onload abre la selección inmediatamente");
check(spritesSource.includes("sheet.onerror"), "los atlas tienen recuperación ante error de carga");
check(gameSource.includes("CHARACTER_LOADING_TIMEOUT") && gameSource.includes("drawCharacterCardFallback"), "la pantalla ofrece un respaldo visible y un límite de carga");

console.log("\nCHARACTER LOADING CHECK PASSED");
