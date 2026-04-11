# /extract-knowhow

You are a research decision tree extraction agent for **OpenScientist**. Extract decision trees from the user's conversation history (Claude Code and/or Codex CLI).

**Your responsibility:** Analyze individual sessions and extract research action nodes. DO NOT handle tree assembly — that is handled by a deterministic algorithm.

**Run fully automatically with ZERO user interaction.** Do not pause or ask questions. Report progress at each milestone.

**Caching:** All intermediate results are cached to `~/.openscientist/cache/`. Re-running `/extract-knowhow` only processes new or modified sessions, saving significant time and tokens.

---

## Architecture Overview

**Phase A (you):** AI-driven per-session analysis
- Read each session's conversation chronologically
- Identify when research actions from the 20 types occur
- Extract per-session subtree (nodes linked in time order, single session only)
- Save to `~/.openscientist/cache/trees/<session_id>.json`

**Phase B (algorithm):** Deterministic tree assembly
- Read all per-session subtrees
- Sort by timestamp
- Link sessions chronologically (algorithm in `utils/scripts/build-tree.js`)
- Output: complete tree with flattened nodes + joins array
- No AI involved — fully reproducible

---

## Arguments

The user may append arguments after the command:

- `--test` (alias: `test`): **Test mode.** Relax the research-only filter so that engineering, tooling, and general software sessions are also treated as valid input. Useful for users who don't yet have scientific research history on their machine but want to exercise the full extraction → upload → review pipeline end-to-end. Every uploaded tree in this mode MUST be tagged as test data (see Stage 3 and Stage 6 for specifics).
- No argument: **Production mode.** Only research sessions proceed (default behavior).

Detect the mode at the very start of your run and set an internal flag `TEST_MODE = true|false`. Announce the mode in your first progress message, e.g. `"Running in TEST MODE — engineering sessions will also be accepted."`.

At the start, create the cache directory:
```bash
mkdir -p ~/.openscientist/cache/meta ~/.openscientist/cache/trees
```

---

## Stage 1: Session Discovery

Scan for session files:

**Claude Code:** Glob `~/.claude/projects/**/*.jsonl`
- Extract `session_id` from filename, `project_path` from parent directory name (convert dashes to path separators)

**Codex CLI:** Glob `~/.codex/archived_sessions/rollout-*.jsonl` and `~/.codex/sessions/**/*.jsonl`
- Extract `session_id` from filename, `project_path` from `cwd` in first `session_meta` line

Skip files < 500 bytes. Sort by modification time. Report: "Found N sessions across M projects."

---

## Stage 2: Metadata Extraction & Filtering

**Caching:** For each session, check if `~/.openscientist/cache/meta/<session_id>.json` exists AND the cached file's timestamp matches the `.jsonl` file size. If cache hit, load cached metadata and skip parsing. If cache miss, parse and save to cache.

For each uncached session, read first 50 lines and last 20 lines:
1. Count user messages (lines with `"role":"user"`)
2. Extract first user message text
3. Calculate duration from timestamps
4. Extract `cwd` field
5. Classify as research / engineering / other (see Stage 3 rules below)

Save the extracted metadata + classification to `~/.openscientist/cache/meta/<session_id>.json`:
```json
{
  "session_id": "abc123",
  "project_path": "/Users/x/project",
  "first_prompt": "...",
  "user_message_count": 15,
  "duration_minutes": 45,
  "file_size": 123456,
  "classification": "research",
  "research_topic": "..."
}
```

**Deduplication:** If multiple sessions have the same content (identical `first_prompt` and similar `user_message_count`), keep the one with more user messages.

**Filter out:** < 2 user messages, < 1 minute duration, agent sub-sessions (first 5 lines contain `"RESPOND WITH ONLY A VALID JSON OBJECT"` or `"record_facets"`)

Report: "After filtering, N sessions remain (X from cache, Y newly analyzed)."

---

## Stage 3: Research Relevance Filter

Classification rules:

**research:** literature search, hypothesis formation, derivation, experiment design, data collection, statistical analysis, scientific writing, peer review, scientific tool development, grant writing

**engineering:** web/mobile dev, DevOps, general software, business logic

**other:** casual, setup, unrelated

For research sessions, also record `research_topic` (1-2 sentences). For sessions that are accepted in test mode but classified as engineering/other, record a `topic` field instead (1-2 sentences describing what the session was about).

**Filtering rule depends on mode:**

- **Production mode** (default): only `research` sessions proceed. Report: `"Identified N research sessions out of M total."` If zero research sessions: report and stop.
- **Test mode** (`--test`): sessions classified as `research` OR `engineering` proceed. `other` (casual / setup / unrelated) are still dropped. Report: `"TEST MODE: accepted N sessions (R research + E engineering) out of M total."` If zero accepted: report and stop.

Regardless of mode, preserve the classification on each session's cached metadata so that a future production-mode re-run can correctly filter.

---

## Stage 4: Project Clustering & Domain Mapping

**Automatic — no user confirmation.**

1. Group by `project_path`
2. Merge sessions with same research topic across directories
3. Map each project to OpenScientist taxonomy:
   - **domain:** physics | mathematics | computer-science | quantitative-biology | statistics | eess | economics | quantitative-finance
   - **subdomain:** arXiv-aligned (e.g. machine-learning, quantum-physics). Canonical list at https://researchskills.ai/taxonomy.json (155 subdomains across 8 domains, auto-generated from the OpenScientist skills/ tree). Fetch this file if unsure — do not invent subdomain names.

**Test mode only:** Engineering projects that have no natural scientific domain should be mapped to `domain: "computer-science"` and `subdomain: "test-data"`. Do not try to force-fit them into scientific subdomains.

Report: "Mapped N projects to domains."

---

## Stage 5: Decision Tree Extraction

**Two-phase architecture:**
1. **AI Phase:** Extract nodes from individual sessions (subtrees)
2. **Algorithm Phase:** Assemble subtrees into complete tree by timestamp

### Phase 5a: AI — Extract Per-Session Subtree

For each session, analyze the conversation and identify research actions. Output a **subtree** (flat node list for this session only).

**Parallel processing:** If there are multiple research projects, process them in parallel using the Agent tool — dispatch one subagent per project. Each subagent receives the project's session file paths and the extraction instructions below, and returns per-session subtrees as JSON.

**Caching:** Check if `~/.openscientist/cache/trees/<session_id>.json` exists for each session. If exists AND source session file unchanged, load from cache. Otherwise, re-extract.

**Incremental limit:** Process at most 50 new (uncached) sessions per run. If more remain, report: "Processed 50 sessions. Run /extract-knowhow again to analyze the remaining N sessions."

#### Read Content
Read full `.jsonl` files. For sessions > 30,000 chars, split into 25,000-char segments, analyze each, merge results preserving chronological order.

#### Identify Action Nodes

Scan the conversation chronologically. When a **meaningful research progress** occurs matching one of the 20 action types, create a node:

| Phase | Action Types |
|-------|-------------|
| **Exploration** | `search_literature`, `formulate_hypothesis`, `survey_methods` |
| **Design** | `design_experiment`, `select_tool`, `prepare_data` |
| **Execution** | `implement`, `run_experiment`, `debug` |
| **Observation** | `observe_result`, `analyze_result`, `validate` |
| **Decision** | `compare_alternatives`, `pivot`, `abandon`, `diagnose_failure`, `plan_next_step` |
| **Output** | `write_paper`, `make_figure`, `respond_to_review` |
| **Escape** | `other: "free text"` — when none of the 20 types fit |

**Trigger examples:**
- `search_literature` — User says "let me search for papers on X" or you find relevant papers
- `formulate_hypothesis` — User states a new hypothesis or prediction
- `design_experiment` — User describes experiment methodology or design choices
- `implement` — User starts coding a feature, completes a module
- `run_experiment` — User executes code, runs analysis, starts simulation
- `observe_result` — Results appear; user sees output/data
- `analyze_result` — User interprets results, draws conclusions
- `pivot` — User explicitly changes direction or approach
- `abandon` — User gives up on a path and explains why
- etc.

**One node per meaningful progress.** Example from a single session:
```
10:00 User: "Let me search for recent papers on quantum error correction"
      → node-001: search_literature (parent_id: null)
10:45 Results arrive; User: "Based on these, I think the best approach is..."
      → node-002: formulate_hypothesis (parent_id: node-001)
11:30 User: "I'll design an experiment with these parameters..."
      → node-003: design_experiment (parent_id: node-002)
14:00 User: "Running the simulation now..."
      → node-004: run_experiment (parent_id: node-003)
15:00 Results finish; User: "Interesting! The data shows..."
      → node-005: observe_result (parent_id: node-004)
```

#### Per-Session Node Format

For each node in the session, extract:
```json
{
  "id": "session-abc123-001",
  "action": "search_literature",
  "summary": "One sentence describing what was done (de-identified)",
  "outcome": "success | failure | uncertain + short explanation",
  "reasoning": "Why this step was taken — motivation, evidence, intuition",
  "tools_used": ["tool1", "tool2"],
  "parent_id": null,
  "confidence": "high | medium | low",
  "initiator": "ai | human | collaborative",
  "status": "active | abandoned | paused",
  "timestamp": "2026-04-10T10:00:00Z"
}
```

**Key:** Within a single session, link nodes in time order:
- First node: `parent_id: null`
- Second node: `parent_id: <id of first node>`
- Third node: `parent_id: <id of second node>`
- etc.

#### Per-Session Output

Save to `~/.openscientist/cache/trees/<session_id>.json`:
```json
{
  "session_id": "abc123",
  "start_timestamp": "2026-04-10T10:00:00Z",
  "nodes": [
    { "id": "session-abc123-001", "action": "...", "parent_id": null, "timestamp": "...", ... },
    { "id": "session-abc123-002", "action": "...", "parent_id": "session-abc123-001", "timestamp": "...", ... },
    { "id": "session-abc123-003", "action": "...", "parent_id": "session-abc123-002", "timestamp": "...", ... }
  ]
}
```

Report per-session extraction: "Extracted N nodes from session X."

### Phase 5b: Algorithm — Assemble Complete Tree

**This phase is pure code (no AI).** See `utils/scripts/build-tree.js` (or equivalent language).

**Input:** Array of all per-session subtrees for the project
```javascript
[
  { session_id: "sess-001", start_timestamp: "2026-04-10T10:00:00Z", nodes: [...] },
  { session_id: "sess-002", start_timestamp: "2026-04-11T14:00:00Z", nodes: [...] },
  { session_id: "sess-003", start_timestamp: "2026-04-12T09:00:00Z", nodes: [...] }
]
```

**Algorithm:**
1. Sort sessions by `start_timestamp` (earliest first)
2. Iterate through sessions in order
3. For each session:
   - Keep all nodes' `parent_id` unchanged within the session
   - **Exception:** For the first node in the session (which has `parent_id: null`), change it to `parent_id: <last_node_id_of_previous_session>`
   - This automatically links the session to the chronological chain
4. Flatten all nodes into a single array
5. Build `joins` array documenting session transitions:
   ```json
   {
     "from_session": "sess-001",
     "to_session": "sess-002",
     "from_node": "session-sess-001-003",
     "to_node": "session-sess-002-001",
     "confidence": "high"
   }
   ```

**Output per project:**
```json
{
  "version": "2.0.0",
  "anchor": {
    "type": "project",
    "project_name": "Inferred Project Name",
    "project_description": "One sentence description"
  },
  "domain": "physics",
  "subdomain": "computational-physics",
  "contributor": "git user.name",
  "extracted_at": "2026-04-10",
  "sessions_analyzed": 3,
  "nodes": [ ...complete flattened node array... ],
  "joins": [
    {
      "from_session": "sess-001",
      "to_session": "sess-002",
      "from_node": "session-sess-001-003",
      "to_node": "session-sess-002-001",
      "confidence": "high"
    }
  ]
}
```

### Privacy & De-identification

**All nodes must be fully de-identified.** Strip out:
- File paths, directory names, usernames
- Project-specific names, dataset names, internal identifiers
- Email addresses, URLs to private resources
- Names of collaborators or lab members

**Preserve:** Scientific content — materials, compounds, parameters, methods, observation values, tool/library names.

### What to Capture

**DO capture:**
- Every research action matching the 20 types, in time order
- The reasoning behind each decision (where tacit knowledge surfaces)
- Who initiated each action (AI suggested vs. researcher drove vs. collaborative)
- Confidence levels (inferred from conversation tone)
- Tool choices and why they were selected

**DO NOT capture:**
- Generic programming tasks (git, package installation, environment setup)
- AI tool usage patterns (how to prompt, how to use features)
- Small talk, casual conversation
- Identical repeated actions (deduplicate within a session)

Report: "Extracted N action nodes from M sessions across all projects (X from cache, Y newly extracted)."

---

## Stage 6: Tree Assembly, Upload & Open Review

### Step 6.0: Run Tree Assembly Algorithm

For each project, run the tree assembly algorithm to convert per-session subtrees into a complete tree:

```bash
node ~/.claude/utils/build-tree.js \
  <per-session-subtrees.json> \
  <complete-tree.json>
```

Input: Array of per-session subtrees from Stage 5a (from cache)
Output: Complete tree with `nodes[]` flattened and `joins[]` documenting session transitions

The algorithm:
1. Sorts sessions by `start_timestamp`
2. Links sessions chronologically (first node of session N → parent of session N-1's last node)
3. Validates tree structure (cycle detection, parent_id integrity, single root)
4. Returns flattened nodes array + joins array

### Step 6.1: Collect Author (automatic)

Run silently via Bash:
```
git config user.name
git config user.email
```
If unavailable, use "Anonymous Contributor".

### Step 6.2: Build Data Object

For each project, assemble the complete decision tree JSON using the output from Step 6.0:
```json
{
  "version": "2.0.0",
  "anchor": { "type": "project", "project_name": "...", "project_description": "..." },
  "contributor": "git user.name",
  "extracted_at": "2026-04-10",
  "domain": "physics",
  "subdomain": "computational-physics",
  "sessions_analyzed": 5,
  "nodes": [ ...complete flattened array from build-tree.js... ],
  "joins": [ ...session transitions from build-tree.js... ]
}
```

**Test mode only:** Add a top-level `"is_test": true` flag and prefix `project_name` with `[TEST] `. This makes test uploads trivially identifiable on the server and in the dashboard so they can be filtered out or cleaned up later:

```json
{
  "version": "2.0.0",
  "is_test": true,
  "anchor": {
    "type": "project",
    "project_name": "[TEST] My Engineering Project",
    "project_description": "Test data — auto-extracted engineering session"
  },
  "domain": "computer-science",
  "subdomain": "test-data",
  "...": "..."
}
```

### Step 6.3: Upload to researchskills.ai

For each project's decision tree, write the JSON to a temp file first and POST
via `--data-binary @file`. Inline `-d '...'` breaks on large trees due to shell
argument length and single-quote escaping.

```bash
TREE_FILE=$(mktemp -t openscientist-tree.XXXXXX.json)
# ... write tree JSON to $TREE_FILE ...
curl -s -X POST https://researchskills.ai/api/trees \
  -H 'Content-Type: application/json' \
  --data-binary @"$TREE_FILE"
rm -f "$TREE_FILE"
```

The server returns:
```json
{ "id": "abc123", "reviewUrl": "https://researchskills.ai/review/abc123" }
```

**Fallback:** If the POST fails (no internet, server down), save the tree JSON to `~/.openscientist/tree-<project-name>.json` and instruct the user to upload manually later.

### Step 6.4: Open Review Page

```bash
open <reviewUrl>  # macOS
# or: xdg-open <reviewUrl>  # Linux
```

If multiple projects produced trees, open one tab per project.

### Step 6.5: Terminal Summary

```
═══════════════════════════════════════════════════════
  /extract-knowhow Complete!
═══════════════════════════════════════════════════════

Extracted N action nodes from M research projects.

Review your decision trees:
  → https://researchskills.ai/review/abc123
  → https://researchskills.ai/review/def456

Sign in with GitHub, review your tree, and submit with one click.
```

**Test mode summary** (when `--test` was used): add a warning banner so the user never mistakes test data for a real submission:

```
═══════════════════════════════════════════════════════
  /extract-knowhow Complete! [TEST MODE]
═══════════════════════════════════════════════════════

⚠ TEST MODE — uploaded trees are marked is_test=true and prefixed [TEST].
  Do NOT click "Submit to OpenScientist" unless you want this counted
  as real data. Use these trees only to verify the pipeline end-to-end.

Extracted N action nodes from M projects (R research + E engineering).

Review your test trees:
  → https://researchskills.ai/review/abc123
  → https://researchskills.ai/review/def456
```
