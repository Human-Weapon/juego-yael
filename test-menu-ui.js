"use strict";

const fs = require("fs");
const vm = require("vm");
const L = require("./level.js");

const gradient = { addColorStop() {} };
const calls = [];
const ctx = new Proxy({}, {
  get(target, key) {
    if (key === "createLinearGradient") return () => gradient;
    if (key === "measureText") return () => ({ width: 0 });
    if (!(key in target)) target[key] = (...args) => { calls.push({ key, args }); };
    return target[key];
  },
  set(target, key, value) { target[key] = value; return true; },
});

const listeners = Object.create(null);
const canvas = {
  style: {}, width: 960, height: 540,
  getContext: () => ctx,
  addEventListener: (name, fn) => { listeners[`canvas:${name}`] = fn; },
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
};
const storage = new Map([["yael_campaign_unlocked", "1"], ["yael_arsenal_v2", "{}"]]);
const windowMock = {
  YAEL_LEVEL: L,
  YAEL_SPRITES: { get: () => ({ guns: {} }) },
  innerWidth: 1280,
  innerHeight: 720,
  addEventListener: (name, fn) => { listeners[`window:${name}`] = fn; },
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
  },
};

const source = fs.readFileSync("./game.js", "utf8");
const marker = "  requestAnimationFrame(loop);\n})();";
if (!source.includes(marker)) throw new Error("No se encontró el punto de instrumentación de game.js");
const instrumented = source.replace(marker, `  requestAnimationFrame(loop);
  window.__YAEL_UI_TEST__ = {
    menu() { return { page: menuPage, selected: menuSelectedLevel, state }; },
    key(key) { listeners.windowKey(key); },
    mouseMove(x, y) { window.__YAEL_MOUSE_HANDLER__({ clientX: x, clientY: y }); },
    mouseDown(x, y) {
      window.__YAEL_MOUSE_HANDLER__({ clientX: x, clientY: y });
      window.__YAEL_MOUSE_DOWN_HANDLER__({ button: 0, preventDefault() {} });
    },
    characterSelect(level) { openCharacterSelect(level); },
    play() { startGame(1); player.x = 400; return { state, level: currentLevel, x: player.x }; },
    session() { return { state, level: currentLevel, x: player && player.x }; },
    tick() { update(); },
    draw() { draw(); },
  };
})();`)
  .replace("listeners.windowKey(key);", "window.__YAEL_KEY_HANDLER__({ key, preventDefault() {} });")
  .replace("listeners.canvasMouseMove(x, y);", "window.__YAEL_MOUSE_HANDLER__({ clientX: x, clientY: y });");

const originalWindowAddEventListener = windowMock.addEventListener;
windowMock.addEventListener = (name, fn) => {
  originalWindowAddEventListener(name, fn);
  if (name === "keydown") windowMock.__YAEL_KEY_HANDLER__ = fn;
};
const originalCanvasAddEventListener = canvas.addEventListener;
canvas.addEventListener = (name, fn) => {
  originalCanvasAddEventListener(name, fn);
  if (name === "mousemove") windowMock.__YAEL_MOUSE_HANDLER__ = fn;
  if (name === "mousedown") windowMock.__YAEL_MOUSE_DOWN_HANDLER__ = fn;
};

class AudioMock { play() { return Promise.resolve(); } pause() {} }
const sandbox = {
  window: windowMock,
  document: { getElementById: () => canvas },
  location: { search: "" },
  URLSearchParams,
  Audio: AudioMock,
  requestAnimationFrame() {},
  setTimeout() {},
  console,
  Math,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(instrumented, sandbox, { filename: "game.js" });
const ui = windowMock.__YAEL_UI_TEST__;
let failures = 0;
const check = (condition, message) => condition
  ? console.log("OK  ", message)
  : (failures++, console.error("FAIL", message));

check(ui.menu().page === 0 && ui.menu().selected === 1, "el menú comienza en la primera página y el nivel 1");
ui.key("d");
check(ui.menu().page === 1 && ui.menu().selected === 5, "D avanza una página completa y conserva la posición de tarjeta");
ui.key("a");
check(ui.menu().page === 0 && ui.menu().selected === 1, "A regresa a la página anterior");
ui.key("ArrowRight");
check(ui.menu().page === 0 && ui.menu().selected === 2, "la flecha derecha cambia la tarjeta dentro de la página");
ui.mouseMove(28 + 2 * 228 + 100, 112 + 90);
check(ui.menu().selected === 3, "mover el mouse sobre una tarjeta actualiza la selección");
ui.draw();
check(calls.some((call) => call.key === "translate"), "el puntero pixel-art se dibuja por encima del menú");

ui.characterSelect(1);
let characterUpdateError = null;
try {
  ui.tick();
} catch (err) {
  characterUpdateError = err;
}
check(!characterUpdateError, "la pantalla de personaje pausa la física mientras aún no hay jugador");
ui.mouseDown(480, 470);
check(ui.menu().state === "loadout", "el botón de confirmar personaje responde al clic");
ui.play();
ui.mouseDown(750, 96);
check(ui.session().state === "play" && ui.session().level === 1 && ui.session().x < 200, "el botón REINICIAR reinicia la partida actual");
ui.mouseDown(888, 96);
check(ui.menu().state === "menu", "el botón MENÚ vuelve a la selección de nivel");

if (failures) {
  console.error(`\nMENU UI CHECK FAILED: ${failures} problema(s)`);
  process.exitCode = 1;
} else {
  console.log("\nMENU UI CHECK PASSED");
}
