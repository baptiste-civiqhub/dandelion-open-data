# Monde 3D de la landing : passation et fusion

Ce document s'adresse à Valentin, et à l'agent qui l'aide, pour brancher le monde 3D (WebGL, personnage, transition) sur l'application telle qu'elle existe sur `develop`. Il dit ce que vit l'utilisateur, ce qui est déjà en place, le contrat à respecter, et comment fusionner sans perdre le travail de personne.

## 1. Ce que vit l'utilisateur

1. **Il arrive sur `/`.** Pas de page d'accueil classique : un monde vu en 3D, un sol, des zones posées dessus, et un personnage qu'il dirige au clavier. Chaque zone est un jeu de données (une loi et ses amendements).
2. **Il approche d'une zone.** Le personnage entre dans son disque. En bas de l'écran, un bandeau affiche le nom de la zone et « Press Enter to open ».
3. **Il presse Entrée.** La caméra plonge vers la zone, en vue de dessus : la fleur de pissenlit de la zone grandit jusqu'à remplir l'écran.
4. **Il arrive sur `/area/{slug}`.** La page de la zone s'affiche : le graphique en fond, la zone et ses articles à gauche, la légende des sorts à droite. La transition masque le changement de page.
5. **À tout moment, le header lui donne deux raccourcis.** « Atlas » ouvre la carte vue de dessus, qui est **exactement** le plan du monde 3D. « Area » ouvre le catalogue avec recherche et tags. Choisir une zone y mène directement à sa page.

Le monde est la porte d'entrée sensible ; l'atlas et le catalogue sont la porte d'entrée accessible (clavier, lecteur d'écran, petit écran). Les deux mènent aux mêmes pages.

## 2. Ce qui existe déjà sur `develop`

| Élément                                            | Où                                           | État                                                                            |
| -------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| Header flottant, menus « Atlas » et « Area »       | `features/shell/components/`                 | fait                                                                            |
| Fenêtre Atlas : carte 2D des zones                 | `features/atlas/`                            | fait, positions par `layoutAtlas`                                               |
| Fenêtre et page Area : recherche, filtres par tags | `features/areas/`, route `/area`             | fait                                                                            |
| Page de zone `/area/{slug}`                        | `features/dataviz/`, route `/area/[areaId]`  | fait, graphique provisoire en points                                            |
| Données des zones                                  | `apis/areas` (`useGetAreas`)                 | fait, lit `datasets`, `textes`, `tag_links`                                     |
| Landing `/`                                        | `features/world/components/world-screen.tsx` | fait : monde 3D, titre en `sr-only` après `onReady`                             |
| Scène du monde                                     | `features/world/scene/create-world-scene.ts` | fait : jardin du Luxembourg, un pissenlit par zone, plongée vers `/area/{slug}` |
| Positions 3D des zones                             | `features/world/lib/world-zones.ts`          | fait et testé                                                                   |

Zones disponibles aujourd'hui (table `datasets`, `slug` = identifiant d'URL) :

| `slug`                | Données                               | Tags                                  |
| --------------------- | ------------------------------------- | ------------------------------------- |
| `plffg-2026`          | 1 texte, 10 articles, 217 amendements | budget, finances-publiques            |
| `demo-plf-2027`       | aucune (démonstration)                | budget, finances-publiques, fiscalite |
| `demo-plfss-2027`     | aucune (démonstration)                | sante, securite-sociale               |
| `demo-energie-climat` | aucune (démonstration)                | energie, environnement                |
| `demo-ecole`          | aucune (démonstration)                | education                             |

Le monde doit fonctionner avec n'importe quel nombre de zones : elles viennent du backend, jamais d'une liste en dur.

## 3. Le contrat

Tout le travail 3D vit dans **`features/world/`**. Le point d'entrée est `createWorldScene(options)`, qui rend une fabrique de scène au format `StageSceneFactory` (`lib/stage/stage-scene.ts`).

```ts
type WorldSceneOptions = {
  zones: readonly WorldZone[] // à poser au sol ; liste vide pendant le chargement
  onReady: () => void // première image dessinée : le titre de marque s'efface
  onZoneFocus: (slug: string | null) => void // entrée ou sortie d'une zone : le bandeau s'affiche ou part
  onEnterZone: (slug: string) => void // Entrée pressée et transition finie : navigation vers /area/{slug}
  landing?: (viewport: { width: number; height: number }) => { cx: number; cy: number; r: number } // facultatif : cercle d'écran où la fleur se pose
  onExitFrames?: (frames: { slug: string; frame: HTMLCanvasElement; scenery: HTMLCanvasElement }) => void // facultatif : dernières images, juste avant onEnterZone
}

type WorldZone = {
  id: string
  slug: string
  name: string
  x: number
  z: number
  radius: number // plan XZ, centre du monde en (0, 0), Y vers le haut, monde de 100 × 100
  hasData: boolean // la zone a un texte : sa page a une dataviz
  tagIds: string[]
}
```

`WorldScreen` fait déjà tout le reste : il charge les zones, calcule leurs positions, affiche le bandeau « Press Enter to open », efface le titre quand le monde est prêt, et navigue. **Valentin n'a pas à toucher au routeur, aux URL, au header ni aux données.**

Règles :

| Sujet            | Règle                                                                                                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Positions        | Utiliser `zone.x` et `zone.z` tels quels. Ne pas recalculer : l'atlas 2D affiche les mêmes positions, et `zoneAt(zones, x, z)` détecte la zone sous le personnage.                                                                                                                                          |
| Cycle de vie     | `StageCanvas` possède le canvas : taille, densité de pixels, boucle `frame`, pause d'onglet, `dispose`. La scène ne crée ni ne redimensionne jamais le canvas.                                                                                                                                              |
| Moteur           | Chargé dans la fabrique : `const THREE = await import('three')` (three.js 0.187.0, déjà installé). Toute autre dépendance : `pnpm add --save-exact`, à signaler dans la PR.                                                                                                                                 |
| Logique pure     | Déplacements, collisions, trajectoire de caméra : `features/world/lib/*.ts`, sans three.js ni DOM, avec tests `*.test.ts`.                                                                                                                                                                                  |
| Clavier          | Écouteurs posés dans la fabrique, retirés dans `dispose`. Ignorer les touches quand le focus est dans un champ (`event.target` est un `input`) ou qu'une fenêtre du header est ouverte (`document.querySelector('[data-slot=overlay-window]')`), sinon taper dans la recherche ferait bouger le personnage. |
| Couleurs         | Lues dans les tokens au montage : `getComputedStyle(document.documentElement).getPropertyValue('--color-brand')`. Jamais de valeur en dur (`pnpm lint:ds`). Zone avec données : `--color-brand` ; zone vide : `--color-muted-foreground`.                                                                   |
| Mouvement réduit | `context.reducedMotion` : pas de caméra qui dérive seule ; Entrée appelle `onEnterZone` immédiatement, sans zoom.                                                                                                                                                                                           |
| Interface        | Aucun DOM créé par la scène. Un HUD supplémentaire est un composant React posé par `WorldScreen` dans le `Stage`.                                                                                                                                                                                           |
| Événements       | `onReady` une seule fois. `onZoneFocus` seulement quand la zone change. `onEnterZone` une seule fois par entrée.                                                                                                                                                                                            |
| Recréation       | La scène est recréée quand `zones` change (arrivée des données). Elle doit libérer toutes ses ressources dans `dispose`.                                                                                                                                                                                    |

## 4. La transition vers la page de zone

Côté monde, la transition est un zoom de caméra vers `(zone.x, 0, zone.z)` en vue de dessus. À la fin du zoom, la scène appelle `onEnterZone(slug)`.

La page `/area/{slug}` s'affiche alors avec son propre canvas. Pour que le passage soit continu :

- la fin du zoom doit montrer un fond proche de celui de la page de zone (`--color-background`) ;
- si Valentin veut un fondu commun aux deux pages, il passe par un composant React partagé (`components/shared/`), pas par le canvas, et le signale dans la PR.

### Continuité monde → page de zone (en place)

1. **Alignement.** `WorldScreen` passe `landing={landingOnSunburst}` : le disque du sunburst de la page de zone (`diskLayout`, même viewport). La plongée (`features/world/lib/dive.ts`) calcule une pose finale à la verticale (`diveLanding`) qui projette la tête de la fleur, à son échelle finale, exactement sur ce disque : centre sur `(cx, cy)`, contour sur `r1`. La caméra y passe par-dessus la fleur (`divePose`, arc dans le plan vertical du regard, sans rotation de l'image). Testé par projection (`dive.test.ts`).
2. **Voile.** Pendant la seconde moitié de la plongée, un voile `--color-background` (shader plein écran) monte à `EXIT_VEIL_OPACITY` (0,7) partout sauf dans le disque, qui reste net (fondu de 40 px).
3. **Rideau.** À la fin, la scène copie deux images (`onExitFrames`) : `frame`, l'image affichée, et `scenery`, la même vue sans voile en basse définition. `WorldScreen` les confie à `store/stage-transition.ts` avant de naviguer. `StageTransitionCurtain` (monté dans `app/[locale]/(stage)/layout.tsx`) tient `frame` au-dessus de la page, ce qui masque l'écran de chargement, puis s'efface en 800 ms quand la page de zone a ses données (`useStageArrival`), au plus tard après 1,6 s.
4. **Arrivée.** La page de zone pose `StageBackdrop` (prop `backdrop` du `Stage`) : `scenery` floutée sous le même voile à 70 %. Ses anneaux s'ouvrent depuis le centre (`opening='bloom'`, 900 ms) pendant que la fleur du rideau se dissout. Accès direct, Atlas, menu Area : fond de repli (dégradé ciel → pelouse voilé) et ouverture habituelle depuis midi.
5. **Mouvement réduit.** Pas de plongée ni d'images : navigation immédiate, fond de repli statique, anneaux affichés d'un coup.

La page de zone est préchargée (`router.prefetch`) dès que le joueur entre dans la zone.

## 5. Fusion avec `develop`

Valentin n'a pas encore de branche. La branche **`feat/world-3d`** est créée pour lui depuis le dernier état de l'application : elle contient tout ce qui précède, contrat compris.

**S'il n'a pas encore commencé :**

```bash
git fetch origin
git switch feat/world-3d
pnpm install --frozen-lockfile
cp .env.example .env.local   # puis NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (la demander à Yanis)
pnpm dev                     # http://localhost:3000
```

**S'il a déjà du code ailleurs (autre dépôt, prototype, dossier local) :**

1. Partir de `feat/world-3d`.
2. Copier son travail **dans `features/world/`** : la scène dans `scene/`, les calculs dans `lib/`, les composants éventuels dans `components/`.
3. Remplacer ses zones en dur par `options.zones`, ses changements de page par `options.onEnterZone(slug)`.
4. Ne pas recopier : `package.json` (sauf ajouts de dépendances), le header, les routes, `apis/`, `i18n/`, `design-system/`.

**Ce qui ne doit pas changer pendant la fusion :**

- les routes `/`, `/area`, `/area/[areaId]` et `PUBLIC_PATHS` ;
- les menus Atlas et Area et leurs fenêtres ;
- la couche `apis/` et le schéma Supabase ;
- `WorldScreen` : le modifier seulement pour poser un HUD, en gardant le titre `h1` et le bandeau d'entrée.

**Quand c'est prêt :** `pnpm check` vert, puis une PR de `feat/world-3d` vers `develop`. Un humain la fusionne.

## 6. Recette du monde

À vérifier dans le navigateur avant la PR :

- [ ] Sur `/`, le monde s'affiche et le titre « Dandelion » disparaît de l'écran.
- [ ] Les cinq zones sont au sol, aux mêmes places que dans la fenêtre Atlas.
- [ ] La zone `plffg-2026` (données) se distingue des zones de démonstration autrement que par la couleur (relief, forme, fleur…).
- [ ] Le personnage entre dans une zone : le bandeau « Press Enter to open » apparaît avec le bon nom ; il disparaît en sortant.
- [ ] Entrée lance le zoom puis ouvre `/area/{slug}` ; la page montre la bonne zone.
- [ ] Taper dans la recherche du header ne fait pas bouger le personnage.
- [ ] Avec « réduire les animations » activé dans le système, Entrée ouvre la page sans zoom.
- [ ] Retour arrière du navigateur depuis `/area/{slug}` : le monde se recharge sans erreur dans la console.
- [ ] `pnpm check` vert.

## 7. Brief à donner à l'agent de Valentin

> Tu travailles dans le dépôt `dandelion-open-data`, branche `feat/world-3d`. Lis `AGENTS.md`, `docs/webui.md` et `docs/dandelion/monde-3d.md` avant toute action. Ta mission : implémenter le monde 3D de la landing dans `features/world/scene/create-world-scene.ts`, en respectant exactement le contrat `WorldSceneOptions` (zones reçues en options, événements `onReady`, `onZoneFocus`, `onEnterZone`). Un sol, une zone par élément de `options.zones` à `(zone.x, zone.z)`, un personnage piloté au clavier, la détection d'entrée avec `zoneAt`, et un zoom de caméra vers la zone quand l'utilisateur presse Entrée. three.js 0.187.0 se charge dans la fabrique par import dynamique. Logique pure dans `features/world/lib/` avec tests. Ne modifie ni les routes, ni le header, ni `apis/`, ni le schéma Supabase. Termine par la recette de la section 6 et `pnpm check`.
