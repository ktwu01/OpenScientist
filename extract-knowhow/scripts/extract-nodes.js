#!/usr/bin/env node
/**
 * extract-nodes.js
 *
 * Helper for the /extract-knowhow AI phase. The AI reads a formatted
 * session (produced by format-session.js) and extracts research action
 * nodes as JSON. This script validates and caches the AI's output,
 * enforcing the schema so that downstream build-tree.js stays clean.
 *
 * Subcommands:
 *   save <session_id> <start_timestamp> <nodes.json>
 *       Validate the AI's nodes array and cache it as a subtree.
 *
 *   load <session_id>
 *       Print a cached subtree to stdout (or exit 1 if not cached).
 *
 *   list
 *       Print JSON array of all cached session IDs.
 *
 *   collect <output.json> [session_ids_csv]
 *       Collect cached subtrees into a single array file, ready for
 *       build-tree.js. Optional CSV of session_ids to filter.
 *
 *   is-cached <session_id>
 *       Exit 0 if cached, 1 otherwise.
 *
 * Cache location: ~/.openscientist/cache/trees/<session_id>.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE_DIR = path.join(os.homedir(), '.openscientist', 'cache', 'trees');

const VALID_ACTIONS = new Set([
  'search_literature', 'formulate_hypothesis', 'survey_methods',
  'design_experiment', 'select_tool', 'prepare_data',
  'implement', 'run_experiment', 'debug',
  'observe_result', 'analyze_result', 'validate',
  'compare_alternatives', 'pivot', 'abandon', 'diagnose_failure', 'plan_next_step',
  'write_paper', 'make_figure', 'respond_to_review',
  'other',
]);

const VALID_OUTCOME_PREFIXES = new Set(['success', 'failure', 'uncertain']);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const VALID_INITIATOR = new Set(['ai', 'human', 'collaborative']);
const VALID_STATUS = new Set(['active', 'abandoned', 'paused']);

function validateNode(node, idx) {
  const errors = [];
  if (!node || typeof node !== 'object') {
    errors.push(`Node ${idx}: not an object`);
    return errors;
  }
  if (!node.id) errors.push(`Node ${idx}: missing id`);
  if (!node.action) {
    errors.push(`Node ${idx}: missing action`);
  } else {
    const base = String(node.action).split(':')[0].trim();
    if (!VALID_ACTIONS.has(base)) {
      errors.push(`Node ${idx}: invalid action "${node.action}"`);
    }
  }
  if (!node.summary) errors.push(`Node ${idx}: missing summary`);
  if (node.parent_id === undefined) errors.push(`Node ${idx}: missing parent_id`);

  if (node.outcome) {
    const base = String(node.outcome).split(':')[0].trim().toLowerCase();
    if (!VALID_OUTCOME_PREFIXES.has(base)) {
      errors.push(`Node ${idx}: invalid outcome prefix "${node.outcome}"`);
    }
  }
  if (node.confidence && !VALID_CONFIDENCE.has(node.confidence)) {
    errors.push(`Node ${idx}: invalid confidence "${node.confidence}"`);
  }
  if (node.initiator && !VALID_INITIATOR.has(node.initiator)) {
    errors.push(`Node ${idx}: invalid initiator "${node.initiator}"`);
  }
  if (node.status && !VALID_STATUS.has(node.status)) {
    errors.push(`Node ${idx}: invalid status "${node.status}"`);
  }
  if (node.tools_used && !Array.isArray(node.tools_used)) {
    errors.push(`Node ${idx}: tools_used must be an array`);
  }
  return errors;
}

function validateSubtree(subtree) {
  const errors = [];
  if (!subtree || typeof subtree !== 'object') {
    errors.push('Subtree is not an object');
    return errors;
  }
  if (!subtree.session_id) errors.push('Missing session_id');
  if (!subtree.start_timestamp) errors.push('Missing start_timestamp');
  if (!Array.isArray(subtree.nodes)) {
    errors.push('Missing or invalid nodes array');
    return errors;
  }
  if (subtree.nodes.length === 0) {
    errors.push('Subtree has zero nodes');
  }

  subtree.nodes.forEach((node, idx) => {
    errors.push(...validateNode(node, idx));
  });

  // parent_id chain: first node null, subsequent nodes reference previous ids
  const ids = new Set(subtree.nodes.map((n) => n && n.id).filter(Boolean));
  subtree.nodes.forEach((node, idx) => {
    if (!node) return;
    if (idx === 0) {
      if (node.parent_id !== null) {
        errors.push(`Node 0: first node must have parent_id: null`);
      }
    } else if (node.parent_id !== null && !ids.has(node.parent_id)) {
      errors.push(
        `Node ${idx} (${node.id}): parent_id "${node.parent_id}" not found in subtree`
      );
    }
  });

  return errors;
}

function cachePathFor(sessionId) {
  return path.join(CACHE_DIR, `${sessionId}.json`);
}

function saveSubtree(subtree) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const outPath = cachePathFor(subtree.session_id);
  fs.writeFileSync(outPath, JSON.stringify(subtree, null, 2) + '\n');
  return outPath;
}

function loadSubtree(sessionId) {
  const p = cachePathFor(sessionId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function isCached(sessionId) {
  return fs.existsSync(cachePathFor(sessionId));
}

function listCachedSessionIds() {
  if (!fs.existsSync(CACHE_DIR)) return [];
  return fs
    .readdirSync(CACHE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

function collectSubtrees(filterIds) {
  const ids = listCachedSessionIds();
  const filter = filterIds && filterIds.length > 0 ? new Set(filterIds) : null;
  const subtrees = [];
  for (const id of ids) {
    if (filter && !filter.has(id)) continue;
    try {
      subtrees.push(JSON.parse(fs.readFileSync(cachePathFor(id), 'utf-8')));
    } catch (err) {
      console.error(`⚠ Skipping corrupted cache: ${id}.json (${err.message})`);
    }
  }
  return subtrees;
}

function printUsage() {
  console.error('Usage: extract-nodes.js <command> [args...]');
  console.error('');
  console.error('Commands:');
  console.error('  save <session_id> <start_timestamp> <nodes.json>');
  console.error('      Validate and cache a subtree.');
  console.error('  load <session_id>');
  console.error('      Print cached subtree JSON.');
  console.error('  list');
  console.error('      List all cached session IDs.');
  console.error('  collect <output.json> [session_ids_csv]');
  console.error('      Collect cached subtrees into an array file.');
  console.error('  is-cached <session_id>');
  console.error('      Exit 0 if cached, 1 otherwise.');
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  try {
    if (cmd === 'save') {
      if (args.length < 4) {
        printUsage();
        process.exit(1);
      }
      const sessionId = args[1];
      const startTimestamp = args[2];
      const nodesFile = path.resolve(args[3]);
      const nodesRaw = fs.readFileSync(nodesFile, 'utf-8');
      const parsed = JSON.parse(nodesRaw);

      // Accept either a bare array or a { nodes: [...] } object
      const nodes = Array.isArray(parsed) ? parsed : parsed.nodes;
      if (!Array.isArray(nodes)) {
        console.error('Error: nodes file must contain an array or { nodes: [...] }');
        process.exit(1);
      }

      const subtree = {
        session_id: sessionId,
        start_timestamp: startTimestamp,
        nodes,
      };

      const errors = validateSubtree(subtree);
      if (errors.length > 0) {
        console.error('⚠ Validation errors:');
        errors.forEach((e) => console.error(`  - ${e}`));
        process.exit(1);
      }

      const outPath = saveSubtree(subtree);
      console.log(`✓ Saved ${nodes.length} nodes → ${outPath}`);
    } else if (cmd === 'load') {
      if (args.length < 2) {
        printUsage();
        process.exit(1);
      }
      const subtree = loadSubtree(args[1]);
      if (!subtree) {
        console.error(`Not cached: ${args[1]}`);
        process.exit(1);
      }
      console.log(JSON.stringify(subtree, null, 2));
    } else if (cmd === 'list') {
      console.log(JSON.stringify(listCachedSessionIds(), null, 2));
    } else if (cmd === 'collect') {
      if (args.length < 2) {
        printUsage();
        process.exit(1);
      }
      const outputFile = path.resolve(args[1]);
      const filter = args[2] ? args[2].split(',').map((s) => s.trim()) : null;
      const subtrees = collectSubtrees(filter);
      fs.mkdirSync(path.dirname(outputFile), { recursive: true });
      fs.writeFileSync(outputFile, JSON.stringify(subtrees, null, 2) + '\n');
      console.log(
        `✓ Collected ${subtrees.length} subtrees → ${path.relative(process.cwd(), outputFile)}`
      );
    } else if (cmd === 'is-cached') {
      if (args.length < 2) {
        printUsage();
        process.exit(1);
      }
      process.exit(isCached(args[1]) ? 0 : 1);
    } else {
      printUsage();
      process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  validateNode,
  validateSubtree,
  saveSubtree,
  loadSubtree,
  isCached,
  listCachedSessionIds,
  collectSubtrees,
  CACHE_DIR,
};
