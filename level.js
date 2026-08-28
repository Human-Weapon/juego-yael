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

  const WORLD_W = 240;
  const WORLD_H = 16;
  const GROUND_Y = WORLD_H - 3;

  const ZONES = [
    { id: "calle", name: "CALLE PRINCIPAL", x0: 0, x1: 20 },
    { id: "puente1", name: "PUENTE DE MAGMA", x0: 20, x1: 36 },
    { id: "arrabal", name: "ARRABAL BAJO", x0: 36, x1: 56 },
    { id: "plaza", name: "PLAZA DE LAS RELIQUIAS", x0: 56, x1: 78 },
    { id: "foso_coliseo", name: "FOSO DEL COLISEO", x0: 78, x1: 98 },
    { id: "coliseo", name: "COLISEO DE LAVA", x0: 98, x1: 120 },
    { id: "bastion", name: "BASTION DE CENIZA", x0: 120, x1: 144 },
    { id: "viaducto", name: "GRAN VIADUCTO", x0: 144, x1: 166 },
    { id: "puesto", name: "PUESTO AVANZADO", x0: 166, x1: 188 },
    { id: "campamento", name: "CAMPAMENTO DE GYOJINS", x0: 188, x1: 210 },
    { id: "arena_rey", name: "ARENA DEL REY MARINO", x0: 210, x1: 228 },
    { id: "fortaleza", name: "PORTAL DEL CASTILLO", x0: 228, x1: 240 },
  ];

  const SPAWNS = {
    comun: { tileX: 48, tileY: GROUND_Y, label: "COMUN" },
    boss: { tileX: 218, tileY: GROUND_Y, label: "BOSS" },
  };

  const LAVA_PITS = [
    [20, 32],
    [56, 68],
    [80, 94],
    [144, 158],
    [188, 202],
  ];

  const BRIDGES = [
    { x: 20, w: 5 },
    { x: 56, w: 5 },
    { x: 80, w: 4 },
    { x: 90, w: 4 },
    { x: 144, w: 5 },
    { x: 153, w: 5 },
    { x: 188, w: 5 },
  ];

  const BUILDINGS = [
    { x: 10, w: 4, h: 1 },
    { x: 38, w: 6, h: 2 },
    { x: 48, w: 4, h: 1 },
    { x: 70, w: 6, h: 2 },
    { x: 100, w: 5, h: 2 },
    { x: 108, w: 8, h: 3 },
    { x: 126, w: 6, h: 2 },
    { x: 136, w: 5, h: 2 },
    { x: 170, w: 6, h: 2 },
    { x: 180, w: 5, h: 1 },
    { x: 204, w: 5, h: 2 },
  ];

  const SANDBAGS = [6, 36, 52, 76, 96, 122, 140, 166, 184, 202, 212];

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

    // Plataformas flotantes en fosos
    put(tiles, 27, GROUND_Y - 2, T.PLATFORM);
    put(tiles, 28, GROUND_Y - 2, T.PLATFORM);
    put(tiles, 29, GROUND_Y - 2, T.PLATFORM);

    put(tiles, 63, GROUND_Y - 2, T.PLATFORM);
    put(tiles, 64, GROUND_Y - 2, T.PLATFORM);
    put(tiles, 65, GROUND_Y - 2, T.PLATFORM);

    put(tiles, 85, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 86, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 87, GROUND_Y - 3, T.PLATFORM);

    put(tiles, 110, GROUND_Y - 4, T.PLATFORM);
    put(tiles, 111, GROUND_Y - 4, T.PLATFORM);
    put(tiles, 112, GROUND_Y - 4, T.PLATFORM);
    put(tiles, 113, GROUND_Y - 4, T.PLATFORM);

    put(tiles, 149, GROUND_Y - 2, T.PLATFORM);
    put(tiles, 150, GROUND_Y - 2, T.PLATFORM);
    put(tiles, 151, GROUND_Y - 2, T.PLATFORM);

    put(tiles, 194, GROUND_Y - 2, T.PLATFORM);
    put(tiles, 195, GROUND_Y - 2, T.PLATFORM);
    put(tiles, 196, GROUND_Y - 2, T.PLATFORM);

    put(tiles, 213, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 214, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 222, GROUND_Y - 3, T.PLATFORM);
    put(tiles, 223, GROUND_Y - 3, T.PLATFORM);

    // Castillo / Portal final
    const cx = WORLD_W - 12;
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
      { x: 26 * TILE, y: (GROUND_Y + 1) * TILE, t: 40 },
      { x: 62 * TILE, y: (GROUND_Y + 1) * TILE, t: 60 },
      { x: 86 * TILE, y: (GROUND_Y + 1) * TILE, t: 75 },
      { x: 110 * TILE, y: (GROUND_Y + 1) * TILE, t: 90 },
      { x: 150 * TILE, y: (GROUND_Y + 1) * TILE, t: 105 },
      { x: 195 * TILE, y: (GROUND_Y + 1) * TILE, t: 120 },
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

  const ZONES_L3 = [
    { id: "l3_base", name: "BASE DE LA TORRE", y0: 166, y1: 180 },
    { id: "l3_p1", name: "PISO 1: MAQUINARIA", y0: 152, y1: 166 },
    { id: "l3_p2", name: "PISO 2: GENERADORES", y0: 138, y1: 152 },
    { id: "l3_p3", name: "PISO 3: CONDUCTOS", y0: 124, y1: 138 },
    { id: "l3_p4", name: "PISO 4: ASCENSOR CENTRAL", y0: 110, y1: 124 },
    { id: "l3_p5", name: "PISO 5: BASTION INTERNO", y0: 96, y1: 110 },
    { id: "l3_p6", name: "PISO 6: VENTILACION", y0: 82, y1: 96 },
    { id: "l3_p7", name: "PISO 7: PASARELA ALTA", y0: 68, y1: 82 },
    { id: "l3_p8", name: "PISO 8: ANTECAMARA", y0: 48, y1: 68 },
    { id: "l3_cima", name: "CIMA: AZOTEA DEL HELIPUERTO", y0: 0, y1: 48 },
  ];

  const SPAWNS_L3 = {
    boss: { tileX: 18, tileY: 18, type: "alien_ship", label: "NAVE ALIENIGENA" },
    towerEnemies: [
      { tileX: 12, tileY: 175, type: "shark" },
      { tileX: 20, tileY: 170, type: "radstar" },
      { tileX: 20, tileY: 165, type: "crab" },
      { tileX: 10, tileY: 154, type: "radstar" },
      { tileX: 22, tileY: 153, type: "octopus" },
      { tileX: 15, tileY: 141, type: "eel" },
      { tileX: 26, tileY: 138, type: "radstar" },
      { tileX: 8, tileY: 129, type: "shark" },
      { tileX: 28, tileY: 129, type: "octopus" },
      { tileX: 12, tileY: 122, type: "radstar" },
      { tileX: 18, tileY: 112, type: "radstar" },
      { tileX: 20, tileY: 103, type: "crab" },
      { tileX: 8, tileY: 96, type: "radstar" },
      { tileX: 12, tileY: 84, type: "radstar" },
      { tileX: 24, tileY: 70, type: "radstar" },
      { tileX: 16, tileY: 61, type: "shark" },
      { tileX: 14, tileY: 52, type: "radstar" },
      { tileX: 26, tileY: 36, type: "radstar" },
    ],
  };

  function buildLevel3() {
    const W3 = 36;
    const H3 = 180;
    const tiles = Array.from({ length: H3 }, () => Array(W3).fill(T.EMPTY));
    const tileMeta = Array.from({ length: H3 }, () => Array(W3).fill(null));

    // Base de tierra en el fondo de la torre
    for (let x = 0; x < W3; x++) {
      for (let y = 176; y < H3; y++) {
        tiles[y][x] = y === 176 ? T.GRASS : T.DIRT;
      }
    }

    // Muros exteriores laterales de la torre (de y=30 a y=176)
    for (let y = 30; y < 176; y++) {
      tiles[y][0] = T.BRICK;
      tiles[y][1] = T.BRICK;
      tiles[y][W3 - 2] = T.BRICK;
      tiles[y][W3 - 1] = T.BRICK;
    }

    // Coberturas y Pisos en zigzag
    function buildFloor(fy, openLeft) {
      for (let x = 2; x < W3 - 2; x++) {
        if (openLeft && x < 10) continue;
        if (!openLeft && x > W3 - 11) continue;
        tiles[fy][x] = T.BRICK;
        if (x % 7 === 0) tiles[fy - 1][x] = T.CRATE;
      }
      // Plataformas intermedias de salto amplio y aterrizaje en el piso
      const px = openLeft ? 2 : W3 - 10;
      for (let i = 0; i < 8; i++) {
        tiles[fy][px + i] = T.PLATFORM;
        tiles[fy + 8][px + i] = T.PLATFORM;
        tiles[fy + 4][px + i] = T.PLATFORM;
        tiles[fy - 4][px + i] = T.PLATFORM;
      }
      // Barricada de sacos de arena en el piso
      const sx = openLeft ? 15 : 18;
      tiles[fy - 1][sx] = T.PIPE_TOP;
      tiles[fy - 1][sx + 1] = T.PIPE_TOP;
    }

    // Construcción de los 9 pisos interiores
    buildFloor(166, false); // Abre derecha
    buildFloor(154, true);  // Abre izquierda
    buildFloor(142, false); // Abre derecha
    buildFloor(130, true);  // Abre izquierda

    // Piso 5 (Ascensor central): abertura al centro (y=118)
    for (let x = 2; x < W3 - 2; x++) {
      if (x >= 11 && x <= 24) continue;
      tiles[118][x] = T.BRICK;
    }
    for (let i = 0; i < 14; i++) {
      tiles[118][11 + i] = T.PLATFORM;
      tiles[126][11 + i] = T.PLATFORM;
      tiles[122][11 + i] = T.PLATFORM;
      tiles[114][11 + i] = T.PLATFORM;
      tiles[110][11 + i] = T.PLATFORM;
    }

    buildFloor(104, false); // Abre derecha
    buildFloor(90, true);   // Abre izquierda
    buildFloor(76, false);  // Abre derecha
    buildFloor(62, true);   // Abre izquierda

    // Antecámara de la cúpula (y=48)
    for (let x = 2; x < W3 - 2; x++) {
      if (x > W3 - 10) continue;
      tiles[48][x] = T.BRICK;
    }
    for (let i = 0; i < 8; i++) {
      tiles[58][W3 - 10 + i] = T.PLATFORM;
      tiles[54][W3 - 10 + i] = T.PLATFORM;
      tiles[50][W3 - 10 + i] = T.PLATFORM;
      tiles[48][W3 - 10 + i] = T.PLATFORM;
      tiles[44][14 + i] = T.PLATFORM;
      tiles[40][14 + i] = T.PLATFORM;
      tiles[35][14 + i] = T.PLATFORM;
      tiles[30][14 + i] = T.PLATFORM;
    }
    tiles[47][8] = T.CRATE;
    tiles[47][9] = T.CRATE;
    tiles[47][20] = T.PIPE_TOP;

    // Azotea del Helipuerto / Arena del Boss (y=30)
    // Helipuerto central sólido (x=5..30) con abismo mortal a ambos lados
    for (let x = 5; x <= 30; x++) {
      if (x < 14 || x > 21) {
        tiles[30][x] = T.BRICK;
        tiles[31][x] = T.BRICK;
      }
    }
    // Plataformas elevadas tácticas para esquivar el láser y el rayo tractor
    for (let i = 0; i < 6; i++) {
      tiles[26][6 + i] = T.PLATFORM;
      tiles[26][23 + i] = T.PLATFORM;
    }
    for (let i = 0; i < 8; i++) {
      tiles[25][14 + i] = T.PLATFORM;
      tiles[22][14 + i] = T.PLATFORM;
      tiles[21][14 + i] = T.PLATFORM; // Escalón directo bajo la puerta
    }

    // Portal / Castillo de escape en la azotea (y: 15..20, x: 15..20)
    for (let y = 15; y <= 18; y++) {
      tiles[y][15] = T.CASTLE;
      tiles[y][20] = T.CASTLE;
    }
    for (let x = 15; x <= 20; x++) {
      tiles[15][x] = T.CASTLE;
    }
    tiles[20][17] = T.DOOR;
    tiles[20][18] = T.DOOR;
    tiles[19][17] = T.DOOR;
    tiles[19][18] = T.DOOR;

    return {
      tiles,
      tileMeta,
      lavaSpawns: [],
      worldW: W3,
      worldH: H3,
      groundY: 176,
      doorX: 17 * TILE,
      doorY: 19 * TILE,
      zones: ZONES_L3,
      spawns: SPAWNS_L3,
      levelNum: 3,
      isVertical: true,
      name: "NIVEL 3: TORRE DEL CATACLISMO",
    };
  }

  function buildLevel(num) {
    if (num === 3) return buildLevel3();
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
