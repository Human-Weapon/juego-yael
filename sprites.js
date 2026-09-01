(function (exports) {
  "use strict";

  const P = {
    ".": null,
    k: "#07060c",
    n: "#161b28",
    i: "#2c3a4d",
    s: "#7b8ea8",
    g: "#e0b33a",
    c: "#5cf6ff",
    b: "#0b6f7c",
    r: "#9b1d3a",
    w: "#f3f6ff",
    o: "#d35400",
    p: "#6c2bd9",
    m: "#3a1d6e",
    t: "#1d8a8a",
    a: "#9be7de",
    e: "#ff6b35",
    y: "#f4d35e",
    h: "#5c4033",
    u: "#c4a484",
    d: "#8d99ae",
    f: "#ef233c",
    x: "#111318",
    z: "#94d2bd",
    q: "#c77dff",
    l: "#ffba08",
    v: "#0077b6",
    j: "#90e0ef",
    "1": "#39ff14",
    "2": "#70e000",
    "3": "#38b000",
    "4": "#007200",
    "5": "#ccff33",
    "6": "#ff3c00",
    "7": "#ff7b00",
    "8": "#ffaa00",
    "9": "#ffe600",
    "0": "#4a1005",
  };

  function bake(map, scale) {
    const rows = map.trim().split("\n").map((r) => r.trimEnd());
    const h = rows.length;
    const w = Math.max.apply(null, rows.map((r) => r.length));
    const c = document.createElement("canvas");
    c.width = w * scale;
    c.height = h * scale;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = P[row[x]];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return c;
  }

  function make() {
    const S = 3;
    const player = {
      idle: bake(`
......gggg......
.....gnnnng.....
....gnnnnngg....
....gnccccnk....
....gnccccnk....
.....nnnnnn.....
....gsnnnsg.....
...nngnnngnn....
...nn.ggg.nn....
...rrnnnnnrr....
...rrnnnnnrr....
...rrnn.nnrr....
...rrn...nrr....
....nn...nn.....
....ni...in.....
....kk...kk.....
`, S),
      run1: bake(`
......gggg......
.....gnnnng.....
....gnnnnngg....
....gnccccnk....
....gnccccnk....
.....nnnnnn.....
....gsnnnsg.....
...nngnnngnn....
...nn.ggg.nn....
...rrnnnnnrr....
...rrnnnnnrr....
..rrrnn.nnrr....
....nn...nrr....
....n....nn.....
...kk....in.....
...kk....kk.....
`, S),
      run2: bake(`
......gggg......
.....gnnnng.....
....gnnnnngg....
....gnccccnk....
....gnccccnk....
.....nnnnnn.....
....gsnnnsg.....
...nngnnngnn....
...nn.ggg.nn....
...rrnnnnnrr....
...rrnnnnnrr....
...rrnn.nnrrr...
...rrn...nn.....
....nn....n.....
....in....kk....
....kk....kk....
`, S),
      jump: bake(`
......gggg......
.....gnnnng.....
....gnnnnngg....
....gnccccnk....
....gnccccnk....
.....nnnnnn.....
....gsnnnsg.....
...nngnnngnn....
...nn.ggg.nn....
..rrrnnnnnrrr...
..rr.nnnnn.rr...
..rr.nn.nn.rr...
....nn...nn.....
...nni...inn....
...kk.....kk....
................
`, S),
      crouch: bake(`
................
................
......gggg......
.....gnnnng.....
....gnccccnk....
....gnccccnk....
.....nnnnnn.....
....gsnnnsgg....
...nngggggnn....
...rrnnnnnrr....
...rrnnnnnrr....
...rrnnnnnrr....
....nnnnnnn.....
....kk...kk.....
`, S),
    };

    const shark = {
      idle: bake(`
...........aa...
....ttttttaat...
...tttttttttt...
..ttwwttttttt...
.ttwwwwttffttk..
.ttwwwwttfftt...
.ttttttttttt....
..ttttttttk.....
..k..k..k.......
`, S),
      walk: bake(`
...........aa...
....ttttttaat...
...tttttttttt...
..ttwwttttttt...
.ttwwwwttffttk..
.ttwwwwttfftt...
.ttttttttttt....
...tttttttk.....
.k.....k........
`, S),
    };

    const octopus = {
      idle: bake(`
......pppp......
....ppmmmmmp....
...pmmqqqqmmp...
...pmqwwqqmmp...
...pmmqqqqmmp...
....pmmmmmm.....
...p.pppppp.p...
..p.p.p..p.p.p..
..p.p.p..p.p.p..
`, S),
      walk: bake(`
......pppp......
....ppmmmmmp....
...pmmqqqqmmp...
...pmqwwqqmmp...
...pmmqqqqmmp...
....pmmmmmm.....
..p..pppppp..p..
.p.p.p....p.p.p.
....p......p....
`, S),
    };

    const eel = {
      idle: bake(`
................
.ee...ee...ll...
eeeeeeeeeeeelk..
.eelllleeeeeee..
....ee...ee.....
`, S),
      walk: bake(`
................
..ee.ee....ll...
.eeeeeeeeeeelk..
eeelllleeeeeee..
.ee..ee...ee....
`, S),
    };

    const crab = {
      idle: bake(`
.ll..........ll.
..l..ffffff..l..
...fffffffff....
.llffyyyyyffll..
ll.ffyyyyyff.ll.
...fffffffff....
...ff.....ff....
...kk.....kk....
`, S),
      walk: bake(`
ll............ll
.l...ffffff...l.
...fffffffff....
.llffyyyyyffll..
ll.ffyyyyyff.ll.
...fffffffff....
..ff.......ff...
.kk.........kk..
`, S),
    };

    const seaking = {
      idle: bake(`
.............vv.....
............vvvv....
.....vvvvvvvvvvv....
...vvvvvvvvvvvvvv...
..vvjjjvvvvvvvvvvv..
.vvjjjjjvvvwwvvvvv..
.vvjjjjjvvvwwvvfvv..
.vvvvvvvvvvvvvvvvv..
..vvvvvvvvvvvvvvv...
...vvv....vvv.......
...ll......ll.......
`, 3),
      walk: bake(`
..............vv....
............vvvv....
.....vvvvvvvvvvv....
...vvvvvvvvvvvvvv...
..vvjjjvvvvvvvvvvv..
.vvjjjjjvvvwwvvvvv..
.vvjjjjjvvvwwvvfvv..
.vvvvvvvvvvvvvvvvv..
..vvvvvvvvvvvvvvv...
....vvv....vvv......
....ll......ll......
`, 3),
    };

    const guns = {
      ar: bake(`
kkiiiiikkkkkkkss
kkiiiiiknnnnkkcc
`, 2),
      magnum: bake(`
..kkggkkkk......
kkkkggkkssgg....
`, 2),
      shotgun: bake(`
kkhhhhhhhhkkkkkk
kkhhhhhhkkssss..
`, 2),
      plasma: bake(`
kkmppqqkkkqqqqcc
kkmppqqkkmmkk...
`, 2),
    };

    const radstar = {
      idle: bake(`
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
`, S),
      walk: bake(`
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
`, S),
      shoot: bake(`
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
`, S),
    };

    const radboss = {
      idle: bake(`
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
`, 4),
      walk: bake(`
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
.k006677....k88899888k...776600k..
.k00667k....k88899888k....k76600k.
..k0666k....k88899888k....k66600k.
..k0666k....k88899888k.....k6660k.
..kk66k.....k88899888k......k66kk.
...kkk......k88899888k.......kkk..
...........kk88899888kk...........
..........kk8888998888kk..........
.........kkk8888888888kkk.........
`, 4),
      charge: bake(`
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
`, 4),
      attack: bake(`
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
`, 4),
      overheat: bake(`
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
`, 4),
    };

    const alien_ship = {
      idle: bake(`
................kkkkkkkk................
..............kk44555544kk..............
.............k4555wwww5554k.............
............k45wwwwwwwwww54k............
.kkk.......k45wwwwwwwwwwww54k.......kkk.
k666kk....kk4455555555555544kk....kk666k
k88899kkkkffccccccccccccccccffkkkk99888k
k8899ww9ffffccccccccccccccccffff9ww9988k
.k8999ffffffffffffffffffffffffffff9998k.
..kkffffccccffffccccccccffffccccffffkk..
...kffffccccffffccccccccffffccccffffk...
....kkffffffffffffffffffffffffffffkk....
......kkkfff0000000000000000fffkkk......
........kk00ffffffffffffffff00kk........
..........kkk11111111111111kkk..........
.............kkkkkkkkkkkkkk.............
`, 4),
      walk: bake(`
................kkkkkkkk................
..............kk44555544kk..............
.............k4555wwww5554k.............
............k45wwwwwwwwww54k............
.kkk.......k45wwwwwwwwwwww54k.......kkk.
k888kk....kk4455555555555544kk....kk888k
k999wwkkkkffccccccccccccccccffkkkkww999k
k99wwww9ffffccccccccccccccccffff9wwww99k
.k9999ffffffffffffffffffffffffffff9999k.
..kkffffccccffffccccccccffffccccffffkk..
...kffffccccffffccccccccffffccccffffk...
....kkffffffffffffffffffffffffffffkk....
......kkkfff8888999999998888fffkkk......
........kk99wwwwwwwwwwwwwwww99kk........
..........kkkffffffffffffffkkk..........
.............kkkkkkkkkkkkkk.............
`, 4),
      laser: bake(`
................kkkkkkkk................
..............kk44555544kk..............
.............k4555wwww5554k.............
............k45wwwwwwwwww54k............
.kkk.......k45wwwwwwwwwwww54k.......kkk.
k666kk....kk4455555555555544kk....kk666k
k88899kkkkffccccccccccccccccffkkkk99888k
k8899ww9ffffccccccccccccccccffff9ww9988k
.k8999ffffffffffffffffffffffffffff9998k.
..kkffffccccffff88888888ffffccccffffkk..
...kffffccccffff99wwww99ffffccccffffk...
....kkffffffffff99wwww99ffffffffffkk....
......kkkfff000099wwww990000fffkkk......
........kk00ffff99wwww99ffff00kk........
..........kkk11188999988111kkk..........
.............kkk88999988kkk.............
`, 4),
      tractor: bake(`
................kkkkkkkk................
..............kk44555544kk..............
.............k4555wwww5554k.............
............k45wwwwwwwwww54k............
.kkk.......k45wwwwwwwwwwww54k.......kkk.
k666kk....kk4455555555555544kk....kk666k
k88899kkkkffccccccccccccccccffkkkk99888k
k8899ww9ffffccccccccccccccccffff9ww9988k
.k8999ffffffffffffffffffffffffffff9998k.
..kkffffccccffffccccccccffffccccffffkk..
...kffffccccffff55wwww55ffffccccffffk...
....kkffffffffff55wwww55ffffffffffkk....
......kkkfff000055wwww550000fffkkk......
........kk00ffff55wwww55ffff00kk........
..........kkk11144555544111kkk..........
.............kkk44555544kkk.............
`, 4),
      stun: bake(`
................kkkkkkkk................
..............kk44555544kk..............
.............k4555wwww5554k.............
............k45wwwwwwwwww54k............
.kkk.......k45wwwwwwwwwwww54k.......kkk.
k999kk....kk4455555555555544kk....kk999k
kwww99kkkkffccccccccccccccccffkkkk99wwwk
kwwwwww9ffffccccccccccccccccffff9wwwwwwk
.kwww9ffffffffffffffffffffffffffff9wwwk.
..kkffffccccffffccccccccffffccccffffkk..
...kffffccccffffccccccccffffccccffffk...
....kkffffffffffffffffffffffffffffkk....
......kkkfff9999wwwwwwww9999fffkkk......
........kkww9999wwwwwwww9999wwkk........
..........kkk99999999999999kkk..........
.............kkkkkkkkkkkkkk.............
`, 4),
    };

    // Nueva familia de sprites de campaña. Son rasterizados en una cuadrícula
    // de píxeles (no polígonos de fallback) y cada ficha tiene una silueta y
    // accesorios diferentes: ojos, casco, garras, motores, armas o coronas.
    function combatSprite(type, boss) {
      const u = boss ? 4 : 3, W = boss ? 28 : 18, H = boss ? 21 : 16;
      const c = document.createElement("canvas"); c.width = W * u; c.height = H * u;
      const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
      const C = { k:"#07060c", n:"#161b28", i:"#2c3a4d", s:"#8d99ae", c:"#5cf6ff", q:"#c77dff", r:"#9b1d3a", e:"#ff6b35", l:"#ffba08", y:"#f4d35e", f:"#ef233c", a:"#9be7de", g:"#70e000", p:"#6c2bd9", o:"#ff7b00", w:"#f3f6ff", h:"#5c4033" };
      const px=(x,y,w,h,z)=>{g.fillStyle=C[z]||z;g.fillRect(x*u,y*u,w*u,h*u);};
      const box=(x,y,w,h,z)=>{px(x,y,w,h,"k");px(x+1,y+1,w-2,h-2,z);};
      const eye=(x,y,z="c")=>{px(x,y,3,2,"k");px(x+1,y,1,1,z);};
      const core=(x,y,z="c")=>{px(x,y,4,4,"k");px(x+1,y+1,2,2,z);};
      const leg=(x,y,dx,dy,z="s")=>{px(x,y,2,2,z);px(x+dx,y+dy,2,2,z);};
      const traits = {
        piranha:["fish","y","n"], firebat:["bat","o","f"], turret:["turret","c","i"], shield:["guard","c","i"], mine:["mine","l","n"], drone:["drone","q","i"], sniper:["sniper","c","n"], slime:["slime","g","g"], spore:["spore","g","a"], mutant:["mutant","f","e"], teleporter:["teleporter","q","p"], xeno_scout:["scout","c","i"], tractor_unit:["tractor","c","s"], mimic:["mimic","o","r"],
        hammer_shark:["hammer","e","s"], sewer_kraken:["kraken","q","p"], siren_warlord:["siren","f","r"], magma_eel_lord:["serpent","o","e"], crab_tank:["tank","c","i"], ferro_worm:["worm","l","s"], admiral_octopus:["admiral","q","p"], ash_golem:["golem","e","s"], magma_emperor:["emperor","o","r"], spore_hydra:["hydra","g","a"], gamma_excavator:["excavator","l","h"], isotope_doctor:["doctor","q","w"], atomic_locomotive:["locomotive","l","h"], omega_sentinel:["sentinel","c","i"], xeno_carrier:["carrier","c","i"], tri_oracle:["oracle","q","p"], cataclysm_architect:["architect","l","q"],
      };
      const t=traits[type]||["guard","c","i"], kind=t[0], glow=t[1], shell=t[2];
      if (!boss) {
        if(kind==="fish"){px(1,7,3,2,glow);box(3,5,11,7,shell);px(5,4,5,2,glow);px(4,12,5,1,"s");eye(10,6,glow);px(14,6,3,1,"k");px(15,7,2,2,glow);}
        else if(kind==="bat"){px(1,5,4,2,glow);px(3,4,3,2,shell);box(6,5,6,6,"n");px(7,3,3,2,"f");eye(8,6,"y");px(12,5,4,2,glow);px(7,11,1,3,"r");px(10,11,1,3,"r");}
        else if(kind==="turret"){box(4,8,10,6,shell);box(6,4,6,5,"n");px(10,5,6,2,"s");px(15,5,3,1,glow);core(7,5,glow);px(3,14,4,1,"s");px(11,14,4,1,"s");}
        else if(kind==="guard"){box(6,3,6,12,shell);px(7,4,4,3,"i");eye(8,5,glow);px(3,6,3,8,"s");px(2,7,2,6,glow);px(12,9,4,2,"r");leg(7,14,0,1);leg(10,14,0,1);}
        else if(kind==="mine"){box(5,5,8,7,"n");core(7,6,glow);for(let i=0;i<4;i++){px(3+i*4,3,1,2,"s");px(3+i*4,12,1,2,"s");}px(2,7,2,1,glow);px(14,7,2,1,glow);}
        else if(kind==="drone"||kind==="scout"){px(1,7,4,2,glow);px(13,7,4,2,glow);box(4,5,10,6,"n");px(6,4,6,2,shell);core(7,6,glow);px(7,11,1,3,"s");px(10,11,1,3,"s");}
        else if(kind==="sniper"){box(6,3,6,12,"n");px(7,4,4,3,"i");eye(8,5,glow);px(11,8,6,1,"s");px(15,7,2,3,glow);px(4,8,2,5,"r");leg(7,14,0,1);leg(10,14,0,1);}
        else if(kind==="slime"){px(3,12,12,2,glow);px(4,9,10,3,glow);px(6,6,6,3,"#38b000");px(7,5,4,2,"#ccff33");eye(6,9,"y");eye(10,9,"y");}
        else if(kind==="spore"){px(7,2,4,2,glow);px(4,4,10,7,"#2e5b28");px(5,3,2,2,"#ccff33");px(11,3,2,2,"#ccff33");core(7,6,"#ccff33");leg(6,11,-2,3,glow);leg(10,11,2,3,glow);}
        else if(kind==="mutant"){box(5,3,8,11,"#35110b");px(6,2,2,2,"f");px(10,2,2,2,"f");eye(8,5,glow);px(2,7,4,3,"f");px(12,8,5,2,"f");leg(4,12,0,2,"n");leg(11,12,0,2,"n");}
        else if(kind==="teleporter"){px(7,2,4,2,glow);box(5,4,8,11,shell);px(6,5,6,3,"n");eye(8,6,glow);px(4,9,2,4,"c");px(12,9,2,4,"c");leg(6,14,0,1,glow);leg(10,14,0,1,glow);}
        else if(kind==="tractor"){box(4,5,10,9,"#182b35");px(5,4,8,2,"s");core(7,7,glow);px(2,8,3,4,"i");px(13,8,3,4,"i");px(7,11,4,1,glow);}
        else {box(3,7,12,7,"#321a0d");px(4,5,10,3,glow);px(5,8,2,2,"w");px(8,8,2,2,"w");px(11,8,2,2,"w");px(5,4,2,2,"q");px(11,4,2,2,"q");leg(6,11,0,3,"r");leg(10,11,0,3,"r");}
      } else {
        // Cuerpo heroico común de boss, transformado individualmente con
        // las armas, cabezas y locomoción de cada arquetipo.
        box(7,7,14,10,shell); px(9,4,10,4,"n"); eye(14,5,glow); core(12,10,glow); leg(9,16,0,3,"s"); leg(17,16,0,3,"s");
        if(["kraken","admiral"].includes(kind)){for(let i=0;i<6;i++)leg(7+i*2,14,(i-3),5,glow);px(8,2,11,2,glow);eye(10,6,glow);eye(16,6,glow);}
        else if(kind==="siren"){px(11,1,2,4,"f");px(15,1,2,4,"f");px(4,10,4,2,"s");px(2,9,2,4,"f");px(20,10,6,1,"q");}
        else if(["serpent","worm"].includes(kind)){for(let i=0;i<5;i++){box(2+i*4,9+(i%2),6,6,shell);px(3+i*4,8+(i%2),4,1,glow);}px(21,8,5,3,glow);eye(22,9,"y");}
        else if(kind==="hammer"){px(3,5,7,4,"s");px(2,4,3,6,"s");px(19,7,7,2,glow);}
        else if(kind==="tank"){px(4,10,4,7,"s");px(20,10,4,7,"s");px(16,5,9,2,"s");for(let i=0;i<4;i++)core(5+i*5,16,"s");}
        else if(kind==="golem"){px(3,8,4,8,"s");px(21,8,4,8,"s");px(8,3,12,4,"s");eye(10,5,"e");eye(16,5,"e");}
        else if(kind==="emperor"){px(10,1,2,5,"y");px(14,0,2,6,"y");px(18,1,2,5,"y");px(2,8,6,3,glow);px(20,8,6,3,glow);}
        else if(kind==="hydra"){for(let i=0;i<3;i++){px(7+i*5,4-(i===1?2:0),3,7,glow);box(5+i*5,1-(i===1?2:0),6,5,"#18351b");eye(7+i*5,3-(i===1?2:0),"#ccff33");}}
        else if(kind==="excavator"){px(3,10,5,7,"h");px(16,7,10,3,glow);px(22,6,4,5,"s");for(let i=0;i<4;i++)core(5+i*4,16,glow);}
        else if(kind==="doctor"){px(8,8,12,9,"w");px(5,10,3,5,"g");px(20,10,3,5,"q");px(12,3,4,4,"#2b1738");}
        else if(kind==="locomotive"){px(2,10,20,7,"h");px(7,4,7,6,"h");px(16,7,7,3,glow);for(let i=0;i<4;i++)core(4+i*5,16,"s");}
        else if(kind==="sentinel"){px(4,7,4,9,"#163b4b");px(20,7,4,9,"#163b4b");px(2,11,3,2,glow);px(23,11,3,2,glow);}
        else if(kind==="carrier"){px(2,9,23,7,"#0d2635");px(5,5,15,4,"i");px(7,10,12,2,glow);core(9,13,glow);core(16,13,glow);}
        else if(kind==="oracle"){for(let i=0;i<3;i++){box(4+i*7,3-(i===1?2:0),6,6,"p");eye(6+i*7,5-(i===1?2:0),glow);}core(12,11,"y");}
        else {px(10,1,7,2,"y");px(3,5,3,3,"q");px(22,5,3,3,"q");px(2,15,5,2,"o");px(21,15,5,2,"o");}
      }
      return c;
    }
    // Los atlas son arte de imagen creado para el juego. Cada celda se copia
    // a su propio canvas, por lo que el render mantiene el pixelado nítido y
    // no depende de composiciones geométricas durante la partida.
    //
    // Algunas herramientas de arte entregan un fondo de referencia claro en
    // vez de alpha real. En los atlas que lo solicitan quitamos sólo el fondo
    // conectado al borde: así se conservan los brillos blancos encerrados en
    // la armadura y el sprite sigue siendo transparente en el mapa.
    function removeConnectedLightBackground(canvas) {
      const g = canvas.getContext("2d");
      const image = g.getImageData(0, 0, canvas.width, canvas.height);
      const data = image.data;
      const width = image.width;
      const height = image.height;
      const seen = new Uint8Array(width * height);
      const queue = [];
      const isBackground = (index) => {
        const r = data[index * 4];
        const green = data[index * 4 + 1];
        const b = data[index * 4 + 2];
        const a = data[index * 4 + 3];
        return a > 0 && r > 220 && green > 220 && b > 220 && Math.max(r, green, b) - Math.min(r, green, b) < 24;
      };
      const enqueue = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const index = y * width + x;
        if (!seen[index] && isBackground(index)) {
          seen[index] = 1;
          queue.push(index);
        }
      };
      for (let x = 0; x < width; x++) {
        enqueue(x, 0);
        enqueue(x, height - 1);
      }
      for (let y = 1; y < height - 1; y++) {
        enqueue(0, y);
        enqueue(width - 1, y);
      }
      for (let head = 0; head < queue.length; head++) {
        const index = queue[head];
        const x = index % width;
        const y = Math.floor(index / width);
        enqueue(x - 1, y);
        enqueue(x + 1, y);
        enqueue(x, y - 1);
        enqueue(x, y + 1);
      }
      for (const index of queue) data[index * 4 + 3] = 0;
      g.putImageData(image, 0, 0);
    }

    function opaqueBounds(canvas) {
      const g = canvas.getContext("2d");
      const image = g.getImageData(0, 0, canvas.width, canvas.height);
      const data = image.data;
      let left = canvas.width;
      let top = canvas.height;
      let right = -1;
      let bottom = -1;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (data[(y * canvas.width + x) * 4 + 3] < 16) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
      return right >= left ? { x: left, y: top, w: right - left + 1, h: bottom - top + 1 } : null;
    }

    function atlasFrames(path, cols, rows, names, frameW, frameH, options) {
      const frames = {};
      const sheet = document.createElement("img");
      const targets = names.map((name) => {
        const frame = document.createElement("canvas");
        frame.width = frameW;
        frame.height = frameH;
        frame.ready = false;
        frames[name] = frame;
        const walk = document.createElement("canvas");
        walk.width = frameW;
        walk.height = frameH;
        walk.ready = false;
        frames[name + "__walk"] = walk;
        const action = document.createElement("canvas");
        action.width = frameW;
        action.height = frameH;
        action.ready = false;
        frames[name + "__action"] = action;
        return { frame, walk, action };
      });
      sheet.onload = function () {
        const cellW = sheet.naturalWidth / cols;
        const cellH = sheet.naturalHeight / rows;
        targets.forEach((target, index) => {
          const sx = (index % cols) * cellW;
          const sy = Math.floor(index / cols) * cellH;
          let subjectCanvas = null;
          let subject = null;
          if (options && options.fitContent) {
            subjectCanvas = document.createElement("canvas");
            subjectCanvas.width = Math.round(cellW);
            subjectCanvas.height = Math.round(cellH);
            const source = subjectCanvas.getContext("2d");
            source.imageSmoothingEnabled = false;
            source.drawImage(sheet, sx, sy, cellW, cellH, 0, 0, subjectCanvas.width, subjectCanvas.height);
            removeConnectedLightBackground(subjectCanvas);
            subject = opaqueBounds(subjectCanvas);
          }
          const paint = (canvas, offsetY, squash, flash) => {
            const g = canvas.getContext("2d");
            g.imageSmoothingEnabled = false;
            g.clearRect(0, 0, canvas.width, canvas.height);
            g.save();
            g.translate(0, offsetY);
            g.translate(canvas.width / 2, canvas.height / 2);
            g.scale(1.025, squash);
            g.translate(-canvas.width / 2, -canvas.height / 2);
            if (subjectCanvas && subject) {
              const scale = Math.min((canvas.width - 2) / subject.w, (canvas.height - 2) / subject.h);
              const w = subject.w * scale;
              const h = subject.h * scale;
              g.drawImage(subjectCanvas, subject.x, subject.y, subject.w, subject.h, (canvas.width - w) / 2, canvas.height - h - 1, w, h);
            } else {
              g.drawImage(sheet, sx, sy, cellW, cellH, 0, 0, canvas.width, canvas.height);
            }
            g.restore();
            if (flash) {
              g.globalCompositeOperation = "source-atop";
              g.fillStyle = "rgba(255,255,255,.18)";
              g.fillRect(0, 0, canvas.width, canvas.height);
              g.globalCompositeOperation = "source-over";
            }
          };
          paint(target.frame, 0, 1, false);
          paint(target.walk, 2, 0.965, false);
          paint(target.action, -1, 1.04, true);
          target.frame.ready = target.walk.ready = target.action.ready = true;
          if (options && options.transparentBackground) {
            removeConnectedLightBackground(target.frame);
            removeConnectedLightBackground(target.walk);
            removeConnectedLightBackground(target.action);
          }
        });
      };
      sheet.onerror = function () {
        // No dejes un atlas pendiente para siempre: la pantalla de selección
        // tiene un retrato por clase y puede continuar tras el límite de carga.
        frames.failed = true;
        targets.forEach((target) => {
          target.failed = true;
        });
      };
      sheet.src = path;
      return frames;
    }

    const campaignSprites = {};
    const commonTypes = ["piranha","firebat","turret","shield","mine","drone","sniper","slime","spore","mutant","teleporter","xeno_scout","tractor_unit","mimic"];
    const bossTypes = ["hammer_shark","sewer_kraken","siren_warlord","magma_eel_lord","crab_tank","ferro_worm","admiral_octopus","ash_golem","magma_emperor","spore_hydra","gamma_excavator","isotope_doctor","atomic_locomotive","omega_sentinel","xeno_carrier","tri_oracle","cataclysm_architect"];
    const commonArt = atlasFrames("assets/sprites/enemies-atlas-v1.png", 4, 4, commonTypes, 72, 72);
    const bossArtA = atlasFrames("assets/sprites/bosses-atlas-a-v1.png", 3, 2, bossTypes.slice(0, 6), 136, 104);
    const bossArtB = atlasFrames("assets/sprites/bosses-atlas-b-v1.png", 3, 2, bossTypes.slice(6, 12), 136, 104);
    const bossArtC = atlasFrames("assets/sprites/bosses-atlas-c-v1.png", 3, 2, bossTypes.slice(12), 136, 104);
    const weaponArt = atlasFrames("assets/sprites/weapons-atlas-v1.png", 3, 2, ["magnum", "ar", "plasma", "shotgun", "cannon", "minigun"], 66, 44);
    const heroArt = atlasFrames("assets/sprites/heroes-atlas-v1.png", 4, 3, [
      "classic_idle", "classic_run", "classic_jump", "classic_fire",
      "agile_idle", "agile_run", "agile_jump", "agile_fire",
      "heavy_idle", "heavy_run", "heavy_climb", "heavy_fire",
    ], 48, 60, { transparentBackground: true, fitContent: true });
    const heroRunArt = atlasFrames("assets/sprites/heroes-run-frames-v2.png", 2, 3, [
      "classic_run_extra1", "classic_run_extra2",
      "agile_run_extra1", "agile_run_extra2",
      "heavy_run_extra1", "heavy_run_extra2",
    ], 48, 60, { transparentBackground: true, fitContent: true });
    const classicRunArt = atlasFrames("assets/sprites/heroes-classic-run-v4.png", 3, 1, [
      "classic_run_extra1", "classic_run_extra2", "classic_run_extra3",
    ], 48, 60, { transparentBackground: true, fitContent: true });
    const heroActionArt = atlasFrames("assets/sprites/heroes-actions-v1.png", 3, 3, [
      "classic_crouch", "classic_dash", "classic_select",
      "agile_crouch", "agile_dash", "agile_select",
      "heavy_crouch", "heavy_dash", "heavy_select",
    ], 48, 60, { transparentBackground: true, fitContent: true });
    const newHeroMovementArt = atlasFrames("assets/sprites/heroes-new-frames-v1.png", 3, 3, [
      "medic_idle", "medic_run1", "medic_run2",
      "technician_idle", "technician_run1", "technician_run2",
      "phantom_idle", "phantom_run1", "phantom_run2",
    ], 48, 60, { transparentBackground: true, fitContent: true });
    const newHeroActionArt = atlasFrames("assets/sprites/heroes-new-actions-v1.png", 3, 3, [
      "medic_jump", "medic_crouch", "medic_dash",
      "technician_jump", "technician_crouch", "technician_dash",
      "phantom_jump", "phantom_crouch", "phantom_dash",
    ], 48, 60, { transparentBackground: true, fitContent: true });
    const newEnemyArt = atlasFrames("assets/sprites/enemies-new-frames-v1.png", 3, 2, [
      "skimmer_idle", "skimmer_walk", "skimmer_attack",
      "bombardier_idle", "bombardier_walk", "bombardier_attack",
    ], 72, 72, { transparentBackground: true, fitContent: true });
    const seakingArt = atlasFrames("assets/sprites/seaking-frames-v1.png", 4, 1, ["idle", "walk", "shoot", "attack"], 144, 104);
    const scenery = atlasFrames("assets/sprites/scenery-atlas-v1.png", 3, 2, ["ruin", "barricade", "tree", "train", "bunker", "arch"], 156, 116);
    const gelArt = atlasFrames("assets/sprites/inertia-gel-frames-v1.png", 3, 1, ["blob", "puddle", "ripple"], 82, 34);
    for (const type of commonTypes) campaignSprites[type] = { idle: commonArt[type], walk: commonArt[type + "__walk"], shoot: commonArt[type + "__action"] };
    for (let i = 0; i < bossTypes.length; i++) {
      const type = bossTypes[i];
      const artSet = i < 6 ? bossArtA : i < 12 ? bossArtB : bossArtC;
      campaignSprites[type] = { idle: artSet[type], walk: artSet[type + "__walk"], shoot: artSet[type + "__action"] };
    }
    campaignSprites.skimmer = { idle: newEnemyArt.skimmer_idle, walk: newEnemyArt.skimmer_walk, shoot: newEnemyArt.skimmer_attack };
    campaignSprites.bombardier = { idle: newEnemyArt.bombardier_idle, walk: newEnemyArt.bombardier_walk, shoot: newEnemyArt.bombardier_attack };
    const heroes = {
      classic: { idle: heroArt.classic_idle, run1: classicRunArt.classic_run_extra1, run2: classicRunArt.classic_run_extra2, run3: classicRunArt.classic_run_extra3, runFrames: [classicRunArt.classic_run_extra1, classicRunArt.classic_run_extra2, classicRunArt.classic_run_extra3], jump: heroArt.classic_jump, crouch: heroActionArt.classic_crouch, dash: heroActionArt.classic_dash, select: heroActionArt.classic_select, fire: heroArt.classic_fire },
      agile: { idle: heroArt.agile_idle, run1: heroArt.agile_run, run2: heroRunArt.agile_run_extra1, run3: heroRunArt.agile_run_extra2, runFrames: [heroArt.agile_run, heroRunArt.agile_run_extra1, heroRunArt.agile_run_extra2], jump: heroArt.agile_jump, crouch: heroActionArt.agile_crouch, dash: heroActionArt.agile_dash, select: heroActionArt.agile_select, fire: heroArt.agile_fire },
      heavy: { idle: heroArt.heavy_idle, run1: heroArt.heavy_run, run2: heroRunArt.heavy_run_extra1, run3: heroRunArt.heavy_run_extra2, runFrames: [heroArt.heavy_run, heroRunArt.heavy_run_extra1, heroRunArt.heavy_run_extra2], jump: heroArt.heavy_climb, crouch: heroActionArt.heavy_crouch, dash: heroActionArt.heavy_dash, select: heroActionArt.heavy_select, fire: heroArt.heavy_fire, climb: heroArt.heavy_climb },
      medic: { idle: newHeroMovementArt.medic_idle, run1: newHeroMovementArt.medic_run1, run2: newHeroMovementArt.medic_run2, runFrames: [newHeroMovementArt.medic_run1, newHeroMovementArt.medic_run2], jump: newHeroActionArt.medic_jump, crouch: newHeroActionArt.medic_crouch, dash: newHeroActionArt.medic_dash, select: newHeroMovementArt.medic_idle, fire: newHeroMovementArt.medic_idle },
      technician: { idle: newHeroMovementArt.technician_idle, run1: newHeroMovementArt.technician_run1, run2: newHeroMovementArt.technician_run2, runFrames: [newHeroMovementArt.technician_run1, newHeroMovementArt.technician_run2], jump: newHeroActionArt.technician_jump, crouch: newHeroActionArt.technician_crouch, dash: newHeroActionArt.technician_dash, select: newHeroMovementArt.technician_idle, fire: newHeroMovementArt.technician_idle },
      phantom: { idle: newHeroMovementArt.phantom_idle, run1: newHeroMovementArt.phantom_run1, run2: newHeroMovementArt.phantom_run2, runFrames: [newHeroMovementArt.phantom_run1, newHeroMovementArt.phantom_run2], jump: newHeroActionArt.phantom_jump, crouch: newHeroActionArt.phantom_crouch, dash: newHeroActionArt.phantom_dash, select: newHeroMovementArt.phantom_idle, fire: newHeroMovementArt.phantom_idle },
    };
    // Cada jefe tutorial es el rival de la clase que se desbloquea. Se
    // conecta al objeto de héroe, no a una copia de sus celdas del atlas:
    // así comparte la misma carga, poses y silueta que verá el jugador al
    // obtener esa clase. La escala y la IA siguen siendo propias del boss.
    const tutorialBossHeroes = {
      agile_scout: heroes.agile,
      heavy_climber: heroes.heavy,
      field_medic: heroes.medic,
      field_technician: heroes.technician,
      cerberus: heroes.phantom,
    };
    for (const [bossType, hero] of Object.entries(tutorialBossHeroes)) {
      campaignSprites[bossType] = {
        idle: hero.idle,
        walk: hero.run1 || hero.idle,
        shoot: hero.fire || hero.dash || hero.idle,
      };
    }
    Object.assign(seaking, { idle: seakingArt.idle, walk: seakingArt.walk, shoot: seakingArt.shoot, attack: seakingArt.attack });
    Object.assign(guns, weaponArt);
    return Object.assign({ player, heroes, shark, octopus, eel, crab, seaking, radstar, radboss, alien_ship, guns, scenery, gel: gelArt, scale: S }, campaignSprites);
  }

  let cache = null;
  exports.P = P;
  exports.get = function getSprites() {
    if (!cache) cache = make();
    return cache;
  };
})(typeof module !== "undefined" && module.exports ? module.exports : (window.YAEL_SPRITES = {}));
