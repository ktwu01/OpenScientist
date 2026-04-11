#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

// --- Claude Code ---
const CC_TARGET = path.join(os.homedir(), ".claude", "commands", "extract-knowhow.md");
const CC_BUILD_TREE_TARGET = path.join(os.homedir(), ".claude", "utils", "build-tree.js");
try {
  if (fs.existsSync(CC_TARGET)) {
    fs.unlinkSync(CC_TARGET);
    console.log("✓ Claude Code: /extract-knowhow removed");
  }
  if (fs.existsSync(CC_BUILD_TREE_TARGET)) {
    fs.unlinkSync(CC_BUILD_TREE_TARGET);
    console.log("✓ Claude Code: build-tree.js removed");
  }
} catch (err) {}

// --- Codex CLI ---
const CODEX_DIR = path.join(os.homedir(), ".codex", "skills", "extract-knowhow");
try {
  if (fs.existsSync(CODEX_DIR)) {
    fs.rmSync(CODEX_DIR, { recursive: true });
    console.log("✓ Codex CLI:   $extract-knowhow removed");
  }
} catch (err) {}
