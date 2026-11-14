# features/world — monde WebGL de la landing

Socle d'architecture pour le jeu de navigation de la landing (un véhicule parcourt les zones d'une carte ; chaque zone mène à une dataviz). **Rien n'est dessiné aujourd'hui** : ce dossier fixe les points d'entrée et les contrats, l'implémentation du monde se fait ici sans toucher au reste de l'interface.

```
features/world/
├── components/
│   ├── world-screen.tsx    # écran de la landing : <Stage canvas={<WorldCanvas />} />, sans widget latéral
│   └── world-canvas.tsx    # client : StageCanvas + branchement routeur (onEnterZone → page de dataviz)
├── scene/
│   └── create-world-scene.ts   # ⇦ POINT D'ENTRÉE DU MONDE (fabrique de scène, contrat StageSceneFactory)
└── lib/                    # (à créer) logique pure du monde : carte, zones, collisions, trajectoires + tests
```

## Contrat à respecter

| Sujet             | Règle                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cycle de vie      | `StageCanvas` possède le canvas : taille, densité de pixels (plafonnée à 2), boucle `frame`, pause onglet masqué, `dispose`. La scène ne crée ni ne redimensionne jamais le canvas elle-même. Contrat : `lib/stage/stage-scene.ts`.                                                                                                    |
| Moteur 3D         | Chargé **à la demande dans la fabrique** (`async ({ canvas }) => { const THREE = await import('three') … }`) : hors du bundle initial. Moteur retenu : **three.js 0.187.0** (exemple complet : [`docs/webui.md`](../../docs/webui.md) § 7). Toute autre dépendance s'installe en `--save-exact` et se signale en PR (`docs/stack.md`). |
| Sortie vers l'app | Uniquement `options.onEnterZone(datasetId)`. Le monde ne connaît ni le routeur ni les URL : `WorldCanvas` traduit l'événement en navigation (`PUBLIC_PATHS.DATASET_DETAIL`).                                                                                                                                                           |
| Logique pure      | Carte, zones, déplacements, collisions : `features/world/lib/*.ts`, sans DOM ni moteur, testés (`*.test.ts`). La scène ne fait que dessiner l'état calculé.                                                                                                                                                                            |
| Couleurs          | Lues dans les tokens au montage (`getComputedStyle(document.documentElement).getPropertyValue('--color-brand')`), jamais écrites en dur (`pnpm lint:ds` surveille `features/`).                                                                                                                                                        |
| Mouvement réduit  | `context.reducedMotion` : pas de caméra qui dérive seule, transitions instantanées ; le véhicule ne bouge que sur action de l'utilisateur.                                                                                                                                                                                             |
| Accessibilité     | Le canvas porte un nom (`world.canvasLabel`). Les zones doivent aussi être atteignables sans le monde : le menu **Area** du header y mène.                                                                                                                                                                                             |
| Interface         | Pas de widget latéral sur la landing. Un HUD éventuel = composant de `components/shared/` posé dans `Stage` (colonne centrale), jamais du DOM créé par la scène.                                                                                                                                                                       |

Voir aussi [`docs/webui.md`](../../docs/webui.md) (architecture de l'interface).
