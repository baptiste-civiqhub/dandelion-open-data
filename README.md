# Dandelion

[English](#english) · [Français](#francais) · [Documentation](docs/README.md)

<a id="english"></a>

**[Open Dandelion](https://dandelion-open-data.vercel.app)**

From a citizen’s question to parliamentary evidence they can inspect, compare and cite.

Sowing public data, letting debate bloom.

Dandelion is a place where a public bill becomes something you can walk through, then read. You start in a garden. Each flower is an area: one text, and the amendments that propose to change it. Enter a flower and it opens as a dandelion. Rings run from the article out to each amendment, and the colour shows what happened to it.

The investigation we are aiming for is short: **a question, the amendments that answer it, the difference in wording, the parliamentary outcome, and the official source.** The garden and the Atlas help you find a topic. The flower helps you inspect it. On the documented integration, an assistant can turn a French question into a small set of checked actions. It does not invent the facts. Those stay in the records.

Built for the Hémicycle × Swanbase Open Data Hackathon, 14 November 2026. The public site opens in English. **FR** switches to French and keeps the same page.

## Project objective and available versions

Our objective is to help a person produce a correct, sourced explanation of a parliamentary proposal. The path is **target → problem → solution**: an association’s monitoring task, the work of connecting public records, then an interface that makes that work visible.

| Version                           | What it contains                                                                                                                         | Where to look                                                                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feat/landing-intro`, this branch | Garden, Atlas/Area, detailed Sunburst and the team’s extraction/tagging pipeline; English default with French available                  | This checkout and the public-site link above; a deployed version may differ from the branch head                                                     |
| Recorded integration `cdb9802`    | The combined work, including PFAS/municipal snapshots, comparison, controlled assistant, Cosmograph and observed filings; French default | [Integration report](docs/project-report.md) and its reproducible checkout instructions                                                              |
| Separate ML research              | Feasibility of identifying provisions that change at the next stage                                                                      | [Published research](https://github.com/baptiste-civiqhub/dandelion-open-data/tree/8d6f3c276a6e048fb10f348ea586f961a12fe05d/research/ml-feasibility) |

The documentation is combined here; the PFAS assistant code is not part of this landing branch. Its diagrams and measurements explicitly refer to the recorded integration.

## Who it is for

The first person we have in mind follows legislation for a small environmental association, without a parliamentary analyst on staff. Their task: write a reliable note on what was proposed about PFAS, and what Parliament did with each proposal.

That is a hypothesis. We have not yet sat with that person, nor measured whether the note is faster or more reliable.

Public documents already exist. The hard part is tying a bill to its articles, its amendments, the alternative wording, the procedural outcome and the official page. A picture only helps if it leads to an answer you can check.

## Move around

You arrive in the garden, in a car. The same keys are shown at the bottom of the screen.

- **Arrows** or **WASD** — drive
- **V** — switch between the car and the horse
- **Drag** — look around
- **Scroll** — zoom
- **Enter** — open the area you are standing in

Drive up to a flower. A banner says “Press Enter to open”. Press Enter. The camera dives onto the flower, and the area opens. The car and the horse stay under your hands. The assistant does not drive them.

The garden uses a keyboard and a mouse. Two other doors open the same areas:

- **Atlas** shows the garden from above. Pick a flower.
- **Area** is the list. Search by name or theme, and filter by tag.

The search field in the header runs the same search. The mark at the top left brings you back to the garden.

## Read an area

The flower in the middle is the text, read from the centre outward.

1. The inner ring is the articles.
2. The next rings are the places inside an article: an alinea, the whole article, or a spot before or after it.
3. The outer slices are the amendments, and the sub-amendments filed on them.

The colour is the outcome. **Outcomes**, on the left, names each colour. Untick one to dim those amendments. **Breakdown**, on the right, counts whatever you are looking at.

The panels say the same thing in words.

- **Dataset and text**, on the left, names the text, where it comes from, and its licence.
- **Details**, on the right, is one amendment: its number, its author, its group, and what it proposes. Hover a slice for a preview. Click an amendment to keep it open. The panel links to the official text.

Click an article or an alinea to move closer: the flower recentres on it. Click the centre, or the up arrow above the flower, to step back. The path above the flower shows where you are, and each step is clickable. **+** and **−** show more rings, or fewer.

## A demonstrated investigation: PFAS

This walk-through lives on the documented integration, commit [`cdb9802`](https://github.com/baptiste-civiqhub/dandelion-open-data/tree/cdb9802a29b83c97a4a2f1d52c3b3fd45c07e9e9), at `/datasets/pfas-senat-620`. This landing checkout does not include that route; check the deployed revision before expecting it on the public site.

1. Open that page.
2. Ask **“Compare les amendements 26 et 27”**, or select them yourself.
3. Read the wording difference: amendment 27 adds **“utilisant des fluoropolymères”**.
4. Read the outcomes: **both amendments were withdrawn**.
5. Open the official pages for [amendment 26](https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html) and [amendment 27](https://www.senat.fr/amendements/2023-2024/620/Amdt_27.html).
6. Try **“Montre le sous-amendement 32”** and look at its documented link to amendment 14.

Amendments 26 and 27 are two proposals, not two successive versions of a law that was passed. A difference in wording is not a legal, environmental or health result.

The corpus is 32 archived Senate amendments. You can explore it without a live database. A guide with fixed rules answers the same kind of question when no model key is configured. To show the Featherless model itself, turn on the server-side assistant. A scripted tour is not a live model call.

A second snapshot, municipal police, holds 392 amendments from Hémicycle in the same kind of view. Missing fields stay visible. They are not filled in silently.

Of the 32 PFAS amendment URLs, 31 match the Hémicycle record exactly, number and outcome included. Amendment 19 has no URL in the export, so it stays unmatched. All 32 point at the same text, and that text resolves to the legislative file. Hémicycle redistributes Senate data: agreement between the two is a consistency check, not a second independent source.

## Where the records and the tags come from

The garden reads records already stored in Supabase. Hémicycle is called while those records are prepared. Featherless is called in two different ways, both off the browser: a batch job that tags articles, and a server route that plans the assistant’s moves. The keys stay on the server.

The full account of the Featherless calls, the three local tests and the limits of that evidence is in [docs/featherless.md](docs/featherless.md). The diagrams are in [docs/architecture.md](docs/architecture.md).

### API partners and relevance

| Service                                                    | Use                                                        | Why it matters                                                               | Verified scope                                                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [Hémicycle AI](https://hemicycle.ai/)                      | Parliamentary data API for extraction and documented joins | Connects amendments, texts and legislative files, with provenance            | PFAS imports and 31/32 exact URL matches verified on the integration; no new Hémicycle call for each question, no MCP execution claimed |
| [Featherless AI](https://featherless.ai/) — classification | `/v1/classifier`                                           | Produces thematic article tags for discovery                                 | Batch implementation present on this branch; completed-run coverage and human-reviewed accuracy still to establish                      |
| [Featherless AI](https://featherless.ai/) — assistant      | `/v1/chat/completions`                                     | Turns a question into constrained visualization actions                      | Three local application calls verified on `cdb9802`; route absent from this landing branch                                              |
| [Supabase](https://supabase.com/)                          | PostgreSQL, REST API and RLS                               | Stores the normalized corpus and tags; serves summaries and detailed records | Team data infrastructure; fixture tests of the integration do not validate live corpus completeness                                     |
| [ElevenLabs](https://elevenlabs.io/)                       | Text-to-speech                                             | French narration for demo and pitch videos                                   | Media production, not an in-app voice assistant                                                                                         |

Vercel provides hosting. Suzan AI supports preparation of a governance review, not a runtime API or an awarded certification. Swanbase’s event and product-methodology contribution is distinct from data and inference APIs.

### Hémicycle, to fetch the records

Hémicycle serves the parliamentary open data. Dandelion asks it for five National Assembly datasets: documents, legislative files (`dossiers`), procedural acts, articles, and amendments.

Each request is a `POST` to `https://api.hemicycle.ai/v1/jeux/interroger`. The key travels in `Authorization: Bearer`. The header `Hemicycle-Version: 2026-10-01` selects the API version. The JSON body names the dataset, the filters, and a page of 200 rows.

Postgres makes that HTTP call (`raw.hemicycle_interroger`). `pnpm extract:raw` only chooses the next page and stores the raw JSON in the `raw` schema. Four Hémicycle accounts share the pages. `pnpm extract:textes` then walks the articles of the bills filed in 2026.

`raw.charger_texte` copies one bill into the eight public tables the site reads: the text, its articles, the alineas, the amendments, and the outcome of each. Driving through the garden reads those tables. Asking a question does not send a new request to Hémicycle. The assistant, when it runs, reads a snapshot already stored.

### Featherless, to tag the articles

`pnpm tag:articles` sends each article to `POST https://api.featherless.ai/v1/classifier`. The default model is `featherless-ai/gemma-4-12B-it-classifier`. This is a different call from the assistant, and it expects its own model if `FEATHERLESS_MODEL` is set.

The body carries the article — designation, title, operative text — and one yes-or-no question per subject. This repository’s list has **50 subjects in 10 categories** (institutions, budget, work, social issues, health, knowledge, ecology, agriculture, economy, security). The count excludes the Other fallback; the [Featherless report](docs/featherless.md) uses the same definition. An answer is kept when its confidence is at least 0.5. If none qualifies, the article is tagged Other, with no confidence score. The bill receives the union of the tags on its articles, keeping the highest score when a subject appears more than once. Two Featherless keys work side by side, one request at a time on each key. If an article is too long for one call, the operative text sent to the model is cut to 8,000 characters, or the subjects are asked in smaller groups. Only that copy is cut. The tags are written back to Supabase with the model name and the score, and Area reads them from there.

Those scores are the classifier’s answers. They are not the probability of a vote, of an intention, or of a real-world effect. The job can write to the database. It is not a read-only check, and a completed, reviewed tagging run is still to be shown.

### Featherless, to steer the view

This section describes the assistant implemented on `cdb9802`, not a route available in this landing checkout.

The navigation assistant uses the chat endpoint. The browser sends the question to our server, `POST /api/dataviz/plan`, with only two fields: the question (600 characters at most) and the id of a supported dataset. A system prompt cannot be sent from the browser.

The server loads the registered snapshot, keeps a short allow-list — at most 40 structural nodes and 24 matching amendments, each excerpt 140 characters, the whole prompt within 16,000 characters — and calls `POST https://api.featherless.ai/v1/chat/completions`. The code’s historical default is `zai-org/GLM-5.2`. The three local calls on 14 November used `zai-org/GLM-5.3-Flash`, because 5.2 was missing from the catalogue. The call uses temperature 0, at most 400 tokens, and stops after 20 seconds.

The model may answer only with a small JSON plan: focus one record, compare two, show the sources, open a place, zoom, reset the view, or abstain. One to four actions. The server drops prose, an unknown id, a self-comparison, an unsupported action, or a plan over 8 KB, and then changes nothing. What the screen shows afterwards — number, outcome, official link — comes from the stored records.

The three recorded calls, all local, all on `GLM-5.3-Flash`:

| Question                                                | What came back                                                        |     Time |
| ------------------------------------------------------- | --------------------------------------------------------------------- | -------: |
| “Compare les amendements 26 et 27”                      | A comparison of the two registered amendments, with their Senate URLs |  5.179 s |
| “Montre le sous-amendement 32”                          | Focus on amendment 32, with its record and source URL                 | 16.567 s |
| “Quel sera le nombre de cancers évités par cette loi ?” | An explicit abstention                                                |  2.407 s |

Three calls show that the path works. They are not a measure of accuracy, cost or reliability. Without a Featherless key, the route answers `mode: "unconfigured"`, and the manual controls and the fixed guide remain. The assistant was tried on the registered snapshots, not on every live area, and not on the car in the garden. The key had not been placed on Vercel at the checkpoint this report describes.

## What that checkpoint also contains

The public garden is the entry point you can open today. The rows below are the integration at `cdb9802`. They are not all on the public URL.

| Piece                     | What it adds                                                    | Boundary                                             |
| ------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| Garden                    | Luxembourg-inspired world, car or horse, Enter to open an area  | You drive. No model controls the vehicle             |
| Atlas and Area            | The same map from above, search, tags                           | Live content depends on Supabase                     |
| Flower and sunburst       | Hierarchy, focus, zoom, breadcrumbs                             | Two views, two levels of detail, shared sources      |
| PFAS and municipal police | Archived amendments you can compare and cite                    | 32 and 392 records, usable without live Supabase     |
| Fixed guide               | Start, pause, resume, stop                                      | A script, separate from the model                    |
| Assistant                 | French questions become checked actions                         | Optional. Three local calls verified                 |
| Cosmograph                | Another graph of the PFAS corpus                                | A separate experimental route                        |
| Observed activity         | Filings per article, dates, government authorship, missing data | Counts from the records. No forecast, no probability |

At that commit the recorded checks were 367 unit tests and 47 browser scenarios. The live Supabase database was not opened in that checkout: the public key was missing. Earlier timing on synthetic trees of up to 100,000 records, drawn down to 150 visible nodes, is a single-machine observation, not a load test of 100,000 amendments on screen.

A separate study looked at whether a provision is likely to change at the next parliamentary stage, on 15 laws from 2018–2021. It is research, not a forecast in the product. The screen shows filing counts, dates and sources. It does not show a percentage.

## For developers

Use Node.js 22 and pnpm 10.32.1. To run this landing branch in a new checkout:

```bash
git clone --branch feat/landing-intro --single-branch https://github.com/baptiste-civiqhub/dandelion-open-data.git
cd dandelion-open-data
corepack enable                     # pnpm 10.32.1
pnpm install --frozen-lockfile
cp .env.example .env.local          # set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
pnpm dev                            # http://localhost:3000
```

Conventions: [`AGENTS.md`](AGENTS.md). Versions: [`docs/stack.md`](docs/stack.md). Deployment: [`docs/deploiement.md`](docs/deploiement.md).

The PFAS assistant demo is the other checkout, commit `cdb9802` on `codex/demo-integration-1730`. Use Node 22, open `http://localhost:3000/datasets/pfas-senat-620`, and prefer `localhost` over `127.0.0.1`. For the model, set `FEATHERLESS_API_KEY`, `FEATHERLESS_API_BASE=https://api.featherless.ai/v1` and `FEATHERLESS_MODEL=zai-org/GLM-5.3-Flash`, then restart. The tagging job reads the same `FEATHERLESS_MODEL` name and expects the classifier model instead. Run those two processes with the model each one needs. `extract:raw`, `extract:textes` and `tag:articles` write to the database. They are not required to walk the archived demo. Read [`docs/dandelion/import.md`](docs/dandelion/import.md) before running them.

`GET /api/health` reports whether Supabase is reachable. `"up"` means the endpoint answered. It does not mean the corpus is complete. `"unconfigured"` means the public key is absent.

### Verification commands

```bash
pnpm check
pnpm format:check
pnpm build
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm test:smoke
```

These are commands to run on the selected checkout, not new test results. The 367/47 figures above belong to `cdb9802`. The [integration report](docs/project-report.md#how-to-use) provides its separate operating modes, routes, environment variables and evidence checks.

## Documentation and architecture

The documentation index explains which branch each document describes: **[docs/README.md](docs/README.md)**.

| Document                                                                                               | Content                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| [Full integration report](docs/project-report.md)                                                      | Objective, complete feature inventory, PFAS/PLFSS evidence, reproduction, benchmarks, governance and future directions |
| [Architecture and assistant sequence](docs/architecture.md)                                            | Two readable Mermaid diagrams, scoped to `cdb9802`                                                                     |
| [System diagram — Mermaid](docs/architecture.mmd) / [PlantUML](docs/architecture.puml)                 | Editable architecture sources                                                                                          |
| [Assistant sequence — Mermaid](docs/assistant-sequence.mmd) / [PlantUML](docs/assistant-sequence.puml) | Editable question → validation → evidence sequence                                                                     |
| [Featherless technical report](docs/featherless.md)                                                    | Real call results, bounded actions, classification pipeline and limits                                                 |
| [Team data API](docs/dandelion/api.md) / [schema](docs/dandelion/schema.md)                            | Current database contracts and provenance                                                                              |

## Roadmap and research

1. **Validate the task:** observe someone from the target group producing a sourced PFAS note; record correctness, completion time and friction.
2. **Verify live data:** configure the final environment and audit corpus coverage, links and parliamentary stages.
3. **Evaluate the AI:** score entity selection, abstention and thematic labels against reviewed questions and articles; measure latency and usage.
4. **Build monitoring:** match provisions across official versions before offering change alerts, then evaluate on recent laws.
5. **Expand after validation:** social security, pensions, environmental policy, economic proposals and technological sovereignty. Policy-effect simulation needs a separate model and evaluation.

The [published ML study](https://github.com/baptiste-civiqhub/dandelion-open-data/tree/8d6f3c276a6e048fb10f348ea586f961a12fe05d/research/ml-feasibility) did not establish a TabICL gain over simpler baselines; no GNN was trained. It is not a deployed forecast engine. A separate [PLFSS evidence package](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/cdb9802a29b83c97a4a2f1d52c3b3fd45c07e9e9/docs/experiments/plfss-evidence.md) links an amendment, its vote and parliamentary groups without claiming current benefit eligibility.

Inspirations include Séléné’s graph exploration, Growth.Design’s product framing, citizen-facing explanatory dataviz, museum-style scientific mediation and Qwiki-style narration. R Shiny, PyGWalker, Mojo and GNNs are ideas examined, not dependencies claimed by this repository.

## Governance, next steps, team

With support from Suzan AI, a review against the GDPR, the AI Act and ISO/IEC 27001:2022 is being prepared. No audit is finished, and no certification is claimed. ElevenLabs is used for the French narration of the demo videos, not as a voice inside the app. Vercel hosts the site. Swanbase and Growth.Design shaped the framing of the day. Codex, Claude and Devin helped build and review. They are not part of a visitor’s session.

Next: watch someone from the target group write a sourced PFAS note, check the live corpus, score the assistant and the tags on a reviewed set, and only then widen the subjects. A change alert needs matched versions of the official text first. A policy simulator is a different problem.

Wilfred Dore, Yanis Gomes Zbairi, Baptiste Vallée, Valentin Potié. Remote governance support: François Amat, CTO of Suzan AI.

Licence: [Apache 2.0](LICENSE). Datasets keep their own licences. Third-party software, including Cosmograph, keeps its own terms.

---

<a id="francais"></a>

# Dandelion — Français

**[Ouvrir Dandelion](https://dandelion-open-data.vercel.app)**

D’une question de citoyen à des pièces parlementaires que l’on peut lire, comparer et citer.

Semer la donnée publique, faire éclore le débat.

Dandelion est un endroit où un texte de loi public se parcourt, puis se lit. Vous commencez dans un jardin. Chaque fleur est une zone : un texte, et les amendements qui proposent de le modifier. Entrez dans une fleur : elle s’ouvre en pissenlit. Les anneaux vont de l’article jusqu’à chaque amendement, et la couleur dit ce qui lui est arrivé.

L’enquête visée est courte : **une question, les amendements qui y répondent, la différence de rédaction, le sort parlementaire, et la source officielle.** Le jardin et l’Atlas aident à trouver un sujet. La fleur aide à l’examiner. Sur l’intégration documentée, un assistant peut transformer une question en français en un petit nombre d’actions vérifiées. Il n’invente pas les faits. Ceux-ci restent dans les enregistrements.

Construit pour le hackathon Open Data d’Hémicycle et Swanbase, le 14 novembre 2026. Le site public s’ouvre en anglais. **FR** passe au français et garde la même page.

## Objectif du projet et versions disponibles

Notre objectif est d’aider une personne à produire une explication juste et sourcée d’une proposition parlementaire. Le chemin est **cible → problème → solution** : une tâche de veille associative, le travail de rapprochement des documents publics, puis une interface qui rend ce travail visible.

| Version                             | Contenu                                                                                                                             | Où le retrouver                                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `feat/landing-intro`, cette branche | Jardin, Atlas/Area, Sunburst détaillé et pipeline d’extraction/classement ; anglais initial, français disponible                    | Cette copie et le lien du site public ci-dessus ; la version déployée peut différer de la tête de branche                                       |
| Intégration documentée `cdb9802`    | Travaux réunis : archives PFAS/police municipale, comparaison, assistant contrôlé, Cosmograph et dépôts observés ; français initial | [Rapport d’intégration](docs/project-report.md) et procédure de reproduction                                                                    |
| Recherche ML séparée                | Faisabilité de la détection des dispositions qui changent à l’étape suivante                                                        | [Étude publiée](https://github.com/baptiste-civiqhub/dandelion-open-data/tree/8d6f3c276a6e048fb10f348ea586f961a12fe05d/research/ml-feasibility) |

La documentation est réunie ici ; le code de l’assistant PFAS ne fait pas partie de cette branche de présentation. Ses diagrammes et mesures désignent explicitement l’intégration documentée.

## À qui il s’adresse

La première personne que nous avons en tête suit la loi pour une petite association environnementale, sans analyste parlementaire dans l’équipe. Sa tâche : écrire une note fiable sur ce qui a été proposé au sujet des PFAS, et sur ce que le Parlement a fait de chaque proposition.

C’est une hypothèse. Nous n’avons pas encore travaillé avec cette personne, ni mesuré si la note est plus rapide ou plus sûre.

Les documents publics existent déjà. Le difficile est de relier un texte à ses articles, à ses amendements, à la rédaction de rechange, au sort de la procédure et à la page officielle. Une image n’aide que si elle mène à une réponse que l’on peut vérifier.

## Se déplacer

Vous arrivez dans le jardin, au volant d’une voiture. Les mêmes touches sont affichées en bas de l’écran.

- **Flèches** ou **ZQSD** — conduire
- **V** — passer de la voiture au cheval
- **Glisser** — regarder autour
- **Molette** — zoomer
- **Entrée** — ouvrir la zone où vous êtes

Approchez-vous d’une fleur. Un bandeau dit « Entrée pour ouvrir ». Appuyez sur Entrée. La caméra plonge sur la fleur, et la zone s’ouvre. La voiture et le cheval restent entre vos mains. L’assistant ne les conduit pas.

Le jardin se conduit au clavier et à la souris. Deux autres portes ouvrent les mêmes zones :

- **Atlas** montre le jardin vu de dessus. Choisissez une fleur.
- **Area** est la liste. Le bouton porte ce nom dans l’interface. Cherchez par nom ou par thème, et filtrez par tag.

Le champ de recherche du bandeau fait la même recherche. La marque en haut à gauche ramène au jardin.

## Lire une zone

La fleur au centre est le texte, lu du centre vers l’extérieur.

1. L’anneau intérieur, ce sont les articles.
2. Les anneaux suivants, ce sont les emplacements dans un article : un alinéa, l’article entier, ou un endroit avant ou après lui.
3. Les parts extérieures, ce sont les amendements, et les sous-amendements déposés dessus.

La couleur est le sort. **Sorts**, à gauche, nomme chaque couleur. Décochez un sort pour atténuer ces amendements. **Répartition**, à droite, compte ce que vous regardez.

Les panneaux disent la même chose en mots.

- **Jeu et texte**, à gauche, nomme le texte, sa source et sa licence.
- **Fiche**, à droite, c’est un amendement : son numéro, son auteur, son groupe, et ce qu’il propose. Survolez une part pour un aperçu. Cliquez sur un amendement pour le garder ouvert. Le panneau renvoie au texte officiel.

Cliquez sur un article ou un alinéa pour vous approcher : la fleur se recentre dessus. Cliquez sur le centre, ou sur la flèche vers le haut au-dessus de la fleur, pour remonter. Le chemin au-dessus de la fleur montre où vous êtes, et chaque cran est cliquable. **+** et **−** affichent plus d’anneaux, ou moins.

## Une enquête montrée : les PFAS

Ce parcours est sur l’intégration documentée, commit [`cdb9802`](https://github.com/baptiste-civiqhub/dandelion-open-data/tree/cdb9802a29b83c97a4a2f1d52c3b3fd45c07e9e9), à l’adresse `/datasets/pfas-senat-620`. Cette copie de présentation ne contient pas cette route ; vérifier la version déployée avant de la chercher sur le site public.

1. Ouvrez cette page.
2. Demandez **« Compare les amendements 26 et 27 »**, ou sélectionnez-les vous-même.
3. Lisez l’écart de rédaction : l’amendement 27 ajoute **« utilisant des fluoropolymères »**.
4. Lisez les sorts : **les deux amendements ont été retirés**.
5. Ouvrez les pages officielles de l’[amendement 26](https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html) et de l’[amendement 27](https://www.senat.fr/amendements/2023-2024/620/Amdt_27.html).
6. Essayez **« Montre le sous-amendement 32 »** et regardez son lien documenté avec l’amendement 14.

Les amendements 26 et 27 sont deux propositions, pas deux versions successives d’une loi adoptée. Un écart de rédaction n’est pas un effet juridique, environnemental ou sanitaire.

Le corpus compte 32 amendements du Sénat, archivés. On peut les parcourir sans base en direct. Un guide à règles fixes répond au même genre de question quand aucune clé de modèle n’est configurée. Pour montrer le modèle Featherless lui-même, il faut activer l’assistant côté serveur. Un parcours scénarisé n’est pas un appel au modèle.

Un second instantané, la police municipale, réunit 392 amendements issus d’Hémicycle dans le même type de vue. Les champs manquants restent visibles. Ils ne sont pas complétés en silence.

Sur les 32 URL d’amendements PFAS, 31 correspondent exactement à la fiche Hémicycle, numéro et sort compris. L’amendement 19 n’a pas d’URL dans l’export : il reste non apparié. Les 32 visent le même texte, et ce texte renvoie au dossier législatif. Hémicycle rediffuse les données du Sénat : l’accord des deux est un contrôle de cohérence, pas une seconde source indépendante.

## D’où viennent les textes et les thèmes

Le jardin lit des enregistrements déjà stockés dans Supabase. Hémicycle est appelé pendant leur préparation. Featherless est appelé de deux façons, toutes deux hors du navigateur : un traitement qui étiquette les articles, et une route serveur qui prépare les gestes de l’assistant. Les clés restent sur le serveur.

Le récit complet des appels Featherless, des trois essais locaux et des limites de cette preuve est dans [docs/featherless.md](docs/featherless.md). Les schémas sont dans [docs/architecture.md](docs/architecture.md).

### API partenaires et pertinence

| Service                                                | Usage                                                                | Intérêt pour le projet                                              | Périmètre vérifié                                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [Hémicycle AI](https://hemicycle.ai/)                  | API parlementaire pour l’extraction et les rapprochements documentés | Relier amendements, textes et dossiers en conservant la provenance  | Imports PFAS et 31/32 URL exactes vérifiés sur l’intégration ; pas d’appel à chaque question ni d’exécution MCP revendiquée |
| [Featherless AI](https://featherless.ai/) — classement | `/v1/classifier`                                                     | Produire les thèmes des articles pour l’exploration                 | Traitement présent dans cette branche ; couverture des traitements terminés et qualité des thèmes encore à établir          |
| [Featherless AI](https://featherless.ai/) — assistant  | `/v1/chat/completions`                                               | Traduire une question en actions contrôlées sur la visualisation    | Trois appels applicatifs locaux vérifiés sur `cdb9802` ; route absente de cette branche de présentation                     |
| [Supabase](https://supabase.com/)                      | PostgreSQL, API REST et RLS                                          | Stocker le corpus normalisé et les thèmes, servir résumés et fiches | Infrastructure de l’équipe ; les tests sur fixtures ne valident pas la complétude de la base réelle                         |
| [ElevenLabs](https://elevenlabs.io/)                   | Synthèse vocale                                                      | Narration française des vidéos de démo et de pitch                  | Production vidéo, pas un assistant vocal intégré                                                                            |

Vercel assure l’hébergement. Suzan AI accompagne la préparation d’une revue de gouvernance, sans API applicative ni certification obtenue. La contribution de Swanbase à l’événement et à la méthode produit est distincte des API de données et d’inférence.

### Hémicycle, pour récupérer les textes

Hémicycle sert la donnée parlementaire ouverte. Dandelion lui demande cinq jeux de l’Assemblée nationale : les documents, les dossiers législatifs, les actes de procédure, les articles et les amendements.

Chaque demande est un `POST` vers `https://api.hemicycle.ai/v1/jeux/interroger`. La clé voyage dans `Authorization: Bearer`. L’en-tête `Hemicycle-Version: 2026-10-01` choisit la version de l’API. Le corps JSON nomme le jeu, les filtres, et une page de 200 lignes.

C’est Postgres qui fait cet appel HTTP (`raw.hemicycle_interroger`). `pnpm extract:raw` choisit seulement la page suivante et range le JSON brut dans le schéma `raw`. Quatre comptes Hémicycle se partagent les pages. `pnpm extract:textes` parcourt ensuite les articles des textes déposés en 2026.

`raw.charger_texte` copie un texte dans les huit tables publiques que le site lit : le texte, ses articles, les alinéas, les amendements, et le sort de chacun. Parcourir le jardin lit ces tables. Poser une question n’envoie pas une nouvelle demande à Hémicycle. L’assistant, quand il tourne, lit un instantané déjà enregistré.

### Featherless, pour étiqueter les articles

`pnpm tag:articles` envoie chaque article en `POST` à `https://api.featherless.ai/v1/classifier`. Le modèle par défaut est `featherless-ai/gemma-4-12B-it-classifier`. C’est un autre appel que l’assistant, et il attend son propre modèle si `FEATHERLESS_MODEL` est défini.

Le corps porte l’article — désignation, titre, dispositif — et une question oui ou non par sujet. La liste de ce dépôt compte **50 sujets dans 10 catégories** (institutions, budget, travail, social, santé, savoir, écologie, agriculture, économie, sécurité). Ce nombre exclut le thème de repli Autre ; le [rapport Featherless](docs/featherless.md) utilise le même décompte. Une réponse est gardée quand sa confiance vaut au moins 0,5. Si aucune ne convient, l’article reçoit le thème Autre, sans score. Le texte reçoit l’union des thèmes de ses articles, en gardant le score le plus haut quand un sujet revient. Deux clés Featherless travaillent côte à côte, une requête à la fois sur chaque clé. Si un article est trop long pour un seul appel, le dispositif envoyé au modèle est coupé à 8 000 caractères, ou les sujets sont posés par groupes plus petits. Seule cette copie est coupée. Les thèmes sont réécrits dans Supabase avec le nom du modèle et le score, et Area les lit là.

Ces scores sont les réponses du classifieur. Ils ne sont pas la probabilité d’un vote, d’une intention ou d’un effet réel. La commande peut écrire dans la base. Ce n’est pas un contrôle en lecture seule, et un classement terminé puis relu reste à montrer.

### Featherless, pour conduire la vue

Cette section décrit l’assistant implémenté sur `cdb9802`, pas une route disponible dans cette copie de présentation.

L’assistant de navigation utilise l’endpoint de conversation. Le navigateur envoie la question à notre serveur, `POST /api/dataviz/plan`, avec deux champs seulement : la question (600 caractères au plus) et l’identifiant d’un jeu pris en charge. Un prompt système ne peut pas être envoyé depuis le navigateur.

Le serveur charge l’instantané enregistré, n’en garde qu’une liste courte — 40 nœuds de structure au plus et 24 amendements correspondants, chacun en extrait de 140 caractères, le prompt entier dans 16 000 caractères — puis appelle `POST https://api.featherless.ai/v1/chat/completions`. Le défaut historique du code est `zai-org/GLM-5.2`. Les trois appels locaux du 14 novembre ont utilisé `zai-org/GLM-5.3-Flash`, parce que 5.2 manquait au catalogue. L’appel est à température 0, 400 jetons au plus, et s’arrête au bout de 20 secondes.

Le modèle ne peut répondre que par un petit plan JSON : centrer un enregistrement, en comparer deux, montrer les sources, ouvrir un lieu, zoomer, réinitialiser la vue, ou s’abstenir. Une à quatre actions. Le serveur écarte la prose, un identifiant inconnu, une comparaison d’un enregistrement avec lui-même, une action non prise en charge, ou un plan de plus de 8 Ko, et ne change alors rien. Ce que l’écran montre ensuite — numéro, sort, lien officiel — vient des enregistrements stockés.

Les trois appels enregistrés, tous locaux, tous sur `GLM-5.3-Flash` :

| Question                                                  | Ce qui est revenu                                                        |    Durée |
| --------------------------------------------------------- | ------------------------------------------------------------------------ | -------: |
| « Compare les amendements 26 et 27 »                      | La comparaison des deux amendements enregistrés, avec leurs URL au Sénat |  5,179 s |
| « Montre le sous-amendement 32 »                          | Le centrage sur l’amendement 32, avec sa fiche et l’URL source           | 16,567 s |
| « Quel sera le nombre de cancers évités par cette loi ? » | Une abstention explicite                                                 |  2,407 s |

Trois appels montrent que le chemin fonctionne. Ils ne mesurent ni l’exactitude, ni le coût, ni la fiabilité. Sans clé Featherless, la route répond `mode: "unconfigured"`, et les commandes manuelles ainsi que le guide fixe restent là. L’assistant a été essayé sur les instantanés enregistrés, pas sur chaque zone en direct, et pas sur la voiture du jardin. La clé n’était pas déposée sur Vercel au point de contrôle que ce rapport décrit.

## Ce que ce point de contrôle contient aussi

Le jardin public est l’entrée que l’on peut ouvrir aujourd’hui. Les lignes ci-dessous sont l’intégration `cdb9802`. Elles ne sont pas toutes sur l’URL publique.

| Pièce                     | Ce qu’elle ajoute                                                           | Limite                                                                    |
| ------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Jardin                    | Monde inspiré du Luxembourg, voiture ou cheval, Entrée pour ouvrir une zone | Vous conduisez. Aucun modèle ne conduit le véhicule                       |
| Atlas et Area             | La même carte vue de dessus, la recherche, les thèmes                       | Le contenu en direct dépend de Supabase                                   |
| Fleur et pissenlit        | Hiérarchie, centrage, zoom, fil d’Ariane                                    | Deux vues, deux niveaux de détail, des sources communes                   |
| PFAS et police municipale | Des amendements archivés, à comparer et à citer                             | 32 et 392 enregistrements, sans Supabase en direct                        |
| Guide fixe                | Démarrer, pause, reprendre, arrêter                                         | Un scénario, distinct du modèle                                           |
| Assistant                 | Des questions en français deviennent des actions vérifiées                  | Facultatif. Trois appels locaux vérifiés                                  |
| Cosmograph                | Un autre graphe du corpus PFAS                                              | Une route expérimentale à part                                            |
| Activité observée         | Dépôts par article, dates, auteurs du Gouvernement, données manquantes      | Des comptes sur les enregistrements. Pas de prévision, pas de probabilité |

À ce commit, les contrôles enregistrés comptaient 367 tests unitaires et 47 scénarios de navigateur. La base Supabase en direct n’a pas été ouverte dans cette copie : la clé publique manquait. Des durées plus anciennes, sur des arbres synthétiques jusqu’à 100 000 enregistrements ramenés à 150 nœuds visibles, sont une observation sur une machine, pas un essai de charge de 100 000 amendements à l’écran.

Une étude séparée a regardé si une disposition a des chances de changer à l’étape parlementaire suivante, sur 15 lois de 2018 à 2021. C’est de la recherche, pas une prévision dans le produit. L’écran montre des comptes de dépôts, des dates et des sources. Il ne montre pas un pourcentage.

## Pour les développeurs

Utiliser Node.js 22 et pnpm 10.32.1. Pour lancer cette branche dans une nouvelle copie :

```bash
git clone --branch feat/landing-intro --single-branch https://github.com/baptiste-civiqhub/dandelion-open-data.git
cd dandelion-open-data
corepack enable                     # pnpm 10.32.1
pnpm install --frozen-lockfile
cp .env.example .env.local          # renseigner NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
pnpm dev                            # http://localhost:3000
```

Conventions : [`AGENTS.md`](AGENTS.md). Versions : [`docs/stack.md`](docs/stack.md). Déploiement : [`docs/deploiement.md`](docs/deploiement.md).

La démo PFAS avec l’assistant est l’autre copie, le commit `cdb9802` sur `codex/demo-integration-1730`. Node 22, puis `http://localhost:3000/datasets/pfas-senat-620`, de préférence via `localhost` plutôt que `127.0.0.1`. Pour le modèle : `FEATHERLESS_API_KEY`, `FEATHERLESS_API_BASE=https://api.featherless.ai/v1` et `FEATHERLESS_MODEL=zai-org/GLM-5.3-Flash`, puis redémarrer. La commande de classement lit le même nom `FEATHERLESS_MODEL` et attend le modèle classifieur. Lancez les deux traitements avec le modèle dont chacun a besoin. `extract:raw`, `extract:textes` et `tag:articles` écrivent dans la base. Ils ne sont pas nécessaires pour parcourir la démo archivée. Lisez [`docs/dandelion/import.md`](docs/dandelion/import.md) avant de les lancer.

`GET /api/health` dit si Supabase répond. `"up"` signifie que le point d’accès a répondu. Cela ne signifie pas que le corpus est complet. `"unconfigured"` signifie que la clé publique est absente.

### Commandes de vérification

```bash
pnpm check
pnpm format:check
pnpm build
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm test:smoke
```

Ces commandes sont à lancer dans la copie choisie ; ce ne sont pas de nouveaux résultats de tests. Les chiffres 367/47 ci-dessus appartiennent à `cdb9802`. Le [rapport d’intégration](docs/project-report.md#how-to-use) détaille ses modes d’utilisation, routes, variables et contrôles des preuves.

## Documentation et architecture

L’index précise la branche décrite par chaque document : **[docs/README.md](docs/README.md)**.

| Document                                                                                                    | Contenu                                                                                              |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Rapport d’intégration complet](docs/project-report.md)                                                     | Objectif, inventaire des fonctions, preuves PFAS/PLFSS, reproduction, mesures, gouvernance et pistes |
| [Architecture et séquence de l’assistant](docs/architecture.md)                                             | Deux diagrammes Mermaid lisibles, portant sur `cdb9802`                                              |
| [Architecture — Mermaid](docs/architecture.mmd) / [PlantUML](docs/architecture.puml)                        | Sources éditables de l’architecture                                                                  |
| [Séquence de l’assistant — Mermaid](docs/assistant-sequence.mmd) / [PlantUML](docs/assistant-sequence.puml) | Sources éditables du parcours question → validation → preuve                                         |
| [Rapport technique Featherless](docs/featherless.md)                                                        | Appels réels, actions bornées, pipeline de classement et limites                                     |
| [API de données de l’équipe](docs/dandelion/api.md) / [schéma](docs/dandelion/schema.md)                    | Contrats de la base et provenance                                                                    |

## Roadmap et recherche

1. **Valider la tâche :** observer une personne de la cible produire une note PFAS sourcée ; relever exactitude, temps et difficultés.
2. **Vérifier les données en direct :** configurer l’environnement final et contrôler couverture, liens et étapes parlementaires.
3. **Évaluer l’IA :** mesurer sélection des entités, abstention et classement thématique sur des questions et articles relus, puis latence et consommation.
4. **Construire la veille :** apparier les dispositions entre versions officielles avant de proposer des alertes, puis évaluer sur des lois récentes.
5. **Élargir après validation :** sécurité sociale, retraites, écologie, propositions économiques et souveraineté technologique. Simuler les conséquences demande un modèle et une évaluation distincts.

L’[étude ML publiée](https://github.com/baptiste-civiqhub/dandelion-open-data/tree/8d6f3c276a6e048fb10f348ea586f961a12fe05d/research/ml-feasibility) n’établit pas de gain de TabICL face aux références simples ; aucun GNN n’a été entraîné. Aucun moteur prédictif n’est déployé. Un [paquet de preuves PLFSS](https://github.com/baptiste-civiqhub/dandelion-open-data/blob/cdb9802a29b83c97a4a2f1d52c3b3fd45c07e9e9/docs/experiments/plfss-evidence.md) relie un amendement, son scrutin et les groupes sans prétendre déterminer les droits actuels à une prestation.

Inspirations : exploration de graphes Séléné, cadrage produit Growth.Design, dataviz explicative citoyenne, médiation scientifique des musées et narration à la Qwiki. R Shiny, PyGWalker, Mojo et les GNN sont des pistes examinées, pas des dépendances revendiquées dans ce dépôt.

## Gouvernance, suite, équipe

Avec l’appui de Suzan AI, une revue au regard du RGPD, de l’AI Act et de l’ISO/IEC 27001:2022 est en préparation. Aucun audit n’est terminé, et aucune certification n’est revendiquée. ElevenLabs sert à la narration française des vidéos de démo, pas à une voix dans l’application. Vercel héberge le site. Swanbase et Growth.Design ont cadré la journée. Codex, Claude et Devin ont aidé à construire et à relire. Ils ne font pas partie de la session d’un visiteur.

Ensuite : regarder une personne du public visé écrire une note sourcée sur les PFAS, vérifier le corpus en direct, noter l’assistant et les thèmes sur un jeu relu, et seulement alors élargir les sujets. Une alerte de changement demande d’abord des versions officielles appariées. Un simulateur de politique publique est un autre problème.

Wilfred Dore, Yanis Gomes Zbairi, Baptiste Vallée, Valentin Potié. Appui gouvernance à distance : François Amat, CTO de Suzan AI.

Licence : [Apache 2.0](LICENSE). Les jeux de données gardent leurs licences. Les logiciels tiers, dont Cosmograph, gardent leurs conditions.
