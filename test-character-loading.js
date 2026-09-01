"use strict";

const fs = require("fs");
const gameSource = fs.readFileSync("game.js", "utf8");
const spritesSource = fs.readFileSync("sprites.js", "utf8");
const indexSource = fs.readFileSync("index.html", "utf8");

const check = (condition, message) => {
  if (!condition) throw new Error(`CHARACTER LOADING CHECK FAILED: ${message}`);
  console.log("OK  ", message);
};

const selectionStart = gameSource.indexOf("function drawCharacterSelect()");
const selectionEnd = gameSource.indexOf("function drawLoadout()", selectionStart);
const characterSelectSource = gameSource.slice(selectionStart, selectionEnd);

check(selectionStart >= 0 && selectionEnd > selectionStart, "la pantalla de selección existe");
check(!characterSelectSource.includes("drawCharacterCardFallback"), "la selección no reemplaza sprites originales por figuras de respaldo");
check(!gameSource.includes("CHARACTER_LOADING_TIMEOUT"), "la selección no abandona la carga de arte por un temporizador arbitrario");
check(indexSource.includes("img-src 'self' data: file:"), "los PNG del juego se permiten al abrir el proyecto localmente");
check(spritesSource.includes("sheet.onerror"), "los atlas registran un error de carga en vez de fallar en silencio");

console.log("\nCHARACTER LOADING CHECK PASSED");
