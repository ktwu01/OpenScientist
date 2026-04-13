#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const SKILL_DIR = path.join(os.homedir(), ".codex", "skills", "extract-knowhow");
const TARGET = path.join(SKILL_DIR, "SKILL.md");
const SCRIPT_DIR = path.join(__dirname, "..", "scripts");

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log("  ✓ " + msg);
    passed++;
  } else {
    console.error("  ✗ " + msg);
    failed++;
  }
}

// Clean up any existing file first
if (fs.existsSync(TARGET)) {
  fs.unlinkSync(TARGET);
}

console.log("Test: postinstall.js");
execFileSync(process.execPath, [path.join(SCRIPT_DIR, "postinstall.js")], { stdio: "pipe" });
assert(fs.existsSync(TARGET), "SKILL.md exists after install");

const content = fs.readFileSync(TARGET, "utf-8");
assert(content.includes("extract-knowhow"), "SKILL.md contains expected content");
assert(content.startsWith("---"), "SKILL.md starts with YAML frontmatter");

console.log("\nTest: postuninstall.js");
execFileSync(process.execPath, [path.join(SCRIPT_DIR, "postuninstall.js")], { stdio: "pipe" });
assert(!fs.existsSync(TARGET), "SKILL.md removed after uninstall");

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
