---
name: creer-un-composant-ds
description: Créer, étendre ou refactorer un composant d'interface en respectant le design system factorisé (tokens sémantiques uniquement, couches primitives / marque / patterns / features, variantes cva, registre des composants, aucune valeur brute). À utiliser AVANT d'écrire ou de modifier tout JSX stylé, même pour un écran prototypé rapidement : nouvel écran, carte, bouton, badge, liste, graphique, état vide, ou dès qu'une même structure visuelle apparaît deux fois.
---

# Créer un composant dans le design system

Références : `design-system/README.md` (tokens, couches, règles), `design-system/BRAND.md` (marque), `design-system/components.md` (registre).

## 1. Chercher avant de créer

1. Lire `design-system/components.md`. Chercher aussi dans le code : `git grep -n "data-slot='<nom>'"` et `ls components/ui components/shared components/brand`.
2. Si un composant couvre ≥ 80 % du besoin → **l'étendre** (nouvelle variante `cva` ou prop), jamais le copier-modifier.
3. Si la même structure existe déjà dans une feature → l'**extraire** dans `components/shared/` et remplacer l'occurrence existante dans la même PR (« deux occurrences = un composant »).

## 2. Choisir la couche

| Le composant… | Couche | Dossier |
| --- | --- | --- |
| est une primitive d'interface générique (shadcn / Radix) | primitive | `components/ui/` |
| porte l'identité (logo, lockup) | marque | `components/brand/` |
| est une composition réutilisable sans métier (StatCard, EmptyState, DataTable…) | pattern | `components/shared/` |
| connaît le domaine, les données, l'API | feature | `features/<domaine>/components/` |

Une couche n'importe que des couches inférieures. Un composant `ui` / `brand` / `shared` ne fait **aucun** appel de données et ne contient **aucun** texte : il reçoit des données typées et des libellés déjà traduits.

## 3. Écrire le composant

```tsx
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const statCardVariants = cva('bg-card text-card-foreground flex flex-col gap-2 rounded-xl border p-6', {
  variants: {
    tone: {
      default: '',
      brand: 'bg-brand-soft border-transparent'
    }
  },
  defaultVariants: { tone: 'default' }
})

type StatCardProps = React.ComponentProps<'div'> &
  VariantProps<typeof statCardVariants> & {
    label: string
    value: string
  }

export function StatCard({ label, value, tone, className, ...props }: StatCardProps) {
  return (
    <div data-slot='stat-card' className={cn(statCardVariants({ tone }), className)} {...props}>
      <p className='text-muted-foreground text-sm'>{label}</p>
      <p className='text-foreground text-3xl font-semibold tracking-tight'>{value}</p>
    </div>
  )
}
```

Checklist :

- [ ] uniquement des **utilitaires de tokens** (`bg-card`, `text-muted-foreground`, `border`, `rounded-xl`, `p-6`, `text-3xl`…) : aucun `#hex`, `rgb()`, `bg-[…]`, `p-[13px]`, `style={{ color }}` ;
- [ ] apparence choisie par **variantes nommées** (`variant`, `size`, `tone`) via `cva` ;
- [ ] export nommé, props typées, `className` fusionné en dernier avec `cn()`, `data-slot` sur la racine ;
- [ ] `asChild` (Slot Radix) : **un seul enfant** ;
- [ ] accessibilité : rôle / nom accessible, focus visible (`focus-visible:ring-3 focus-visible:ring-ring/50`), contraste AA, info jamais portée par la seule couleur ;
- [ ] composant de données : états chargement (`Skeleton`), vide, erreur, rempli ;
- [ ] calculs de rendu (géométrie, échelles, agrégats) extraits en fonction pure dans `lib/` ou `features/<domaine>/lib/` avec test.

## 4. Si un token manque

Ne jamais contourner. Ajouter le token sémantique dans `design-system/tokens/source/brand.json` (section `color`, référence `{palette.<primitive>}` : jamais une valeur brute), puis `pnpm tokens:build`. Respecter les familles réservées (`cta-*` actions transactionnelles, `stance-*` positions individuelles, `feedback-*` états système, `brand-*` identité). Signaler le nouveau token dans la PR.

## 5. Enregistrer et vérifier

1. Ajouter ou mettre à jour la ligne du composant dans `design-system/components.md`.
2. `pnpm check` (lint, `lint:ds`, `tokens:check`, typecheck, tests) doit être vert.
3. Vérifier le rendu dans `pnpm dev` (états compris) avant de rendre la main.
