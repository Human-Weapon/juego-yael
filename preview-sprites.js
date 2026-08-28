"use strict";

const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const S = require("./sprites.js");

const P = S.P;

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

function hexToRgb(hex) {
  if (!hex) return null;
  const num = parseInt(hex.slice(1), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function setPx(img, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const i = (y * img.w + x) * 4;
  img.pix[i] = r;
  img.pix[i + 1] = g;
  img.pix[i + 2] = b;
  img.pix[i + 3] = a !== undefined ? a : 255;
}

function fill(img, x, y, w, h, r, g, b, a) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) setPx(img, x + xx, y + yy, r, g, b, a);
}

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
  "3": ["11110", "00001", "01110", "00001", "11110"],
  "4": ["10001", "10001", "11111", "00001", "00001"],
  "5": ["11111", "10000", "11110", "00001", "11110"],
  "6": ["01111", "10000", "11110", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "00100"],
  "8": ["01110", "10001", "01110", "10001", "01110"],
  "9": ["01110", "10001", "01111", "00001", "01110"],
  "0": ["01110", "10011", "10101", "11001", "01110"],
  ".": ["00000", "00000", "00000", "00000", "00100"],
  "!": ["00100", "00100", "00100", "00000", "00100"],
  "(": ["00110", "01000", "01000", "01000", "00110"],
  ")": ["01100", "00010", "00010", "00010", "01100"],
};

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

function drawAscii(img, mapStr, ox, oy, scale) {
  const rows = mapStr.trim().split("\n").map((r) => r.trimEnd());
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const col = P[ch];
      if (!col) continue;
      const rgb = hexToRgb(col);
      fill(img, ox + x * scale, oy + y * scale, scale, scale, rgb[0], rgb[1], rgb[2]);
    }
  }
}

const RAW_RADSTAR = {
  idle: `
.......kk11kk.......
......k115511k......
.....k155ww551k.....
....k15wwwwww51k....
...k125wwwwww521k...
..k1231k1551k1321k..
.k123..k1221k..321k.
k11...k125521k...11k
12...k125ww521k...21
15...k15wwww51k...51
12...k125ww521k...21
k11...k125521k...11k
.k123..k1221k..321k.
..k1231k1551k1321k..
...k125wwwwww521k...
....k15wwwwww51k....
.....k155ww551k.....
......k115511k......
.......kk11kk.......
`,
  walk: `
........k11k........
......kk1551kk......
....kk125ww521kk....
...k1235wwww5321k...
..k1231k1551k1321k..
..k13..k1221k..31k..
.k11..k125521k..11k.
k15..k125ww521k..51k
155..k15wwww51k..551
155..k15wwww51k..551
k15..k125ww521k..51k
.k11..k125521k..11k.
..k13..k1221k..31k..
..k1231k1551k1321k..
...k1235wwww5321k...
....kk125ww521kk....
......kk1551kk......
........k11k........
`,
  shoot: `
.......kk55kk.......
.....kk15ww51kk.....
....k125wwww521k....
...k125wwwwww521k...
..k15wwwwwwwwww51k..
.k15wwk115511kww51k.
k15w..k125521k..w51k
15w..k155ww551k..w51
5ww..k5wwwwww5k..ww5
5ww..k5wwwwww5k..ww5
15w..k155ww551k..w51
k15w..k125521k..w51k
.k15wwk115511kww51k.
..k15wwwwwwwwww51k..
...k125wwwwww521k...
....k125wwww521k....
.....kk15ww51kk.....
.......kk55kk.......
`,
};

const RAW_RADBOSS = {
  idle: `
.............kkk666kkk............
............k666888666k...........
...........k668889988866k.........
..........k688999ww999886k........
.........k68999wwwwww99986k.......
...kkk...k689wwwwwwwwww986k...kkk.
..k666k.k6899wwwwwwwwww9986k.k666k
.k68886k689999wwwwwwww999986k68886k
k68999866890009999990009866899986k
k6899998890000kkkkkk0000988999986k
.k6899999900k........k0099999986k.
..k688999900k........k009999886k..
...k66889990kk......kk09998866k...
...k0668899999kkkkkk9999988660k...
..k0066778899999999999988776600k..
.k0066777889999wwww9999887776600k.
.k0066777889999wwww9999887776600k.
.k006677....k88899888k....776600k.
k006677k....k88899888k....k776600k
k00666k.....k88899888k.....k66600k
k0666k......k88899888k......k6660k
kk66k.......k88899888k.......k66kk
.kkk........k88899888k........kkk.
............kk88899888kk..........
...........kk8888998888kk.........
..........kkk8888888888kkk........
`,
  charge: `
.............kkk999kkk............
............k999www999k...........
...........k99www99www99k.........
..........k99wwwwwwwwww99k........
.........k99wwwwwwwwwwww99k.......
..kkkk...k99wwwwwwwwwwww99k...kkkk
.k9999k.k9999wwwwwwwwww9999k.k9999k
k99www9k999900wwwwwwww009999k9www99k
k9wwwww9999000kkkkkk00099999wwwww9k
.k9wwwww99900k........k00999wwwww9k
..k9wwww99900k........k00999wwww9k.
...k99999990kk......kk099999999k..
...k0999999999kkkkkk99999999990k..
..k00778899wwwwwwwwwwww99887700k..
.k007788999wwwwwwwwwwww999887700k.
.k007788999wwwwwwwwwwww999887700k.
.k007788....k999wwww999k....887700k
k007788k....k999wwww999k....k887700k
k00777k.....k999wwww999k.....k77700k
k0777k......k999wwww999k......k7770k
kk77k.......k999wwww999k.......k77kk
.kkk........k999wwww999k........kkk.
............kk999wwww999kk........
...........kk9999wwww9999kk.......
..........kkk9999999999kkk........
.........kkkk9999999999kkkk.......
`,
  attack: `
................kkk666kkk.........
...............k666888666k........
...kkkk.......k668889988866k......
..k6666k.....k688999ww999886k.....
.k688886k...k68999wwwwww99986k.kkk
k68999986kkk689wwwwwwwwww986k6666k
k689wwww9886899wwwwwwwwww99868886k
.k689wwww999900099999900098668986k
..k689wwww990000kkkkkk00009889986k
...k689wwww9900k........k00999986k
....k6889999900k........k0099886k.
.....k06688990kk......kk09988660k.
....k00668899999kkkkkk99999886600k
...k0066778899999999999988776600k.
..k0066777889999wwww9999887776600k
..k0066777889999wwww9999887776600k
.k006677....k88899888k....776600k.
.k00667k....k88899888k....k76600k.
.k0666k.....k88899888k.....k6660k.
kk666k......k88899888k......k666kk
k666k.......k88899888k.......k666k
kkkk........k88899888k........kkkk
............kk88899888kk..........
...........kk8888998888kk.........
..........kkk8888888888kkk........
.........kkkk8888888888kkkk.......
`,
  overheat: `
.............kkk000kkk............
............k000fff000k...........
...........k00fff99fff00k.........
..........k0ff999ww999ff0k........
.........k0f999wwwwww999f0k.......
...kkk...k0f9wwwwwwwwww9f0k...kkk.
..k000k.k0f99wwwwwwwwww99f0k.k000k
.k0fff0k0f9999wwwwwwww9999f0k0fff0k
k0f999f00f9000cccccccc0009f00f999f0k
k0f9999ff90000kccccckk00009ff9999f0k
.k0f99999900k..cccccc..k00999999f0k
..k0ff999900k..cccccc..k009999ff0k.
...k00ff9990kk.cccccc.kk0999ff00k..
...k000ff999999cccccc99999ff000k..
..k0000ffff9999cccccc9999ffff0000k
.k0000fffff9999cccccc9999fffff0000k
.k0000fffff9999cccccc9999fffff0000k
.k0000ff....kccccccccc...ff0000k..
k0000ffk....kccccccccc....kff0000k
k0000fk.....kccccccccc.....kf0000k
k000fk......kccccccccc......kf000k
kk00k.......kccccccccc.......k00kk
.kkk........kccccccccc........kkk.
............kkcccccccckk..........
...........kkcccccccccckk.........
..........kkkcccccccccckkk........
`,
};

const W = 1040;
const H = 600;
const img = makeBuf(W, H, 11, 16, 32);

// Header
fill(img, 0, 0, W, 48, 20, 14, 34);
fill(img, 0, 46, W, 2, 92, 246, 255);
text(img, 24, 16, "NUEVOS SPRITES: NIVEL 2 - PROTOCOLO BELMONT", 92, 246, 255, 3);

// Section 1: Estrella Radiactiva Voladora
fill(img, 24, 60, W - 48, 175, 18, 26, 42);
fill(img, 24, 60, W - 48, 2, 57, 255, 20);
text(img, 40, 72, "1. ESTRELLA RADIACTIVA VOLADORA (COMUN)", 57, 255, 20, 2);
text(img, 40, 92, "Vuela y dispara proyectiles de fuego verde radiactivo", 180, 200, 220, 1);

const scaleStar = 4;
drawAscii(img, RAW_RADSTAR.idle, 80, 115, scaleStar);
text(img, 85, 208, "IDLE", 92, 246, 255, 2);

drawAscii(img, RAW_RADSTAR.walk, 300, 115, scaleStar);
text(img, 300, 208, "PULSE", 92, 246, 255, 2);

drawAscii(img, RAW_RADSTAR.shoot, 520, 115, scaleStar);
text(img, 515, 208, "DISPARO", 57, 255, 20, 2);

// Proyectil verde demo
fill(img, 780, 135, 26, 26, 57, 255, 20);
fill(img, 785, 140, 16, 16, 204, 255, 51);
fill(img, 790, 145, 6, 6, 255, 255, 255);
text(img, 740, 175, "FUEGO VERDE", 204, 255, 51, 1);

// Section 2: Boss Titán Gigante Naranja
fill(img, 24, 250, W - 48, 330, 24, 16, 30);
fill(img, 24, 250, W - 48, 2, 255, 123, 0);
text(img, 40, 262, "2. BOSS: TITAN RADIACTIVO COLOSAL (950 HP - PESADO)", 255, 123, 0, 2);
text(img, 40, 282, "Ataque telegrafiado con aviso. Sobrecalentamiento expone su nucleo (2X dano)", 240, 180, 140, 1);

const scaleBoss = 3;
drawAscii(img, RAW_RADBOSS.idle, 40, 310, scaleBoss);
text(img, 50, 545, "1. REPOSO", 255, 170, 0, 1);

drawAscii(img, RAW_RADBOSS.charge, 280, 310, scaleBoss);
text(img, 275, 545, "2. AVISO / CARGA", 255, 230, 0, 1);

drawAscii(img, RAW_RADBOSS.attack, 520, 310, scaleBoss);
text(img, 515, 545, "3. ATAQUE RAPIDO", 255, 60, 0, 1);

drawAscii(img, RAW_RADBOSS.overheat, 760, 310, scaleBoss);
text(img, 750, 545, "4. NUCLEO EXPUESTO (2X)", 92, 246, 255, 1);

writePng(path.join(__dirname, "preview-sprites.png"), W, H, img.pix);
console.log("preview-sprites.png generated successfully!");
