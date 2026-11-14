# Marque — Dandelion

Guidelines de marque applicables à toute l'interface. Valeurs exactes : [`tokens/palette.generated.md`](tokens/palette.generated.md) (générée depuis `tokens/source/brand.json`). Règles de consommation des tokens : [`README.md`](README.md).

## Identité

| Élément               | Valeur                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Nom                   | **Dandelion**                                                                                             |
| Baseline              | « Sowing public data, letting debate bloom. » (fr : « Semer la donnée publique, faire éclore le débat. ») |
| Langue de l'interface | anglais                                                                                                   |
| Ton visuel            | civic-tech, sobre, institutionnel, clair, moderne, accessible                                             |

## Pictogramme

Cinq chevrons inscrits dans un cercle, comme une aigrette de pissenlit vue de dessus.

**Construction** (source : `lib/brand/dandelion-geometry.ts`, testée) :

1. un cercle extérieur coupe toutes les branches ;
2. un centre de construction, décalé à droite du centre du cercle, d'où partent **5 bandes droites d'épaisseur constante espacées de 36°** (à 30°, 66°, 102°, 138°, 174°) ; chaque bande passe à une petite distance alternée (±ρ) de ce centre, d'où l'effet de rotation ;
3. chaque chevron réunit deux demi-bandes voisines : coin arrondi tourné vers le centre, encoche intérieure là où les bords se croisent, extrémités coupées par le cercle ; les deux moitiés d'une même bande restent alignées de part et d'autre du centre ;
4. le décalage du centre crée des chevrons de tailles différentes (grands à gauche, courts à droite) : c'est l'énergie de la marque, à ne jamais « régulariser ».

**Déclinaisons**

| Usage                  | Rendu                                                                                                                                  | Implémentation                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Interface (fond clair) | picto `foreground` (#141414)                                                                                                           | `<DandelionMark />` (`text-foreground`)                                                      |
| Sur surface de marque  | picto blanc                                                                                                                            | `<DandelionMark className='text-brand-foreground' />`                                        |
| Icône d'app / favicon  | picto blanc sur carré arrondi, dégradé vertical `brand-gradient-from` (#F96B61) → `brand-gradient-to` (#FAD870), picto à 66 % du cadre | route `/brand/mark.svg` (`app/brand/mark.svg/route.ts`)                                      |
| Lockup                 | picto + nom + baseline, centrés                                                                                                        | `<BrandLockup />` (`components/brand/brand-lockup.tsx`)                                      |
| Chargement             | vague « Bloom » : les pétales respirent l'un après l'autre, sens horaire                                                               | `<DandelionLoader />` ([`MOTION.md`](MOTION.md) § 4)                                         |
| Picto héros interactif | survol « Lean » : le picto se penche vers la souris, les pétales qui lui font face s'entrouvrent                                       | `<InteractiveDandelionMark />`, `<BrandLockup interactive />` ([`MOTION.md`](MOTION.md) § 5) |

**Interdits** : recolorer avec une couleur hors tokens, déformer, pivoter, régulariser les tailles des chevrons, ajouter contour, ombre ou effet, placer le picto blanc sur fond clair (ou noir sur fond sombre), recréer le picto à la main : toujours passer par `DandelionMark` ou `renderDandelionSvg`. **En mouvement**, seuls l'opacité et des translations le long de l'axe de chaque pétale sont permises (ni rotation, ni échelle, ni changement de couleur), uniquement via les variantes `motion` : voir [`MOTION.md`](MOTION.md).

**Zone de protection** : un espace vide d'au moins ¼ du diamètre du picto autour de lui. Taille minimale : 16 px (favicon), 24 px dans l'interface.

## Typographie

| Règle         | Détail                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------- |
| Police unique | **Inter** pour tout le texte : titres, corps, libellés, données, légendes                     |
| Graisses      | 400 (corps), 500 (libellés, boutons), 600 (titres, nom de marque), 700 (rare : chiffres clés) |
| Échelle       | 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48 px (`text-xs` … `text-5xl`)                        |
| Nom de marque | Inter 600, interlettrage serré (`tracking-tight`)                                             |
| Interdits     | toute autre police dans l'interface ; texte en capitales longues ; corps de texte sous 14 px  |

## Couleurs

Principes :

- **neutres pour l'interface** : texte et traits en `foreground` (#141414), `foreground-secondary` (#333), `muted-foreground` (#666) ; `subtle-foreground` (#999) seulement pour l'accessoire ; fond `background` (#FFFFFF) ;
- **le bleu `cta` est réservé aux actions transactionnelles** (Valider, Publier, Soumettre) ;
- **le corail de marque (`brand`, dégradé corail → pêche) porte l'identité** : picto, icône d'app, barre de chargement, rares accents ; jamais pour du texte courant ni pour un état système ;
- **les couleurs de Likert (`stance-*`) encodent une position individuelle** sur 5 niveaux, rien d'autre ; elles ne sont pas des couleurs de marque ;
- **`feedback-*` est réservé aux états système** ;
- **aucune couleur décorative** : toute couleur porte une fonction ; jamais d'information portée par la seule couleur ;
- **pas de noir pur** dans l'interface (#141414 est le noir de texte) ;
- **noir carbone** (#1F1F1E, primitive `neutral-carbon`) : réservé aux supports de présentation (decks, documents), pas à l'interface.

Familles de la palette (153 primitives, aucune consommée directement) : Blue (11), Neutral (12), Semantic (5), Semantic Tint (4), Likert (5), Likert Tint (5), et dix familles d'accents à 10 nuances (Raspberry, Mauve, Olive, Terracotta, Yellow, Teal Vivid, Teal Sage, Green, Red, Blue Sky) plus Blue Royal (11). Détail et valeurs : [`tokens/palette.generated.md`](tokens/palette.generated.md).

## Accessibilité

| Paire                                     | Contraste | Statut                                                                                                                |
| ----------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| `foreground` / `background`               | 18,4:1    | AA                                                                                                                    |
| `foreground-secondary` / `background`     | 12,6:1    | AA                                                                                                                    |
| `muted-foreground` / `background`         | 5,7:1     | AA                                                                                                                    |
| `cta-foreground` / `cta`                  | 9,1:1     | AA                                                                                                                    |
| `destructive-foreground` / `destructive`  | 5,1:1     | AA                                                                                                                    |
| `subtle-foreground` / `background`        | 2,85:1    | non essentiel uniquement                                                                                              |
| `feedback-success` / `background`         | 3,4:1     | jamais en petit texte                                                                                                 |
| `input` / `background` (bordure de champ) | 1,26:1    | sous WCAG 1.4.11 : champ toujours accompagné d'un libellé visible et d'un focus `ring` ; écart à trancher côté design |

Ces seuils sont vérifiés par `design-system/tokens/tokens.test.ts`.

## Écarts connus (à trancher avec le design)

- mode sombre incomplet, non activé ;
- bordure de champ `input` sous le contraste 3:1 ;
- `cta` aligné sur `blue-800` (#2C448B, valeur mesurée du produit de référence) et non `blue-500` comme dans la première version du système de couleurs ;
- tokens `consensus-*` (signal agrégé) et `deadline-*` non définis : ne pas réutiliser `stance-*` pour un consensus.
