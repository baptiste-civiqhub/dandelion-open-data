# Assistant de visualisation (guide déterministe)

Surface de commande pour la visualisation PFAS existante (vues native et Cosmograph). Une question tapée en français
sélectionne et met au point les vrais amendements, ou ouvre le parcours documentaire existant.

**Ce n'est pas un modèle de langage.** Le guide actuel applique des règles locales (`features/pfas-amendments/lib/assistant-guide.ts`)
sur l'instantané importé (export Sénat 2023-2024 n° 620 et contexte Hémicycle archivé). Aucun appel réseau ni API par question.

## Découpage

| Couche                | Fichier                                                    | Rôle                                                                                                                 |
| --------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Noyau pur, générique  | `features/dataviz-assistant/lib/plan.ts`                   | Schéma Zod strict du plan, registre hôte, `validatePlan`, `parseModelResponse` (JSON seul, ≤ 8 Ko, abstention typée) |
|                       | `features/dataviz-assistant/lib/adapter.ts`                | Interface `DatavizAssistantAdapter`, `applyPlan`, validation avant exécution                                         |
|                       | `features/dataviz-assistant/lib/question.ts`               | Normalisation (accents, apostrophes, ponctuation), extraction exacte des numéros, limite de 600 caractères           |
|                       | `features/dataviz-assistant/lib/prompt.ts`                 | `buildSystemPrompt` public pour un futur fournisseur côté serveur (non appelé)                                       |
| Adaptateur PFAS (pur) | `features/pfas-amendments/lib/assistant-guide.ts`          | Intentions françaises → plan ou abstention motivée                                                                   |
| Intégration UI        | `features/dataviz-assistant/components/pfas-assistant.tsx` | Panneau, exemples, réponse `aria-live="polite"`, résumé des actions                                                  |
|                       | `features/pfas-amendments/components/pfas-screen.tsx`      | Adaptateur branché sur `selectedIds` / `focusedId` contrôlés                                                         |
|                       | `features/pfas-amendments/components/evidence-journey.tsx` | Prop `trailRequest` : ouvre la question C existante                                                                  |

Le noyau n'importe ni React ni Next (règle ESLint de `features/*/lib`). L'intégration PFAS peut être rejetée sans toucher au noyau.

## Contrat de plan

```ts
{ schemaVersion: 1, actions: Action[] } // 1 à 4 actions
type Action =
  | { type: 'focus'; id: string }
  | { type: 'compare'; ids: [string, string] } // distincts
  | { type: 'show-evidence' }
  | { type: 'open-location'; id: string } // seulement si le lieu est enregistré par l'hôte
```

Refusés : champs ou actions inconnus, identifiants absents du registre, comparaison d'une entité avec elle-même, lieu non
enregistré, hôte sans `openLocation`, plan brut > 8 Ko. Le plan entier est validé avant toute action : un seul défaut, rien
n'est appliqué. Les callbacks de l’hôte doivent être fiables : une exception pendant leur exécution n’est pas annulée automatiquement. Aucun code, sélecteur DOM, SQL ni URL ne peut transiter. Réponse d'abstention d'un modèle :
`{ "schemaVersion": 1, "abstain": true }` ; toute prose est refusée, la réponse affichée vient toujours des enregistrements réels.

PFAS n'enregistre aucun lieu : `open-location` y est toujours refusé.

## Questions reconnues (PFAS)

| Exemple                                          | Effet                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| « Compare les amendements 26 et 27 »             | sélection = exactement 26 et 27, focus sur 26                                  |
| « Montre l’amendement 32 »                       | sélection = 32, fiche ouverte                                                  |
| « Quel est le parent du sous-amendement 32 ? »   | sélection = 32 et son parent vérifié (`parentId` + `parentRelation`), focus 32 |
| « Affiche les sources et le parcours de la loi » | ouvre « Comment replacer… » et « Sources et croisements » existants            |

Abstentions explicites : effets économiques ou environnementaux, droit en vigueur, prédictions, question inconnue, numéro
absent ou ambigu, parenté absente ou contradictoire, plus de deux numéros (clarification), moins de deux pour comparer.
Les numéros sont comparés exactement (« 2 » ne désigne jamais 26). Les trois exemples sont des illustrations, pas des
demandes d'utilisateurs ni des tendances.

## Brancher un autre hôte (fleur radiale, jeu PLFSS)

```ts
import {
  applyPlan,
  createRegistry,
  parseModelResponse,
  type DatavizAssistantAdapter
} from '@/features/dataviz-assistant/lib'

const registry = createRegistry(
  myEntities.map((entity) => entity.id),
  myLocations.map((location) => location.id) // vide si l'hôte n'a pas de lieux
)
const adapter: DatavizAssistantAdapter = {
  focusEntity: (id) => store.focus(id),
  compareEntities: ([a, b]) => store.compare(a, b),
  showEvidence: () => store.openSources(),
  openLocation: (id) => store.goTo(id) // optionnel
}

const response = parseModelResponse(rawJsonFromServer, registry)
if (response.kind === 'plan') applyPlan(response.plan, adapter, registry)
```

`buildSystemPrompt({ entities, locations, sourceText })` énumère les identifiants et actions autorisés, exige du JSON seul,
encadre le texte source comme donnée et demande l'abstention hors périmètre. Aucun fournisseur (Featherless ou autre) n'est
branché : ce sera une route serveur distincte, avec ses propres secrets.

## Tests

- Unitaires : `features/dataviz-assistant/lib/*.test.ts`, `features/pfas-amendments/lib/assistant-guide.test.ts`.
- Navigateur : `test/e2e/pfas-assistant.spec.mjs` (deux vues, clavier, mobile, abstention, contexte en échec). Ils
  testent le guide déterministe sur l'instantané, pas un modèle ni l'API Hémicycle en direct.
