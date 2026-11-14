# PFAS graph implementation plan — 14 November 2026

**Goal:** make the sourced graph the primary exploratory view, linked to the existing amendment comparison.

**Architecture:** shared pure TypeScript builds nodes and explicit relationships from the public snapshot. One renderer uses a deterministic SVG layout in the team's existing React stack. A second renderer uses actual Cosmograph, isolated behind the same component contract. The existing screen owns focus and comparison selection. Both routes expose the same corpus and user journey.

**Tech stack:** existing Next 15 / React 19 / TypeScript / SVG / semantic chart tokens / next-intl / Playwright.

## Constraints

- Keep the isolated branch, route, original data and official outcomes.
- Draw article membership and the documented sub-amendment relation only. Geometry is navigation, not political similarity or legal causality.
- Keep the accessible list and existing comparison/export. French UI is explicitly requested by the user; retain English/French key parity, but scope the French provider to the experimental routes.
- Native SVG adds no dependency. Cosmograph 2.5.1 is an explicitly user-requested evaluation dependency, with its CC-BY-NC-4.0 licence documented. Do not substitute cosmos.gl.
- No GNN, database or deployment-setting change. The published civiqhub-selene 0.0.1 package is a scaffold: do not claim it computes these graphs.

## Execution

1. `features/pfas-amendments/lib/graph.test.ts`: verify one node per source amendment, 32 → 14 edge, single-article filtering, stable finite coordinates, no mutation or invented parent for missing data, empty input.
2. `features/pfas-amendments/lib/graph.ts`: implement `buildAmendmentGraph(amendments, subdivision?)` returning positioned nodes and sourced edges; constrain the view transform with `graphViewBox(zoom, pan)`.
3. `features/pfas-amendments/components/amendment-graph.tsx`: primary graph, article filter, zoom/reset, pan, keyboard focus, focused-item inspector, comparison selection and jump link. Reuse current outcome/source components and semantic tokens.
4. `pfas-screen.tsx` and i18n: share focus/selection with the list and the comparison, place the graph above the existing detailed workspace.
5. `test/e2e/pfas.spec.mjs`: select 26/27 through the graph, verify the existing comparison, inspect 32 via keyboard, filter to 17 Article 1er amendments, zoom/reset and confirm narrow-screen overflow stays contained.
6. Run `pnpm check`, `pnpm build`, all browser tests; inspect screenshots. Update the PR description and push the same branch, then verify CI and automatic preview status.
7. Review the delegated Cosmograph renderer against the same data contract, integrate a second route, test real WebGL interaction and compare actual loading/bytes, ease of integration and portability. Record browser and machine conditions; this small corpus is not a large-graph benchmark.

Implementation proceeds inline within the already authorized MVP scope, taking the user's dataviz correction into account.
