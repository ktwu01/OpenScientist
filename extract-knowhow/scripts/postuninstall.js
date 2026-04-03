#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const TARGET = path.join(os.homedir(), ".claude", "commands", "extract-knowhow.md");

try {
  if (fs.existsSync(TARGET)) {
    fs.unlinkSync(TARGET);
    console.log("✓ /extract-knowhow command removed from ~/.claude/commands/");
  }
} catch (err) {
  // Silent failure on uninstall is fine
}
