#!/usr/bin/env node
/**
 * finalize.js
 *
 * Project finalizer for /extract-knowhow. Given a project metadata file
 * describing which cached skills belong to one project, this script:
 *
 *   1. Collects validated skills  (validate-skills.js collect)
 *   2. Uploads to researchskills.ai  (upload-skills.js)
 *   3. Cleans up temp dir
 *
 * Usage:
 *   finalize.js <project-meta.json> [--no-upload] [--no-open]
 *
 * project-meta.json shape:
 *   {
 *     "project_slug":   "my-project",
 *     "session_ids":    ["id1", "id2", ...],
 *     "anchor":         { "type": "project", "project_name": "...", "project_description": "..." },
 *     "domain":         "physics",
 *     "subdomain":      "computational-physics",
 *     "contributor":    "Name (Institution)",
 *     "is_test":        false
 *   }
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const UTILS_DIR = path.join(os.homedir(), '.claude', 'utils');
const VALIDATE_SKILLS = path.join(UTILS_DIR, 'validate-skills.js');
const UPLOAD_SKILLS = path.join(UTILS_DIR, 'upload-skills.js');

function runNode(script, args, opts = {}) {
  return execFileSync('node', [script, ...args], {
    encoding: 'utf-8',
    stdio: opts.inherit ? 'inherit' : ['ignore', 'pipe', 'inherit'],
  });
}

function slugify(s) {
  return String(s || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60) || 'project';
}

function finalize(metaPath, options = {}) {
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const slug = slugify(meta.project_slug || (meta.anchor && meta.anchor.project_name));
  const tmp = os.tmpdir();
  const outputDir = path.join(tmp, `${slug}-skills`);

  const sessionIds = meta.session_ids || [];
  if (sessionIds.length === 0) {
    throw new Error('project-meta.json has empty session_ids');
  }

  // 1. Collect validated skills
  runNode(VALIDATE_SKILLS, ['collect', outputDir, sessionIds.join(',')]);
  console.log(`✓ Skills collected → ${outputDir}`);

  if (options.noUpload) return { outputDir, uploaded: false };

  // 2. Upload skills
  const uploadArgs = [outputDir];
  if (options.noOpen) uploadArgs.push('--no-open');
  if (meta.project_slug) {
    uploadArgs.push('--project-slug', meta.project_slug);
  }
  if (meta.anchor && meta.anchor.project_name) {
    uploadArgs.push('--project-name', meta.anchor.project_name);
  }
  try {
    const out = runNode(UPLOAD_SKILLS, uploadArgs);
    process.stdout.write(out);
    return { outputDir, uploaded: true };
  } catch (err) {
    console.error('⚠ Upload step failed (see output above)');
    return { outputDir, uploaded: false };
  } finally {
    // 3. Clean up temp dir
    try {
      fs.rmSync(outputDir, { recursive: true, force: true });
    } catch (_) {
      // best-effort cleanup
    }
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: finalize.js <project-meta.json> [--no-upload] [--no-open]');
    process.exit(1);
  }
  const metaPath = path.resolve(args[0]);
  if (!fs.existsSync(metaPath)) {
    console.error(`Error: not found: ${metaPath}`);
    process.exit(1);
  }
  try {
    finalize(metaPath, {
      noUpload: args.includes('--no-upload'),
      noOpen: args.includes('--no-open'),
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { finalize, slugify };
