# /extract-knowhow

Extract research skills from the user's Claude Code + Codex CLI session history for **OpenScientist**.

**Run fully automatically with ZERO user interaction.** Do not pause or ask questions. Report progress at each milestone.

You extract three types of cognitive memory from research conversations:
- **Procedural** — IF-THEN rules for research impasses (hardest to extract, most valuable)
- **Semantic** — Facts the LLM doesn't know (frontier, non-public, correction)
- **Episodic** — Concrete research episodes (failure, adaptation, anomalous cases)

Everything else — discovery, formatting, validation, upload — is done by helper scripts. Do not reimplement their work.

---

## Pipeline

```
scan-sessions.js   ─┐
                    ├─ deterministic (you just call them)
format-session.js  ─┤
validate-skills.js ─┤
upload-skills.js   ─┤
finalize.js        ─┘

Read + your judgment  ← the only AI step
```

Helper scripts (installed at `~/.claude/utils/`):

| Script | What it does |
|--------|-------------|
| `scan-sessions.js` | Discover sessions, extract metadata, filter, group by project |
| `format-session.js` | Preprocess .jsonl → truncated text (user 500 chars, assistant 300 chars) |
| `validate-skills.js` | Validate skill markdown and cache to `~/.openscientist/cache/skills/` |
| `upload-skills.js` | POST skills to researchskills.ai, open review page |
| `finalize.js` | Orchestrate: collect cached skills → upload |

---

## The Three Hard Rules

1. **Use the Read tool** on formatted text produced by `format-session.js`. Never pattern-match or grep raw `.jsonl` files.
2. **Timestamps** come from the `[ISO-timestamp]` prefix on each line of formatted text. Never fabricate timestamps.
3. **Skills must be specific** to what actually happened in the conversation. Never write generic textbook-style advice.

---

## Arguments

- `--test` (alias: `test`): Test mode. Accept engineering sessions too (not just research). Tag all output as test data.
- No argument: Production mode. Only research sessions proceed.

Detect mode at start. Announce: `"Running in TEST MODE"` or `"Running in production mode"`.

Create cache directory:
```bash
mkdir -p ~/.openscientist/cache/meta ~/.openscientist/cache/skills
```

---

## Stage 1 — Scan

```bash
node ~/.claude/utils/scan-sessions.js
```

Reads `~/.openscientist/cache/work-list.json` output. Report: `"Found N sessions across M projects."`

---

## Stage 2 — Classify & Pick Domain (AI)

For each project in the work-list:
1. Read the first_prompt of representative sessions
2. Classify as research / engineering / other
3. Map to OpenScientist taxonomy domain + subdomain
4. In test mode: engineering sessions accepted, mapped to `computer-science/test-data`

Report: `"Classified N projects. Proceeding with M."`

---

## Stage 3 — Extract Skills Per Session (AI, the real work)

### 3a. Format

For each session, call format-session.js:
```bash
node ~/.claude/utils/format-session.js <path/to/session.jsonl> /tmp/session-<session_id>.txt
```

Parse stdout JSON for `start_timestamp` and `output_files`.

### 3b. Read (mandatory — Rule 1)

Use the Read tool on each formatted text file. For segmented sessions, read each segment.

### 3c. Identify impasse moments

Scan the conversation chronologically. Look for **research impasse moments** — places where the researcher:
- Had to choose between alternatives (→ **Tie**)
- Got stuck and didn't know what to do next (→ **No-change**)
- Discovered an assumption didn't hold (→ **Constraint Failure**)
- Tried something and it failed technically (→ **Operator Fail**)

Also look for:
- Facts the human provided that an LLM wouldn't know (→ **Semantic**)
- Notable episodes worth remembering (→ **Episodic**)

### 3d. Extract in difficulty order

**Step 1: Episodic (easiest)**

For each notable episode, write a skill file:

```markdown
---
name: "<slug>"
memory_type: episodic
subtype: failure | adaptation | anomalous
domain: <domain>
subdomain: <subdomain>
contributor: <git user.name>
source:
  type: session
  session_id: "<session_id>"
extracted_at: "<today>"
confidence:
  llm_score: <0-5>
tags: [<relevant>, <tags>]
---

## Situation
[What was happening — be specific, de-identified]

## Action
[What was done]

## Outcome
[What happened as a result]

## Lesson
[What was learned — may be empty for anomalous cases]

## Retrieval Cues
- [When should an agent recall this episode?]
- [What situation pattern triggers it?]
```

**Step 2: Semantic (medium)**

For each knowledge gap identified:

```markdown
---
name: "<slug>"
memory_type: semantic
subtype: frontier | non-public | correction
domain: <domain>
subdomain: <subdomain>
contributor: <git user.name>
source:
  type: session
  session_id: "<session_id>"
extracted_at: "<today>"
confidence:
  llm_score: <0-5>
tags: [<relevant>, <tags>]
---

## Fact
[The specific knowledge point — concise, actionable]

## Evidence
- Source: [where this comes from]
- Verified by: [how verified]

## LLM Default Belief
[Only for correction subtype: what the LLM incorrectly assumes]

## Expiry Signal
[When this fact might become outdated]
```

**Step 3: Procedural (hardest)**

For each impasse with a clear resolution pattern:

```markdown
---
name: "<slug>"
memory_type: procedural
subtype: tie | no-change | constraint-failure | operator-fail
domain: <domain>
subdomain: <subdomain>
contributor: <git user.name>
source:
  type: session
  session_id: "<session_id>"
extracted_at: "<today>"
confidence:
  llm_score: <0-5>
tags: [<relevant>, <tags>]
---

## When
[What research situation triggers this skill — be specific]

### Exclusions
- [Situations that look similar but should NOT trigger this]

## Decision

### Preferred action
[What to do]

### Rejected alternatives
- [Alternative 1] — [why wrong here]

### Reasoning
[The tacit knowledge — why the preferred action is better]

## Local Verifiers
1. [Concrete check to run after acting]

## Failure Handling
[What to do if the verifiers fail]

## Anti-exemplars
- [Situation where this skill would be harmful]
```

### 3e. Save via validate-skills.js

Write each skill to `/tmp/skill-<session_id>-<N>.md`, then validate and cache:

```bash
node ~/.claude/utils/validate-skills.js save \
  <session_id> \
  /tmp/skill-<session_id>-001.md \
  /tmp/skill-<session_id>-002.md
```

On validation failure, fix the skill markdown and retry.

Report: `"Extracted N skills from session X (E episodic, S semantic, P procedural)."`

### 3f. Caching and limits

Before processing each session, check cache:
```bash
node ~/.claude/utils/validate-skills.js is-cached <session_id>
```

Process at most 50 new sessions per run. If more remain: `"Processed 50 sessions. Run /extract-knowhow again for remaining N."`

---

## Stage 4 — Finalize Per Project

For each project, write a project-meta.json and call finalize.js:

```bash
cat > /tmp/<slug>-meta.json <<'EOF'
{
  "project_slug": "<slug>",
  "session_ids": ["<id1>", "<id2>"],
  "anchor": { "type": "project", "project_name": "<name>", "project_description": "<desc>" },
  "domain": "<domain>",
  "subdomain": "<subdomain>",
  "contributor": "<git user.name>",
  "is_test": false
}
EOF

node ~/.claude/utils/finalize.js /tmp/<slug>-meta.json
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
  → https://researchskills.ai/review/skill/abc123
═══════════════════════════════════════════════════════
```

---

## De-identification

All skills must be de-identified. Strip:
- File paths, directory names, usernames
- Project-specific names, dataset names, internal identifiers
- Email addresses, URLs to private resources
- Names of collaborators or lab members

Preserve: Scientific content — materials, compounds, parameters, methods, tool/library names.

---

## What to Extract vs What to Skip

**DO extract:**
- Research impasse moments and their resolutions
- Knowledge the human provided that LLMs wouldn't know
- Notable episodes (failures, adaptations, anomalies)
- The reasoning behind decisions (where tacit knowledge surfaces)
- Anti-exemplars and exclusions (as important as the skill itself)

**DO NOT extract:**
- Generic programming tasks (git, npm, environment setup)
- Textbook-level knowledge (LLMs already know this)
- Small talk, casual conversation
- The same impasse repeated across sessions (deduplicate)
