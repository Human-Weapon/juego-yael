"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "integrity-manifest.json");
const ignored = new Set(["integrity-manifest.json"]);
const normalizedTextExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".py", ".txt"]);

function digest(absolute) {
  let content = fs.readFileSync(absolute);
  if (normalizedTextExtensions.has(path.extname(absolute).toLowerCase())) {
    content = Buffer.from(content.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
  }
  return crypto.createHash("sha256").update(content).digest("hex");
}

const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  encoding: "utf8",
}).split(/\r?\n/).map((entry) => entry.trim().replace(/\\/g, "/")).filter(Boolean);

const files = {};
for (const relative of [...new Set(listed)].sort()) {
  if (ignored.has(relative) || relative.startsWith("node_modules/")) continue;
  const absolute = path.join(root, ...relative.split("/"));
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
  files[relative] = digest(absolute);
}

const manifest = {
  project: "Protocol Omega",
  fingerprint: "PO-HW-2026-OMEGA-7F",
  officialRepository: "https://github.com/Human-Weapon/protocol-omega",
  algorithm: "sha256",
  textLineEndings: "normalized-to-lf",
  protectedExtensions: [".html", ".js", ".css", ".wasm", ".exe", ".dll", ".msi", ".bat", ".cmd", ".ps1", ".vbs", ".scr", ".jar"],
  files,
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Integrity manifest updated: ${Object.keys(files).length} files`);
