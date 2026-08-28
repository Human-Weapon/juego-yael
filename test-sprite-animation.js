"use strict";

const fs = require("fs");

const spritePath = "assets/sprites/heroes-run-frames-v2.png";
const actionPath = "assets/sprites/heroes-actions-v1.png";
const spritesSource = fs.readFileSync("sprites.js", "utf8");
const png = fs.readFileSync(spritePath);
const actionPng = fs.readFileSync(actionPath);
const check = (condition, message) => {
  if (!condition) throw new Error(`SPRITE ANIMATION CHECK FAILED: ${message}`);
  console.log("OK  ", message);
};

check(png.readUInt32BE(0) === 0x89504e47, "la hoja de carrera es un PNG válido");
check(png.readUInt32BE(16) === 1024 && png.readUInt32BE(20) === 1536, "la hoja usa una cuadrícula vertical 2×3 estable");
check(spritesSource.includes(`heroes-run-frames-v2.png`), "el atlas nuevo está conectado al cargador de sprites");
check((spritesSource.match(/runFrames:\s*\[/g) || []).length === 3, "los tres personajes tienen un ciclo de carrera explícito");
check(spritesSource.includes("classic_run_extra1") && spritesSource.includes("classic_run_extra2"), "el Clásico tiene dos poses nuevas");
check(spritesSource.includes("agile_run_extra1") && spritesSource.includes("agile_run_extra2"), "el Ágil tiene dos poses nuevas");
check(spritesSource.includes("heavy_run_extra1") && spritesSource.includes("heavy_run_extra2"), "el Pesado tiene dos poses nuevas");
check(spritesSource.includes("transparentBackground: true"), "las poses nuevas eliminan el fondo claro al cargar");
check(actionPng.readUInt32BE(0) === 0x89504e47 && actionPng[25] === 6, "la hoja de acciones usa PNG con transparencia real");
check(actionPng.readUInt32BE(16) % 3 === 0 && actionPng.readUInt32BE(20) % 3 === 0, "la hoja de acciones conserva cuadrícula 3×3");
check(spritesSource.includes("heroes-actions-v1.png"), "el atlas de agacharse, dash y selección está conectado");
check((spritesSource.match(/crouch: heroActionArt/g) || []).length === 3, "los tres personajes tienen sprite propio de agacharse");
check((spritesSource.match(/dash: heroActionArt/g) || []).length === 3, "los tres personajes tienen sprite propio de dash");
check((spritesSource.match(/select: heroActionArt/g) || []).length === 3, "los tres personajes tienen pose frontal de selección");

console.log("\nSPRITE ANIMATION CHECK PASSED");
