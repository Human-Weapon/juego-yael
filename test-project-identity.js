"use strict";

const fs = require("fs");

let failures = 0;
const check = (condition, message) => condition
  ? console.log("OK  ", message)
  : (failures++, console.error("FAIL", message));
const read = (path) => fs.readFileSync(path, "utf8");

const html = read("index.html");
const game = read("game.js");
const readme = read("README.md");
const pkg = JSON.parse(read("package.json"));

check(html.includes("<title>Protocol Omega</title>"), "el navegador usa Protocol Omega");
check(html.includes('name="protocol-omega:source"'), "la página contiene procedencia invisible");
check(pkg.name === "protocol-omega", "el paquete usa la identidad nueva");
check(readme.startsWith("# Protocol Omega"), "el README presenta el nombre nuevo");
check(!game.includes("YAEL — PROTOCOLO BELMONT") && !game.includes('"YAEL  [') && !game.includes("Yael cayo"), "el nombre anterior desaparece de la interfaz jugable");
check(game.includes("Jonathan Yael Maldonado Rodríguez") && game.includes("Abraham Rodríguez Arana"), "los nombres personales quedan reservados para créditos");
check(game.includes("https://github.com/Human-Weapon/protocol-omega"), "el final contiene el enlace oficial");
for (const path of ["LICENSE.md", "NOTICE.md", "SECURITY.md", "PROVENANCE.json", "tools/verify_integrity.js", "integrity-manifest.json"]) {
  check(fs.existsSync(path), `protección presente: ${path}`);
}

if (failures) {
  console.error(`\nPROJECT IDENTITY CHECK FAILED: ${failures} problema(s)`);
  process.exitCode = 1;
} else {
  console.log("\nPROJECT IDENTITY CHECK PASSED");
}
