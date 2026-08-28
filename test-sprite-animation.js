"use strict";

const fs = require("fs");

const spritePath = "assets/sprites/heroes-run-frames-v2.png";
const classicRunPath = "assets/sprites/heroes-classic-run-v4.png";
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
check(spritesSource.includes("classic_run_extra1") && spritesSource.includes("classic_run_extra2") && spritesSource.includes("classic_run_extra3"), "el Clásico tiene tres poses nuevas");
const classicRunExists = fs.existsSync(classicRunPath);
check(classicRunExists, "el Clásico usa una hoja de carrera aislada y reemplazable");
if (classicRunExists) {
  const classicRunPng = fs.readFileSync(classicRunPath);
  check(classicRunPng.readUInt32BE(0) === 0x89504e47, "la carrera aislada del Clásico es un PNG válido");
  check(classicRunPng.readUInt32BE(16) % 3 === 0, "la carrera aislada del Clásico tiene tres celdas simétricas");
}
check(spritesSource.includes("heroes-classic-run-v4.png"), "el Clásico no reutiliza la hoja compartida para sus poses extra");
check(spritesSource.includes("classicRunArt.classic_run_extra1") && spritesSource.includes("classicRunArt.classic_run_extra2"), "el ciclo del Clásico conecta sus poses nuevas");
check(spritesSource.includes("fitContent: true"), "la carrera aislada recorta su silueta antes de escalarla, sin encogerla dentro de la celda");
check(fs.existsSync(classicRunPath), "la revisión V4 de carrera del Clásico está presente");
check(spritesSource.includes("heroes-classic-run-v4.png") && spritesSource.includes("classic_run_extra3"), "la revisión V4 añade un tercer paso claramente distinto");
check(/runFrames:\s*\[classicRunArt\.classic_run_extra1,\s*classicRunArt\.classic_run_extra2,\s*classicRunArt\.classic_run_extra3\]/.test(spritesSource), "la carrera del Clásico recorre tres poses antes de repetir");
check(spritesSource.includes("agile_run_extra1") && spritesSource.includes("agile_run_extra2"), "el Ágil tiene dos poses nuevas");
check(spritesSource.includes("heavy_run_extra1") && spritesSource.includes("heavy_run_extra2"), "el Pesado tiene dos poses nuevas");
check(spritesSource.includes("transparentBackground: true"), "las poses nuevas eliminan el fondo claro al cargar");
check(actionPng.readUInt32BE(0) === 0x89504e47 && actionPng[25] === 6, "la hoja de acciones usa PNG con transparencia real");
check(actionPng.readUInt32BE(16) % 3 === 0 && actionPng.readUInt32BE(20) % 3 === 0, "la hoja de acciones conserva cuadrícula 3×3");
check(spritesSource.includes("heroes-actions-v1.png"), "el atlas de agacharse, dash y selección está conectado");
check((spritesSource.match(/crouch: heroActionArt/g) || []).length === 3, "los tres personajes tienen sprite propio de agacharse");
check((spritesSource.match(/dash: heroActionArt/g) || []).length === 3, "los tres personajes tienen sprite propio de dash");
check((spritesSource.match(/select: heroActionArt/g) || []).length === 3, "los tres personajes tienen pose frontal de selección");
check(/y:\s*b\.y\s*\+\s*\(player\.crouch\s*\?\s*6\s*:\s*8\)/.test(fs.readFileSync("game.js", "utf8")), "el arma se ancla a la altura del torso y no debajo de las manos");

console.log("\nSPRITE ANIMATION CHECK PASSED");
