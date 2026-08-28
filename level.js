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
  };

  const WORLD_W = 168;
  const WORLD_H = 16;
  const GROUND_Y = WORLD_H - 3;

  const LAVA_PITS = [
    [17, 22],
    [30, 35],
    [46, 52],
    [64, 69],
    [80, 88],
    [98, 103],
    [114, 122],
    [132, 142],
  ];

  const PLATFORMS = [
    [10, 11, 3, "brick"],
    [18, 10, 3, "q"],
    [31, 11, 3, "brick"],
    [33, 9, 2, "q"],
    [47, 11, 3, "brick"],
    [49, 9, 2, "q"],
    [65, 10, 3, "brick"],
    [81, 11, 2, "brick"],
    [84, 9, 3, "q"],
    [99, 10, 3, "brick"],
    [115, 11, 3, "brick"],
    [118, 8, 3, "q"],
    [133, 11, 3, "brick"],
    [136, 9, 3, "q"],
    [24, 8, 2, "brick"],
    [56, 8, 3, "brick"],
    [74, 7, 2, "q"],
    [106, 8, 2, "brick"],
  ];

  const PIPES = [
    [25, 1],
    [41, 2],
    [61, 1],
    [93, 2],
    [127, 1],
  ];

  const FLOAT_PLATS = [
    [26, GROUND_Y - 2, 3],
    [54, GROUND_Y - 2, 3],
    [76, GROUND_Y - 2, 3],
    [110, GROUND_Y - 2, 3],
  ];

  function inLava(x) {
    return LAVA_PITS.some(([a, b]) => x >= a && x < b);
  }

  function buildLevel() {
    const tiles = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(T.EMPTY));
    const tileMeta = Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(null));
    const lavaSpawns = [];

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

    for (let x = 0; x < 12; x++) {
      tiles[WORLD_H - 1][x] = T.DIRT;
      tiles[WORLD_H - 2][x] = T.DIRT;
      tiles[GROUND_Y][x] = T.GRASS;
    }
    for (let x = WORLD_W - 22; x < WORLD_W; x++) {
      tiles[WORLD_H - 1][x] = T.DIRT;
      tiles[WORLD_H - 2][x] = T.DIRT;
      tiles[GROUND_Y][x] = T.GRASS;
    }

    for (const [x, y, w, kind] of PLATFORMS) {
      for (let i = 0; i < w; i++) {
        const useQ = kind === "q" && i === (w >> 1);
        tiles[y][x + i] = useQ ? T.QBLOCK : T.BRICK;
        if (useQ) tileMeta[y][x + i] = { coins: 2 };
      }
    }

    for (const [x, h] of PIPES) {
      const base = GROUND_Y - 1;
      for (let i = 0; i < h; i++) {
        tiles[base - i][x] = T.PIPE;
        tiles[base - i][x + 1] = T.PIPE;
      }
      tiles[base - h][x] = T.PIPE_TOP;
      tiles[base - h][x + 1] = T.PIPE_TOP;
    }

    for (const [x, y, w] of FLOAT_PLATS) {
      for (let i = 0; i < w; i++) tiles[y][x + i] = T.PLATFORM;
    }

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

    for (const [a, b] of LAVA_PITS) {
      lavaSpawns.push({
        x: ((a + b) / 2) * TILE,
        y: (WORLD_H - 2) * TILE,
        t: 20 + ((a * 13) % 90),
        edgeL: a * TILE,
        edgeR: b * TILE,
      });
    }

    return {
      tiles,
      tileMeta,
      lavaSpawns,
      worldW: WORLD_W,
      worldH: WORLD_H,
      groundY: GROUND_Y,
      doorX: (cx + 5) * TILE,
    };
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
      id === T.USED
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
  exports.PLATFORMS = PLATFORMS;
  exports.buildLevel = buildLevel;
  exports.solid = solid;
  exports.oneWay = oneWay;
  exports.maxJumpHeight = maxJumpHeight;
  exports.maxJumpTiles = maxJumpTiles;
  exports.maxJumpDist = maxJumpDist;
  exports.inLava = inLava;
})(typeof module !== "undefined" && module.exports ? module.exports : (window.YAEL_LEVEL = {}));
