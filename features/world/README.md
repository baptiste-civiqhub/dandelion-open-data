# features/world — monde WebGL de la landing

Monde navigable de la landing : le jardin du Luxembourg, un pissenlit par zone aux positions de l'atlas (zone avec données : aigrette haute et anneau plein ; zone de démonstration : fleur jaune basse et anneau en pointillés). Le joueur conduit une voiture ou monte à cheval (touche **V** ; flèches, ZQSD ou WASD, Maj = turbo, Espace = frein) ; Entrée dans une zone fait plonger la caméra sur la fleur, puis ouvre `/area/{slug}`. Couleurs : tokens `world-*` (`design-system/tokens/source/world.json`).

```
features/world/
├── components/
│   ├── world-screen.tsx    # écran de la landing : <Stage canvas={<WorldCanvas />} />, sans widget latéral
│   └── world-canvas.tsx    # client : StageCanvas + branchement routeur (onEnterZone → page de dataviz)
├── scene/
│   ├── create-world-scene.ts   # ⇦ POINT D'ENTRÉE DU MONDE : moteur, lumières, caméra, clavier, boucle, focus, plongée, dispose
│   ├── build-garden.ts         # décor + animateur (eau, voiliers, feuilles, promeneurs, pigeons, graines)
│   ├── build-zones.ts          # une clairière + un pissenlit + une plaque par zone ; anneau de focus
│   ├── build-vehicles.ts       # voiture et cheval
│   ├── world-kit.ts            # matériaux par token, instances, dalles, textures canvas
│   └── world-palette.ts        # lecture des tokens --color-world-* et --color-* au montage
└── lib/                    # logique pure testée : world-zones, garden-layout, vehicle, dive, seeded-random, world-colors
```

## Contrat à respecter

| Sujet             | Règle                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cycle de vie      | `StageCanvas` possède le canvas : taille, densité de pixels (plafonnée à 2), boucle `frame`, pause onglet masqué, `dispose`. La scène ne crée ni ne redimensionne jamais le canvas elle-même. Contrat : `lib/stage/stage-scene.ts`.                                                                                                    |
| Moteur 3D         | Chargé **à la demande dans la fabrique** (`async ({ canvas }) => { const THREE = await import('three') … }`) : hors du bundle initial. Moteur retenu : **three.js 0.187.0** (exemple complet : [`docs/webui.md`](../../docs/webui.md) § 7). Toute autre dépendance s'installe en `--save-exact` et se signale en PR (`docs/stack.md`). |
| Sortie vers l'app | Uniquement les rappels `onReady`, `onZoneFocus(slug)`, `onEnterZone(slug)`. Le monde ne connaît ni le routeur ni les URL : `WorldScreen` affiche le bandeau d'entrée et navigue vers `PUBLIC_PATHS.AREA_DETAIL(slug)`. Zones reçues en `options.zones` (`worldZonesFromAreas`, mêmes positions que l'atlas).                           |
| Logique pure      | Carte, zones, déplacements, collisions : `features/world/lib/*.ts`, sans DOM ni moteur, testés (`*.test.ts`). La scène ne fait que dessiner l'état calculé.                                                                                                                                                                            |
| Couleurs          | Lues dans les tokens au montage (`getComputedStyle(document.documentElement).getPropertyValue('--color-brand')`), jamais écrites en dur (`pnpm lint:ds` surveille `features/`).                                                                                                                                                        |
| Mouvement réduit  | `context.reducedMotion` : pas de caméra qui dérive seule, transitions instantanées ; le véhicule ne bouge que sur action de l'utilisateur.                                                                                                                                                                                             |
| Accessibilité     | Le canvas porte un nom (`world.canvasLabel`). Les zones doivent aussi être atteignables sans le monde : le menu **Area** du header y mène.                                                                                                                                                                                             |
| Interface         | Pas de widget latéral sur la landing. Un HUD éventuel = composant de `components/shared/` posé dans `Stage` (colonne centrale), jamais du DOM créé par la scène.                                                                                                                                                                       |

Passation et procédure de fusion : [`docs/dandelion/monde-3d.md`](../../docs/dandelion/monde-3d.md). Voir aussi [`docs/webui.md`](../../docs/webui.md).
