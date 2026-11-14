# Dandelion documentation

[Main README — English and French](../README.md)

This index combines the team’s landing documentation with the complete integration report and the Featherless and architecture documents prepared during the hackathon. No private preparation files, credentials or personal conversations are included.

## Choose the right scope

| Scope                           | Reference                                                                                                                                   | What is documented                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Current landing branch          | `feat/landing-intro`                                                                                                                        | Garden, Atlas/Area, detailed Sunburst, team data contracts and extraction/classification scripts                              |
| Combined integration checkpoint | [`cdb9802`](https://github.com/baptiste-civiqhub/dandelion-open-data/tree/cdb9802a29b83c97a4a2f1d52c3b3fd45c07e9e9)                         | PFAS and municipal archives, guided comparison, constrained assistant, Cosmograph, observed filings and recorded verification |
| Separate ML research            | [`8d6f3c2`](https://github.com/baptiste-civiqhub/dandelion-open-data/tree/8d6f3c276a6e048fb10f348ea586f961a12fe05d/research/ml-feasibility) | Historical feasibility study, data limitations, baselines and TabICL findings; no deployed forecast                           |

Documenting the combined integration here does not merge its application code into the landing branch. The public URL may run a different revision; check the deployed commit before demonstrating a branch-specific feature.

## Product and integration

- [Complete integration report](project-report.md): target, problem, solution, features, API roles, use cases, installation, tests, research and roadmap.
- [Featherless technical report](featherless.md): actual application calls, validated UI actions, article classification and evaluation limits.
- [Architecture and assistant sequence](architecture.md): readable Mermaid diagrams with explicit data and execution boundaries.
- Architecture source: [Mermaid](architecture.mmd) · [PlantUML](architecture.puml).
- Assistant sequence source: [Mermaid](assistant-sequence.mmd) · [PlantUML](assistant-sequence.puml).

The original diagram sources are preserved. The topic vocabulary count is corrected to **50 labels plus an Other fallback** after checking both the historical classifier commit and the landing source.

## Team implementation references

- [Data model overview](dandelion/README.md), [schema](dandelion/schema.md), [REST API](dandelion/api.md) and [import contract](dandelion/import.md).
- [Frontend stack](stack.md), [portability](portabilite.md), [deployment](deploiement.md) and [web UI](webui.md).
- [World controls and implementation](../features/world/README.md).
- [Agent conventions](../AGENTS.md) and [design system](../design-system/README.md).

## Evidence and limits

The 367 unit tests and 47 browser scenarios are archived results for `cdb9802`, not a new test run of this branch. Nine of those browser scenarios use intercepted API fixtures. Real Supabase corpus coverage was not verified in that integration checkout.

The three recorded Featherless application calls establish local feasibility, not statistical model reliability. Classification scores are not probabilities of legislative outcomes. Suzan AI supports preparation of a governance review; no completed audit or certification is claimed.
