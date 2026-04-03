# extract-knowhow

Analyze your Claude Code research session history and extract reusable know-how as OpenScientist skill files.

## Usage

Run `/extract-knowhow` in Claude Code to:

1. Scan your recent session `.jsonl` files in `~/.claude/projects/`
2. Identify domain-specific insights, techniques, and patterns discovered during research
3. Generate a draft OpenScientist skill file using the standard template
4. Save the draft to `skills/<domain>/<subdomain>/` for review and contribution

## What counts as know-how?

- Debugging strategies that solved non-obvious problems
- Parameter choices with empirical justification (e.g., "AMIX=0.05 for GGA+U on transition metals")
- Workflow patterns repeated across sessions
- Tool configurations and their rationale
- Domain heuristics and rules of thumb

## Output

The command produces a Markdown skill file pre-filled with frontmatter and sections populated from your session. Review the draft, fill in any missing fields, then open a pull request to contribute it to OpenScientist.
