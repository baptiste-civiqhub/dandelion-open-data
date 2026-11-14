# WebUI — architecture de l'interface

L'interface est minimaliste et technique : **chaque page est un canvas plein écran** (le monde WebGL sur la landing, un graphique sur une page de dataviz), et l'interface HTML **flotte par-dessus** : un header rémanent et, selon la page, des widgets dans des colonnes latérales. Ce document dit comment les pièces s'emboîtent, comment ajouter une page et où brancher le WebGL et les données.

Références : [`design-system/README.md`](../design-system/README.md) (règles), [`design-system/components.md`](../design-system/components.md) (registre), [`features/world/README.md`](../features/world/README.md) (monde de la landing).

## 1. Anatomie d'un écran

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ╭──────────────────────────────────────────────────────────────────────╮ │  FloatingHeader (fixed, z-50)
│ │ ✳ Dandelion   Atlas  Area                    ( ⌕ Search… )  EN FR   │ │  ← monté une fois par le layout
│ ╰──────────────────────────────────────────────────────────────────────╯ │
│ ┌──────────┐                                             ┌──────────┐    │  Stage overlay (grille 3 · 6 · 3)
│ │ Widget   │               colonne centrale              │ Widget   │    │  ← pointer-events: none,
│ │ (left)   │            (souvent vide : on voit          │ (right)  │    │    sauf sur les widgets
│ └──────────┘              et on manipule le canvas)      └──────────┘    │
│                                                                          │
│                 StageCanvas (absolute inset-0, -z-10)                    │  ← scène WebGL / 2D de la page
└──────────────────────────────────────────────────────────────────────────┘
```

| Calque   | Composant                                                | Rôle                                                                                                         |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Header   | `SiteHeader` → `FloatingHeader`                          | seul élément rémanent : marque animée, navigation, recherche, langue. Ne se démonte jamais entre deux pages. |
| Colonnes | `Stage` (`left`, `children`, `right`)                    | grille 12 colonnes : 3 · 6 · 3 dès `lg`, empilées en dessous. Une colonne absente n'est pas rendue.          |
| Widgets  | `Widget` (+ `Header`, `Title`, `Description`, `Content`) | panneaux flottants, même matière que le header (`floatingSurface`).                                          |
| Fond     | `StageCanvas` + une scène de feature                     | canvas plein écran, toujours derrière ; reçoit le pointeur partout où il n'y a pas de widget.                |

Le pointeur traverse l'overlay (`pointer-events-none`) et n'est capté que par les enfants directs des colonnes (`*:pointer-events-auto`) : le canvas reste navigable entre les widgets.

## 2. Routes

Toutes les pages de l'interface vivent dans le route group **`app/[locale]/(stage)/`**. Son `layout.tsx` monte `SiteHeader` une fois : naviguer entre ces pages ne recrée pas le header (le picto interactif garde son état, pas de clignotement). Le layout racine `app/[locale]/layout.tsx` n'est pas modifié.

| URL              | Fichier                          | Écran (feature)                      | Canvas                       | Colonnes                                            |
| ---------------- | -------------------------------- | ------------------------------------ | ---------------------------- | --------------------------------------------------- |
| `/`              | `(stage)/page.tsx`               | `features/world` · `WorldScreen`     | monde WebGL (`WorldCanvas`)  | **aucune** (landing sans widget)                    |
| `/about`         | `(stage)/about/page.tsx`         | `features/about` · `AboutScreen`     | —                            | centre : un widget de texte                         |
| `/area?q=…`      | `(stage)/area/page.tsx`          | `features/areas` · `AreasScreen`     | —                            | centre : catalogue, recherche, tags                 |
| `/area/[areaId]` | `(stage)/area/[areaId]/page.tsx` | `features/dataviz` · `DatavizScreen` | pissenlit (`SunburstCanvas`) | gauche : texte, sorts · droite : fiche, répartition |
| (attente)        | `(stage)/loading.tsx`            | —                                    | —                            | centre : `DandelionLoader`                          |

Chemins : `PUBLIC_PATHS` (`constant/path.ts`), dont `PUBLIC_PATHS.AREA_DETAIL(areaId)` (`areaId` = slug du jeu `datasets`, ou son UUID). Les menus « Atlas » et « Area » ouvrent une `OverlayWindow` (`features/shell/components/site-menus.tsx`). Monde 3D de la landing : [`docs/dandelion/monde-3d.md`](dandelion/monde-3d.md). Paramètre de recherche : `SEARCH_PARAMS.QUERY` (`q`). Jamais d'URL en dur.

## 3. Header

`features/shell/components/site-header.tsx` compose des pièces du design system :

```tsx
<FloatingHeader>
  <FloatingHeaderSection>
    {' '}
    {/* gauche : taille fixe */}
    <Link href={PUBLIC_PATHS.HOME}>
      <InteractiveDandelionMark className='size-8' /> Dandelion
    </Link>
    <HeaderNav label={t('nav.label')}>
      <HeaderNavLink href={PUBLIC_PATHS.ABOUT}>{t('nav.about')}</HeaderNavLink>
      <HeaderNavLink href={PUBLIC_PATHS.DATASETS}>{t('nav.datasets')}</HeaderNavLink>
    </HeaderNav>
  </FloatingHeaderSection>
  <FloatingHeaderSection align='end'>
    {' '}
    {/* droite : prend et cède l'espace restant */}
    <SearchField action={PUBLIC_PATHS.DATASETS} label={t('search.label')} placeholder={t('search.placeholder')} />
    <LocaleSwitch />
  </FloatingHeaderSection>
</FloatingHeader>
```

- **Lien actif** : `isActivePath` (`lib/navigation/is-active-path.ts`, testé) — actif sur la page et ses sous-pages ; fond `secondary` + `aria-current='page'`.
- **Recherche** : formulaire GET (`next/form`) vers le catalogue, navigation client et prefetch, fonctionne sans JavaScript. Elle cède sa largeur (`max-w-64` dès `sm`) pour laisser le sélecteur de langue au bord droit.
- **Langue** : `LocaleSwitch` en dernier dans la section `end`.
- **Ajouter une entrée** : chemin dans `PUBLIC_PATHS`, clé `shell.nav.<entrée>` en en + fr, un `<HeaderNavLink>`.
- **Ajouter un bouton d'action** : `<Button variant='ghost' size='icon'>` (ou `secondary`) dans la section `end`, avant ou après la recherche ; jamais la variante `default` (bleu `cta` réservé aux actions transactionnelles).
- **Contrainte de hauteur** : header `top-4` + `h-14`, réservés par le `pt-24` du `Stage`. L'un ne change pas sans l'autre.

## 4. Construire un écran

Une page est fine (metadata + `setRequestLocale`) et rend un écran de feature ; l'écran choisit son canvas et ses widgets :

```tsx
// features/<domaine>/components/<domaine>-screen.tsx
export function ElectionsScreen() {
  const t = useTranslations('elections')

  return (
    <Stage
      canvas={<ElectionsCanvas label={t('canvasLabel')} />}
      left={
        <Widget aria-labelledby='elections-summary'>
          <WidgetHeader>
            <WidgetTitle id='elections-summary'>{t('summary.title')}</WidgetTitle>
            <WidgetDescription>{t('summary.description')}</WidgetDescription>
          </WidgetHeader>
          <WidgetContent>…</WidgetContent>
        </Widget>
      }
      right={<Widget>…</Widget>}
    />
  )
}
```

| Prop de `Stage` | Contenu                                                                |
| --------------- | ---------------------------------------------------------------------- |
| `canvas`        | un composant client de la feature qui rend un `StageCanvas`            |
| `left`, `right` | un ou plusieurs `Widget` (empilés, la colonne défile si elle déborde)  |
| `children`      | colonne centrale ; vide sur une dataviz pour laisser voir le graphique |
| `centerAlign`   | `start` (défaut) · `center` · `end` : alignement vertical du centre    |

Règles : un widget porte un titre (`WidgetTitle` + `aria-labelledby`), affiche les quatre états d'un composant de données (chargement `Skeleton`, vide, erreur, rempli) et ne contient aucun texte en dur. Un même widget utilisé sur deux écrans est promu dans `components/shared/` (« deux occurrences = un composant »).

## 5. Scènes (WebGL)

Le canvas est servi par un hôte unique, **`StageCanvas`** (`components/shared/stage-canvas.tsx`), et chaque feature fournit une **scène** qui respecte le contrat `StageSceneFactory` (`lib/stage/stage-scene.ts`) :

```ts
type StageSceneFactory = (context: { canvas; size; reducedMotion }) => StageScene | Promise<StageScene>
type StageScene = { resize?(size): void; frame?({ time, delta }): void; dispose?(): void }
```

| Responsabilité                                                               | Qui                                       |
| ---------------------------------------------------------------------------- | ----------------------------------------- |
| taille du tampon à la densité de pixels (plafonnée à 2), `ResizeObserver`    | `StageCanvas`                             |
| boucle `requestAnimationFrame`, pause quand l'onglet est masqué              | `StageCanvas`                             |
| création unique, `dispose` au démontage (y compris si la scène arrive après) | `StageCanvas`                             |
| contexte WebGL, shaders, caméra, dessin                                      | la scène de la feature                    |
| état et calculs (carte, échelles, positions)                                 | `features/<domaine>/lib/` (pur, testé)    |
| navigation, données, textes                                                  | le composant canvas de la feature (React) |

Organisation d'une feature avec canvas :

```
features/<domaine>/
├── components/<domaine>-canvas.tsx   # 'use client' : useMemo(() => createXScene(options)) → <StageCanvas scene={…} label={…} />
├── scene/create-<domaine>-scene.ts   # fabrique de scène (DOM / GPU, pas de React)
└── lib/                              # logique pure + tests
```

Règles :

- **moteur chargé à la demande** dans la fabrique (`await import('three')`, etc.) : le bundle initial ne grossit pas ;
- **fabrique stable** (fonction de module ou `useMemo`) : une nouvelle référence recrée la scène ;
- **couleurs lues dans les tokens** au montage (`getComputedStyle(document.documentElement).getPropertyValue('--color-chart-1')`), jamais en dur ;
- **mouvement réduit** : `context.reducedMotion` coupe toute animation non déclenchée par l'utilisateur ;
- **accessibilité** : `label` traduit sur le canvas, et l'information essentielle disponible dans les widgets (le canvas n'est pas lisible par un lecteur d'écran) ;
- **pas de DOM créé par la scène** : un HUD ou une infobulle est un composant React posé dans le `Stage`.

État actuel : `createWorldScene` dessine le monde 3D de la landing (jardin du Luxembourg, three.js chargé à la demande) ; `createSunburstScene` (`features/dataviz/scene/`) dessine le texte de loi en pissenlit (sunburst, canvas 2D) sur la page de zone, avec ses widgets reliés par deux stores (vue épinglée dans l'URL, survol éphémère). Le monde de la landing est détaillé dans [`features/world/README.md`](../features/world/README.md).

## 6. Pages de dataviz : où brancher les données

1. `apis/datasets/` (types, request, queries) selon le patron de `apis/health/` et [`docs/portabilite.md`](portabilite.md) ; clés dans `QueryKeysEnum`.
2. `DatavizScreen` devient un composant client qui appelle `useGetDataset(datasetId)` et distribue le résultat : métadonnées et états dans les widgets, série préparée vers le canvas.
3. Les transformations (agrégats, échelles, positions) vivent dans `features/dataviz/lib/` avec leurs tests ; la scène ne reçoit que des tableaux prêts à dessiner.
4. Le catalogue (`DatasetsScreen`) liste les jeux via `useGetDatasets({ query })`, chaque entrée liant à `PUBLIC_PATHS.DATASET_DETAIL(id)`.

## 7. Dépendances

**Moteur retenu : three.js** (`three` 0.187.0, `@types/three` 0.187.0, hors catalogue, listé dans `docs/stack.md`). Il ne s'importe **que dans une fabrique de scène**, par import dynamique, pour rester hors du bundle initial :

```ts
export function createWorldScene(options: WorldSceneOptions): StageSceneFactory {
  return async ({ canvas, size }) => {
    const THREE = await import('three')
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(size.pixelRatio)
    // scène, caméra, objets…
    return {
      resize: (next) => renderer.setSize(next.width, next.height, false),
      frame: () => renderer.render(scene, camera),
      dispose: () => renderer.dispose()
    }
  }
}
```

`setSize(…, false)` : le canvas est déjà dimensionné par `StageCanvas`, three.js ne doit pas réécrire son style. `@react-three/fiber` n'est pas utilisé : il gère son propre canvas et contournerait `StageCanvas`.
