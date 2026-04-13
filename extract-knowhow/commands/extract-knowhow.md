# /extract-knowhow

Extract research skills from the user's Claude Code session history for **OpenScientist**.

**Run fully automatically with ZERO user interaction.** Do not pause or ask questions. Report progress at each milestone.

You extract three types of cognitive memory from research conversations:
- **Procedural** — IF-THEN rules for **scientific research** decisions: methodology choices, data interpretation strategies, research direction pivots. NOT engineering workflows.
- **Semantic** — **Frontier scientific knowledge** the LLM doesn't have: domain-specific constraints, unpublished findings, corrections to scientific misconceptions. NOT tool/API behaviors.
- **Episodic** — **Research cognitive turning points**: hypothesis overturned, methodology abandoned for scientific reasons, unexpected findings that changed direction. NOT debugging episodes.

Everything else — discovery, formatting, validation, upload — is done by helper scripts. Do not reimplement their work.

---

## Pipeline

```
scan-sessions.js       ─┐
classify-projects.js   ─┤  deterministic scripts (you call them)
extract-skills.js      ─┤
  └─ claude -p          │  ← Sonnet CLI call per session, inside the script
finalize.js            ─┘

You (main agent)       ← call scripts, read summaries, report
```

Helper scripts (installed at `~/.claude/utils/`):

| Script | What it does |
|--------|-------------|
| `scan-sessions.js` | Discover sessions, extract metadata, filter, group by project |
| `classify-projects.js` | Classify projects as research/engineering via Sonnet, pick domain/subdomain |
| `extract-skills.js` | **The core loop**: format each session → call `claude -p --model sonnet` → validate + cache skills |
| `validate-skills.js` | Validate skill markdown and cache to `~/.openscientist/cache/skills/` |
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
node ~/.claude/utils/scan-sessions.js
```

Reads `~/.openscientist/cache/work-list.json` output. Report: `"Found N sessions across M projects."`

---

## Stage 2 — Classify Projects

**YOU MUST call this script. Do NOT classify projects yourself.**

```bash
node ~/.claude/utils/classify-projects.js ~/.openscientist/cache/work-list.json --verbose
```

For test mode, add `--test`.

The script calls Sonnet to classify each project as research/engineering and picks domain/subdomain from the taxonomy. It also filters out non-research sessions (e.g., extract-knowhow runs, build/deploy tasks) via `skip_patterns`.

Output: `~/.openscientist/cache/classification.json`.

Read the output file. For each project with `type: "research"`, use its `research_session_ids` (NOT `session_ids`), `domain`, and `subdomain` in Stage 3. Do NOT include skipped sessions.

Report: `"Classified N projects. Proceeding with M."`

---

## Stage 3 — Extract Skills Per Session

### MANDATORY: Use --single-batch and loop. NEVER run all at once.

The extraction script MUST be called in a loop with `--single-batch`. Each call processes ONE batch (~5 parallel Sonnet calls) then exits. You call it again in a new Bash tool call. This keeps the user informed of progress and prevents the UI from freezing.

**FORBIDDEN patterns (will cause long freezes):**
- `run_in_background: true` — user sees nothing for 10+ minutes
- Omitting `--single-batch` — script runs all batches internally, no progress visible
- Using Monitor tool to watch output — still freezes, just with delayed notifications

**REQUIRED pattern:**

```bash
# REPEAT this exact Bash call in a loop. Each call = 1 batch.
node ~/.claude/utils/extract-skills.js ~/.openscientist/cache/work-list.json \
  --domain <domain> \
  --subdomain <subdomain> \
  --contributor "$(git config user.name)" \
  --session-ids <ALL-research-session-ids-csv> \
  --single-batch \
  --verbose
```

**Loop logic:**
1. Run the command above (foreground Bash, NOT background)
2. Read the output. Report to user: "Batch N/M done: X skills extracted, Y calls remaining"
3. If output says `0 Sonnet calls remaining` or `All sessions already cached` → **stop, go to Stage 4**
4. Otherwise → run the **same command again** (it auto-skips cached segments)

Pass ALL research session IDs from Stage 2. Do NOT drop sessions or pick a subset.

If you need to process multiple projects with different domains, call the script once per project with `--session-ids` filtering to that project's sessions.

---

## Stage 4 — Finalize Per Project

```bash
node ~/.claude/utils/finalize.js \
  --session-ids <ALL-research-session-ids-csv> \
  --domain <domain> \
  --subdomain <subdomain> \
  --contributor "$(git config user.name)" \
  --project-name "<name>" \
  --project-slug "<slug>"
```

---

## Stage 5 — Terminal Summary

```
═══════════════════════════════════════════════════════
  /extract-knowhow Complete!
═══════════════════════════════════════════════════════

Extracted N skills from M sessions across P projects:
  • Episodic:   E skills (F failure, A adaptation, X anomalous)
  • Semantic:   S skills (Fr frontier, Np non-public, C correction)
  • Procedural: Pr skills (T tie, Nc no-change, Cf constraint-failure, Of operator-fail)

Review your skills:
  → https://researchskills.ai/review/batch/<batchId>
═══════════════════════════════════════════════════════
```

