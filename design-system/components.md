# Registre des composants

Inventaire obligatoire : **consulté avant de créer un composant, mis à jour dans la même PR** que tout ajout ou toute nouvelle variante. Couches et règles : [`README.md` § 5](README.md#5-exigence-de-factorisation-à-respecter-à-chaque-composant-même--vibe-codé-).

| Composant                                                      | Couche    | Fichier                               | Variantes / props clés                                                                                                     | Tokens consommés                                                                  | Statut |
| -------------------------------------------------------------- | --------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| `Button`                                                       | primitive | `components/ui/button.tsx`            | `variant`: default (cta) · destructive · outline · secondary · ghost · link ; `size`: default · sm · lg · icon ; `asChild` | `cta*`, `destructive*`, `secondary*`, `accent*`, `background`, `ring`             | stable |
| `Badge`                                                        | primitive | `components/ui/badge.tsx`             | `variant`: default · secondary · destructive · success · warning · info · outline ; `asChild`                              | `primary*`, `secondary*`, `destructive*`, `feedback-*-soft`, `foreground`, `ring` | stable |
| `Card` (+ Header, Title, Description, Action, Content, Footer) | primitive | `components/ui/card.tsx`              | composition par sous-composants                                                                                            | `card`, `card-foreground`, `muted-foreground`, `border`                           | stable |
| `Skeleton`                                                     | primitive | `components/ui/skeleton.tsx`          | `className` (taille)                                                                                                       | `muted`                                                                           | stable |
| `Toaster`                                                      | primitive | `components/ui/sonner.tsx`            | props Sonner                                                                                                               | `popover`, `popover-foreground`, `border`                                         | stable |
| `DandelionMark`                                                | marque    | `components/brand/dandelion-mark.tsx` | `title` (nom accessible) ; couleur par `text-*`, taille par `size-*`                                                       | `foreground` (défaut), `brand-foreground` sur surface de marque                   | stable |
| `BrandLockup`                                                  | marque    | `components/brand/brand-lockup.tsx`   | `size`: md · lg ; `titleAs`: h1 · p ; `name`, `baseline` (déjà traduits)                                                   | `foreground`, `muted-foreground`                                                  | stable |

## Ajouter une ligne

Colonnes : nom exporté · couche (`primitive` / `marque` / `pattern` / `feature`) · chemin · variantes et props qui changent l'apparence · tokens sémantiques consommés · statut (`draft` / `stable` / `deprecated`).

Un composant de feature n'entre dans ce registre que s'il est promu en `components/shared/` (pattern réutilisable).
