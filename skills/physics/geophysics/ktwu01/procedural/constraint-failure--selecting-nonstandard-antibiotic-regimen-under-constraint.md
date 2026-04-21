---
name: "Selecting Nonstandard Antibiotic Regimen Under Constraint"
memory_type: procedural
subtype: constraint-failure
domain: physics
subdomain: geophysics
contributor: ktwu01
---
## When
First-line treatment is invalid due to patient constraint (e.g., drug allergy).

## Decision
Preferred: Construct **mechanistically equivalent regimen** using alternative drug classes rather than forcing partial standard protocol.

Rejected:
- Removing offending drug without replacement → reduces efficacy.
- Using unrelated substitutes without considering mechanism → increases resistance risk.

Reasoning:
Treatment success depends on **mechanistic coverage**, not brand-specific drugs.

## Local Verifiers
- Coverage spans acid suppression + multiple antibiotic pathways.
- Known resistance patterns accounted for.

## Failure Handling
If treatment fails:
- Perform post-treatment verification (e.g., breath test).
- Switch to quadruple therapy with different antibiotic classes.

## Anti-exemplars
- Mild infections where monotherapy suffices.
