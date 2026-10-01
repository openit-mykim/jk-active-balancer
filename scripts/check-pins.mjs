#!/usr/bin/env node
// Enforce design section 32: every dependency is pinned to an exact version.
// `workspace:*` is allowed for internal packages. Caret/tilde/range specifiers
// are rejected.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "coverage", ".vite"]);
const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

function findPackageJsons(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      findPackageJsons(full, found);
    } else if (entry === "package.json") {
      found.push(full);
    }
  }
  return found;
}

const violations = [];
for (const file of findPackageJsons(ROOT)) {
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, range] of Object.entries(deps)) {
      if (typeof range !== "string") continue;
      if (range.startsWith("workspace:")) continue;
      if (/^[0-9]/.test(range)) continue; // exact version, e.g. "3.5.1"
      violations.push(`${file.replace(ROOT + "/", "")} -> ${field}.${name} = ${range}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Non-exact dependency ranges found (design section 32 forbids ^ and ~):");
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}

console.log("dependency pins OK: every version is exact or workspace:*");
