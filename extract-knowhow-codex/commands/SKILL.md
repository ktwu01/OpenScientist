---
name: "extract-knowhow"
description: "Extract research skills from conversation history into OpenScientist skill files."
---
# /extract-knowhow

Extract research skills from the user's Codex CLI session history for **OpenScientist**.

**Run fully automatically with ZERO user interaction.** Do not pause or ask questions. Report progress at each milestone.

> **Prerequisite:** This skill spawns nested `codex exec` calls that need full network and filesystem access. Start Codex with: `codex -a never -s danger-full-access` (or `--dangerously-bypass-approvals-and-sandbox`). If the parent session is sandboxed, nested calls will fail with network errors.

You extract three types of cognitive memory from research conversations:
- **Procedural** — IF-THEN rules for **scientific research** decisions: methodology choices, data interpretation strategies, research direction pivots. NOT engineering workflows.
- **Semantic** — **Frontier scientific knowledge** the LLM doesn't have: domain-specific constraints, unpublished findings, corrections to scientific misconceptions. NOT tool/API behaviors.
- **Episodic** — **Research cognitive turning points**: hypothesis overturned, methodology abandoned for scientific reasons, unexpected findings that changed direction. NOT debugging episodes.

Everything else — discovery, formatting, validation, upload — is done by helper scripts. Do not reimplement their work.

---

## Pipeline

```
scan-sessions.js       ─┐
classify-projects.js   ─┤
extract-skills.js      ─┤  deterministic scripts (you call them)
  └─ codex exec         │  ← Codex exec call per session, inside the script
clean-skills.js        ─┤  ← review: reject/fix/merge
score-skills.js        ─┤  ← score: 3-dim value assessment
finalize.js            ─┘

You (main agent)       ← call scripts, read summaries, report
```

Helper scripts (installed at `~/.codex/skills/extract-knowhow/scripts/`):

| Script | What it does |
|--------|-------------|
| `scan-sessions.js` | Discover sessions, extract metadata, filter, group by project |
| `classify-projects.js` | Classify projects as research/engineering via Codex, pick domain/subdomain |
| `extract-skills.js` | **The core loop**: format each session → call `codex exec` → validate + cache skills |
| `validate-skills.js` | Validate skill markdown and cache to `~/.openscientist/cache/skills/` |
| `clean-skills.js` | Review extracted skills: reject engineering, fix PII, merge duplicates |
| `score-skills.js` | Score surviving skills on 3 dimensions: procedural, semantic, episodic value |
| `finalize.js` | Collect cached skills → upload to researchskills.ai |

---

## Arguments

- `--test` (alias: `test`): Test mode. Accept engineering sessions too (not just research). Tag all output as test data.
- No argument: Production mode. Only research sessions proceed.

Detect mode at start. Announce: `"Running in TEST MODE"` or `"Running in production mode"`.

---

## Stage 1 — Scan

```bash
mkdir -p ~/.openscientist/cache/meta ~/.openscientist/cache/skills
node ~/.codex/skills/extract-knowhow/scripts/scan-sessions.js
```

Reads `~/.openscientist/cache/work-list.json` output. Report: `"Found N sessions across M projects."`

---

## Stage 2 — Classify Projects

**YOU MUST call this script. Do NOT classify projects yourself.**

```bash
node ~/.codex/skills/extract-knowhow/scripts/classify-projects.js ~/.openscientist/cache/work-list.json --verbose
```

For test mode, add `--test`.

The script calls Codex to classify each project as research/engineering and picks domain/subdomain from the taxonomy. It also filters out non-research sessions (e.g., extract-knowhow runs, build/deploy tasks) via `skip_patterns`.

Output: `~/.openscientist/cache/classification.json`.

Read the output file. For each project with `type: "research"`, use its `research_session_ids` (NOT `session_ids`), `domain`, `subdomain`, and `project_name` in later stages. Do NOT include skipped sessions.

The script generates an AI-summarized `project_name` for each project (e.g. "Protein Folding Simulation Pipeline") instead of using the raw folder name. Use this `project_name` in Stage 6 finalize. If `project_name` is null, fall back to the `slug`.

Report: `"Classified N projects. Proceeding with M."`

---

## Stage 3 — Extract Skills Per Session

### MANDATORY: Use --single-batch and loop. NEVER run all at once.

The extraction script MUST be called in a loop with `--single-batch`. Each call processes ONE batch (~5 parallel Codex calls) then exits. You call it again in a new tool call. This keeps the user informed of progress and prevents the UI from freezing.

**FORBIDDEN patterns (will cause long freezes):**
- `run_in_background: true` — user sees nothing for 10+ minutes
- Omitting `--single-batch` — script runs all batches internally, no progress visible

**REQUIRED pattern:**

```bash
# REPEAT this exact call in a loop. Each call = 1 batch.
node ~/.codex/skills/extract-knowhow/scripts/extract-skills.js ~/.openscientist/cache/work-list.json \
  --domain <domain> \
  --subdomain <subdomain> \
  --contributor "$(git config user.name)" \
  --session-ids <ALL-research-session-ids-csv> \
  --single-batch \
  --verbose
```

**Loop logic:**
1. Run the command above (foreground, NOT background)
2. Read the output. Report to user: "Batch N/M done: X skills extracted, Y calls remaining"
3. If output says `0 Codex calls remaining` or `All sessions already cached` → **stop, go to Stage 4**
4. Otherwise → run the **same command again** (it auto-skips cached segments)

Pass ALL research session IDs from Stage 2. Do NOT drop sessions or pick a subset.

If you need to process multiple projects with different domains, call the script once per project with `--session-ids` filtering to that project's sessions.

---

## Stage 4 — Clean Skills

Run review of all extracted skills: reject engineering content, fix PII leaks, merge duplicates.

```bash
node ~/.codex/skills/extract-knowhow/scripts/clean-skills.js \
  --session-ids <ALL-research-session-ids-csv> \
  --verbose
```

This spawns a Codex instance that directly reads, deletes, and edits skill files on disk.

Report: `"Clean: kept N, rejected M, merged K."`

---

## Stage 5 — Score Skills

Run assessment of the value of each surviving skill on 3 dimensions.

```bash
node ~/.codex/skills/extract-knowhow/scripts/score-skills.js \
  --session-ids <ALL-research-session-ids-csv> \
  --verbose
```

This spawns a Codex instance that reads each skill and writes `review_scores` (procedural, semantic, episodic — each 0-5) into the YAML frontmatter.

Report: `"Scored N skills. Avg: procedural X.X, semantic X.X, episodic X.X."`

---

## Stage 6 — Finalize Per Project

Use the AI-generated `project_name` from classification.json (Stage 2). Do NOT use the raw folder name.

```bash
node ~/.codex/skills/extract-knowhow/scripts/finalize.js \
  --session-ids <ALL-research-session-ids-csv> \
  --domain <domain> \
  --subdomain <subdomain> \
  --contributor "$(git config user.name)" \
  --project-name "<project_name from classification>" \
  --project-slug "<slug>"
```

---

## Stage 7 — Terminal Summary

```
═══════════════════════════════════════════════════════
  /extract-knowhow Complete!
═══════════════════════════════════════════════════════

Extracted N skills from M sessions across P projects:
  • Episodic:   E skills
  • Semantic:   S skills
  • Procedural: Pr skills

Review:
  • Kept: K / Rejected: R / Merged: G
  • Avg scores: procedural X.X, semantic X.X, episodic X.X

Review your skills:
  → https://researchskills.ai/review/batch/<batchId>
═══════════════════════════════════════════════════════
```
