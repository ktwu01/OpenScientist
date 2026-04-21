---
name: "Quantum Computing Triple Obstacle Framework"
memory_type: procedural
subtype: tie
domain: computer-science
subdomain: artificial-intelligence
contributor: HHHHHejia
---
## When
Evaluating the near-term (3–10 year) viability of a deep-tech research area with unclear commercialization timelines (quantum computing is the canonical case). Multiple expert opinions conflict; need a framework to separate "possible but far" from "never."

## Decision
Decompose into three distinct obstacle classes — any one blocks commercialization:
1. **Hardware scaling** — physical qubit : logical qubit ratio (~1000:1 for useful fault-tolerant QC). Check whether below-threshold error correction has been demonstrated (Google Willow, late 2024 — yes, milestone signal). Answers "can we build the machine at all."
2. **Algorithmic bottleneck** — the narrow list of provably-quantum-advantage algorithms (Shor, Grover, quantum simulation, select optimization). Quantum-AI claims are mostly speculative. Answers "even if we have the machine, what can it usefully do."
3. **Form-factor / market model** — will it be consumer product (unlikely), B2B platform via cloud (QCaaS via AWS Braket / Azure Quantum — yes), or national-lab-only? Answers "who pays for it and how."

The three classes are not independent: hardware unlocking (1) triggers algorithm exploration (2) by giving researchers an experimental platform, so "algorithm bottleneck" is partly a chicken-and-egg downstream of (1). Rejected: arguing from bench/qubit counts alone — ignores (2) and (3).

## Local Verifiers
- Can you name the specific recent milestone relevant to each of the three? If not, you don't have current state.
- Is your investment thesis priced in as if all three are solved? If yes, it's high-risk low-certainty — pure-play QC companies (IonQ, Rigetti) have this exposure.
- Is there a blended-exposure vehicle (Google, IBM, Microsoft) where QC is one of many bets? If yes, the timeline uncertainty is laundered through the parent company.

## Failure Handling
If all three obstacles are active, the honest answer is "commercialization timeline is 10–30 years, unknown." State the uncertainty rather than defaulting to a point estimate.

## Anti-exemplars
- Framing the entire question as "hardware scaling" alone (the usual VC pitch).
- Treating the algorithm bottleneck as resolved because someone has a "quantum ML" paper (most such claims lack the provable-advantage pillar).
- Dismissing all QC investment because of (3) alone — ignores that cloud-delivered specialty compute can be highly valuable (GPUs were never consumer-first).
