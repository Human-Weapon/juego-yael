"use strict";

const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const L = require("./level.js");

const { T, WORLD_H, GROUND_Y } = L;

const FONT = {
  A: ["01110", "10001", "11111", "10001", "10001"],
  B: ["11110", "10001", "11110", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "11110", "10000", "11111"],
  F: ["11111", "10000", "11110", "10000", "10000"],
  G: ["01111", "10000", "10111", "10001", "01110"],
  H: ["10001", "10001", "11111", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "11100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001"],
  O: ["01110", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "11110", "10000", "10000"],
  Q: ["01110", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "11110", "10010", "10001"],
  S: ["01111", "10000", "01110", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10101", "11011", "10001"],
  X: ["10001", "01010", "00100", "01010", "10001"],
  Y: ["10001", "01010", "00100", "00100", "00100"],
  Z: ["11111", "00010", "00100", "01000", "11111"],
  " ": ["00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "11111", "00000", "00000"],
  ":": ["00000", "00100", "00000", "00100", "00000"],
  "1": ["00100", "01100", "00100", "00100", "01110"],
  "2": ["11110", "00001", "01110", "10000", "11111"],
};

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tag = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, data])), 0);
  return Buffer.concat([len, tag, data, crc]);
}

function writePng(file, width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ])
  );
}

function makeBuf(w, h, r, g, b) {
  const pix = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    pix[i * 4] = r;
    pix[i * 4 + 1] = g;
    pix[i * 4 + 2] = b;
    pix[i * 4 + 3] = 255;
  }
  return { w, h, pix };
}

function setPx(img, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const i = (y * img.w + x) * 4;
  img.pix[i] = r;
  img.pix[i + 1] = g;
  img.pix[i + 2] = b;
  img.pix[i + 3] = 255;
}

function fill(img, x, y, w, h, r, g, b) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) setPx(img, x + xx, y + yy, r, g, b);
}

function text(img, x, y, str, r, g, b, s) {
  s = s || 2;
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const g5 = FONT[ch] || FONT[" "];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (g5[row][col] === "1") fill(img, cx + col * s, y + row * s, s, s, r, g, b);
      }
    }
    cx += 6 * s;
  }
}

function tileColor(id, ty) {
  if (id === T.EMPTY) {
    if (ty < 6) return [70, 50, 110];
    if (ty < 11) return [110, 55, 70];
    return [140, 70, 55];
  }
  if (id === T.GRASS) return [70, 65, 50];
  if (id === T.DIRT) return [50, 40, 32];
  if (id === T.BRICK) return [90, 95, 80];
  if (id === T.LAVA) return [255, 90, 20];
  if (id === T.PLATFORM) return [80, 230, 255];
  if (id === T.PIPE || id === T.PIPE_TOP) return [200, 180, 90];
  if (id === T.CASTLE) return [90, 110, 140];
  if (id === T.DOOR) return [220, 40, 70];
  if (id === T.QBLOCK) return [80, 255, 255];
  if (id === T.BRIDGE) return [160, 150, 120];
  if (id === T.CRATE) return [196, 160, 70];
  return [200, 200, 200];
}

function drawWorld(lvl, img, ox, oy, s, x0, x1) {
  x0 = Math.max(0, x0);
  x1 = Math.min(lvl.worldW, x1);
  for (let ty = 0; ty < WORLD_H; ty++) {
    for (let tx = x0; tx < x1; tx++) {
      const id = lvl.tiles[ty][tx];
      const c = tileColor(id, ty);
      fill(img, ox + (tx - x0) * s, oy + ty * s, s, s, c[0], c[1], c[2]);
      if (id === T.GRASS) fill(img, ox + (tx - x0) * s, oy + ty * s, s, Math.max(2, s / 5), 180, 255, 220);
      if (id === T.LAVA) fill(img, ox + (tx - x0) * s, oy + ty * s, s, Math.max(2, s / 4), 255, 220, 60);
      if (id === T.BRICK) {
        fill(img, ox + (tx - x0) * s + 1, oy + ty * s + 1, s - 2, s - 2, 60, 40, 20);
        fill(img, ox + (tx - x0) * s + 2, oy + ty * s + 2, s - 4, s - 4, 240, 190, 60);
      }
    }
  }
}

function drawPlayer(img, px, py, s) {
  fill(img, px + s * 0.25, py - s * 1.4, s * 0.5, s * 1.4, 20, 30, 50);
  fill(img, px + s * 0.28, py - s * 1.35, s * 0.44, s * 0.35, 80, 255, 255);
  fill(img, px + s * 0.2, py - s * 0.9, s * 0.6, s * 0.55, 200, 40, 70);
}

const outDir = process.argv[2] || __dirname;

function renderLevelPreview(num, filename, title) {
  const lvl = L.buildLevel(num);
  const S = 8;
  const header = 36;
  const full = makeBuf(lvl.worldW * S, WORLD_H * S + header, 245, 236, 220);
  fill(full, 0, 0, full.w, header, 28, 22, 40);
  text(full, 8, 8, title, 255, 220, 80, 2);
  drawWorld(lvl, full, 0, header, S, 0, lvl.worldW);

  const zcols = [
    [80, 255, 255],
    [255, 180, 40],
    [200, 200, 255],
    [80, 255, 255],
    [255, 180, 40],
    [200, 200, 255],
    [255, 100, 40],
    [255, 180, 40],
    [255, 50, 70],
    [80, 255, 255],
  ];
  for (let i = 0; i < (lvl.zones || []).length; i++) {
    const z = lvl.zones[i];
    const c = zcols[i % zcols.length];
    fill(full, z.x0 * S, header - 6, (z.x1 - z.x0) * S - 1, 5, c[0], c[1], c[2]);
  }

  drawPlayer(full, 3 * S, header + GROUND_Y * S, S);
  if (lvl.spawns && lvl.spawns.comun) {
    fill(full, lvl.spawns.comun.tileX * S, header + (GROUND_Y - 2) * S, S, S * 2, 80, 255, 255);
    text(full, lvl.spawns.comun.tileX * S - 10, header + (GROUND_Y - 4) * S, "COMUN", 0, 80, 90, 1);
  }
  if (lvl.spawns && lvl.spawns.boss) {
    fill(full, lvl.spawns.boss.tileX * S, header + (GROUND_Y - 2) * S, S, S * 2, 255, 50, 70);
    text(full, lvl.spawns.boss.tileX * S - 6, header + (GROUND_Y - 4) * S, "BOSS", 120, 0, 20, 1);
  }
  if (lvl.spawns && lvl.spawns.radstars) {
    for (const rs of lvl.spawns.radstars) {
      fill(full, rs.tileX * S, header + rs.tileY * S, S, S, 57, 255, 20);
    }
  }

  writePng(path.join(outDir, filename), full.w, full.h, full.pix);
}

function renderVerticalLevelPreview(filename, title) {
  const lvl = L.buildLevel(3);
  const S = 6;
  const header = 36;
  const full = makeBuf(lvl.worldW * S + 120, lvl.worldH * S + header, 245, 236, 220);
  fill(full, 0, 0, full.w, header, 28, 22, 40);
  text(full, 8, 8, title, 92, 246, 255, 2);

  drawWorld(lvl, full, 0, header, S, 0, lvl.worldW);

  // Zona indicadora a la derecha
  for (let i = 0; i < (lvl.zones || []).length; i++) {
    const z = lvl.zones[i];
    const y0 = header + z.y0 * S;
    const h = (z.y1 - z.y0) * S;
    fill(full, lvl.worldW * S + 4, y0, 10, h - 1, 92, 246, 255);
    text(full, lvl.worldW * S + 18, y0 + 4, z.name, 40, 50, 70, 1);
  }

  // Boss Spawn en la azotea
  if (lvl.spawns && lvl.spawns.boss) {
    fill(full, lvl.spawns.boss.tileX * S - 12, header + lvl.spawns.boss.tileY * S - 8, 32, 16, 92, 246, 255);
    text(full, lvl.spawns.boss.tileX * S - 28, header + lvl.spawns.boss.tileY * S - 20, "BOSS: NAVE NODRIZA", 20, 60, 120, 1);
  }

  writePng(path.join(outDir, filename), full.w, full.h, full.pix);
}

renderLevelPreview(1, "preview-layout.png", "NIVEL 1: PROTOCOLO BELMONT");
renderLevelPreview(2, "preview-layout-l2.png", "NIVEL 2: REACTOR RADIACTIVO");
renderVerticalLevelPreview("preview-layout-l3.png", "NIVEL 3: TORRE DEL CATACLISMO");

console.log("Generated map previews successfully in", outDir);
