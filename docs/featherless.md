# Dandelion × Featherless AI

## Technical implementation, experiments and next steps

**Date:** 14 November 2026  
**Project:** Dandelion — an interactive explorer for parliamentary texts and amendments  
**Scope:** Repository implementations and recorded local experiments. This report is not a fresh audit of the deployed application.

## 1. Executive summary

We integrated Featherless into two complementary parts of Dandelion:

1. **An assistant that translates French questions into validated visualization actions.** It can select an amendment, compare two amendments and request supported navigation actions. Three application-level calls were successfully tested against the real Featherless API, including an explicit abstention on an unsupported health-impact question.
2. **An article-classification pipeline contributed by the team.** It assigns thematic tags to legislative articles through Featherless’s classifier endpoint, records their provenance in Supabase and aggregates article tags at text level. The implementation was inspected for this report; its production run volume and classification accuracy have not been independently established here.

The intended benefit is to help people find and inspect relevant legislative evidence through natural language and thematic navigation. We have technical evidence of feasibility, but have not yet measured time saved or comprehension gains with users.

| Workstream | Implemented | Evidence available | Remaining validation |
| --- | --- | --- | --- |
| Featherless chat integration | Server-side completion client and application route | Connectivity smoke test and three real application calls | Broader evaluation and deployed configuration |
| Visualization action contract | Strict schemas, identifier validation and host adapters | Code and automated test coverage | Live-model coverage of every action and host |
| Article classification | Controlled vocabulary, classifier client and Supabase persistence | Team pipeline code and tests | End-to-end run evidence and human-reviewed label quality |
| Demo and partner attribution | Official Featherless logo and documented API role | Existing pitch materials | Keep claims aligned with the final demonstrated build |

## 2. The product use case

A person investigating a parliamentary proposal should be able to ask a concrete question, reach the relevant evidence and inspect its source without learning the database schema.

Our main verified example uses **32 public Senate amendments concerning PFAS**, from the 2023–2024 text numbered 620. A second supported snapshot contains **392 amendments** to a municipal-police text supplied through the team’s Hémicycle data workflow.

For example, the user asks:

> “Compare les amendements 26 et 27.”

Featherless selects the corresponding registered identifiers. Dandelion opens its comparison interface and attaches facts and source links from the stored records. Both PFAS amendments are recorded as withdrawn. They are separate proposals, not successive versions of an enacted article.

The model’s role is to help navigate the evidence. The application supplies the amendment text, status and provenance.

## 3. Workstream A — Natural-language control of the visualization

### Architecture

```text
French question + supported dataset identifier
    ↓
Next.js server route: POST /api/dataviz/plan
    ↓
Load the registered snapshot and select relevant candidates
    ↓
Featherless /v1/chat/completions
    ↓
JSON response → schema and identifier validation
    ↓
Host capability checks → supported visualization actions
    ↓
Display evidence from application records and official sources
```

The tested model was **`zai-org/GLM-5.3-Flash`**. The client uses a 20-second timeout, `temperature: 0` and `max_tokens: 400`. These settings limit the request; they do not guarantee identical or correct model outputs.

The repository’s historical default was `zai-org/GLM-5.2`. It was absent from the catalog checked during setup, so the successful local tests explicitly selected `GLM-5.3-Flash` through `FEATHERLESS_MODEL`.

### Bounded retrieval and prompting

The route accepts a strict request containing only `question` and `datasetId`. Questions are limited to 600 characters; clients cannot inject a separate system-prompt field.

The server constructs a compact candidate list using exact amendment numbers and lexical matching:

- Up to 40 structural nodes, such as the text and its articles.
- Up to 24 candidate amendment records.
- Text excerpts limited to 140 characters per candidate.
- A system-prompt budget of 16,000 characters.

This keeps the model context bounded as the corpus grows. Candidate selection still scans the indexed records, and the small excerpts limit the depth of semantic interpretation. This is a retrieval-and-action prototype, not comprehensive legal reasoning over a whole corpus.

### Validated actions

The shared action contract supports `focus`, `compare`, `show-evidence`, `open-location`, `zoom` and `reset-view`. Individual hosts expose only the capabilities they support. In particular, the tested route advertises zoom and reset; registered locations are required before location actions can be accepted.

An actual plan returned during the PFAS test was:

```json
{
  "schemaVersion": 1,
  "actions": [
    {
      "type": "compare",
      "ids": [
        "senat-2023-2024-620-amdt-26",
        "senat-2023-2024-620-amdt-27"
      ]
    }
  ]
}
```

Responses must be JSON, no larger than 8 KiB, and contain one to four valid actions. Unknown fields, unknown identifiers, unsupported actions and self-comparisons are rejected. The entire plan is validated before execution. This validation does not provide automatic rollback if a host callback subsequently fails.

The contract carries no executable JavaScript, SQL, DOM selectors or arbitrary navigation URLs. These controls limit what a model response can do; they do not establish that every valid selection is relevant to the user’s question.

### Abstention and service failure

The prompt requests an explicit abstention for unsupported predictions, opinions, economic effects or questions about applicable law:

```json
{"schemaVersion": 1, "abstain": true}
```

The server distinguishes valid plans, abstentions, invalid responses, timeouts and provider errors. Without a configured key, it returns `mode: "unconfigured"`. Manual navigation and the separate deterministic guide remain available.

### Recorded real-API tests

All observations below were recorded locally on **14 November 2026** using `zai-org/GLM-5.3-Flash`.

| User question | Observed result | Local elapsed time |
| --- | --- | ---: |
| “Compare les amendements 26 et 27” | Valid comparison plan; both records and Senate source URLs returned | 5.179 s |
| “Montre le sous-amendement 32” | Valid focus plan for amendment 32; record and source URL returned | 16.567 s |
| “Quel sera le nombre de cancers évités par cette loi ?” | Explicit abstention | 2.407 s |

A separate minimal connectivity smoke test also succeeded in 2.439 seconds. Its provider usage record reported 31 prompt tokens and 50 completion tokens. That call only checked connectivity and a short response; it was not an application-plan validation test.

The three application calls demonstrate feasibility, not a statistically meaningful accuracy or latency benchmark. No aggregate usage, operating cost, throughput or reliability claim follows from them.

Automated tests additionally cover malformed requests, client-supplied prompts, unknown identifiers, oversized responses, prose instead of JSON, abstention and provider failures. These tests use simulated provider responses and must be distinguished from live-model evaluation.

## 4. Workstream B — Thematic article classification

The team’s extraction pipeline includes `scripts/tag-articles.mjs`, exposed through the `tag:articles` package script.

It uses **`https://api.featherless.ai/v1/classifier`**, with **`featherless-ai/gemma-4-12B-it-classifier`** as its default model. This is a separate integration from the chat-completion assistant.

### Processing flow

1. Read legislative articles from Supabase, including designation, title and operative text (`dispositif`).
2. Evaluate a controlled vocabulary of **49 thematic labels across 10 categories**: institutions, budget, ecology, economy, health, knowledge/education, security, social issues, work and agriculture.
3. For each label, supply an explicit positive rule and a negative criterion through the classifier’s `noul` question format.
4. Keep recognized labels with finite scores between 0 and 1 and at least 0.5. Reject unknown labels and malformed scores.
5. Assign an “Other” fallback with no confidence value if no label is retained.
6. Store article-level tags in `tag_links`, including the dataset, target type, `source: "inference"`, model identifier and score.
7. Aggregate article tags at legislative-text level, retaining the highest available score for each shared tag.

These scores represent classifier outputs. They are not calibrated probabilities of legislative outcomes, political intent or real-world consequences.

### Operational handling implemented

- One in-flight classification request per configured key, with support for up to two distinct keys.
- Up to eight attempts for HTTP 429 and server-error responses, honoring a positive numeric `Retry-After` or applying bounded exponential backoff.
- A 90-second timeout per classifier request.
- On HTTP 422, support for splitting large vocabularies into groups of 50 and retrying with the operative text truncated to 8,000 characters. Only the copy sent for inference is truncated.
- Skip logic for articles already tagged by the same inference model, and checks against existing tag associations before insertion.
- Run counters for tagged, empty, skipped and failed articles.

This job writes derived metadata to Supabase, including rebuilding script-generated text-level tags. It is not a read-only analysis command.

The code and tests establish that these mechanisms are implemented. This report does not establish how many articles the team has successfully classified, the quality of those classifications or their completeness in the final interface.

## 5. Data handling and configuration

The assistant sends the user’s question and bounded excerpts from registered parliamentary records to Featherless. The classifier sends article content and topic definitions. Both are external inference calls, not local model execution.

The inspected assistant integration keeps its credential server-side; the recorded local configuration used an ignored environment file. No credential is included in this document. The last archived deployment checkpoint explicitly stated that the assistant key had not been deployed to Vercel; current deployment status requires a separate check.

| Component | Configuration |
| --- | --- |
| Assistant | `FEATHERLESS_API_KEY`, `FEATHERLESS_API_BASE`, `FEATHERLESS_MODEL` |
| Classification job | `FEATHERLESS_API_KEY_1` and optionally `_2`; unnumbered key accepted as the first key; `FEATHERLESS_MODEL`; server-side Supabase credential |

Both components use the environment name `FEATHERLESS_MODEL` for different model roles. Keep their execution environments separate or explicitly configure the appropriate model for each process.

Provider retention policies and organization-wide compliance have not been audited as part of this technical report.

## 6. Relationship to the rest of Dandelion

- **Hémicycle and official parliamentary sources supply the data.** The tested assistant route works over registered snapshots, rather than making a new Hémicycle request for every question.
- **The UI renders the graph, flower/sunburst, comparisons and navigation.** Featherless selects supported actions; it does not generate the rendering code or geometry.
- **The guided demo has a deterministic scenario.** A successful scripted animation is not evidence that a model autonomously completed the same journey.
- **The newer live Atlas/Area corpus guide remained deterministic at the documented checkpoint.** The recorded Featherless tests concern the supported snapshots, not arbitrary datasets or every 3D/game interaction.
- **The official Featherless logo was retrieved for partner slides and video materials.** The narration distinguishes the locally tested model integration from the deterministic guide shown in the preview.
- **Video narration uses ElevenLabs.** Image generation, speech synthesis, GNNs and the separate TabICL feasibility study are not Featherless results in this report.

## 7. What to validate next

| Priority | Next step | Evidence to collect |
| --- | --- | --- |
| 1 | Evaluate representative French questions, including ambiguous and unsupported requests | Correct entity selection, valid-plan rate, appropriate abstention and false-answer rate |
| 2 | Review classified articles against human labels | Per-topic precision/recall, missed themes, disagreement and fallback frequency |
| 3 | Verify the deployed configuration and dataset coverage | Real end-to-end calls from the final interface, source integrity and failure behavior |
| 4 | Measure performance over repeated requests | Latency distributions, timeout/error rates, token usage and cost |
| 5 | Test with intended users | Task completion, time to find evidence and understanding of amendment status |

Expansion to additional visualization hosts should preserve the same validation contract and make each host’s supported actions explicit.

## 8. Source and evidence references

Implementation links are pinned to inspected commits so that subsequent merges do not change the referenced design.

- [Featherless server client](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/bcb72f33d3ee2a946c3bba9a13caaab8f96919d0/services/featherless.ts)
- [Application route and request handling](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/bcb72f33d3ee2a946c3bba9a13caaab8f96919d0/app/api/dataviz/plan/handler.ts)
- [Validated action contract](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/bcb72f33d3ee2a946c3bba9a13caaab8f96919d0/features/dataviz-assistant/lib/plan.ts)
- [Integration and recorded local verification notes](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/bcb72f33d3ee2a946c3bba9a13caaab8f96919d0/docs/experiments/fleur-integration.md)
- [Team article-classification job](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/17027aa868570b159d8a8701949d7ac463a81575/scripts/tag-articles.mjs)
- [Classifier request and response logic](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/17027aa868570b159d8a8701949d7ac463a81575/lib/tagging/classify.ts)
- [Controlled thematic vocabulary](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/17027aa868570b159d8a8701949d7ac463a81575/lib/tagging/vocabulary.ts)
- Official PFAS records: [amendment 26](https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html), [amendment 27](https://www.senat.fr/amendements/2023-2024/620/Amdt_27.html), [sub-amendment 32](https://www.senat.fr/amendements/2023-2024/620/Amdt_32.html).

Local evidence reviewed for this document: `provider-route-live.json`, `provider-smoke.json` and the archived integration verification report. These logs were reviewed locally; they are not attached to this shareable document.

## Short description for a project or partner page

> Dandelion uses Featherless to turn French-language questions into validated actions in a parliamentary data explorer. Real local API tests demonstrated amendment comparison, targeted navigation and abstention on an unsupported impact question. The team also implemented Featherless-based thematic classification of legislative articles, with model provenance recorded alongside derived tags. Official parliamentary records remain the source of factual content. Broader model evaluation and final deployment verification are the next steps.
