#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const SOURCE = path.join(__dirname, "..", "commands", "extract-knowhow.md");
const TEMPLATE_SOURCE = path.join(__dirname, "..", "templates", "skill-template.md");

// --- Claude Code ---
const CC_DIR = path.join(os.homedir(), ".claude", "commands");
const CC_TARGET = path.join(CC_DIR, "extract-knowhow.md");

try {
  fs.mkdirSync(CC_DIR, { recursive: true });
  fs.copyFileSync(SOURCE, CC_TARGET);
  console.log("✓ Claude Code: /extract-knowhow installed to ~/.claude/commands/");
} catch (err) {
  console.error("⚠ Claude Code: could not install —", err.message);
}

// --- Codex CLI ---
const CODEX_DIR = path.join(os.homedir(), ".codex", "skills", "extract-knowhow");
const CODEX_TARGET = path.join(CODEX_DIR, "SKILL.md");
const CODEX_REF_DIR = path.join(CODEX_DIR, "references");
const CODEX_REF_TARGET = path.join(CODEX_REF_DIR, "skill-template.md");

try {
  fs.mkdirSync(CODEX_DIR, { recursive: true });
  fs.mkdirSync(CODEX_REF_DIR, { recursive: true });

  // Codex SKILL.md needs YAML frontmatter for discovery
  var CODEX_FRONTMATTER = [
    "---",
    'name: "extract-knowhow"',
    'description: "Analyze your conversation history and extract reusable scientific research know-how into OpenScientist skill files. Use when you want to turn your research conversations into structured, shareable skills."',
    "---",
    "",
  ].join("\n");
  var sourceContent = fs.readFileSync(SOURCE, "utf-8");
  fs.writeFileSync(CODEX_TARGET, CODEX_FRONTMATTER + sourceContent);

  if (fs.existsSync(TEMPLATE_SOURCE)) {
    fs.copyFileSync(TEMPLATE_SOURCE, CODEX_REF_TARGET);
  }
  console.log("✓ Codex CLI:   $extract-knowhow installed to ~/.codex/skills/");
} catch (err) {
  console.error("⚠ Codex CLI: could not install —", err.message);
}

console.log("\n  Usage: /extract-knowhow (Claude Code) or $extract-knowhow (Codex CLI)");
