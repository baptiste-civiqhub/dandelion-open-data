# PFAS — parcours avec preuves et croisements

Section « Trois questions pour vérifier », placée au-dessus du graphe sur `/experiments/pfas` et `/experiments/pfas/cosmograph` (composant partagé `PfasScreen`).

| Question                                                   | Comportement                                                                                                                                                                                  |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quelles différences entre ces deux amendements ?           | Sélectionne 26 et 27 par numéro exact, affiche leurs sorts officiels, lien vers la comparaison existante. Pas de « versions successives », pas d'effet juridique.                             |
| À quel amendement le n° 32 se rattache-t-il ?              | Sélectionne 32 et 14, focalise 32. Refusée si `parentId`/`parentRelation.parentNumber` de 32 ne désignent pas 14 (aucune relation devinée).                                                   |
| Où se situent ces amendements dans le parcours de la loi ? | Charge `data/pfas/evidence-context.json` (via `GET /api/pfas/evidence`), affiche documents datés et croisements typés (`official-reference`, `source-url-match`, `context`) avec leur preuve. |

« Sources et croisements » : provenance, dates, identifiants, statut Hémicycle (`verified-snapshot` = instantané archivé, jamais un import en direct ; `not-integrated` affiché tel quel), export Markdown local `pfas-parcours-documentaire.md`, distinct de l'export de comparaison.

## Données

- `data/pfas/evidence-context.json` appartient au coordinateur ; il n'est ni créé ni modifié par ce patch. Absent → la route répond 404 et l'interface affiche une erreur explicite, le reste de l'expérience reste utilisable.
- Validation Zod à la frontière (`features/pfas-amendments/lib/evidence-context.ts`, appelée par `apis/pfas-evidence/request.ts`) : schéma strict, URL HTTPS, identifiants uniques, toutes les références de source/document/amendement résolues, compteurs ≥ 0, `matchedRows ≤ rows`.
- Le contexte n'est chargé que lorsque la question C ou la section des sources est ouverte.
- « Officiel » désigne le producteur de la source, pas une validation d'une explication.

## Tests

- `pnpm test` : `evidence-context.test.ts`, `evidence-presets.test.ts`, `evidence-markdown.test.ts` (fixtures synthétiques `evidence-fixtures.ts`).
- `pnpm test:smoke test/e2e/pfas-evidence.spec.mjs` : le contexte du test C est **synthétique** et injecté par interception réseau Playwright.

Les repères et croisements affichent leurs propres liens de source. Les boutons vers la comparaison et le détail réappliquent la sélection du parcours si la personne a entre-temps exploré un autre amendement. Voir `pfas-evidence-data.md` pour l’import Hémicycle réel et son audit reproductible.
