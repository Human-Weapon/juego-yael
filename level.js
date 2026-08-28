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
    const height = tiles.length;
    const width = height && tiles[0] ? tiles[0].length : WORLD_W;
    if (ty < 0 || ty >= height || tx < 0 || tx >= width) return;
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

  // Catálogo de campaña. Los mapas existentes se recolocan en los puestos 5,
  // 15 y 19; el resto se construye con el generador de abajo. Mantener la
  // progresión aquí evita que la lógica de juego tenga que conocer 20 casos.
  const CAMPAIGN_LEVELS = [
    { num: 1, title: "PUERTO EN LLAMAS", theme: "costa", tag: "INTRO · 250 TILES", bossType: "hammer_shark", bossName: "MARTILLO ESCUALO", difficulty: 2, worldW: 250, enemyTypes: ["shark", "piranha", "skimmer"], mechanic: "marea" },
    { num: 2, title: "ALCANTARILLAS ABISALES", theme: "alcantarilla", tag: "TUNELES · 270 TILES", bossType: "sewer_kraken", bossName: "KRAKEN MENOR", difficulty: 3, worldW: 270, enemyTypes: ["octopus", "eel", "mine"], mechanic: "corriente" },
    { num: 3, title: "BARRIO SUMERGIDO", theme: "inundado", tag: "RUTAS · 280 TILES", bossType: "siren_warlord", bossName: "SIRENA DE GUERRA", difficulty: 3, worldW: 280, enemyTypes: ["shark", "octopus", "piranha", "skimmer", "sniper"], mechanic: "inundacion" },
    { num: 4, title: "PUENTE DE MAGMA", theme: "magma", tag: "PERSECUCION · 290 TILES", bossType: "magma_eel_lord", bossName: "ANGUILA VOLCANICA", difficulty: 4, worldW: 290, enemyTypes: ["eel", "crab", "firebat"], mechanic: "puentes" },
    { num: 5, title: "FORTALEZA DEL LITORAL", theme: "castillo", tag: "TIERRA · 240 TILES", bossType: "seaking", bossName: "REY MARINO", difficulty: 4, existing: "level1" },
    { num: 6, title: "ARSENAL CAIDO", theme: "militar", tag: "ASALTO · 280 TILES", bossType: "crab_tank", bossName: "TANQUE CANGREJO", difficulty: 4, worldW: 280, enemyTypes: ["turret", "shield", "mine", "crab", "skimmer"], mechanic: "cobertura" },
    { num: 7, title: "METRO FANTASMA", theme: "metro", tag: "TUNELES · 300 TILES", bossType: "ferro_worm", bossName: "GUSANO FERRICO", difficulty: 5, worldW: 300, enemyTypes: ["drone", "mine", "sniper", "slime"], mechanic: "trenes" },
    { num: 8, title: "ASTILLERO DE TORMENTA", theme: "astillero", tag: "GRUAS · 300 TILES", bossType: "admiral_octopus", bossName: "ALMIRANTE PULPO", difficulty: 5, worldW: 300, enemyTypes: ["octopus", "drone", "eel", "turret", "bombardier"], mechanic: "tormenta" },
    { num: 9, title: "FORTALEZA DE CENIZA", theme: "ceniza", tag: "ASEDIO · 310 TILES", bossType: "ash_golem", bossName: "GOLEM DEL BASTION", difficulty: 5, worldW: 310, enemyTypes: ["shield", "crab", "firebat", "turret"], mechanic: "murallas" },
    { num: 10, title: "COLISEO DE MAGMA", theme: "coliseo", tag: "ARENA · 320 TILES", bossType: "magma_emperor", bossName: "EMPERADOR CANGREJO", difficulty: 6, worldW: 320, enemyTypes: ["crab", "eel", "firebat", "mine", "bombardier"], mechanic: "oleadas" },
    { num: 11, title: "PANTANO TOXICO", theme: "toxico", tag: "GAS · 300 TILES", bossType: "spore_hydra", bossName: "HIDRA DE ESPORAS", difficulty: 6, worldW: 300, enemyTypes: ["slime", "spore", "piranha", "mutant"], mechanic: "gas" },
    { num: 12, title: "PLANTA DE RESIDUOS", theme: "industrial", tag: "PRENSAS · 320 TILES", bossType: "gamma_excavator", bossName: "EXCAVADOR GAMMA", difficulty: 6, worldW: 320, enemyTypes: ["turret", "mine", "drone", "slime", "shield", "bombardier"], mechanic: "prensas" },
    { num: 13, title: "LABORATORIO FRACTURADO", theme: "laboratorio", tag: "MUTANTES · 310 TILES", bossType: "isotope_doctor", bossName: "DOCTOR ISOTOPO", difficulty: 7, worldW: 310, enemyTypes: ["mutant", "teleporter", "spore", "radstar"], mechanic: "teletransporte" },
    { num: 14, title: "TREN NUCLEAR", theme: "nuclear", tag: "CONVOY · 330 TILES", bossType: "atomic_locomotive", bossName: "LOCOMOTORA ATOMICA", difficulty: 7, worldW: 330, enemyTypes: ["drone", "shield", "sniper", "mine", "radstar", "bombardier"], mechanic: "convoy" },
    { num: 15, title: "REACTOR RADIACTIVO", theme: "reactor", tag: "TOXICO · 260 TILES", bossType: "radboss", bossName: "TITAN RADIACTIVO", difficulty: 7, existing: "level2" },
    { num: 16, title: "DISTRITO DEL APAGON", theme: "apagon", tag: "SOMBRAS · 320 TILES", bossType: "omega_sentinel", bossName: "CENTINELA OMEGA", difficulty: 7, worldW: 320, enemyTypes: ["turret", "drone", "teleporter", "mimic"], mechanic: "oscuridad" },
    { num: 17, title: "HANGAR ORBITAL", theme: "orbital", tag: "GRAVEDAD · 330 TILES", bossType: "xeno_carrier", bossName: "PORTANAVES XENO", difficulty: 8, worldW: 330, enemyTypes: ["xeno_scout", "drone", "tractor_unit", "sniper", "bombardier"], mechanic: "gravedad" },
    { num: 18, title: "CIUDAD FLOTANTE", theme: "flotante", tag: "ASCENSO VERTICAL · 136 PISOS", bossType: "tri_oracle", bossName: "ORACULO TRICEFALO", difficulty: 8, vertical: "ascend", enemyTypes: ["xeno_scout", "radstar", "tractor_unit", "firebat"], mechanic: "viento" },
    { num: 19, title: "TORRE DEL CATACLISMO", theme: "torre", tag: "VERTICAL · 180 TILES", bossType: "alien_ship", bossName: "NAVE NODRIZA", difficulty: 8, existing: "level3" },
    { num: 20, title: "DIMENSION CERO", theme: "cataclismo", tag: "FINAL · 360 TILES · 4 FASES", bossType: "cataclysm_architect", bossName: "ARQUITECTO DEL CATACLISMO", difficulty: 10, worldW: 360, enemyTypes: ["mimic", "mutant", "xeno_scout", "teleporter", "tractor_unit", "bombardier"], mechanic: "sintesis" },
  ];

  // Cada nivel nuevo parte de un plano propio. No son simples nombres: route
  // controla la silueta transitable y encounterPlan define el ritmo de combate.
  const LEVEL_DESIGNS = {
    1: { layoutFamily: "muelles-ramificados", visualProfile: "puerto-pesquero-incendiado", arenaPattern: "dique-partido", route: ["docks", "steps", "arches", "towers"], setPieces: ["barco varado", "grua en llamas", "lonja derrumbada", "faro del dique"], encounterPlan: ["pirañas bajo pasarelas", "tiburones entre coberturas", "emboscada en el faro"] },
    2: { layoutFamily: "tuneles-superpuestos", visualProfile: "alcantarilla-abisal-bioluminiscente", arenaPattern: "cisterna-circular", route: ["tunnels", "basin", "zigzag", "chambers"], setPieces: ["colector roto", "compuertas gemelas", "nido de minas", "gran cisterna"], encounterPlan: ["anguilas en conductos", "minas con corriente", "pulpos desde respiraderos"] },
    3: { layoutFamily: "tejados-y-canales", visualProfile: "barrio-costero-sumergido", arenaPattern: "plaza-inundada", route: ["islands", "towers", "docks", "canopy"], setPieces: ["mercado anegado", "campanario inclinado", "azoteas conectadas", "plaza de la sirena"], encounterPlan: ["cruce sobre balsas", "francotiradores en azoteas", "asedio desde canales"] },
    4: { layoutFamily: "persecucion-lineal", visualProfile: "viaducto-volcanico", arenaPattern: "caldera-con-puentes", route: ["rails", "arches", "zigzag", "steps"], setPieces: ["acueducto de lava", "torres de enfriamiento", "puente quebrado", "boca del volcan"], encounterPlan: ["murcielagos sobre magma", "anguilas en el viaducto", "cangrejos de bloqueo"] },
    6: { layoutFamily: "trincheras-escalonadas", visualProfile: "arsenal-militar-abandonado", arenaPattern: "bunker-cruzado", route: ["trenches", "chambers", "towers", "rails"], setPieces: ["campo de alambradas", "deposito de municion", "bunker alfa", "hangar del tanque"], encounterPlan: ["torretas con cobertura", "minas entre trincheras", "escuadra de escudos"] },
    7: { layoutFamily: "andenes-paralelos", visualProfile: "metro-oxidado-fantasma", arenaPattern: "terminal-de-vias", route: ["rails", "tunnels", "islands", "trenches"], setPieces: ["anden clausurado", "tren descarrilado", "tunel de servicio", "terminal ferrica"], encounterPlan: ["drones sobre vagones", "minas entre rieles", "francotiradores de anden"] },
    8: { layoutFamily: "gruas-verticales", visualProfile: "astillero-bajo-tormenta", arenaPattern: "dique-seco", route: ["towers", "docks", "canopy", "arches"], setPieces: ["cascos a medio montar", "grua de contenedores", "muelle de carga", "dique del almirante"], encounterPlan: ["pulpos entre contenedores", "drones alrededor de gruas", "torretas del dique"] },
    9: { layoutFamily: "asedio-en-anillos", visualProfile: "fortaleza-de-ceniza", arenaPattern: "patio-del-bastion", route: ["trenches", "steps", "arches", "chambers"], setPieces: ["campamento sitiador", "muralla exterior", "torre de ceniza", "patio del bastion"], encounterPlan: ["escudos en la brecha", "torretas de muralla", "murcielagos sobre almenas"] },
    10: { layoutFamily: "arenas-encadenadas", visualProfile: "coliseo-imperial-de-magma", arenaPattern: "foso-con-gradas", route: ["arches", "basin", "steps", "islands"], setPieces: ["puerta de gladiadores", "foso de bestias", "galeria imperial", "arena del emperador"], encounterPlan: ["oleada de cangrejos", "minas en el foso", "anguilas desde las gradas"] },
    11: { layoutFamily: "islas-pantanosas", visualProfile: "humedal-toxico-organico", arenaPattern: "nido-de-raices", route: ["islands", "canopy", "basin", "zigzag"], setPieces: ["aldea hundida", "arbol de esporas", "laguna mutagena", "nido de la hidra"], encounterPlan: ["slimes desde el lodo", "esporas en el dosel", "mutantes en la laguna"] },
    12: { layoutFamily: "cadena-industrial", visualProfile: "planta-de-residuos-gamma", arenaPattern: "prensa-central", route: ["rails", "chambers", "trenches", "towers"], setPieces: ["cintas trituradoras", "silos toxicos", "prensas alternas", "pozo de excavacion"], encounterPlan: ["minas en cintas", "drones entre silos", "escudos bajo prensas"] },
    13: { layoutFamily: "salas-plegadas", visualProfile: "laboratorio-cuantico-fracturado", arenaPattern: "camara-de-portales", route: ["chambers", "zigzag", "tunnels", "islands"], setPieces: ["sala de contencion", "vivero mutante", "corredor imposible", "camara de isotopos"], encounterPlan: ["mutantes liberados", "teletransportadores cruzados", "esporas de contencion"] },
    14: { layoutFamily: "convoy-en-marcha", visualProfile: "tren-blindado-nuclear", arenaPattern: "locomotora-abierta", route: ["rails", "steps", "canopy", "trenches"], setPieces: ["vagones cisterna", "coche artillado", "techo del convoy", "locomotora atomica"], encounterPlan: ["drones entre vagones", "francotiradores en techos", "minas de acoplamiento"] },
    16: { layoutFamily: "calles-en-penumbra", visualProfile: "distrito-electrico-apagado", arenaPattern: "subestacion-omega", route: ["towers", "tunnels", "docks", "chambers"], setPieces: ["avenida sin luz", "edificios puente", "central de respaldo", "subestacion omega"], encounterPlan: ["mimicos en escaparates", "drones de patrulla", "teletransportes en sombras"] },
    17: { layoutFamily: "hangar-gravedad-variable", visualProfile: "hangar-orbital-xeno", arenaPattern: "bahia-de-lanzamiento", route: ["islands", "rails", "towers", "zigzag"], setPieces: ["esclusa exterior", "anillos de gravedad", "cubierta de cazas", "bahia del portanaves"], encounterPlan: ["exploradores en gravedad baja", "tractores sobre pasarelas", "francotiradores orbitales"] },
    18: { layoutFamily: "archipielago-aereo", visualProfile: "ciudad-flotante-alienigena", arenaPattern: "templo-de-tres-islas", route: ["islands", "canopy", "arches", "towers"], setPieces: ["jardines suspendidos", "molinos de viento", "puentes de nubes", "templo del oraculo"], encounterPlan: ["exploradores entre islas", "tractores contra el viento", "murcielagos sobre puentes"] },
    20: { layoutFamily: "realidad-recombinada", visualProfile: "dimension-cero-inestable", arenaPattern: "poliedro-cataclismico", route: ["zigzag", "chambers", "islands", "towers"], setPieces: ["ruinas recombinadas", "mar invertido", "ciudad imposible", "nucleo de dimension cero"], encounterPlan: ["mimicos de otros niveles", "mutantes y xenos combinados", "tractores entre fracturas"] },
  };

  function campaignLevel(num) {
    return CAMPAIGN_LEVELS[Math.max(0, Math.min(CAMPAIGN_LEVELS.length - 1, num - 1))];
  }

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
      levelNum: 5,
      name: "NIVEL 5: FORTALEZA DEL LITORAL",
      campaign: campaignLevel(5),
      bossSpawn: { ...SPAWNS.boss, type: "seaking", triggerX: 204 },
      checkpoints: [52, 104, 156, 196],
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
      levelNum: 15,
      name: "NIVEL 15: REACTOR RADIACTIVO",
      campaign: campaignLevel(15),
      bossSpawn: { ...SPAWNS_L2.boss, type: "radboss", triggerX: 232 },
      checkpoints: [58, 116, 174, 220],
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
      levelNum: 19,
      isVertical: true,
      name: "NIVEL 19: TORRE DEL CATACLISMO",
      campaign: campaignLevel(19),
      bossSpawn: { ...SPAWNS_L3.boss, type: "alien_ship", triggerY: 36 },
      checkpoints: [166, 142, 118, 90, 62],
    };
  }

  function sculptRoute(tiles, tileMeta, design, W, H, gy) {
    const routeEnd = W - 50;
    const sectorW = Math.floor(routeEnd / 4);
    const safePut = (x, y, id, landmark) => {
      x = Math.round(x);
      y = Math.round(y);
      put(tiles, x, y, id);
      if (landmark && y >= 0 && y < H && x >= 0 && x < W) tileMeta[y][x] = { landmark };
    };

    design.route.forEach((pattern, sector) => {
      const start = sector * sectorW + 5;
      const end = sector === 3 ? routeEnd - 4 : (sector + 1) * sectorW - 4;
      const mark = design.setPieces[sector];

      if (pattern === "docks") {
        for (let x = start; x < end; x += 11) {
          const y = gy - 2 - ((x / 11 + sector) % 2);
          for (let i = 0; i < 6 && x + i < end; i++) safePut(x + i, y, T.BRIDGE, i === 0 ? mark : null);
        }
      } else if (pattern === "steps") {
        for (let x = start; x < end; x += 10) {
          const height = 1 + (Math.floor((x - start) / 10) % 3);
          for (let i = 0; i < 3; i++) for (let h = 1; h <= height; h++) safePut(x + i, gy - h, h === height ? T.CRATE : T.BRICK, i === 0 && h === height ? mark : null);
        }
      } else if (pattern === "arches") {
        for (let x = start; x < end - 7; x += 14) {
          for (let h = 1; h <= 3; h++) {
            safePut(x, gy - h, T.CASTLE);
            safePut(x + 7, gy - h, T.CASTLE);
          }
          for (let i = 0; i <= 7; i++) safePut(x + i, gy - 5, T.BRIDGE, i === 3 ? mark : null);
        }
      } else if (pattern === "towers") {
        for (let x = start; x < end - 3; x += 15) {
          const height = 3 + (Math.floor((x - start) / 15) % 3);
          for (let i = 0; i < 3; i++) for (let h = 1; h <= height; h++) safePut(x + i, gy - h, T.CASTLE, i === 1 && h === height ? mark : null);
          for (let i = -3; i < 6; i++) safePut(x + i, gy - height - 1, T.PLATFORM);
        }
      } else if (pattern === "tunnels") {
        for (let x = start; x < end; x++) if ((x - start) % 13 < 9) safePut(x, 5 + sector % 2, T.PIPE, (x - start) === 3 ? mark : null);
        for (let x = start + 9; x < end; x += 13) for (let h = 1; h <= 2; h++) safePut(x, gy - h, T.PIPE);
      } else if (pattern === "basin") {
        for (let x = start; x < end; x += 18) {
          for (let i = 0; i < 5 && x + i < end; i++) safePut(x + i, gy - 4, T.PLATFORM, i === 2 ? mark : null);
          for (let i = 8; i < 14 && x + i < end; i++) safePut(x + i, gy - 1, T.BRIDGE);
        }
      } else if (pattern === "zigzag") {
        for (let x = start, n = 0; x < end; x += 8, n++) {
          const y = gy - (n % 2 ? 5 : 2);
          for (let i = 0; i < 5 && x + i < end; i++) safePut(x + i, y, T.PLATFORM, i === 2 && n === 1 ? mark : null);
        }
      } else if (pattern === "chambers") {
        for (let x = start; x < end - 9; x += 16) {
          for (let h = 1; h <= 4; h++) {
            safePut(x, gy - h, T.BLOCK);
            safePut(x + 9, gy - h, T.BLOCK);
          }
          for (let i = 0; i <= 9; i++) safePut(x + i, gy - 6, T.BLOCK, i === 4 ? mark : null);
        }
      } else if (pattern === "islands") {
        for (let x = start, n = 0; x < end; x += 10, n++) {
          const y = gy - 2 - (n % 3) * 2;
          for (let i = 0; i < 6 && x + i < end; i++) safePut(x + i, y, T.GRASS, i === 2 && n === 1 ? mark : null);
        }
      } else if (pattern === "canopy") {
        for (let x = start; x < end; x++) if ((x - start) % 17 < 12) safePut(x, gy - 7, T.GRASS, (x - start) === 5 ? mark : null);
        for (let x = start + 6; x < end; x += 17) safePut(x, gy - 3, T.PLATFORM);
      } else if (pattern === "rails") {
        // Tramos elevados con huecos amplios: evocan vagones/vias sin crear
        // un techo bajo que encierre al jugador contra la primera cobertura.
        for (let x = start; x < end; x++) if ((x - start) % 14 < 8) safePut(x, gy - 7, T.BRIDGE, (x - start) === 5 ? mark : null);
        for (let x = start + 3; x < end; x += 14) safePut(x, gy - 10, T.PLATFORM);
      } else if (pattern === "trenches") {
        for (let x = start; x < end; x += 12) {
          for (let i = 0; i < 3; i++) for (let h = 1; h <= 2; h++) safePut(x + i, gy - h, T.BRICK, i === 1 && h === 2 ? mark : null);
          for (let i = 6; i < 10 && x + i < end; i++) safePut(x + i, gy - 1, T.BRIDGE);
        }
      }
    });
  }

  function sculptBossArena(tiles, cfg, arenaStart, gy, W) {
    const putSafe = (x, y, id) => put(tiles, x, y, id);
    const block = (x, height, id = T.BRICK, width = 2) => {
      for (let xx = 0; xx < width; xx++) for (let h = 1; h <= height; h++) putSafe(x + xx, gy - h, id);
    };
    const ledge = (x, y, width, id = T.PLATFORM) => {
      for (let i = 0; i < width; i++) putSafe(x + i, y, id);
    };
    const boss = cfg.bossType;
    // Cada arena utiliza estructuras físicas claras y bajas; las formas
    // cambian la ruta de esquiva sin bloquear la puerta ni crear colisiones
    // que no correspondan a un tile dibujado.
    if (["hammer_shark", "seaking"].includes(boss)) {
      ledge(arenaStart + 5, gy - 3, 5, T.BRIDGE); ledge(arenaStart + 20, gy - 4, 5, T.BRIDGE);
    } else if (boss === "sewer_kraken") {
      block(arenaStart + 6, 2, T.PIPE, 2); block(arenaStart + 24, 2, T.PIPE, 2); ledge(arenaStart + 14, gy - 4, 5);
    } else if (boss === "siren_warlord") {
      ledge(arenaStart + 4, gy - 4, 6); ledge(arenaStart + 22, gy - 4, 6); block(arenaStart + 15, 1, T.CRATE, 2);
    } else if (["magma_eel_lord", "magma_emperor"].includes(boss)) {
      ledge(arenaStart + 5, gy - 3, 5); ledge(arenaStart + 21, gy - 5, 6); block(arenaStart + 15, 1, T.CRATE, 2);
    } else if (boss === "crab_tank") {
      block(arenaStart + 5, 2, T.BRICK, 3); block(arenaStart + 23, 2, T.BRICK, 3); ledge(arenaStart + 14, gy - 4, 5, T.BRIDGE);
    } else if (boss === "ferro_worm" || boss === "atomic_locomotive") {
      ledge(arenaStart + 3, gy - 6, 9, T.BRIDGE); ledge(arenaStart + 19, gy - 6, 9, T.BRIDGE); block(arenaStart + 14, 1, T.CRATE, 2);
    } else if (boss === "admiral_octopus") {
      ledge(arenaStart + 4, gy - 3, 6, T.BRIDGE); ledge(arenaStart + 21, gy - 3, 6, T.BRIDGE); block(arenaStart + 15, 2, T.CRATE, 2);
    } else if (boss === "ash_golem") {
      block(arenaStart + 6, 3, T.CASTLE, 2); block(arenaStart + 23, 3, T.CASTLE, 2); ledge(arenaStart + 14, gy - 5, 5);
    } else if (boss === "spore_hydra") {
      block(arenaStart + 6, 2, T.GRASS, 2); block(arenaStart + 24, 2, T.GRASS, 2); ledge(arenaStart + 14, gy - 4, 5);
    } else if (boss === "gamma_excavator") {
      block(arenaStart + 5, 2, T.BRICK, 3); block(arenaStart + 23, 2, T.BRICK, 3); ledge(arenaStart + 15, gy - 5, 4, T.BRIDGE);
    } else if (boss === "isotope_doctor") {
      block(arenaStart + 6, 2, T.PIPE, 2); block(arenaStart + 24, 2, T.PIPE, 2); ledge(arenaStart + 14, gy - 4, 5);
    } else if (boss === "omega_sentinel") {
      block(arenaStart + 5, 2, T.CASTLE, 2); block(arenaStart + 24, 2, T.CASTLE, 2); ledge(arenaStart + 15, gy - 4, 4);
    } else if (boss === "xeno_carrier") {
      ledge(arenaStart + 3, gy - 5, 8); ledge(arenaStart + 20, gy - 5, 8); block(arenaStart + 14, 1, T.CRATE, 2);
    } else if (boss === "tri_oracle") {
      ledge(arenaStart + 4, gy - 4, 5); ledge(arenaStart + 15, gy - 6, 5); ledge(arenaStart + 25, gy - 4, 4);
    } else if (boss === "cataclysm_architect") {
      block(arenaStart + 6, 2, T.CASTLE, 2); block(arenaStart + 23, 2, T.CASTLE, 2); ledge(arenaStart + 14, gy - 5, 5);
    }
  }

  // Un segundo mapa vertical de verdad: no recicla la Torre. La ciudad se
  // recorre por islas escalonadas y balcones alternos; el viento se expresa
  // con espacios abiertos y plataformas de aterrizaje, no con paredes
  // invisibles ni saltos imposibles.
  function buildSkyCityLevel(num) {
    const cfg = campaignLevel(num);
    const W = 42;
    const H = 136;
    const floorY = 132;
    const tiles = Array.from({ length: H }, () => Array(W).fill(T.EMPTY));
    const tileMeta = Array.from({ length: H }, () => Array(W).fill(null));
    const floors = [120, 108, 96, 84, 72, 60, 48, 36];
    const verticalBotGoals = [];

    for (let x = 0; x < W; x++) {
      for (let y = floorY; y < H; y++) tiles[y][x] = y === floorY ? T.GRASS : T.DIRT;
    }
    for (let y = 22; y <= floorY; y++) {
      tiles[y][0] = T.CASTLE;
      tiles[y][1] = T.CASTLE;
      tiles[y][W - 2] = T.CASTLE;
      tiles[y][W - 1] = T.CASTLE;
    }

    const ledge = (x, y, width, id = T.PLATFORM, landmark) => {
      for (let i = 0; i < width; i++) {
        put(tiles, x + i, y, id);
        if (landmark && i === Math.floor(width / 2)) tileMeta[y][x + i] = { landmark };
      }
    };
    // Escalera aérea continua. Cada salto asciende cuatro tiles y conecta
    // con el siguiente balcón; el clásico puede terminarla y el Ágil puede
    // recortar trayectos con su doble salto. Los restos laterales son sólo
    // decoración/cobertura, no barreras de una pantalla a la otra.
    // El carril central hace de ascensor de ruinas: es la ruta segura y
    // legible. Los balcones laterales quedan como desvíos para movilidad y
    // combate, no como un requisito de precisión horizontal ciega.
    const stairX = [17, 17, 17, 17];
    for (let fy = 128, step = 0; fy >= 24; fy -= 4, step++) {
      const x = stairX[step % stairX.length];
      ledge(x, fy, 8, T.PLATFORM, step % 6 === 0 ? cfg.title : null);
      verticalBotGoals.push({ x: (x + 3) * TILE, fy });
      if (step % 3 === 1) {
        const decorX = x < 18 ? W - 7 : 3;
        ledge(decorX, fy + 1, 4, T.BRIDGE);
        put(tiles, decorX + 1, fy, T.CRATE);
      }
    }
    ledge(17, 20, 8, T.PLATFORM, "PUERTA DEL TEMPLO");
    verticalBotGoals.push({ x: 20 * TILE, fy: 20 });

    // Santuario del Oráculo: tres islas, cada una con una altura y cobertura
    // diferente para que los rayos y ecos del jefe tengan contrajuego real.
    ledge(4, 31, 10, T.BRIDGE, "JARDIN DEL ORACULO");
    ledge(16, 27, 10, T.PLATFORM, "TEMPLO DE TRES ISLAS");
    ledge(28, 31, 10, T.BRIDGE, "JARDIN DEL ORACULO");
    ledge(16, 22, 10, T.PLATFORM);
    for (let x = 14; x <= 27; x++) tiles[34][x] = T.BRIDGE;

    for (let y = 10; y <= 16; y++) {
      tiles[y][18] = T.CASTLE;
      tiles[y][23] = T.CASTLE;
    }
    for (let x = 18; x <= 23; x++) tiles[10][x] = T.CASTLE;
    tiles[16][20] = T.DOOR;
    tiles[16][21] = T.DOOR;
    tiles[15][20] = T.DOOR;
    tiles[15][21] = T.DOOR;

    const enemySpawns = [
      [20, 122, "firebat"], [8, 114, "xeno_scout"], [31, 102, "tractor_unit"],
      [10, 91, "radstar"], [30, 79, "xeno_scout"], [8, 68, "firebat"],
      [31, 56, "tractor_unit"], [12, 45, "radstar"], [29, 38, "xeno_scout"],
    ].map(([tileX, tileY, type]) => ({ tileX, tileY, type }));
    const bossSpawn = { tileX: 21, tileY: 29, type: cfg.bossType, label: "ORACULO", triggerY: 35 };
    return {
      tiles,
      tileMeta,
      lavaSpawns: [],
      worldW: W,
      worldH: H,
      groundY: floorY,
      doorX: 20 * TILE,
      doorY: 15 * TILE,
      zones: [
        { id: "sky_docks", name: "MUELLES DE NUBES", x0: 0, x1: W },
        { id: "sky_temple", name: "TEMPLO DEL ORACULO", x0: 0, x1: W },
      ],
      spawns: { enemySpawns, boss: bossSpawn },
      enemySpawns,
      bossSpawn,
      checkpoints: [120, 96, 72, 48, 36],
      verticalFloors: [20, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132],
      verticalBotGoals,
      verticalStartY: floorY,
      verticalHazard: false,
      levelNum: num,
      isVertical: true,
      campaign: cfg,
      name: `NIVEL ${num}: ${cfg.title}`,
      theme: cfg.theme,
      mechanic: cfg.mechanic,
      design: LEVEL_DESIGNS[num],
    };
  }

  function buildGeneratedLevel(num) {
    const cfg = campaignLevel(num);
    const W = cfg.worldW || 280;
    const H = WORLD_H;
    const gy = H - 3;
    const tiles = Array.from({ length: H }, () => Array(W).fill(T.EMPTY));
    const tileMeta = Array.from({ length: H }, () => Array(W).fill(null));
    const pits = [];
    const design = LEVEL_DESIGNS[num];

    // Fosos cortos y espaciados: siempre hay una plataforma o puente de
    // salvamento, pero la distancia entre retos aumenta con la campaña.
    const pitCount = 5 + Math.floor(num / 4);
    const gap = Math.max(24, Math.floor((W - 70) / pitCount));
    for (let i = 0; i < pitCount; i++) {
      const start = 18 + i * gap + ((num * 11 + i * 7) % 7);
      const width = 3 + ((num + i * 2) % (num >= 10 ? 5 : 4));
      if (start + width < W - 55) pits.push([start, start + width]);
    }
    const inPit = (x) => pits.some(([a, b]) => x >= a && x < b);

    for (let x = 0; x < W; x++) {
      const pit = inPit(x);
      if (pit) {
        tiles[H - 1][x] = T.LAVA;
        tiles[H - 2][x] = T.LAVA;
      } else {
        tiles[H - 1][x] = T.DIRT;
        tiles[H - 2][x] = T.DIRT;
        tiles[gy][x] = T.GRASS;
      }
    }

    pits.forEach(([a, b], i) => {
      const bridgeY = gy - (i % 3 === 0 ? 2 : 1);
      for (let x = a - 1; x <= b; x++) put(tiles, x, bridgeY, i % 2 ? T.PLATFORM : T.BRIDGE);
      if (cfg.mechanic === "corriente" || cfg.mechanic === "viento") {
        for (let x = a; x < b; x++) put(tiles, x, bridgeY - 3, T.PLATFORM);
      }
    });

    // Coberturas y cambios de altura. El patrón depende del acto para evitar
    // que todos los mapas sean una repetición del mismo foso.
    const obstacleStep = num < 6 ? 34 : num < 11 ? 28 : 24;
    for (let x = 12; x < W - 58; x += obstacleStep) {
      if (inPit(x) || inPit(x + 1)) continue;
      const height = 1 + ((x + num) % (num >= 12 ? 4 : 3));
      const width = 2 + ((x + num * 3) % 4);
      for (let bx = x; bx < Math.min(W - 58, x + width); bx++) {
        for (let h = 1; h <= height; h++) put(tiles, bx, gy - h, h === height && height > 1 ? T.CRATE : T.BRICK);
      }
      if (num % 3 === 0) {
        put(tiles, x + width + 2, gy - height - 1, T.PLATFORM);
        put(tiles, x + width + 3, gy - height - 1, T.PLATFORM);
      }
    }

    // La ruta temática se superpone al terreno seguro y crea una silueta,
    // lectura vertical y puntos de combate distintos en cada sector.
    sculptRoute(tiles, tileMeta, design, W, H, gy);

    // Arena aislada y reconocible al final de cada mapa.
    const arenaStart = W - 48;
    for (let x = arenaStart; x < W - 7; x++) {
      tiles[gy][x] = T.BRIDGE;
      if (x === arenaStart) {
        for (let y = gy - 1; y >= gy - 4; y--) put(tiles, x, y, T.BRICK);
      }
    }
    const cx = W - 8;
    for (let y = 5; y <= 10; y++) {
      put(tiles, cx, y, T.CASTLE);
      put(tiles, cx + 5, y, T.CASTLE);
    }
    for (let x = cx; x <= cx + 5; x++) {
      put(tiles, x, 5, T.CASTLE);
      if ((x - cx) % 2 === 0) put(tiles, x, 4, T.CASTLE);
    }
    put(tiles, cx + 2, gy - 1, T.DOOR);
    put(tiles, cx + 3, gy - 1, T.DOOR);
    put(tiles, cx + 2, gy - 2, T.DOOR);
    put(tiles, cx + 3, gy - 2, T.DOOR);

    sculptBossArena(tiles, cfg, arenaStart, gy, W);

    const zones = [];
    const zoneNames = design.setPieces.map((name) => name.toUpperCase()).concat([design.arenaPattern.replace(/-/g, " ").toUpperCase()]);
    for (let i = 0; i < zoneNames.length; i++) {
      const x0 = Math.floor((W - 48) * i / 4);
      const x1 = i === 4 ? W : Math.floor((W - 48) * (i + 1) / 4);
      zones.push({ id: `l${num}_${i}`, name: `${zoneNames[i]} · ${cfg.title}`, x0, x1 });
    }

    const enemySpawns = [];
    const spawnTypes = cfg.enemyTypes || ["shark"];
    const flyingTypes = new Set(["radstar", "firebat", "drone", "xeno_scout", "skimmer", "bombardier", "spore"]);
    let spawnIndex = 0;
    const encounterGap = Math.max(15, 25 - Math.floor(cfg.difficulty / 2));
    for (let x = 28; x < arenaStart - 10; x += encounterGap) {
      let sx = x;
      for (const [a, b] of pits) if (sx >= a - 2 && sx <= b + 2) sx = b + 3;
      if (sx >= arenaStart - 10) break;
      const squadSize = cfg.difficulty < 4 ? (spawnIndex % 3 === 2 ? 2 : 1) : cfg.difficulty < 7 ? 2 : 2 + (spawnIndex % 3 === 0 ? 1 : 0);
      for (let member = 0; member < squadSize; member++) {
        const type = spawnTypes[(spawnIndex + member) % spawnTypes.length];
        const flyer = flyingTypes.has(type);
        const offset = member === 0 ? 0 : member % 2 ? 3 + member : -(3 + member);
        let memberX = Math.max(5, sx + offset);
        for (const [a, b] of pits) if (memberX >= a - 1 && memberX <= b + 1) memberX = b + 3;
        if (memberX < arenaStart - 8) enemySpawns.push({ tileX: memberX, tileY: flyer ? gy - 3 - ((spawnIndex + member) % 3) : gy, type });
      }
      spawnIndex += squadSize;
    }

    const checkpoints = [0.24, 0.48, 0.70, 0.86].map((ratio) => Math.floor((arenaStart - 8) * ratio));
    const bossTileY = ["xeno_carrier", "tri_oracle", "cataclysm_architect"].includes(cfg.bossType) ? gy - 4 : gy;
    const generatedBoss = { tileX: W - 25, tileY: bossTileY, type: cfg.bossType, label: "BOSS", triggerX: arenaStart };
    return {
      tiles,
      tileMeta,
      lavaSpawns: [],
      worldW: W,
      worldH: H,
      groundY: gy,
      doorX: (cx + 2) * TILE,
      zones,
      spawns: { enemySpawns, boss: generatedBoss },
      enemySpawns,
      bossSpawn: generatedBoss,
      checkpoints,
      levelNum: num,
      campaign: cfg,
      name: `NIVEL ${num}: ${cfg.title}`,
      theme: cfg.theme,
      mechanic: cfg.mechanic,
      lavaChase: cfg.bossType === "xeno_carrier",
      design,
    };
  }

  function buildLevel(num) {
    const safeNum = Math.max(1, Math.min(CAMPAIGN_LEVELS.length, Number(num) || 1));
    const cfg = campaignLevel(safeNum);
    if (cfg.existing === "level1") return buildLevel1();
    if (cfg.existing === "level2") return buildLevel2();
    if (cfg.existing === "level3") return buildLevel3();
    if (cfg.vertical === "ascend") return buildSkyCityLevel(safeNum);
    return buildGeneratedLevel(safeNum);
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
      id === T.CRATE
    );
  }

  function oneWay(id) {
    // PLATFORM y BRIDGE se dibujan como superficies delgadas. Ambos deben
    // comportarse como plataformas de una dirección; tratarlos como cubos
    // completos crea paredes laterales invisibles de 48 px.
    return id === T.PLATFORM || id === T.BRIDGE;
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
  exports.CAMPAIGN_LEVELS = CAMPAIGN_LEVELS;
  exports.campaignLevel = campaignLevel;
  exports.buildLevel = buildLevel;
  exports.buildLevel1 = buildLevel1;
  exports.buildLevel2 = buildLevel2;
  exports.buildLevel3 = buildLevel3;
  exports.solid = solid;
  exports.oneWay = oneWay;
  exports.zoneAt = zoneAt;
  exports.maxJumpHeight = maxJumpHeight;
  exports.maxJumpTiles = maxJumpTiles;
  exports.maxJumpDist = maxJumpDist;
  exports.inLava = inLava;
})(typeof module !== "undefined" && module.exports ? module.exports : (window.YAEL_LEVEL = {}));
