#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const SOURCE_SKILL = path.join(__dirname, "..", "commands", "SKILL.md");

// Helper scripts that must be available at runtime
const HELPER_SCRIPTS = [
  "scan-sessions.js",
  "classify-projects.js",
  "format-session.js",
  "extract-skills.js",
  "validate-skills.js",
  "clean-skills.js",
  "score-skills.js",
  "upload-skills.js",
  "finalize.js",
];

// --- Codex CLI ---
const CODEX_SKILL_DIR = path.join(os.homedir(), ".codex", "skills", "extract-knowhow");
const CODEX_SKILL_TARGET = path.join(CODEX_SKILL_DIR, "SKILL.md");
const CODEX_SCRIPTS_DIR = path.join(CODEX_SKILL_DIR, "scripts");

try {
  fs.mkdirSync(CODEX_SKILL_DIR, { recursive: true });
  fs.mkdirSync(CODEX_SCRIPTS_DIR, { recursive: true });
  fs.copyFileSync(SOURCE_SKILL, CODEX_SKILL_TARGET);
  console.log("✓ Codex CLI: /extract-knowhow installed to ~/.codex/skills/extract-knowhow/");

  for (const script of HELPER_SCRIPTS) {
    const src = path.join(__dirname, script);
    const dst = path.join(CODEX_SCRIPTS_DIR, script);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log(`✓ Codex CLI: ${script} installed to ~/.codex/skills/extract-knowhow/scripts/`);
    } else {
      console.warn(`⚠ Codex CLI: ${script} not found in package, skipping`);
    }
  }
} catch (err) {
  console.error("⚠ Codex CLI: could not install —", err.message);
}

// --- Cache directory ---
const CACHE_DIR = path.join(os.homedir(), ".openscientist", "cache");
try {
  fs.mkdirSync(path.join(CACHE_DIR, "meta"), { recursive: true });
  fs.mkdirSync(path.join(CACHE_DIR, "skills"), { recursive: true });
  fs.mkdirSync(path.join(CACHE_DIR, "sessions"), { recursive: true });
  console.log("✓ Cache:       ~/.openscientist/cache/ ready");
} catch (err) {
  console.error("⚠ Cache: could not prepare —", err.message);
}

console.log("\n  Usage: /extract-knowhow");
