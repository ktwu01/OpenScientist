# /extract-knowhow

Extract a research decision tree from the user's Claude Code + Codex CLI session history for **OpenScientist**.

**Run fully automatically with ZERO user interaction.** Do not pause or ask questions. Report progress at each milestone.

You are responsible for exactly one thing: **reading each session's formatted text with the Read tool and turning it into a list of research action nodes.** Everything else — discovery, metadata, filtering, dedup, tree assembly, upload — is done by helper scripts. Do not reimplement their work.

---

## Pipeline

```
scan-sessions.js   ─┐
                    ├─ deterministic (you just call them)
format-session.js  ─┤
extract-nodes.js   ─┤
build-tree.js      ─┤
upload-tree.js     ─┤
finalize.js        ─┘

Read + your judgment  ← the only AI step
```

Helper scripts (installed at `~/.claude/utils/`):

| Script | Purpose |
|---|---|
| `scan-sessions.js` | Discover all sessions, parse metadata, filter garbage, group by project → `work-list.json` |
| `format-session.js` | Turn one raw `.jsonl` into compact timestamped text (auto-splits >30K into segments) |
| `extract-nodes.js` | Validate and cache the node JSON you produce per session |
| `build-tree.js` | Sort subtrees by timestamp and assemble into a single tree |
| `upload-tree.js` | POST to researchskills.ai and open the review page |
| `finalize.js` | One-shot wrapper: collect → build-tree → merge anchor/domain → upload |

---

## The Three Hard Rules

These exist because prior runs produced garbage by taking shortcuts.

1. **Use the Read tool on the formatted text.** After `format-session.js` writes `/tmp/session-<id>.txt`, you MUST open it with the Read tool. Do not pattern-match, do not grep, do not write a script that loops over sessions. Your semantic judgment is the whole point of this command.

2. **Timestamps come from the line prefix.** Every line in the formatted text is prefixed with `[ISO-timestamp] ROLE: text`. The `timestamp` field on each node MUST be that prefix timestamp. Never use the current time, never fabricate.

3. **Nodes must be specific.** Each `summary`, `reasoning`, `outcome` describes *this specific moment* in *this specific conversation*. If you find yourself copying the same sentence across nodes ("Searched for information", "Research phase"), you did it wrong — re-read the session.

---

## Arguments

- `--test` → Test mode. Accept engineering sessions too, tag every upload with `is_test: true` and prefix `project_name` with `[TEST] `.
- (none) → Production mode. Only `research` sessions proceed.

Announce the mode in your first progress message.

---

## Stage 1 — Scan

Run one command:

```bash
node ~/.claude/utils/scan-sessions.js
```

This writes `~/.openscientist/cache/work-list.json`:

```json
{
  "totals":  { "discovered": 1712, "accepted": 63 },
  "skipped": { "tooSmall": 180, "tooShort": 44, "subAgent": 1421, "duplicate": 4, "unreadable": 0 },
  "sessions": [
    { "session_id": "...", "source": "claude", "file_path": "...", "project_path": "...",
      "first_prompt": "...", "user_message_count": 15, "duration_minutes": 42,
      "start_timestamp": "2026-03-10T10:15:00Z" }
  ],
  "projects": { "/Users/.../proj-a": ["id1", "id2"], ... }
}
```

Read that file. Everything downstream operates on its `sessions` array.

---

## Stage 2 — Classify & Pick Domain (AI)

For each session in the work list, classify it semantically from its `first_prompt` (and `project_path` for context):

- `research` → literature, hypothesis, derivation, experiment design, data analysis, scientific writing, scientific tool dev
- `engineering` → web/mobile, DevOps, general software, business logic
- `other` → casual, setup, unrelated

**Semantic only.** No substring matching. Read the prompt and decide.

**Filter:**
- Production mode → keep only `research`
- Test mode → keep `research` + `engineering`, drop `other`

If zero sessions survive: report and stop.

Then group the surviving sessions by `project_path` and for each project pick:
- `anchor.project_name`, `anchor.project_description` (infer from session prompts)
- `domain` (arXiv top-level: physics | mathematics | computer-science | quantitative-biology | statistics | eess | economics | quantitative-finance)
- `subdomain` (arXiv-aligned, canonical list at <https://researchskills.ai/taxonomy.json>)

Test-mode engineering projects → `domain: "computer-science"`, `subdomain: "test-data"`.

Get the contributor name once:

```bash
git config user.name
git config user.email
```

Fall back to `"Anonymous Contributor"`.

---

## Stage 3 — Extract Nodes Per Session (AI, the real work)

**Incremental limit:** process at most 50 uncached sessions per run. Before processing, skip any session already cached:

```bash
node ~/.claude/utils/extract-nodes.js is-cached <session_id>
# exit 0 = cached (skip), exit 1 = not cached (process)
```

For each remaining session, do these steps **one at a time, with explicit tool calls**:

### 3a. Format

```bash
node ~/.claude/utils/format-session.js <file_path> /tmp/session-<session_id>.txt
```

Capture the stdout JSON. You need `start_timestamp` and `output_files` (one normally, multiple if the session was large enough to be segmented).

### 3b. Read (mandatory — Rule 1)

Open each output file with the **Read tool**. For segmented sessions, Read each segment in order. Every line looks like:

```
[2026-03-26T02:12:20.598Z] USER: Let's look at surface-code decoders for low-rate fault tolerance…
[2026-03-26T02:13:45.102Z] ASSISTANT: Here are three promising approaches…
```

### 3c. Identify nodes

Scan chronologically. Create a node at each **meaningful research progress** matching one of the 20 action types:

| Phase | Actions |
|---|---|
| Exploration | `search_literature`, `formulate_hypothesis`, `survey_methods` |
| Design      | `design_experiment`, `select_tool`, `prepare_data` |
| Execution   | `implement`, `run_experiment`, `debug` |
| Observation | `observe_result`, `analyze_result`, `validate` |
| Decision    | `compare_alternatives`, `pivot`, `abandon`, `diagnose_failure`, `plan_next_step` |
| Output      | `write_paper`, `make_figure`, `respond_to_review` |
| Escape      | `other: "free text"` |

Each node:

```json
{
  "id": "session-<session_id>-001",
  "action": "search_literature",
  "summary": "Surveyed surface-code decoders for low-rate fault tolerance",
  "outcome": "success: shortlisted three candidate decoders",
  "reasoning": "Needed SOTA baseline before picking a decoder to reproduce",
  "tools_used": ["arxiv-mcp", "WebFetch"],
  "parent_id": null,
  "confidence": "high",
  "initiator": "human",
  "status": "active",
  "timestamp": "2026-03-26T02:12:20.598Z"
}
```

Linking: first node `parent_id: null`, subsequent nodes chain to the previous one by id. Timestamps come from the `[...]` prefix (Rule 2). Content is specific to this conversation (Rule 3).

**De-identify:** strip file paths, usernames, project codenames, private URLs, collaborator names. Keep scientific content — materials, parameters, methods, tool/library names.

**Parallelism:** if there are multiple projects, dispatch one Agent per project to run Stage 3 in parallel. Give each agent the session records for its project plus this stage's instructions.

### 3d. Save via extract-nodes.js

Write the nodes array to a temp file, then let the helper validate + cache it:

```bash
cat > /tmp/nodes-<session_id>.json <<'EOF'
[ { "id": "session-<session_id>-001", ... }, ... ]
EOF

node ~/.claude/utils/extract-nodes.js save \
  <session_id> <start_timestamp> /tmp/nodes-<session_id>.json
```

On validation failure it prints errors and exits non-zero — fix and retry.

---

## Stage 4 — Finalize Per Project

For each project (from Stage 2) write a `project-meta.json` and call `finalize.js`. It handles collect → build-tree → merge → upload in one go.

```bash
cat > /tmp/<slug>-meta.json <<'EOF'
{
  "project_slug": "surface-code-decoders",
  "session_ids": ["id1", "id2", "id3"],
  "anchor": {
    "type": "project",
    "project_name": "Surface-Code Decoder Benchmarks",
    "project_description": "Comparing decoder families for low-rate fault tolerance."
  },
  "domain": "physics",
  "subdomain": "quantum-physics",
  "contributor": "Jane Doe (MIT)",
  "is_test": false
}
EOF

node ~/.claude/utils/finalize.js /tmp/<slug>-meta.json
```

`finalize.js` prints the upload result (including the `RESULT={...}` line with the review URL) and opens the review page in the browser. On upload failure it saves locally and exits non-zero — include the fallback path in your summary.

For test-mode projects, set `"is_test": true`. The script adds the `[TEST]` prefix and `is_test` flag automatically.

---

## Stage 5 — Terminal Summary

```
═══════════════════════════════════════════════════════
  /extract-knowhow Complete!
═══════════════════════════════════════════════════════

Extracted N action nodes from M projects (P sessions).

Review your decision trees:
  → https://researchskills.ai/review/abc123
  → https://researchskills.ai/review/def456

Sign in with GitHub, review your tree, and submit with one click.
```

**Test mode** — add the warning banner:

```
⚠ TEST MODE — uploaded trees are marked is_test=true and prefixed [TEST].
  Do NOT click "Submit to OpenScientist" unless you want this counted
  as real data.
```

If Stage 3 hit the 50-session limit, add:

```
Processed 50 sessions. Run /extract-knowhow again to analyze the remaining N sessions.
```
