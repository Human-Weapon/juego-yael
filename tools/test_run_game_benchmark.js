"use strict";

const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const target = path.join(__dirname, "run_game_benchmark.js");
const run = (payload) => spawnSync(process.execPath, [target], {
  cwd: root,
  input: JSON.stringify(payload),
  encoding: "utf8",
});

const valid = run({ case: { id: "combat" } });
if (valid.status !== 0 || !valid.stdout.includes("COMBAT REGRESSION CHECK PASSED")) {
  process.stdout.write(valid.stdout || "");
  process.stderr.write(valid.stderr || "");
  process.exit(1);
}
const invalid = run({ case: { id: "does-not-exist" } });
if (invalid.status !== 2) {
  console.error("El puente no rechaza casos desconocidos");
  process.exit(1);
}
console.log("AGENTBENCH TARGET TEST PASSED");
