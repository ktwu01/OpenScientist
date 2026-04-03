#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const SOURCE = path.join(__dirname, "..", "commands", "extract-knowhow.md");
const TARGET_DIR = path.join(os.homedir(), ".claude", "commands");
const TARGET = path.join(TARGET_DIR, "extract-knowhow.md");

try {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  fs.copyFileSync(SOURCE, TARGET);

  console.log("✓ /extract-knowhow command installed to ~/.claude/commands/");
  console.log("  Usage: type /extract-knowhow in Claude Code to analyze your research sessions");
} catch (err) {
  console.error("⚠ Could not install /extract-knowhow command:", err.message);
  console.error("  You can manually copy commands/extract-knowhow.md to ~/.claude/commands/");
}
