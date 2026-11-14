# Dandelion — integration report

**From a citizen’s question to parliamentary evidence they can inspect, compare and cite.**

Dandelion combines an interactive legislative explorer, a navigable 3D world, flower/sunburst visualizations and a constrained AI assistant. Its first demonstrated investigation uses real PFAS amendments to show what was proposed, how the wording differs and what happened to each proposal.

Built for the **Hémicycle × Swanbase Open Data Hackathon, 14 November 2026**. The interface starts in **French**, with an English language option.

[Project repository](https://github.com/baptiste-civiqhub/dandelion-open-data) · [Documented integration](https://github.com/baptiste-civiqhub/dandelion-open-data/tree/cdb9802a29b83c97a4a2f1d52c3b3fd45c07e9e9) · [Architecture diagrams](architecture.md) · [Featherless implementation report](featherless.md)

> This report documents integration commit `cdb9802` on `codex/demo-integration-1730`. It distinguishes implemented features, recorded tests and future work. It does not assume that this branch has been merged into production.

> **Branch scope:** this is the full report for integration `cdb9802`. The current `feat/landing-intro` branch contains the garden and team data pipeline, but does not contain the PFAS assistant routes described below. See the [main README](../README.md) for the landing branch.

## Target → problem → solution

### Target

Our first proposed user is the person responsible for legislative monitoring in a small environmental association, without a dedicated parliamentary analyst. Their immediate task: prepare a reliable note explaining the proposals made about PFAS and their parliamentary outcomes.

This is a product hypothesis. We have not yet validated it through a user interview or measured an improvement in that person’s work.

### Problem

Public documents are available, but answering a specific question requires connecting a bill, its articles, amendments, alternative wording, procedural status and official sources. A visually impressive graph only helps if it leads to a correct, useful and verifiable answer.

### Solution

Dandelion provides a guided investigation:

**Question → relevant amendments → visible text difference → parliamentary outcome → official source.**

The immersive world and Atlas help users discover topics. The flower, Sunburst, search and comparison panels help them inspect evidence. The assistant can translate a question into validated actions on supported visualizations.

Our objective is to make this investigation easier to complete and verify. Time saved, understanding and recurring demand remain to be measured with users.

## What we built

| Capability                      | Contribution                                                                                                                    | Scope at the documented checkpoint                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Immersive entry point           | Three.js world inspired by the Jardin du Luxembourg, vehicle movement, car/horse switching and navigation into a topic area     | Integrated; no AI control of the vehicle                                                                      |
| Atlas and catalogue             | Shared zone layout, topic search, tags and direct access to areas                                                               | Live area content requires the team’s Supabase configuration                                                  |
| Flower and detailed Sunburst    | Hierarchical exploration, focus, zoom, breadcrumbs and a switch between guided comparison and the team’s detailed visualization | Integrated; views share data sources while retaining their own detail contracts                               |
| PFAS investigation              | Real amendment records, text comparison, outcomes, sub-amendment relationships and official-source links                        | 32 archived Senate amendments; usable without live Supabase                                                   |
| Second real corpus              | Municipal-police amendments in the same exploration interface                                                                   | 392-record Hémicycle snapshot; missing fields and links are disclosed                                         |
| Guided journey                  | Start, pause, resume and stop; manual interactions pause the tour; reduced-motion behavior                                      | Deterministic scenario, separate from model inference                                                         |
| Natural-language assistant      | French questions become validated focus, comparison, evidence and supported navigation actions                                  | Optional Featherless integration; three real local application calls verified                                 |
| Cosmograph experiment           | Alternative interactive graph implementation for the PFAS corpus                                                                | Available as a separate experimental route                                                                    |
| Team data API integration       | Paginated lightweight amendment summaries, with full records loaded when opened or compared                                     | UI integration tested using intercepted fixtures; real database access remains to be checked in this checkout |
| Observed amendment activity     | Per-article filing counts, government-authored filings, dates, sources and missing-data indicators                              | Deterministic observations; no forecast or probability                                                        |
| Extraction and tagging pipeline | Hémicycle extraction, normalization and Featherless thematic article classification                                             | Team code integrated; batch jobs were not executed during the integration verification                        |
| Evaluation and delivery         | Unit and browser tests, synthetic scaling measurements, pitch decks and French narrated demo videos                             | Recorded results have explicit scope; media versions are separate from the runtime application                |

## A concrete demo: PFAS

1. Open `/datasets/pfas-senat-620`.
2. Ask **“Compare les amendements 26 et 27”** or select them manually.
3. Inspect the wording difference: amendment 27 adds **“utilisant des fluoropolymères”**.
4. Check the outcomes: **both amendments were withdrawn**.
5. Open the [official amendment 26](https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html) and [amendment 27](https://www.senat.fr/amendements/2023-2024/620/Amdt_27.html) pages.
6. Try **“Montre le sous-amendement 32”** and inspect its documented relationship to amendment 14.

Amendments 26 and 27 are separate proposals, not two successive versions of an enacted article. A wording difference does not establish a legal, environmental or health outcome.

The deterministic guide works without a model key. To demonstrate the actual Featherless provider, configure the optional server-side integration and use its provider control; do not present a scripted tour as a live model call.

## Public data and documented joins

The PFAS evidence chain connects the Senate’s public amendment export with Hémicycle’s amendment, text and legislative-dossier records:

- **31 of 32 amendment URLs match exactly**, with matching amendment numbers and recorded outcomes.
- Amendment 19 remains explicitly unmatched by URL because its CSV record lacks the link; it is not silently repaired.
- All 32 amendment records refer to the same text, which resolves to the legislative dossier.
- The sub-amendment 32 → amendment 14 relationship is documented.
- Archived responses retain provenance and integrity checks.

Hémicycle redistributes Senate data. Agreement between these representations is a consistency check, not independent corroboration.

We also prepared a separate **PLFSS evidence package** linking an amendment to its official vote, individual voting records and parliamentary groups. It supports future social-security investigations; it is not presented as a complete retirement simulator or an already delivered user journey. See the [PLFSS evidence notes](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/cdb9802a29b83c97a4a2f1d52c3b3fd45c07e9e9/docs/experiments/plfss-evidence.md).

## API partners and why they matter

| Service                                                    | API or role used                                                        | Relevance to Dandelion                                                                          | Evidence and boundary                                                                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [Hémicycle AI](https://hemicycle.ai/)                      | Parliamentary data API: amendments, texts, dossiers and votes           | Connects the entities needed for an investigation and preserves their provenance                | PFAS imports and joins verified. The archived demo does not call Hémicycle for every question; MCP execution is not claimed |
| [Featherless AI](https://featherless.ai/) — assistant      | Server-side `/v1/chat/completions`; tested with `zai-org/GLM-5.3-Flash` | Converts French requests into controlled visualization actions                                  | Three real local calls: comparison, focus and abstention. Optional, restricted to supported snapshots                       |
| [Featherless AI](https://featherless.ai/) — classification | `/v1/classifier`; default `featherless-ai/gemma-4-12B-it-classifier`    | Adds thematic metadata for discovery: 50 labels across 10 categories                            | Pipeline implemented, with model provenance and scores; run completeness and label quality still need verification          |
| [Supabase](https://supabase.com/)                          | PostgreSQL, REST API, typed client and row-level security               | Stores normalized legislative entities and derived tags; serves paginated summaries and details | Team infrastructure. The integration’s nine API browser scenarios use fixtures, not the live database                       |
| [ElevenLabs](https://elevenlabs.io/)                       | Text-to-speech for French video narration                               | Makes the pitch and demonstration easier to follow                                              | Media production only; not an in-app voice assistant                                                                        |

Other contributions have distinct roles:

- **Vercel** hosts application previews. The recorded preview is access-protected.
- **Suzan AI** supports preparation of the governance, compliance and security review. This is not a runtime API integration or an awarded certification.
- **Swanbase** provided the event/product-methodology context; Growth.Design informed the target → problem → solution approach.
- **Codex, Claude and Devin** assisted development, integration, research and review. They are development tools, not dependencies of a visitor’s session.
- **Official parliamentary websites** remain the primary source links. No endorsement by those institutions is implied.

## Architecture

The application uses **Next.js 15, React 19 and TypeScript**, with TanStack Query for server data, Zustand for UI state, Tailwind and shared design tokens. The 3D scene uses Three.js; Cosmograph is an additional graph experiment.

There are two data paths: registered public snapshots for reproducible demonstrations, and the team’s Supabase API for live area exploration. Featherless planning runs on the Next.js server. The classifier is a separate batch process that writes derived metadata.

| Diagram                                 | Readable view                                                    | Editable Mermaid                                 | Editable PlantUML                                  |
| --------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| System architecture and data boundaries | [Architecture overview](architecture.md#system-architecture)     | [architecture.mmd](architecture.mmd)             | [architecture.puml](architecture.puml)             |
| Question → validated action → evidence  | [Assistant sequence](architecture.md#assistant-request-sequence) | [assistant-sequence.mmd](assistant-sequence.mmd) | [assistant-sequence.puml](assistant-sequence.puml) |

See the [Featherless technical report](featherless.md) for prompts, request bounds, action validation, classifier handling and recorded API results.

## How to use

### Run the documented code

Use **Node.js 22** and **pnpm 10.32.1**, matching the repository’s CI/runtime conventions. Start in a new checkout:

```bash
git clone --branch codex/demo-integration-1730 --single-branch https://github.com/baptiste-civiqhub/dandelion-open-data.git
cd dandelion-open-data
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev --hostname localhost --port 3000
```

Open [http://localhost:3000/datasets/pfas-senat-620](http://localhost:3000/datasets/pfas-senat-620) for the reproducible PFAS demo. Use `localhost`; the documented local production setup encountered locale-rewrite loops with `127.0.0.1`.

The branch may advance. For exact reproduction of this report’s verification checkpoint, check out commit `cdb9802a29b83c97a4a2f1d52c3b3fd45c07e9e9` in the new clone before installing.

### Choose the operating mode

| Mode                     | Configuration                                                                                                          | What to expect                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Archived demo            | No Supabase or Featherless key required                                                                                | PFAS and municipal snapshots, manual exploration, comparison and deterministic guidance                        |
| Team API data            | `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                                                  | Area catalogue, live summaries, detailed records and derived tags, subject to database content and permissions |
| Optional model assistant | `FEATHERLESS_API_KEY`, `FEATHERLESS_API_BASE=https://api.featherless.ai/v1`, `FEATHERLESS_MODEL=zai-org/GLM-5.3-Flash` | Model-assisted plans on registered supported datasets; restart the server after configuration                  |

Keep private keys in `.env.local`, never in browser-exposed `NEXT_PUBLIC_*` variables or Git. The public Supabase key is designed for the browser; access control depends on the database’s RLS policies. A secret/admin Supabase key is unnecessary for browsing.

The historical default Featherless model differs from the model used in the successful tests. Select an available model explicitly. The classification job also reads `FEATHERLESS_MODEL` but expects its own classifier model; configure those processes separately.

### Main routes and controls

| Route                                 | Purpose                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `/`                                   | 3D world; arrows or ZQSD to move, `V` to change vehicle, Enter near an available zone |
| `/area`                               | Searchable live area catalogue                                                        |
| `/area/{slug}`                        | Guided view using the team API                                                        |
| `/area/{slug}?vue=pissenlit`          | Detailed Sunburst view for the same area                                              |
| `/datasets`                           | Registered archived datasets                                                          |
| `/datasets/pfas-senat-620`            | PFAS investigation                                                                    |
| `/datasets/police-municipale-an-2464` | Municipal-police snapshot                                                             |
| `/experiments/pfas`                   | Standalone PFAS explorer                                                              |
| `/experiments/pfas/cosmograph`        | Cosmograph experiment                                                                 |
| `/about`                              | Project and governance information                                                    |
| `/api/health`                         | Configuration and Supabase reachability indicator                                     |

In the guided flower, Tab navigates sectors, Enter opens them, `+`/`−` zoom, `0` fits the view and Escape moves up. The catalogue provides an alternative to 3D navigation.

`/api/health` reporting `supabase: "up"` establishes endpoint reachability, not completeness or correctness of the legislative corpus. Without a key, `"unconfigured"` is expected.

### Checks and production build

```bash
pnpm check
pnpm format:check
pnpm build
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm test:smoke
```

If Chromium is not installed, install the test browser with `pnpm exec playwright install chromium`. For a production server after building:

```bash
pnpm start --hostname localhost --port 3000
```

Validate the archived evidence independently with:

```bash
python3 scripts/verify-pfas-evidence.py
```

The extraction and classification commands are **operator workflows**: they write to the team’s database and require server-side credentials. They are not prerequisites for exploring the archived demo. Review the [import contract](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/cdb9802a29b83c97a4a2f1d52c3b3fd45c07e9e9/docs/dandelion/import.md) before using `extract:raw`, `extract:textes` or `tag:articles`; no database migration is part of the quick start.

## Verification and scientific contribution

At integration commit **`cdb9802`**, the recorded verification reports:

- **367 unit tests passed**.
- **47 distinct browser scenarios passed**: 38 on a production build and nine API scenarios with intercepted fixtures.
- Build, lint, type checking, token checks and formatting passed.
- Real Supabase database access was **not** verified in that checkout; its public key was missing.

Earlier local visualization measurements used synthetic corpora of 1,000, 10,000 and 100,000 records while bounding the displayed hierarchy to at most 150 interactive nodes. At 100,000 records, the recorded load was 1,820 ms and search/focus 126 ms, with a 600 ms longest JavaScript task. These are single-machine automation observations, not evidence that 100,000 real amendments render simultaneously or that the product has passed a load test.

Claude also produced a separate [ML feasibility study](https://github.com/baptiste-civiqhub/dandelion-open-data/tree/8d6f3c276a6e048fb10f348ea586f961a12fe05d/research/ml-feasibility) on identifying provisions likely to change at the next parliamentary stage. The test set covers **15 laws from 2018–2021**. It found no established TabICL advantage over simpler models; no GNN was trained. This research is published separately and is not a deployed forecasting engine.

The implemented follow-up is deliberately observable: amendment filing counts, authorship type, dates and sources. Without a verified examination date and stage scope, the UI does not claim “before examination.” It does not display prediction percentages.

## Governance and limitations

**With the support of Suzan AI, we are preparing Dandelion’s governance, compliance and security review: GDPR, the AI Act and ISO/IEC 27001:2022.** No completed audit or certification is claimed.

Results retain their parliamentary stage and source. Missing records and missing links are disclosed. A lexical difference is not proof of legal effect; a vote is not a general political preference; a historical proposal is not necessarily current law.

The assistant accepts only bounded, validated actions. Factual content comes from stored records. It can abstain, and a manual/deterministic path remains available. The newer live-area guide remains deterministic; autonomous control of the 3D world is not implemented.

User benefit, live-database completeness and classification quality remain explicit validation tasks.

## Roadmap

1. **Validate the task:** ask a person in the proposed target group to produce a sourced PFAS note; measure correctness, completion time and remaining friction.
2. **Complete live-data verification:** configure the final environment, inspect real corpus coverage and preserve stage/date provenance through every view.
3. **Evaluate the assistant and tags:** use a reviewed question set and article labels; measure entity selection, abstention, classification precision/recall and latency.
4. **Develop evidence-based monitoring:** match provisions between official versions before offering change alerts; validate on recent laws before introducing forecasts.
5. **Expand use cases after validation:** social security, pensions, environmental policy, economic proposals and technological sovereignty. Simulation of policy consequences is a separate modeling problem.

Inspirations include Séléné’s graph exploration, citizen-facing explanatory data visualization, Growth.Design’s product framing, museum-style scientific mediation and Qwiki-style narrated journeys. GNNs, R Shiny, PyGWalker, Mojo and policy simulations were explored as ideas; they are not claimed as installed product components.

## Team and credits

- **Wilfred Dore**
- **Yanis Gomes Zbairi**
- **Baptiste Vallée**
- **Valentin Potié**

**Remote governance support:** François Amat, CTO of Suzan AI. This credit is distinct from the event’s official team-registration status.

## License and reuse

The source repository uses the [Apache License 2.0](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/cdb9802a29b83c97a4a2f1d52c3b3fd45c07e9e9/LICENSE). Datasets retain their own source licenses and provenance. Third-party software, including Cosmograph, and partner logos retain their respective terms; the repository license does not replace them.
