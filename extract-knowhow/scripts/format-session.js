#!/usr/bin/env node
/**
 * format-session.js
 *
 * Preprocess a raw Claude Code / Codex CLI .jsonl session file into
 * compact, truncated text suitable for LLM analysis.
 *
 * Rules (inspired by Claude Code's /insights pipeline):
 *   - User messages truncated to 500 chars
 *   - Assistant messages truncated to 300 chars
 *   - Tool uses reduced to [Tool: <name>]
 *   - Tool results truncated to 200 chars
 *   - Thinking blocks dropped
 *   - If total text > 30,000 chars, split into 25,000-char segments
 *
 * Output:
 *   - Single text file <output.txt>, OR
 *   - Multiple segment files <output-seg1.txt>, <output-seg2.txt>, ...
 *   - Metadata JSON printed to stdout
 */

'use strict';

const fs = require('fs');
const path = require('path');

const USER_MAX_CHARS = 1000; // 82% messages uncut, saves 78% total chars
const ASSISTANT_MAX_CHARS = 300;
const TOOL_RESULT_MAX_CHARS = 200;
const SEGMENT_THRESHOLD = 30000;
const SEGMENT_SIZE = 25000;

function truncate(text, max) {
  if (!text) return '';
  const str = String(text);
  if (str.length <= max) return str;
  return str.substring(0, max) + '…[truncated]';
}

function extractContentParts(content) {
  if (typeof content === 'string') return [content];
  if (!Array.isArray(content)) return [];
  const parts = [];
  for (const item of content) {
    if (!item) continue;
    if (typeof item === 'string') {
      parts.push(item);
    } else if (
      (item.type === 'text' ||
        item.type === 'input_text' ||
        item.type === 'output_text') &&
      item.text
    ) {
      parts.push(item.text);
    } else if (item.type === 'tool_use' && item.name) {
      parts.push(`[Tool: ${item.name}]`);
    } else if (item.type === 'tool_result') {
      let resText = '';
      if (typeof item.content === 'string') {
        resText = item.content;
      } else if (Array.isArray(item.content)) {
        resText = item.content
          .map((c) => (typeof c === 'string' ? c : c.text || ''))
          .join(' ');
      }
      if (resText) {
        parts.push(`[Tool Result: ${truncate(resText, TOOL_RESULT_MAX_CHARS)}]`);
      }
    }
    // thinking blocks, images, etc. are intentionally dropped
  }
  return parts;
}

function extractMessage(entry) {
  if (!entry) return null;

  // Claude Code: { type: 'user'|'assistant', message: { role, content }, timestamp }
  // Codex CLI:   { type: 'response_item', payload: { type: 'message', role, content: [{type:'input_text',text}] }, timestamp }
  // Skip non-message Codex payloads (function_call, reasoning, etc.)
  if (entry.payload && entry.payload.type && entry.payload.type !== 'message') {
    return null;
  }

  const msg = entry.message || entry.payload || entry;
  const role =
    msg.role ||
    entry.role ||
    (entry.type === 'user' || entry.type === 'assistant' ? entry.type : null);

  if (role !== 'user' && role !== 'assistant') return null;

  const parts = extractContentParts(msg.content);
  if (parts.length === 0) return null;

  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;

  const timestamp = entry.timestamp || entry.ts || msg.timestamp || null;
  return { role, text, timestamp };
}

function formatSession(jsonlPath) {
  const content = fs.readFileSync(jsonlPath, 'utf-8');
  const lines = content.split('\n');

  const formatted = [];
  let startTimestamp = null;
  let messageCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry;
    try {
      entry = JSON.parse(trimmed);
    } catch (err) {
      continue; // skip corrupted lines
    }

    const msg = extractMessage(entry);
    if (!msg) continue;

    if (!startTimestamp && msg.timestamp) startTimestamp = msg.timestamp;

    const maxLen = msg.role === 'user' ? USER_MAX_CHARS : ASSISTANT_MAX_CHARS;
    const ts = msg.timestamp ? `[${msg.timestamp}] ` : '';
    formatted.push(`${ts}${msg.role.toUpperCase()}: ${truncate(msg.text, maxLen)}`);
    messageCount += 1;
  }

  return {
    text: formatted.join('\n\n'),
    startTimestamp,
    messageCount,
  };
}

function splitIntoSegments(text) {
  if (text.length <= SEGMENT_THRESHOLD) return [text];
  const segments = [];
  for (let i = 0; i < text.length; i += SEGMENT_SIZE) {
    segments.push(text.substring(i, i + SEGMENT_SIZE));
  }
  return segments;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: format-session.js <input.jsonl> <output.txt>');
    console.error('');
    console.error('Writes formatted text to output.txt.');
    console.error('If session > 30K chars, writes multiple segment files:');
    console.error('  <output>-seg1.txt, <output>-seg2.txt, ...');
    console.error('Prints metadata JSON to stdout.');
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = path.resolve(args[1]);

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: input file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    const { text, startTimestamp, messageCount } = formatSession(inputPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    const segments = splitIntoSegments(text);
    const outputFiles = [];

    if (segments.length === 1) {
      fs.writeFileSync(outputPath, text);
      outputFiles.push(outputPath);
    } else {
      const base = outputPath.replace(/\.txt$/, '');
      segments.forEach((seg, i) => {
        const p = `${base}-seg${i + 1}.txt`;
        fs.writeFileSync(p, seg);
        outputFiles.push(p);
      });
    }

    const meta = {
      input: inputPath,
      start_timestamp: startTimestamp,
      message_count: messageCount,
      total_chars: text.length,
      segments: segments.length,
      output_files: outputFiles,
    };
    console.log(JSON.stringify(meta, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  formatSession,
  splitIntoSegments,
  extractMessage,
  truncate,
  USER_MAX_CHARS,
  ASSISTANT_MAX_CHARS,
  SEGMENT_THRESHOLD,
  SEGMENT_SIZE,
};
