(function (exports) {
  "use strict";

  const TILE = 48;
  const PHYS = {
    TILE: 48,
    GRAVITY: 0.4,
    HOLD_GRAV: 0.33,
    JUMP: -14.2,
    MAX_FALL: 11.2,
    RUN: 5.2,
    CROUCH_RUN: 2.15,
    ACC: 0.95,
    AIR_ACC: 0.78,
    FRICTION: 0.68,
    AIR_FRICTION: 0.96,
    COYOTE: 10,
    JUMP_BUF: 10,
    PLAYER_W: 22,
    PLAYER_H: 36,
    CROUCH_H: 22,
  };

  const T = {
    EMPTY: 0,
    GRASS: 1,
    DIRT: 2,
    BRICK: 3,
    BLOCK: 4,
    LAVA: 5,
    PLATFORM: 6,
    PIPE: 7,
    PIPE_TOP: 8,
    CASTLE: 9,
    DOOR: 10,
    QBLOCK: 11,
    USED: 12,
    BRIDGE: 13,
    CRATE: 14,
  };

  const WORLD_W = 148;
  const WORLD_H = 16;
  const GROUND_Y = WORLD_H - 3;

  const ZONES = [
    { id: "calle", name: "CALLE", x0: 0, x1: 16 },
    { id: "puente1", name: "PUENTE", x0: 16, x1: 24 },
    { id: "arrabal", name: "ARRABAL", x0: 24, x1: 38 },
    { id: "plaza", name: "PLAZA", x0: 38, x1: 56 },
    { id: "puente2", name: "PUENTE ROTO", x0: 56, x1: 64 },
    { id: "base", name: "BASE", x0: 64, x1: 88 },
    { id: "viaducto", name: "VIADUCTO", x0: 88, x1: 100 },
    { id: "puesto", name: "PUESTO", x0: 100, x1: 108 },
    { id: "campo", name: "CAMPO DE BATALLA", x0: 108, x1: 132 },
    { id: "fortaleza", name: "FORTALEZA", x0: 132, x1: 148 },
  ];

  const SPAWNS = {
    comun: { tileX: 47, tileY: GROUND_Y, label: "COMUN" },
    boss: { tileX: 120, tileY: GROUND_Y, label: "BOSS" },
  };

  const LAVA_PITS = [
    [16, 22],
    [56, 62],
    [79, 86],
    [90, 97],
    [102, 107],
  ];

  const BRIDGES = [
    { x: 16, w: 6 },
    { x: 56, w: 6 },
    { x: 79, w: 3 },
    { x: 84, w: 2 },
    { x: 90, w: 2 },
    { x: 95, w: 2 },
    { x: 102, w: 5 },
  ];

  const BUILDINGS = [
    { x: 8, w: 4, h: 1 },
    { x: 25, w: 7, h: 2 },
    { x: 39, w: 4, h: 1 },
    { x: 52, w: 4, h: 1 },
    { x: 64, w: 3, h: 1 },
    { x: 67, w: 4, h: 2 },
    { x: 71, w: 6, h: 3 },
    { x: 111, w: 4, h: 1 },
    { x: 125, w: 4, h: 1 },
  ];

  const SANDBAGS = [5, 44, 99, 116];

  function inLava(x) {
    return LAVA_PITS.some(([a, b]) => x >= a && x < b);
  }

  function zoneAt(tileX) {
    for (let i = ZONES.length - 1; i >= 0; i--) {
      if (tileX >= ZONES[i].x0 && tileX < ZONES[i].x1) return ZONES[i];
    }
    return ZONES[0];
  }

  function put(tiles, tx, ty, id) {
    if (ty < 0 || ty >= WORLD_H || tx < 0 || tx >= WORLD_W) return;
    tiles[ty][tx] = id;
  }

  const ZONES_L2 = [
    { id: "l2_acceso", name: "TUNEL DE ACCESO", x0: 0, x1: 20 },
    { id: "l2_foso1", name: "FOSO DE RADIACION I", x0: 20, x1: 38 },
    { id: "l2_bunker1", name: "BUNKER ALPHA", x0: 38, x1: 60 },
    { id: "l2_critica", name: "ZONA CRITICA", x0: 60, x1: 82 },
    { id: "l2_complejo", name: "COMPLEJO INDUSTRIAL", x0: 82, x1: 104 },
    { id: "l2_foso2", name: "FOSO DE RADIACION II", x0: 104, x1: 126 },
    { id: "l2_bastion", name: "BASTION TOXICO", x0: 126, x1: 150 },
    { id: "l2_pasarela", name: "PASARELA ALTA", x0: 150, x1: 172 },
    { id: "l2_bunker2", name: "BUNKER BETA", x0: 172, x1: 194 },
    { id: "l2_viaducto", name: "VIADUCTO ENERGETICO", x0: 194, x1: 216 },
    { id: "l2_condensador", name: "SECTOR CONDENSADORES", x0: 216, x1: 232 },
    { id: "l2_antecamara", name: "ANTECAMARA DEL TITAN", x0: 232, x1: 242 },
    { id: "l2_arena", name: "ARENA DEL REACTOR", x0: 242, x1: 254 },
    { id: "l2_reactor", name: "NUCLEO CENTRAL", x0: 254, x1: 260 },
  ];

  const LAVA_PITS_L2 = [
    [20, 32],
    [62, 76],
    [106, 120],
    [152, 166],
    [196, 210],
  ];

  const SPAWNS_L2 = {
    comun: { tileX: 45, tileY: 6, type: "radstar", label: "ESTRELLA RAD" },
    boss: { tileX: 248, tileY: GROUND_Y, type: "radboss", label: "TITAN RADIACTIVO" },
    radstars: [
      { tileX: 26, tileY: 6 },
      { tileX: 46, tileY: 5 },
      { tileX: 68, tileY: 5 },
      { tileX: 90, tileY: 6 },
      { tileX: 112, tileY: 5 },
      { tileX: 136, tileY: 5 },
      { tileX: 158, tileY: 6 },
      { tileX: 180, tileY: 5 },
      { tileX: 200, tileY: 5 },
      { tileX: 212, tileY: 6 },
      { tileX: 226, tileY: 5 },
      { tileX: 235, tileY: 6 },
    ],
  };

  function buildLevel1() {
    const tiles = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(T.EMPTY));
    const tileMeta = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(null));

    for (let x = 0; x < WORLD_W; x++) {
      if (inLava(x)) {
        tiles[WORLD_H - 1][x] = T.LAVA;
        tiles[WORLD_H - 2][x] = T.LAVA;
      } else {
        tiles[WORLD_H - 1][x] = T.DIRT;
        tiles[WORLD_H - 2][x] = T.DIRT;
        tiles[GROUND_Y][x] = T.GRASS;
      }
    }

    for (let x = 0; x < 16; x++) {
      tiles[WORLD_H - 1][x] = T.DIRT;
      tiles[WORLD_H - 2][x] = T.DIRT;
      tiles[GROUND_Y][x] = T.GRASS;
    }
    for (let x = 38; x < 56; x++) {
      tiles[WORLD_H - 1][x] = T.DIRT;
      tiles[WORLD_H - 2][x] = T.DIRT;
      tiles[GROUND_Y][x] = T.GRASS;
    }
    for (let x = 108; x < WORLD_W; x++) {
      tiles[WORLD_H - 1][x] = T.DIRT;
      tiles[WORLD_H - 2][x] = T.DIRT;
      tiles[GROUND_Y][x] = T.GRASS;
    }

    for (const b of BRIDGES) {
      for (let i = 0; i < b.w; i++) put(tiles, b.x + i, GROUND_Y, T.BRIDGE);
    }

    for (const b of BUILDINGS) {
      for (let i = 0; i < b.w; i++) {
        for (let h = 1; h <= b.h; h++) put(tiles, b.x + i, GROUND_Y - h, T.BRICK);
        if (b.h >= 2) put(tiles, b.x + i, GROUND_Y - b.h, T.CRATE);
      }
    }

    for (const x of SANDBAGS) {
      put(tiles, x, GROUND_Y - 1, T.PIPE_TOP);
      put(tiles, x + 1, GROUND_Y - 1, T.PIPE_TOP);
    }

    put(tiles, 29, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 30, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 31, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 72, GROUND_Y - 4, T.PLATFORM);
    put(tiles, 73, GROUND_Y - 4, T.PLATFORM);
    put(tiles, 74, GROUND_Y - 4, T.PLATFORM);
    put(tiles, 75, GROUND_Y - 4, T.PLATFORM);

    const cx = WORLD_W - 16;
    for (let y = 5; y <= 10; y++) {
      tiles[y][cx] = T.CASTLE;
      tiles[y][cx + 11] = T.CASTLE;
    }
    for (let x = cx; x < cx + 12; x++) {
      tiles[5][x] = T.CASTLE;
      if ((x - cx) % 2 === 0) tiles[4][x] = T.CASTLE;
    }
    for (let y = 6; y <= 9; y++) {
      tiles[y][cx + 2] = T.CASTLE;
      tiles[y][cx + 3] = T.CASTLE;
      tiles[y][cx + 8] = T.CASTLE;
      tiles[y][cx + 9] = T.CASTLE;
    }
    tiles[GROUND_Y - 1][cx + 5] = T.DOOR;
    tiles[GROUND_Y - 1][cx + 6] = T.DOOR;
    tiles[GROUND_Y - 2][cx + 5] = T.DOOR;
    tiles[GROUND_Y - 2][cx + 6] = T.DOOR;

    const lavaSpawns = [
      { x: 27 * TILE, y: (GROUND_Y + 1) * TILE, t: 40 },
      { x: 65 * TILE, y: (GROUND_Y + 1) * TILE, t: 60 },
      { x: 82 * TILE, y: (GROUND_Y + 1) * TILE, t: 75 },
      { x: 98 * TILE, y: (GROUND_Y + 1) * TILE, t: 90 },
    ];

    return {
      tiles,
      tileMeta,
      lavaSpawns,
      worldW: WORLD_W,
      worldH: WORLD_H,
      groundY: GROUND_Y,
      doorX: (cx + 5) * TILE,
      zones: ZONES,
      spawns: SPAWNS,
      levelNum: 1,
      name: "NIVEL 1: PROTOCOLO BELMONT",
    };
  }

  function buildLevel2() {
    const W2 = 260;
    const tiles = Array.from({ length: WORLD_H }, () => Array(W2).fill(T.EMPTY));
    const tileMeta = Array.from({ length: WORLD_H }, () => Array(W2).fill(null));

    function inLava2(x) {
      return LAVA_PITS_L2.some(([a, b]) => x >= a && x < b);
    }

    for (let x = 0; x < W2; x++) {
      if (inLava2(x)) {
        tiles[WORLD_H - 1][x] = T.LAVA;
        tiles[WORLD_H - 2][x] = T.LAVA;
      } else {
        tiles[WORLD_H - 1][x] = T.DIRT;
        tiles[WORLD_H - 2][x] = T.DIRT;
        tiles[GROUND_Y][x] = T.GRASS;
      }
    }

    // Coberturas con sacos de arena (Sandbag barricades para agacharse con S)
    const SANDBAGS_L2 = [8, 10, 42, 44, 52, 84, 86, 92, 130, 132, 144, 174, 176, 188, 220, 222, 236, 238];
    for (const x of SANDBAGS_L2) {
      put(tiles, x, GROUND_Y - 1, T.PIPE_TOP);
      put(tiles, x + 1, GROUND_Y - 1, T.PIPE_TOP);
    }

    // Foso 1 (20..32): Puente metálico inicial + plataforma magnética
    for (let i = 0; i < 4; i++) put(tiles, 20 + i, GROUND_Y, T.BRIDGE);
    for (let i = 0; i < 4; i++) put(tiles, 26 + i, GROUND_Y - 2, T.PLATFORM);

    // Bunker Alpha (38..60): Estructuras de ladrillo y cajas
    for (let i = 0; i < 6; i++) {
      put(tiles, 45 + i, GROUND_Y - 1, T.BRICK);
      put(tiles, 45 + i, GROUND_Y - 2, T.CRATE);
    }
    put(tiles, 55, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 56, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 57, GROUND_Y - 3, T.PLATFORM);

    // Foso 2 (62..76): Zona Crítica con plataformas escalonadas
    for (let i = 0; i < 3; i++) put(tiles, 63 + i, GROUND_Y - 2, T.PLATFORM);
    for (let i = 0; i < 4; i++) put(tiles, 68 + i, GROUND_Y - 4, T.PLATFORM);
    for (let i = 0; i < 3; i++) put(tiles, 73 + i, GROUND_Y - 2, T.PLATFORM);

    // Complejo Industrial (82..104): Búnker con tuberías y pasarelas
    for (let i = 0; i < 7; i++) {
      put(tiles, 88 + i, GROUND_Y - 1, T.BRICK);
      put(tiles, 88 + i, GROUND_Y - 2, T.BRICK);
      put(tiles, 88 + i, GROUND_Y - 3, T.CRATE);
    }
    put(tiles, 96, GROUND_Y - 1, T.PIPE);
    put(tiles, 96, GROUND_Y - 2, T.PIPE_TOP);
    put(tiles, 97, GROUND_Y - 1, T.PIPE);
    put(tiles, 97, GROUND_Y - 2, T.PIPE_TOP);
    put(tiles, 100, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 101, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 102, GROUND_Y - 3, T.PLATFORM);

    // Foso 3 (106..120): Foso de Radiación II
    for (let i = 0; i < 4; i++) put(tiles, 107 + i, GROUND_Y - 2, T.PLATFORM);
    for (let i = 0; i < 4; i++) put(tiles, 114 + i, GROUND_Y - 3, T.PLATFORM);

    // Bastión Tóxico (126..150): Fortaleza de 3 niveles con coberturas
    for (let i = 0; i < 8; i++) {
      put(tiles, 134 + i, GROUND_Y - 1, T.BRICK);
      put(tiles, 134 + i, GROUND_Y - 2, T.BRICK);
      put(tiles, 134 + i, GROUND_Y - 3, T.BRICK);
      put(tiles, 134 + i, GROUND_Y - 4, T.CRATE);
    }
    put(tiles, 146, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 147, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 148, GROUND_Y - 3, T.PLATFORM);

    // Foso 4 (152..166): Pasarela Alta
    for (let i = 0; i < 4; i++) put(tiles, 153 + i, GROUND_Y - 2, T.PLATFORM);
    for (let i = 0; i < 4; i++) put(tiles, 160 + i, GROUND_Y - 3, T.PLATFORM);

    // Bunker Beta (172..194): Búnker de reaprovisionamiento
    for (let i = 0; i < 6; i++) {
      put(tiles, 178 + i, GROUND_Y - 1, T.BRICK);
      put(tiles, 178 + i, GROUND_Y - 2, T.CRATE);
    }
    put(tiles, 185, GROUND_Y - 1, T.PIPE);
    put(tiles, 185, GROUND_Y - 2, T.PIPE_TOP);
    put(tiles, 186, GROUND_Y - 1, T.PIPE);
    put(tiles, 186, GROUND_Y - 2, T.PIPE_TOP);
    put(tiles, 190, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 191, GROUND_Y - 3, T.PLATFORM);

    // Foso 5 (196..210): Viaducto Energético
    for (let i = 0; i < 4; i++) put(tiles, 197 + i, GROUND_Y, T.BRIDGE);
    for (let i = 0; i < 4; i++) put(tiles, 203 + i, GROUND_Y - 2, T.PLATFORM);

    // Sector Condensadores (216..232): Muros de contención
    for (let i = 0; i < 6; i++) {
      put(tiles, 224 + i, GROUND_Y - 1, T.BRICK);
      put(tiles, 224 + i, GROUND_Y - 2, T.CRATE);
    }
    put(tiles, 231, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 232, GROUND_Y - 3, T.PLATFORM);

    // Arena del Reactor & Coloso (242..254):
    // Plataformas tácticas elevadas para esquivar la colosal embestida del Boss
    for (let i = 0; i < 4; i++) put(tiles, 243 + i, GROUND_Y - 3, T.PLATFORM);
    for (let i = 0; i < 3; i++) put(tiles, 244 + i, GROUND_Y - 5, T.PLATFORM);
    for (let i = 0; i < 4; i++) put(tiles, 250 + i, GROUND_Y - 3, T.PLATFORM);
    for (let i = 0; i < 3; i++) put(tiles, 251 + i, GROUND_Y - 5, T.PLATFORM);

    // Reactor Central / Puerta de Salida: x=254..260
    const cx = W2 - 6;
    for (let y = 5; y <= 10; y++) {
      tiles[y][cx] = T.CASTLE;
      tiles[y][cx + 5] = T.CASTLE;
    }
    for (let x = cx; x < cx + 6; x++) {
      tiles[5][x] = T.CASTLE;
      if ((x - cx) % 2 === 0) tiles[4][x] = T.CASTLE;
    }
    tiles[GROUND_Y - 1][cx + 2] = T.DOOR;
    tiles[GROUND_Y - 1][cx + 3] = T.DOOR;
    tiles[GROUND_Y - 2][cx + 2] = T.DOOR;
    tiles[GROUND_Y - 2][cx + 3] = T.DOOR;

    return {
      tiles,
      tileMeta,
      lavaSpawns: [],
      worldW: W2,
      worldH: WORLD_H,
      groundY: GROUND_Y,
      doorX: (cx + 2) * TILE,
      zones: ZONES_L2,
      spawns: SPAWNS_L2,
      levelNum: 2,
      name: "NIVEL 2: REACTOR RADIACTIVO",
    };
  }

  function buildLevel(num) {
    if (num === 2) return buildLevel2();
    return buildLevel1();
  }

  function solid(id) {
    return (
      id === T.GRASS ||
      id === T.DIRT ||
      id === T.BRICK ||
      id === T.BLOCK ||
      id === T.PIPE ||
      id === T.PIPE_TOP ||
      id === T.CASTLE ||
      id === T.QBLOCK ||
      id === T.USED ||
      id === T.BRIDGE ||
      id === T.CRATE
    );
  }

  function oneWay(id) {
    return id === T.PLATFORM;
  }

  function maxJumpHeight() {
    const v = -PHYS.JUMP;
    return (v * v) / (2 * PHYS.HOLD_GRAV);
  }

  function maxJumpTiles() {
    return maxJumpHeight() / TILE;
  }

  function airTimeFrames() {
    const up = -PHYS.JUMP / PHYS.HOLD_GRAV;
    const h = maxJumpHeight();
    const down = Math.sqrt((2 * h) / PHYS.GRAVITY);
    return up + down;
  }

  function maxJumpDist() {
    return PHYS.RUN * airTimeFrames();
  }

  exports.TILE = TILE;
  exports.PHYS = PHYS;
  exports.T = T;
  exports.WORLD_W = WORLD_W;
  exports.WORLD_H = WORLD_H;
  exports.GROUND_Y = GROUND_Y;
  exports.LAVA_PITS = LAVA_PITS;
  exports.LAVA_PITS_L2 = LAVA_PITS_L2;
  exports.PLATFORMS = [];
  exports.BRIDGES = BRIDGES;
  exports.BUILDINGS = BUILDINGS;
  exports.ZONES = ZONES;
  exports.ZONES_L2 = ZONES_L2;
  exports.SPAWNS = SPAWNS;
  exports.SPAWNS_L2 = SPAWNS_L2;
  exports.buildLevel = buildLevel;
  exports.buildLevel1 = buildLevel1;
  exports.buildLevel2 = buildLevel2;
  exports.solid = solid;
  exports.oneWay = oneWay;
  exports.zoneAt = zoneAt;
  exports.maxJumpHeight = maxJumpHeight;
  exports.maxJumpTiles = maxJumpTiles;
  exports.maxJumpDist = maxJumpDist;
  exports.inLava = inLava;
})(typeof module !== "undefined" && module.exports ? module.exports : (window.YAEL_LEVEL = {}));
