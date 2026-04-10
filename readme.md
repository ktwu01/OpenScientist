<div align="right">

[English](#-openscientist) · [中文](readme_zh.md)

</div>

<div align="center">

# 🌍 OpenScientist

[![GitHub stars](https://img.shields.io/github/stars/OpenScientists/OpenScientist?style=social)](https://github.com/OpenScientists/OpenScientist/stargazers) [![GitHub forks](https://img.shields.io/github/forks/OpenScientists/OpenScientist?style=social)](https://github.com/OpenScientists/OpenScientist/fork) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

2015: 5,154 scientists co-authored one paper on the Higgs boson.

Today: We're launching the largest academic collaboration in human history

**— 🏛️ Building the Library of Alexandria for AGI, Accelerating Automated Scientific Discovery.**

<p align="center">
  <a href="https://openscientists.github.io/OpenScientist/">
    <img src="https://raw.githubusercontent.com/OpenScientists/OpenScientist/main/utils/assets/knowledge-tree-v2.png" alt="Knowledge Tree" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://openscientists.github.io/OpenScientist/">View Interactive Knowledge Tree →</a>
</p>

---

<h2 align="center">1. About OpenScientist</h2>

</div>

**Science is the last important problem left for AI to solve.** Real scientific breakthroughs require something no model has: the hard-won intuition of researchers who've spent years at the frontier.

This intuition lives in your head — the know-how, the heuristics, the reasoning patterns, the "I just know this won't work" instinct. It never makes it into papers. It dies when you retire.

**OpenScientist captures it before it's lost.** We turn the tacit knowledge of the world's top researchers — their skills, thinking frameworks, and principles — into reusable AI agent skills (compatible with **Claude Code** and **Codex CLI**). Every contribution makes every AI scientist — now and in the future — smarter, permanently.

Each skill encodes the knowledge, tools, reasoning protocols, and common pitfalls of a scientific field. Skills can be written by domain experts or **auto-extracted from your research conversations** using `/extract-knowhow`. The command reconstructs your research trajectory as a **decision tree** — every action you took, every path you abandoned, every judgment call you made — then derives reusable skills from it. Point your AI agent at a skill, and it reasons like a domain expert.

---

<h2 align="center">2. How to Contribute</h2>

### Method A: Auto-Extract with `/extract-knowhow` (Recommended)

```bash
npm install -g @openscientist/extract-knowhow
```

**Claude Code:**
```
/extract-knowhow
```

**Codex CLI:**
```
$extract-knowhow
```

The command scans your conversation history and reconstructs your research as a **decision tree** — a structured trace of every action you took, what worked, what you abandoned, and why. Each node is mapped to one of 20 atomic research action types (e.g., `formulate_hypothesis`, `diagnose_failure`, `pivot`, `validate`), capturing who initiated each step (you or the AI) and the reasoning behind it.

An interactive browser review page lets you verify the tree, check de-identification, and bind it to your paper (arXiv/DOI) or project. Submit your tree to OpenScientist, where it becomes part of a growing dataset of real research trajectories — the raw material for building better AI scientist skills.

### Method B: One-Click Prompt for Web Users (ChatGPT / Claude / Gemini)

Enable memory so the AI can access your history:

| Platform | How to enable | Settings link |
|----------|--------------|---------------|
| **ChatGPT** | Settings > Personalization > turn on **Memory** and **Reference chat history** | [Settings](https://chatgpt.com/settings) |
| **Claude** | Settings > Capabilities > turn on **Memory** | [Settings](https://claude.ai/settings/capabilities) |
| **Gemini** | Settings > Personal context > turn on **Your past chats with Gemini** | [Settings](https://gemini.google.com/settings) |

Then paste this prompt into a **new conversation**:

<details>
<summary><b>Click to expand the full prompt</b></summary>

```
Review all our past conversations and reconstruct my research process as a decision tree. Focus exclusively on research activities — ignore general programming, setup, or casual conversations.

For each meaningful research action you find, create a node with the following fields:

- action: one of these 20 types:
  Exploration: search_literature, formulate_hypothesis, survey_methods
  Design: design_experiment, select_tool, prepare_data
  Execution: implement, run_experiment, debug
  Observation: observe_result, analyze_result, validate
  Decision: compare_alternatives, pivot, abandon, diagnose_failure, plan_next_step
  Output: write_paper, make_figure, respond_to_review
  (If none fit, use: other: "free text description")
- summary: one sentence describing what was done
- outcome: success | failure | uncertain + short explanation
- reasoning: why this step was taken (motivation, evidence, intuition)
- tools_used: tools, models, or libraries involved (empty list if none)
- confidence: high | medium | low
- initiator: ai | human | collaborative (who proposed this action?)
- status: active | abandoned | paused

Output the full tree as a SINGLE JSON code block using this format:

{
  "anchor": {
    "type": "paper or project",
    "paper_url": "arXiv/DOI URL if available",
    "project_name": "project name if no paper",
    "project_description": "one sentence"
  },
  "contributor": "My Name (My Institution)",
  "extracted_at": "[today's date]",
  "nodes": [
    {
      "id": "001",
      "action": "search_literature",
      "summary": "Surveyed recent methods for X",
      "outcome": "success: identified 3 approaches",
      "reasoning": "Needed to understand SOTA before designing experiment",
      "tools_used": ["Google Scholar"],
      "parent_id": null,
      "confidence": "high",
      "initiator": "human",
      "status": "active"
    }
  ]
}

Rules:
- Reconstruct the FULL research trajectory, including dead ends and abandoned paths
- Use parent_id to build tree structure: child actions branch from the action that led to them
- Mark abandoned paths with status: "abandoned" — these dead ends are the most valuable data
- DE-IDENTIFY all output: remove file paths, usernames, project names, private URLs, collaborator names. Keep scientific content (materials, parameters, methods)
- Focus on capturing the reasoning and judgment behind each action — the kind of intuition that never makes it into papers
- DO NOT skip failed attempts or abandoned directions — they reveal tacit knowledge
- DO NOT extract generic programming knowledge, AI tool usage patterns, or textbook basics
- After the JSON block, ask if there are research conversations that were missed
```

</details>

After running, submit via: [**Submit your skill →**](https://github.com/OpenScientists/OpenScientist/issues/new?template=01-submit-skill.yml)

### Method C: Write Manually

Write your own skill following the [template](skills/_template.md), then [**submit via GitHub Issue →**](https://github.com/OpenScientists/OpenScientist/issues/new?template=01-submit-skill.yml)

> Don't see your field? [Propose a new area →](https://github.com/OpenScientists/OpenScientist/issues/new?template=04-propose-new-area.md) · Need a skill but can't write it yourself? [Request a skill →](https://github.com/OpenScientists/OpenScientist/issues/new?template=02-skill-request.yml)

---

<h2 align="center">3. Become a Reviewer</h2>

Reviewers are domain experts who guard the scientific quality of skills in their subdomain. You need substantial peer-review experience in the relevant field.

**What you do:** Review submitted skills for scientific accuracy and completeness. Provide constructive feedback to contributors. Promote skill status from `draft` to `reviewed` once verified.

**What you get:** Approve or request changes on submissions in your subdomain.

[**Apply to become a reviewer →**](https://github.com/OpenScientists/OpenScientist/issues/new?template=03-maintainer-application.yml)

---

<h2 align="center">4. Domains</h2>

<div align="center">

Aligned with the [arXiv category taxonomy](https://arxiv.org/category_taxonomy). 8 domains, 155 subcategories.

| Domain                                      | arXiv                                              | Subcategories | Reviewer(s)        |
| --------------------------------------------- | ---------------------------------------------------- | --------------- | -------------------- |
| ⚛️ Physics                                | astro-ph, cond-mat, gr-qc, hep, nlin, physics, ... | 51            | *Seeking reviewer* |
| ➗ Mathematics                              | math                                               | 32            | *Seeking reviewer* |
| 💻 Computer Science                         | cs                                                 | 40            | *Seeking reviewer* |
| 🧬 Quantitative Biology                     | q-bio                                              | 10            | *Seeking reviewer* |
| 📊 Statistics                               | stat                                               | 6             | *Seeking reviewer* |
| ⚡ Electrical Engineering & Systems Science | eess                                               | 4             | *Seeking reviewer* |
| 📈 Economics                                | econ                                               | 3             | *Seeking reviewer* |
| 💹 Quantitative Finance                     | q-fin                                              | 9             | *Seeking reviewer* |

[View all 155 subcategories in the interactive knowledge tree →](https://openscientists.github.io/OpenScientist/)

</div>

---

## License

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — free to share and adapt, with attribution.

---

<div align="center">

## Acknowledgments

With gratitude to everyone who makes this possible:

[**Contributors →**](https://github.com/OpenScientists/OpenScientist/graphs/contributors) · [**Reviewers →**](https://openscientists.github.io/OpenScientist/reviewers.html) · [**Sponsors →**](https://openscientists.github.io/OpenScientist/organizers.html) · [**Organizers →**](https://openscientists.github.io/OpenScientist/organizers.html)

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=OpenScientists/OpenScientist&type=Date)](https://star-history.com/#OpenScientists/OpenScientist&Date)

</div>
