"use strict";

const { spawnSync } = require("child_process");

const scripts = {
  physics: "test-physics.js",
  levels: "test-level-variety.js",
  ai: "test-ai-personality.js",
  combat: "test-combat-regressions.js",
  roster: "test-roster-and-hazards.js",
  arsenal: "test-arsenal.js",
};

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  let payload = {};
  try { payload = JSON.parse(input || "{}"); } catch (err) {}
  const script = scripts[payload.case && payload.case.id];
  if (!script) {
    console.error("Unknown benchmark case");
    process.exitCode = 2;
    return;
  }
  const completed = spawnSync(process.execPath, [script], { cwd: process.cwd(), encoding: "utf8" });
  process.stdout.write(completed.stdout || "");
  process.stderr.write(completed.stderr || "");
  process.exitCode = completed.status === null ? 1 : completed.status;
});
