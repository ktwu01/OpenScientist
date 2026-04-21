---
name: paper-based-analysis-limits-scalability
memory_type: semantic
subtype: correction
domain: statistics
subdomain: applications
contributor: ktwu01
---
## Skill 3

**Skill Name:** paper-based-analysis-limits-scalability

**Memory Type:** semantic
**Subtype:** correction

## When

IF a researcher performs most analysis manually on paper with minimal computational tooling in data-heavy or modeling domains (e.g., biology PhD work involving data interpretation).

## Decision

Shift toward computational workflows:

* Use scripting (Python/R) for reproducibility
* Digitize intermediate reasoning

Rejected:

* Continuing manual-only workflows → limits scale and reproducibility

## Why

Paper-based workflows:

* Prevent iteration over large datasets
* Block reproducibility
* Limit integration with statistical or ML tools

This contradicts modern research requirements where **analysis must scale and be auditable**.

## Local Verifiers

* Repeated manual recalculation of similar analyses
* No saved intermediate outputs
* Difficulty reproducing previous results

## Anti-exemplars

* Pure theoretical derivations
* Small-scale conceptual reasoning
