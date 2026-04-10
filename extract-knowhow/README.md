# @openscientist/extract-knowhow

> Automatically extract your research trajectory as a **decision tree** from Claude Code / Codex CLI conversation history and submit it to [OpenScientist](https://github.com/OpenScientists/OpenScientist).

## What It Does

When you use Claude Code for scientific research — data analysis, paper writing, experiment design, theoretical derivation — your conversations contain valuable tacit knowledge: judgment calls, abandoned approaches, tool choices, and reasoning patterns.

`/extract-knowhow` reconstructs your research as a **decision tree** — a structured trace of every action you took, what worked, what you abandoned, and why. Each node is mapped to one of 20 atomic research action types, capturing who initiated each step (you or the AI) and the reasoning behind it.

## Install

```bash
npm install -g @openscientist/extract-knowhow
```

This installs the command into both environments automatically:
- **Claude Code** → `~/.claude/commands/extract-knowhow.md`
- **Codex CLI** → `~/.codex/skills/extract-knowhow/SKILL.md`

## Usage

**Claude Code:**
```
/extract-knowhow
```

**Codex CLI:**
```
$extract-knowhow
```

The command will:

1. **Discover** all your Claude Code / Codex sessions
2. **Filter** to only research-related sessions (ignoring engineering/casual conversations)
3. **Cluster** sessions by research project and map to scientific domains
4. **Extract** a decision tree of atomic research actions:
   - 20 action types: `search_literature`, `formulate_hypothesis`, `design_experiment`, `implement`, `debug`, `observe_result`, `diagnose_failure`, `pivot`, `abandon`, `validate`, and more
   - Each node captures: what was done, why, what the outcome was, who initiated it (you or AI), and confidence level
   - Tree structure preserves branching, dead ends, and pivots
5. **Present** an interactive browser report for review
6. **Submit** your decision tree to OpenScientist via GitHub

## Output

A JSON decision tree following the [OpenScientist decision tree format](https://github.com/OpenScientists/OpenScientist/blob/main/docs/decision-tree-v2-design.md):

```json
{
  "version": "2.0.0",
  "anchor": { "type": "paper", "paper_url": "https://arxiv.org/abs/..." },
  "nodes": [
    {
      "id": "001",
      "action": "formulate_hypothesis",
      "summary": "Hypothesized that method A would outperform baseline",
      "outcome": "uncertain",
      "reasoning": "Method A showed strong results on similar tasks",
      "tools_used": [],
      "parent_id": null,
      "confidence": "medium",
      "initiator": "collaborative",
      "status": "active"
    }
  ]
}
```

## Contributing Back

After reviewing your decision tree in the browser:

- [**Submit via GitHub Issue →**](https://github.com/OpenScientists/OpenScientist/issues/new?template=02-submit-decision-tree.yml) (paste the JSON — no git required!)
- Or open a PR if you prefer git

## Uninstall

```bash
npm uninstall -g @openscientist/extract-knowhow
```

## Privacy

- All analysis happens locally via your Claude Code session
- Session data is read from `~/.claude/projects/` on your machine
- No data is sent to external servers beyond your normal Claude Code API usage
- AI auto-strips personal information; you review before submitting
- You choose what to submit — nothing is sent without your explicit action

## License

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Part of [OpenScientist](https://github.com/OpenScientists/OpenScientist)

> Building the Library of Alexandria for AGI — Accelerating Automated Scientific Discovery.
