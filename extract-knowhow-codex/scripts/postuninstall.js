#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const HELPER_SCRIPTS = [
  "scan-sessions.js",
  "format-session.js",
  "extract-skills.js",
  "validate-skills.js",
  "upload-skills.js",
  "finalize.js",
];

// --- Codex CLI ---
const CODEX_SKILL_DIR = path.join(os.homedir(), ".codex", "skills", "extract-knowhow");
const CODEX_SKILL_TARGET = path.join(CODEX_SKILL_DIR, "SKILL.md");
const CODEX_SCRIPTS_DIR = path.join(CODEX_SKILL_DIR, "scripts");

try {
  if (fs.existsSync(CODEX_SKILL_TARGET)) {
    fs.unlinkSync(CODEX_SKILL_TARGET);
    console.log("✓ Codex CLI: /extract-knowhow SKILL.md removed");
  }
  for (const script of HELPER_SCRIPTS) {
    const p = path.join(CODEX_SCRIPTS_DIR, script);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log(`✓ Codex CLI: ${script} removed`);
    }
  }
  // Remove skill dir if empty
  try {
    const remaining = fs.readdirSync(CODEX_SCRIPTS_DIR);
    if (remaining.length === 0) fs.rmdirSync(CODEX_SCRIPTS_DIR);
    const skillRemaining = fs.readdirSync(CODEX_SKILL_DIR);
    if (skillRemaining.length === 0) fs.rmdirSync(CODEX_SKILL_DIR);
  } catch (_) { /* best effort */ }
} catch (err) {
  // ignore
}

// Note: cache directory ~/.openscientist/cache/ is intentionally preserved,
// so reinstalling retains previously extracted subtrees.
