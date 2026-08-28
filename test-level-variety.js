"use strict";

const L = require("./level.js");
const { T } = L;

let failures = 0;
function fail(message) {
  failures++;
  console.error("FAIL", message);
}
function ok(message) {
  console.log("OK  ", message);
}

function zoneFingerprint(level, x0, x1) {
  const samples = 24;
  const values = [];
  for (let i = 0; i < samples; i++) {
    const x = Math.min(level.worldW - 1, Math.floor(x0 + ((x1 - x0) * i) / samples));
    let top = level.worldH;
    let platforms = 0;
    let hazards = 0;
    for (let y = 0; y < level.worldH; y++) {
      const tile = level.tiles[y][x];
      if (tile !== T.EMPTY && top === level.worldH) top = y;
      if (tile === T.PLATFORM || tile === T.BRIDGE) platforms++;
      if (tile === T.LAVA) hazards++;
    }
    values.push(`${Math.round((top / level.worldH) * 8)}${Math.min(2, platforms)}${Math.min(2, hazards)}`);
  }
  return values.join("-");
}

const designedLevels = L.CAMPAIGN_LEVELS.filter((cfg) => !cfg.existing);
const layoutFamilies = new Map();
const visualProfiles = new Set();
const arenaPatterns = new Set();

for (const cfg of designedLevels) {
  const level = L.buildLevel(cfg.num);
  const design = level.design;
  if (!design) {
    fail(`Nivel ${cfg.num} (${cfg.title}): no tiene plano de diseño propio`);
    continue;
  }

  const setPieces = Array.isArray(design.setPieces) ? design.setPieces : [];
  if (setPieces.length < 4) fail(`Nivel ${cfg.num}: solo declara ${setPieces.length} set pieces`);
  else ok(`Nivel ${cfg.num}: ${setPieces.length} set pieces diseñados`);

  if (!design.layoutFamily) fail(`Nivel ${cfg.num}: sin familia de recorrido`);
  else layoutFamilies.set(design.layoutFamily, (layoutFamilies.get(design.layoutFamily) || 0) + 1);
  if (!design.visualProfile) fail(`Nivel ${cfg.num}: sin identidad arquitectónica`);
  else visualProfiles.add(design.visualProfile);
  if (!design.arenaPattern) fail(`Nivel ${cfg.num}: sin arena propia para su boss`);
  else arenaPatterns.add(design.arenaPattern);
  if (!Array.isArray(design.encounterPlan) || design.encounterPlan.length < 3) fail(`Nivel ${cfg.num}: sin encuentros dirigidos suficientes`);

  if (!level.isVertical) {
    const fingerprints = new Set();
    const zoneCount = 5;
    for (let zone = 0; zone < zoneCount; zone++) {
      const x0 = Math.floor((level.worldW * zone) / zoneCount);
      const x1 = Math.floor((level.worldW * (zone + 1)) / zoneCount);
      fingerprints.add(zoneFingerprint(level, x0, x1));
    }
    if (fingerprints.size < 4) fail(`Nivel ${cfg.num}: sus sectores repiten demasiada geometría (${fingerprints.size}/5 distintos)`);
  }
}

for (const [family, count] of layoutFamilies) {
  if (count > 3) fail(`La familia de recorrido '${family}' se repite en ${count} niveles`);
}
if (visualProfiles.size < 12) fail(`Solo hay ${visualProfiles.size} identidades arquitectónicas para 17 niveles nuevos`);
if (arenaPatterns.size < 12) fail(`Solo hay ${arenaPatterns.size} diseños de arena para 17 bosses nuevos`);

if (failures) {
  console.error(`\nLEVEL VARIETY CHECK FAILED: ${failures} problema(s)`);
  process.exitCode = 1;
} else {
  console.log("\nLEVEL VARIETY CHECK PASSED");
}
