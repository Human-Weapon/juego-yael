"use strict";

const fs = require("fs");
const L = require("./level.js");

const source = fs.readFileSync("./game.js", "utf8");
const start = source.indexOf("  function drawTile(id, tx, ty) {");
const end = source.indexOf("\n  function drawCastleDecor()", start);
if (start < 0 || end < 0) throw new Error("No se encontró drawTile para auditar las colisiones");
const drawTileSource = source.slice(start, end);
const solidNames = Object.entries(L.T)
  .filter(([, id]) => L.solid(id))
  .map(([name]) => name);

let failures = 0;
for (const name of solidNames) {
  const drawn = new RegExp(`id === T\\.${name}\\b`).test(drawTileSource);
  if (drawn) console.log("OK  ", `${name} sólido tiene textura visible`);
  else {
    failures++;
    console.error("FAIL", `${name} bloquea al jugador sin una rama de textura en drawTile`);
  }
}

if (failures) {
  console.error(`\nTILE VISIBILITY CHECK FAILED: ${failures} textura(s) de colisión faltante(s)`);
  process.exitCode = 1;
} else console.log("\nTILE VISIBILITY CHECK PASSED");
