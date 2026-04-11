#!/usr/bin/env node
/**
 * upload-tree.js
 *
 * Upload a complete decision tree JSON to researchskills.ai and open
 * the returned review URL in the user's browser.
 *
 * On failure, saves the tree locally to ~/.openscientist/tree-<name>.json
 * and exits non-zero so the caller can surface the error.
 *
 * Usage:
 *   upload-tree.js <complete_tree.json> [--no-open] [--api <url>]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { execFileSync } = require('child_process');

const DEFAULT_API = 'https://researchskills.ai/api/trees';

function postJson(apiUrl, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (err) {
              reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}`));
            }
          } else {
            reject(
              new Error(`HTTP ${res.statusCode}: ${data.substring(0, 300) || '(empty body)'}`)
            );
          }
        });
      }
    );
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out after 30s'));
    });
    req.write(body);
    req.end();
  });
}

function fallbackSave(tree) {
  const projectName =
    (tree.anchor && (tree.anchor.project_name || tree.anchor.paper_url)) ||
    'unknown-project';
  const safeName = String(projectName)
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 80);
  const dir = path.join(os.homedir(), '.openscientist');
  fs.mkdirSync(dir, { recursive: true });
  const fallbackPath = path.join(dir, `tree-${safeName}.json`);
  fs.writeFileSync(fallbackPath, JSON.stringify(tree, null, 2) + '\n');
  return fallbackPath;
}

function openBrowser(url) {
  // URL is always an untrusted-looking string, so use execFileSync with
  // an argv array to avoid any shell interpretation.
  try {
    if (process.platform === 'darwin') {
      execFileSync('open', [url], { stdio: 'ignore' });
    } else if (process.platform === 'win32') {
      // On Windows, `start` is a cmd builtin; use cmd.exe with /c start "" <url>
      execFileSync('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
    } else {
      execFileSync('xdg-open', [url], { stdio: 'ignore' });
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function uploadTree(treePath, options = {}) {
  const apiUrl = options.apiUrl || DEFAULT_API;
  const treeContent = fs.readFileSync(treePath, 'utf-8');
  const tree = JSON.parse(treeContent);

  try {
    const response = await postJson(apiUrl, treeContent);
    return { ok: true, response, tree };
  } catch (err) {
    const fallback = fallbackSave(tree);
    return { ok: false, error: err, tree, fallback };
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1 || args[0] === '--help' || args[0] === '-h') {
    console.error('Usage: upload-tree.js <complete_tree.json> [--no-open] [--api <url>]');
    process.exit(args.length < 1 ? 1 : 0);
  }

  const treePath = path.resolve(args[0]);
  const noOpen = args.includes('--no-open');
  const apiIdx = args.indexOf('--api');
  const apiUrl = apiIdx !== -1 && args[apiIdx + 1] ? args[apiIdx + 1] : DEFAULT_API;

  if (!fs.existsSync(treePath)) {
    console.error(`Error: file not found: ${treePath}`);
    process.exit(1);
  }

  uploadTree(treePath, { apiUrl }).then((result) => {
    if (result.ok) {
      const { response } = result;
      const reviewUrl = response.reviewUrl || response.review_url;
      const id = response.id;
      console.log(`✓ Uploaded to ${apiUrl}`);
      if (id) console.log(`  Tree ID: ${id}`);
      if (reviewUrl) {
        console.log(`  Review:  ${reviewUrl}`);
        if (!noOpen) {
          if (openBrowser(reviewUrl)) {
            console.log('✓ Opened review page in browser');
          } else {
            console.log(`  (Could not open browser — visit manually)`);
          }
        }
      }
      // Emit machine-readable line for orchestrators
      console.log(`RESULT=${JSON.stringify(response)}`);
      process.exit(0);
    } else {
      console.error(`⚠ Upload failed: ${result.error.message}`);
      console.error(`  Saved locally to: ${result.fallback}`);
      console.error('  You can upload manually later.');
      process.exit(2);
    }
  });
}

module.exports = {
  uploadTree,
  postJson,
  fallbackSave,
  openBrowser,
  DEFAULT_API,
};
