# Mouvement — principes, tokens et pictogramme animé

Le mouvement est une foundation au même titre que la couleur : **il se déclare ici, se consomme par des utilitaires, ne s'écrit jamais en valeur brute dans un composant**. Ce guide couvre les principes généraux puis les deux animations du pictogramme Dandelion : le loader **« Bloom »** et le survol **« Lean »**.

## 1. Principes

| Principe           | Règle                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonctionnel        | un mouvement signale quelque chose (attente, entrée, réponse au geste). Aucune animation décorative en boucle hors loader.                                       |
| Discret            | amplitudes faibles (≤ 4 % de l'objet), durées entre 300 et 2 400 ms, courbes douces : le mouvement se remarque, il ne se regarde pas.                            |
| Fidèle à la marque | le picto ne **pivote** pas, ne se **déforme** pas, ne change pas de **couleur** : seuls l'opacité et des translations le long de ses propres axes sont permises. |
| Accessible         | tout est derrière `motion-safe:` ; `prefers-reduced-motion: reduce` a toujours un repli (aucun déplacement). Aucune information portée par le seul mouvement.    |
| Performant         | uniquement `opacity` et `translate` (composités par le GPU) ; aucun rendu React par frame.                                                                       |

## 2. Où vivent les valeurs : l'espace dans `lib/`, le temps dans le CSS

```
lib/brand/dandelion-geometry.ts   géométrie du picto (source, inchangée)
        │
        ▼
lib/brand/dandelion-motion.ts     ESPACE : axe de chaque pétale, ordre de la vague, amplitudes (pur, testé)
        │  variables CSS --dm-* posées sur chaque <path data-petal>
        ▼
design-system/motion.css          TEMPS : keyframes, durées, courbes, décalage (stagger), transitions
        │  utilitaires Tailwind : animate-dandelion-bloom, dandelion-stagger, dandelion-follow…
        ▼
components/brand/*                DandelionMark · DandelionLoader · InteractiveDandelionMark
```

Conséquence : modifier **l'amplitude** d'un mouvement = `DANDELION_MOTION_PARAMS` (tests à l'appui) ; modifier **son rythme** = `motion.css`. Aucun des deux ne se touche depuis un composant.

**Axe d'un pétale.** Demi-droite partant du centre de construction P (cf. [`BRAND.md`](BRAND.md#pictogramme)) et passant par l'encoche du chevron. C'est la direction dans laquelle une graine quitterait l'aigrette : tous les déplacements de pétale suivent cet axe, ce qui garde la construction lisible même en mouvement.

## 3. Inventaire des tokens de mouvement

| Token / utilitaire                    | Valeur                                                          | Usage                                                                        |
| ------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `animate-fade-up`                     | 600 ms, `cubic-bezier(0.22, 1, 0.36, 1)`                        | entrée d'un bloc (`motion-safe:animate-fade-up`)                             |
| `animate-dandelion-bloom`             | cycle 1 800 ms, `cubic-bezier(0.45, 0, 0.55, 1)`, infini        | loader : respiration d'un pétale (posé par `DandelionMark motion='loading'`) |
| `dandelion-stagger`                   | `(--dm-order − 5) × 360 ms`                                     | décale chaque pétale d'1/5 de cycle (sens horaire)                           |
| `animate-dandelion-breathe`           | 2 400 ms, opacité 1 → 0,4 → 1                                   | repli du loader en mouvement réduit                                          |
| `dandelion-follow`                    | transition `translate` 700 ms, `cubic-bezier(0.22, 1, 0.36, 1)` | survol : suivi doux du pointeur                                              |
| `DANDELION_MOTION_PARAMS.bloomDrift`  | 2,4 u. (viewBox 100)                                            | sortie d'un pétale au pic du loader                                          |
| `DANDELION_MOTION_PARAMS.hoverLean`   | 1,2 u.                                                          | déport du picto entier vers le pointeur                                      |
| `DANDELION_MOTION_PARAMS.hoverOpen`   | 2,8 u.                                                          | ouverture des pétales tournés vers le pointeur                               |
| `DANDELION_MOTION_PARAMS.hoverSettle` | 0,3 × `hoverOpen`                                               | resserrement des pétales opposés                                             |

Contrat entre les deux fichiers : **décalage = cycle / 5** (360 ms = 1 800 ms / 5). Changer l'un impose de changer l'autre (commentaire en tête de `motion.css`).

## 4. Loader « Bloom »

> Une respiration qui fait le tour de l'aigrette : chaque pétale, à son tour et dans le sens horaire, s'avive et s'écarte d'un souffle le long de son axe, comme une graine prête à s'envoler, puis se repose.

- **Cycle** : 1 800 ms. Chaque pétale est au repos (opacité 0,28, position d'origine), monte à son pic à 24 % du cycle (opacité 1, `bloomDrift` vers l'extérieur), redescend à 60 %, reste au repos jusqu'à la fin.
- **Vague** : rang 0 à midi, puis sens horaire (`order`, calculé depuis l'angle de l'axe). Trois pétales sont en mouvement à tout instant : la vague paraît continue, sans rotation réelle du picto.
- **Démarrage immédiat** : délai négatif, la vague tourne dès la première frame (pas d'état figé au montage).
- **Mouvement réduit** : plus aucun déplacement, le picto entier respire en opacité (`animate-dandelion-breathe`).
- **Accessibilité** : `role='status'`, `aria-live='polite'`, libellé traduit en `sr-only`.

```tsx
import { DandelionLoader } from '@/components/brand/dandelion-loader'

const t = useTranslations('common')
<DandelionLoader label={t('loading')} />                         // md, corail de marque
<DandelionLoader size='sm' tone='neutral' label={t('loading')} /> // dans un bouton, une ligne de tableau
<DandelionLoader tone='inverse' label={t('loading')} />           // sur une surface brand uniquement
```

| Prop    | Valeurs                                                                                      | Défaut  |
| ------- | -------------------------------------------------------------------------------------------- | ------- |
| `size`  | `sm` 24 px · `md` 48 px · `lg` 80 px                                                         | `md`    |
| `tone`  | `brand` (`text-brand`) · `neutral` (`text-foreground`) · `inverse` (`text-brand-foreground`) | `brand` |
| `label` | texte annoncé, **déjà traduit**                                                              | requis  |

Quand l'utiliser : attente d'une page ou d'un bloc sans structure connue (route `app/[locale]/loading.tsx`, calcul en cours). Quand la forme du contenu est connue, préférer `Skeleton` (moins d'attention captée, pas de saut de mise en page). Jamais deux loaders visibles en même temps.

## 5. Survol « Lean »

> Le pictogramme remarque la souris : il se penche imperceptiblement vers elle, les pétales qui lui font face s'entrouvrent, ceux qui lui tournent le dos se resserrent. Quand la souris s'en va, tout se repose.

Pour un pointeur `p` ramené au disque unité centré sur le picto (`normalizePointer`), le décalage du pétale d'axe `a` vaut :

```
facing = p · a                                   (∈ [−1, 1] : 1 = le pétale fait face au pointeur)
spread = facing × hoverOpen                      si facing > 0
       = facing × hoverOpen × hoverSettle        sinon
offset = p × hoverLean + a × spread              (≤ hoverLean + hoverOpen = 4 u., soit 4 % du picto)
```

Implémentation (`useDandelionPointer`) :

1. `pointermove` → position normalisée, échantillonnée **une fois par frame** (`requestAnimationFrame`) ;
2. `pointerOffsets` (pur, testé) → un décalage par pétale ;
3. écrit en `--dm-hover-x|y` directement sur chaque `<path data-petal>` : **aucun rendu React** ;
4. l'utilitaire `dandelion-follow` transforme ces valeurs en `translate` avec une transition longue (700 ms) : les à-coups du pointeur deviennent un suivi souple, légèrement retardé ;
5. `pointerleave` → pointeur au centre, les pétales glissent à leur place.

Ignoré au toucher (pas de survol sur mobile) et sous `prefers-reduced-motion: reduce` (le hook n'écrit rien, l'utilitaire n'est pas appliqué).

```tsx
import { InteractiveDandelionMark } from '@/components/brand/interactive-dandelion-mark'

<InteractiveDandelionMark className='size-28' />
<BrandLockup interactive name={t('title')} baseline={t('baseline')} />  // via le lockup
```

Quand l'utiliser : un picto **héros** par écran (accueil, écran vide, page 404). Pas dans un en-tête répété, une liste ou un favicon : un détail ludique n'amuse que s'il est rare.

## 6. API de `DandelionMark` (`motion`)

| `motion`      | Effet                                              | Composant à préférer |
| ------------- | -------------------------------------------------- | -------------------- | -------------------------- |
| `static`      | défaut, aucun mouvement                            | `DandelionMark`      |
| `loading`     | vague « Bloom » ; pose `--dm-order`, `--dm-drift-x | y` sur chaque pétale | `DandelionLoader`          |
| `interactive` | pétales prêts à suivre `--dm-hover-x               | y`                   | `InteractiveDandelionMark` |

Chaque pétale porte `data-petal` (son index dans `DANDELION_MARK.chevrons`). L'attribut `style` des pétales ne transporte **que** des propriétés `--dm-*` dérivées de la géométrie, jamais une couleur, une taille ou un espacement : c'est la seule exception tolérée à la règle « pas de `style={{…}}` ».

## 7. Ajouter ou modifier une animation

1. **Le rythme** (durée, courbe, keyframes) : `design-system/motion.css`, dans `@theme` (`--animate-<nom>`) ou en `@utility`. Jamais d'`animate-[…]`, de `duration-[…]` ni de `style={{ animation }}` dans un composant.
2. **L'espace** (amplitudes, directions) d'un mouvement du picto : `lib/brand/dandelion-motion.ts`, avec un test qui borne l'amplitude.
3. **L'exposition** : une valeur de variante `cva` (comme `motion`) sur le composant de marque, jamais une classe d'animation ajoutée au cas par cas dans une feature.
4. **Le repli** `prefers-reduced-motion` : obligatoire, sans déplacement.
5. **La trace** : ligne dans le tableau § 3 de ce fichier et dans [`components.md`](components.md).
