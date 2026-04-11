#!/usr/bin/env node
/**
 * finalize.js
 *
 * Project finalizer for /extract-knowhow. Given a project metadata file
 * describing which cached subtrees belong to one project plus the anchor
 * and domain info the AI decided, this script:
 *
 *   1. Collects the subtrees  (extract-nodes.js collect)
 *   2. Assembles a complete tree  (build-tree.js)
 *   3. Merges anchor + domain + contributor + test flag
 *   4. Uploads to researchskills.ai  (upload-tree.js)
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

const SCRIPTS_DIR = __dirname;
const EXTRACT_NODES = path.join(SCRIPTS_DIR, 'extract-nodes.js');
const BUILD_TREE = path.join(SCRIPTS_DIR, 'build-tree.js');
const UPLOAD_TREE = path.join(SCRIPTS_DIR, 'upload-tree.js');

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
  const subtreesFile = path.join(tmp, `${slug}-subtrees.json`);
  const assembledFile = path.join(tmp, `${slug}-assembled.json`);
  const treeFile = path.join(tmp, `${slug}-tree.json`);

  const sessionIds = meta.session_ids || [];
  if (sessionIds.length === 0) {
    throw new Error('project-meta.json has empty session_ids');
  }

  // 1. Collect cached subtrees
  runNode(EXTRACT_NODES, ['collect', subtreesFile, sessionIds.join(',')]);

  // 2. Build tree
  runNode(BUILD_TREE, [subtreesFile, assembledFile]);
  const assembled = JSON.parse(fs.readFileSync(assembledFile, 'utf-8'));

  // 3. Merge project metadata
  const anchor = { ...(meta.anchor || {}) };
  if (
    meta.is_test &&
    anchor.project_name &&
    !anchor.project_name.startsWith('[TEST]')
  ) {
    anchor.project_name = `[TEST] ${anchor.project_name}`;
  }
  const tree = {
    version: '2.0.0',
    ...(meta.is_test ? { is_test: true } : {}),
    anchor,
    contributor: meta.contributor || 'Anonymous Contributor',
    extracted_at: new Date().toISOString().slice(0, 10),
    domain: meta.domain,
    subdomain: meta.subdomain,
    sessions_analyzed: assembled.sessions_analyzed || sessionIds.length,
    nodes: assembled.nodes || [],
    joins: assembled.joins || [],
  };
  fs.writeFileSync(treeFile, JSON.stringify(tree, null, 2) + '\n');
  console.log(
    `✓ Tree assembled: ${tree.nodes.length} nodes, ${tree.joins.length} joins → ${treeFile}`
  );

  if (options.noUpload) return { treeFile, uploaded: false };

  // 4. Upload
  const uploadArgs = [treeFile];
  if (options.noOpen) uploadArgs.push('--no-open');
  try {
    const out = runNode(UPLOAD_TREE, uploadArgs);
    process.stdout.write(out);
    return { treeFile, uploaded: true };
  } catch (err) {
    console.error(`⚠ Upload step failed (see output above)`);
    return { treeFile, uploaded: false };
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
