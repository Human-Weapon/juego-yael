"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "integrity-manifest.json");
const failures = [];
const normalizedTextExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".py", ".txt"]);

function digest(absolute) {
  let content = fs.readFileSync(absolute);
  if (normalizedTextExtensions.has(path.extname(absolute).toLowerCase())) {
    content = Buffer.from(content.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
  }
  return crypto.createHash("sha256").update(content).digest("hex");
}

if (!fs.existsSync(manifestPath)) {
  console.error("INTEGRITY FAILED: integrity-manifest.json is missing");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.project !== "Protocol Omega" || manifest.algorithm !== "sha256") failures.push("manifest identity is invalid");

for (const [relative, expected] of Object.entries(manifest.files || {})) {
  const absolute = path.join(root, ...relative.split("/"));
  if (!fs.existsSync(absolute)) {
    failures.push(`missing: ${relative}`);
    continue;
  }
  const actual = digest(absolute);
  if (actual !== expected) failures.push(`modified: ${relative}`);
}

const protectedExtensions = new Set(manifest.protectedExtensions || []);
const registered = new Set(Object.keys(manifest.files || {}).map((entry) => entry.replace(/\\/g, "/")));
const ignoredDirectories = new Set([".git", "node_modules", ".agentops", ".vscode", ".idea", "graphify-out"]);
function scan(directory, prefix = "") {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(absolute, relative);
    else if (relative !== "integrity-manifest.json" && protectedExtensions.has(path.extname(entry.name).toLowerCase()) && !registered.has(relative)) {
      failures.push(`unregistered executable/code file: ${relative}`);
    }
  }
}
scan(root);

if (failures.length) {
  console.error("INTEGRITY FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`INTEGRITY PASSED: ${Object.keys(manifest.files || {}).length} official files verified`);
