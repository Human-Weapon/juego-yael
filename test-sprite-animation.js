"use strict";

const fs = require("fs");

const spritePath = "assets/sprites/heroes-run-frames-v2.png";
const classicRunPath = "assets/sprites/heroes-classic-run-v4.png";
const actionPath = "assets/sprites/heroes-actions-v1.png";
const newHeroRunPath = "assets/sprites/heroes-new-frames-v1.png";
const newHeroActionPath = "assets/sprites/heroes-new-actions-v1.png";
const newEnemyPath = "assets/sprites/enemies-new-frames-v1.png";
const spritesSource = fs.readFileSync("sprites.js", "utf8");
const gameSource = fs.readFileSync("game.js", "utf8");
const png = fs.readFileSync(spritePath);
const actionPng = fs.readFileSync(actionPath);
const check = (condition, message) => {
  if (!condition) throw new Error(`SPRITE ANIMATION CHECK FAILED: ${message}`);
  console.log("OK  ", message);
};

check(png.readUInt32BE(0) === 0x89504e47, "la hoja de carrera es un PNG válido");
check(png.readUInt32BE(16) === 1024 && png.readUInt32BE(20) === 1536, "la hoja usa una cuadrícula vertical 2×3 estable");
check(spritesSource.includes(`heroes-run-frames-v2.png`), "el atlas nuevo está conectado al cargador de sprites");
check((spritesSource.match(/runFrames:\s*\[/g) || []).length === 6, "los seis personajes tienen un ciclo de carrera explícito");
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
check((spritesSource.match(/crouch: heroActionArt/g) || []).length === 3, "los tres personajes originales tienen sprite propio de agacharse");
check((spritesSource.match(/dash: heroActionArt/g) || []).length === 3, "los tres personajes originales tienen sprite propio de dash");
check((spritesSource.match(/select: heroActionArt/g) || []).length === 3, "los tres personajes originales tienen pose frontal de selección");
for (const id of ["medic", "technician", "phantom"]) {
  check(spritesSource.includes(`${id}: { idle: newHeroMovementArt.${id}_idle`), `${id} tiene atlas de movimiento propio`);
  check(spritesSource.includes(`jump: newHeroActionArt.${id}_jump`) && spritesSource.includes(`crouch: newHeroActionArt.${id}_crouch`) && spritesSource.includes(`dash: newHeroActionArt.${id}_dash`), `${id} tiene salto, agacharse y dash propios`);
  check(spritesSource.includes(`runFrames: [newHeroMovementArt.${id}_run1, newHeroMovementArt.${id}_run2]`), `${id} recorre sus dos pasos de carrera`);
}
check(fs.existsSync(newHeroRunPath) && fs.existsSync(newHeroActionPath), "las hojas de los tres personajes nuevos están presentes");
check(fs.existsSync(newEnemyPath), "la hoja de enemigos nuevos está presente");
if (fs.existsSync(newHeroRunPath)) {
  const newHeroPng = fs.readFileSync(newHeroRunPath);
  check(newHeroPng.readUInt32BE(16) % 3 === 0 && newHeroPng.readUInt32BE(20) % 3 === 0, "la hoja de movimiento nueva conserva cuadrícula 3×3");
}
if (fs.existsSync(newHeroActionPath)) {
  const newActionPng = fs.readFileSync(newHeroActionPath);
  check(newActionPng.readUInt32BE(16) % 3 === 0 && newActionPng.readUInt32BE(20) % 3 === 0, "la hoja de acciones nueva conserva cuadrícula 3×3");
}
if (fs.existsSync(newEnemyPath)) {
  const newEnemyPng = fs.readFileSync(newEnemyPath);
  check(newEnemyPng.readUInt32BE(16) % 3 === 0 && newEnemyPng.readUInt32BE(20) % 2 === 0, "la hoja de skimmer y bombardier conserva cuadrícula 3×2");
}
check(spritesSource.includes("campaignSprites.skimmer") && spritesSource.includes("campaignSprites.bombardier"), "los dos enemigos nuevos tienen idle, movimiento y ataque propios");
check(spritesSource.includes("newEnemyArt.skimmer_walk") && spritesSource.includes("newEnemyArt.bombardier_walk"), "los dos enemigos nuevos conectan sus poses de desplazamiento");
for (const [bossType, heroId] of [["agile_scout", "agile"], ["heavy_climber", "heavy"], ["field_medic", "medic"], ["field_technician", "technician"], ["cerberus", "phantom"]]) {
  check(spritesSource.includes(`${bossType}: heroes.${heroId}`), `jefe tutorial ${bossType} usa directamente el sprite de ${heroId}`);
}
check(gameSource.includes("drop_bomb") && gameSource.includes("lastDecision === \"intercept\""), "los enemigos aéreos activan su pose de ataque al moverse o soltar bombas");
check(gameSource.includes("function readySprite") && gameSource.includes("firstReadySprite(frame, locomotionFrame, set.walk, set.idle)"), "el render nunca dibuja un frame de atlas aún no cargado");
check(!/firstReadySprite\(hero && hero\.select, hero && hero\.idle, SPR\.player && SPR\.player\.idle\)/.test(gameSource), "la selección no reutiliza el placeholder común para todos los personajes");
const characterSelectSource = gameSource.slice(gameSource.indexOf("function drawCharacterSelect()"), gameSource.indexOf("function drawLoadout()"));
check(gameSource.includes("function characterSpritesReady") && gameSource.includes('characterSpritesReady() ? "character_select" : "character_loading"'), "el selector espera a que los seis atlas estén listos antes de dibujarse");
check(!characterSelectSource.includes("drawCharacterIcon("), "el selector nunca sustituye sprites por figuras geométricas");
check(!gameSource.includes("drawPlayableFallback(p.move"), "el jugador no vuelve a una figura geométrica mientras se cargan sus sprites");
check(gameSource.includes("wrapCanvasText(c.description") && gameSource.includes("CHARACTER_CARD_TEXT_WIDTH"), "las descripciones de personaje se ajustan dentro de su tarjeta");
check(gameSource.includes("fitCanvasFont(levelTitle, cardW - 12") && gameSource.includes("fitCanvasFont(characterTitle, 164"), "los títulos largos se ajustan dentro de sus tarjetas");
for (const type of ["piranha", "firebat", "turret", "shield", "mine", "drone", "sniper", "slime", "spore", "mutant", "teleporter", "xeno_scout", "tractor_unit", "mimic"]) {
  check(spritesSource.includes(`"${type}"`), `enemigo de campaña con entrada de atlas: ${type}`);
}
check(/y:\s*b\.y\s*\+\s*\(player\.crouch\s*\?\s*6\s*:\s*8\)/.test(fs.readFileSync("game.js", "utf8")), "el arma se ancla a la altura del torso y no debajo de las manos");

console.log("\nSPRITE ANIMATION CHECK PASSED");
