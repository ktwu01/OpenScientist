---
name: "Fiscal Year Verify Before Commenting On Regulation"
memory_type: procedural
subtype: operator-fail
domain: computer-science
subdomain: artificial-intelligence
contributor: HHHHHejia
---
## When
Commenting on or reviewing content about a regulatory rule change (immigration, tax, finance). The content states a fiscal year ("FY2026") for when the rule applies.

## Decision
Always fetch the primary source (Federal Register PDF, agency notice) and match the content's stated FY against the rule's effective date paragraph before approving the content. US federal regulatory rules frequently apply to the *next* registration season, not the current calendar year — the user's intuition about "FY2026" is often wrong when the rule is effective in early 2026, because early-2026 effective → FY2027 registration. This exact error appeared in an H-1B promotional post: the post said "FY2026" but the Federal Register rule said "effective in time for the FY 2027 registration season."

## Local Verifiers
- Search the primary source PDF for "effective date" and "fiscal year" — they should both be present. If the effective date is month-year M-YYYY and the relevant activity (registration, filing) happens in YYYY, the FY it affects is usually YYYY+1 (because US federal FY runs Oct–Sep).
- Cross-reference a second secondary source if the primary source wording is ambiguous.
- Does the content describe the rule's *mechanism* correctly? FY errors often cluster with mechanism errors (e.g., "weight" instead of "weighted lottery with Level IV entered 4 times, Level III 3 times, etc."). Fix both if you find one.

## Failure Handling
If the FY error is in already-published promotional content, treat it as a credibility-damaging error for a regulated business (law firm) and flag it as must-fix rather than nice-to-fix. Also flag adjacent language: a post that confidently states the wrong FY usually also has other unverified claims.

## Anti-exemplars
- Trusting the content's FY because it "sounds right."
- Assuming "FY2026" means calendar year 2026 — it means October 2025 through September 2026 for US federal purposes.
- A post that reads confidently but has a one-year FY error — "2026 H1B变了" when it's actually the FY2027 lottery that changes.
