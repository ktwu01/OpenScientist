# /extract-knowhow

Extract research skills from the user's Claude Code session history for **OpenScientist**.

**Run fully automatically with ZERO user interaction.** Do not pause or ask questions. Report progress at each milestone.

Everything — formatting, extraction, validation, upload — is done by helper scripts. Do not reimplement their work.

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

```bash
node ~/.claude/utils/classify-projects.js ~/.openscientist/cache/work-list.json --verbose
```

For test mode, add `--test`.

The script calls Haiku to classify each project as research/engineering and picks domain/subdomain from the taxonomy. Output: `~/.openscientist/cache/classification.json`.

Read the output file. For each project with `type: "research"`, use its `research_session_ids`, `domain`, and `subdomain` in Stage 3.

---

## Stage 3 — Extract Skills Per Session (script + Haiku CLI)

### CRITICAL execution rules (you MUST follow ALL of these):

1. **NEVER use `run_in_background`** for the extraction script. The user needs to see progress after each batch.
2. **ALWAYS use `--single-batch`** flag. This makes the script run ONE batch (10 parallel Haiku calls) then exit.
3. **Loop with separate Bash calls.** After each call, report progress, then call the script again. Repeat until it reports "All sessions already cached" or "0 Haiku calls remaining".
4. **Pass ALL research session IDs** from Stage 2. Do NOT drop sessions or pick a subset.

### Execution pattern:

```bash
# Call this in a LOOP, one Bash call per iteration. NEVER run_in_background.
node ~/.claude/utils/extract-skills.js ~/.openscientist/cache/work-list.json \
  --domain <domain> \
  --subdomain <subdomain> \
  --contributor "$(git config user.name)" \
  --session-ids <ALL-research-session-ids-csv> \
  --single-batch \
  --verbose
```

After each call completes:
1. Report the batch result to the user (e.g. "Batch 2/7 done: 45 skills so far, 21 Haiku calls remaining")
2. If output contains "0 Haiku calls remaining" or "All sessions already cached" → stop looping
3. Otherwise → call the script again (same command, it auto-skips cached work)

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

Print a summary: total skills by type (episodic/semantic/procedural), sessions processed, and the batch review URL from finalize.js output.

