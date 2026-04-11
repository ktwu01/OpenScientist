#!/usr/bin/env node
/**
 * build-tree.js
 *
 * Assemble per-session decision tree subtrees into a complete project tree.
 *
 * Input: Array of per-session subtrees (from Stage 5a)
 * Output: Complete tree with flattened nodes + joins array
 *
 * Algorithm:
 * 1. Sort sessions by start_timestamp
 * 2. Link sessions chronologically by connecting first node of session N
 *    to last node of session N-1
 * 3. Flatten all nodes into single array
 * 4. Build joins array documenting transitions
 */

'use strict';

/**
 * Assemble per-session subtrees into a complete decision tree
 *
 * @param {Array} sessionSubtrees - Array of { session_id, start_timestamp, nodes }
 * @param {Object} projectMetadata - { project_name, project_description, domain, subdomain, ... }
 * @returns {Object} Complete tree with nodes[] and joins[]
 */
function buildCompleteTree(sessionSubtrees, projectMetadata) {
  if (!sessionSubtrees || sessionSubtrees.length === 0) {
    return {
      ...projectMetadata,
      sessions_analyzed: 0,
      nodes: [],
      joins: []
    };
  }

  // Sort sessions by timestamp (earliest first)
  const sortedSessions = [...sessionSubtrees].sort((a, b) => {
    const timeA = new Date(a.start_timestamp).getTime();
    const timeB = new Date(b.start_timestamp).getTime();
    return timeA - timeB;
  });

  const allNodes = [];
  const joins = [];

  // Process each session
  for (let i = 0; i < sortedSessions.length; i++) {
    const session = sortedSessions[i];
    const nodes = session.nodes || [];

    if (nodes.length === 0) continue;

    // Link this session to previous session (if not first)
    if (i > 0) {
      const prevSession = sortedSessions[i - 1];
      const prevNodes = prevSession.nodes || [];
      if (prevNodes.length > 0) {
        const lastNodeOfPrev = prevNodes[prevNodes.length - 1];
        const firstNodeOfCurrent = nodes[0];

        // Update first node's parent_id to link to previous session's last node
        const firstNodeCopy = { ...firstNodeOfCurrent };
        firstNodeCopy.parent_id = lastNodeOfPrev.id;

        // Record the join
        joins.push({
          from_session: prevSession.session_id,
          to_session: session.session_id,
          from_node: lastNodeOfPrev.id,
          to_node: firstNodeOfCurrent.id,
          confidence: 'high'
        });

        // Add all nodes from this session, with first node updated
        allNodes.push(firstNodeCopy);
        for (let j = 1; j < nodes.length; j++) {
          allNodes.push(nodes[j]);
        }
      } else {
        // Previous session had no nodes, add all nodes from current
        allNodes.push(...nodes);
      }
    } else {
      // First session, add all nodes as-is
      allNodes.push(...nodes);
    }
  }

  return {
    ...projectMetadata,
    sessions_analyzed: sortedSessions.length,
    nodes: allNodes,
    joins: joins
  };
}

/**
 * Validate a complete tree structure
 * @param {Object} tree - Complete tree object
 * @returns {Array} Array of validation errors (empty if valid)
 */
function validateTree(tree) {
  const errors = [];

  if (!tree.nodes || !Array.isArray(tree.nodes)) {
    errors.push('Missing or invalid nodes array');
    return errors;
  }

  if (tree.nodes.length === 0) {
    errors.push('Tree has no nodes');
    return errors;
  }

  // Check that all nodes have required fields
  tree.nodes.forEach((node, idx) => {
    if (!node.id) errors.push(`Node ${idx} missing id`);
    if (!node.action) errors.push(`Node ${idx} missing action`);
    if (!node.summary) errors.push(`Node ${idx} missing summary`);
    if (node.parent_id === undefined) errors.push(`Node ${idx} missing parent_id`);
  });

  // Check that all parent_ids reference existing nodes
  const nodeIds = new Set(tree.nodes.map(n => n.id));
  tree.nodes.forEach((node, idx) => {
    if (node.parent_id !== null && !nodeIds.has(node.parent_id)) {
      errors.push(
        `Node ${idx} (${node.id}) references non-existent parent_id: ${node.parent_id}`
      );
    }
  });

  // Check that exactly one root node exists
  const roots = tree.nodes.filter(n => n.parent_id === null);
  if (roots.length !== 1) {
    errors.push(
      `Expected exactly 1 root node (parent_id: null), found ${roots.length}`
    );
  }

  // Check joins array structure
  if (tree.joins && Array.isArray(tree.joins)) {
    tree.joins.forEach((join, idx) => {
      if (!join.from_session) errors.push(`Join ${idx} missing from_session`);
      if (!join.to_session) errors.push(`Join ${idx} missing to_session`);
      if (!join.from_node) errors.push(`Join ${idx} missing from_node`);
      if (!join.to_node) errors.push(`Join ${idx} missing to_node`);
    });
  }

  return errors;
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildCompleteTree, validateTree };
}

// CLI usage (if run directly)
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node build-tree.js <input.json> <output.json>');
    console.error('  input.json: array of { session_id, start_timestamp, nodes }');
    console.error('  output.json: complete tree with nodes[] + joins[]');
    process.exit(1);
  }

  const inputFile = path.resolve(args[0]);
  const outputFile = path.resolve(args[1]);

  try {
    const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    if (!Array.isArray(input)) {
      throw new Error('Input must be an array of session subtrees');
    }

    const metadata = input[0].__metadata || {
      project_name: 'Untitled Project',
      project_description: 'Auto-extracted research project',
      domain: 'computer-science',
      subdomain: 'other',
      contributor: 'Anonymous',
      extracted_at: new Date().toISOString().split('T')[0]
    };

    const tree = buildCompleteTree(input, metadata);

    const errors = validateTree(tree);
    if (errors.length > 0) {
      console.warn('⚠ Validation warnings:');
      errors.forEach(e => console.warn(`  - ${e}`));
    }

    fs.writeFileSync(outputFile, JSON.stringify(tree, null, 2) + '\n');
    console.log(`✓ Built complete tree: ${path.relative(process.cwd(), outputFile)}`);
    console.log(`  ${tree.nodes.length} nodes, ${tree.joins.length} joins, ${tree.sessions_analyzed} sessions`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
