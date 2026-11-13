# Design system — foundations et règles de factorisation

Ce dossier est la **source unique** de l'apparence de l'application. Un agent qui écrit de l'interface lit ce fichier avant de coder, puis [`BRAND.md`](BRAND.md) (marque) et [`components.md`](components.md) (registre des composants).

> Règle d'or : **aucune valeur visuelle ne s'écrit dans un composant**. Couleur, espacement, rayon, taille de texte, ombre, animation : tout vient d'un token. Un besoin non couvert = un nouveau token ici, jamais une valeur en dur là-bas.

## 1. Architecture des tokens (trois couches)

```
design-system/tokens/source/brand.json      ← seule source éditée à la main
        │  pnpm tokens:build (scripts/build-tokens.mjs, déterministe, hors ligne)
        ▼
generated.css   generated.ts   palette.generated.md     ← jamais édités à la main
        │
        ▼
app/globals.css (@import) → utilitaires Tailwind : bg-primary, text-muted-foreground, rounded-lg, text-lg…
```

| Couche                   | Où                                                                       | Forme                                                                        | Qui la consomme                   |
| ------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------- |
| **Palette** (primitives) | `palette` dans `brand.json`                                              | variables CSS `--palette-*`, **aucun utilitaire**                            | uniquement les tokens sémantiques |
| **Tokens sémantiques**   | `color` dans `brand.json`                                                | `--color-*` dans `@theme static` → utilitaires `bg-*`, `text-*`, `border-*`… | les composants                    |
| **Échelles**             | `spacing`, `radius`, `fontSize`, `fontWeight`, `lineHeight`, `elevation` | namespaces natifs Tailwind 4                                                 | les composants                    |

Garde-fous automatiques :

- la palette Tailwind par défaut est **désactivée** (`--color-*: initial`) : `bg-blue-500` ne génère rien ;
- les primitives n'ont pas d'utilitaire : impossible d'écrire `bg-palette-…` ;
- `pnpm lint:ds` refuse dans `app/`, `components/`, `features/`, `hooks/` : `#hex`, `rgb()`/`hsl()`/`oklch()`, `var(--palette-…)`, et les valeurs Tailwind arbitraires (`p-[13px]`, `text-[#333]`, `rounded-[7px]`…) ;
- `pnpm tokens:check` et `design-system/tokens/tokens.test.ts` échouent si les fichiers générés ne sont pas à jour, si un token sémantique pointe vers une valeur brute ou vers une primitive inexistante, ou si une paire critique passe sous le contraste WCAG AA.

Référence complète, générée et toujours à jour : [`tokens/palette.generated.md`](tokens/palette.generated.md) (70 tokens sémantiques, 153 primitives, valeurs claires et sombres).

## 2. Tokens sémantiques et leurs usages

| Famille                 | Tokens                                                                                                       | Usage autorisé                                                                | Interdit                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Surfaces                | `background`, `card`, `popover`, `surface-raised`, `muted`, `secondary`, `accent`                            | fonds d'écran, cartes, sheets, survols                                        | —                                                                                                        |
| Texte                   | `foreground` (#141414), `foreground-secondary` (#333), `muted-foreground` (#666), `subtle-foreground` (#999) | hiérarchie de texte                                                           | `subtle-foreground` pour une info essentielle (2,85:1)                                                   |
| Bordures et focus       | `border` (noir 8 %), `input`, `ring`                                                                         | séparateurs, champs, anneau de focus                                          | —                                                                                                        |
| Action transactionnelle | `cta`, `cta-hover`, `cta-pressed`, `cta-disabled`, `cta-surface`, `cta-foreground`                           | **uniquement** Valider / Publier / Soumettre (variante `default` du `Button`) | boutons secondaires, liens, décoration                                                                   |
| Shadcn                  | `primary`, `primary-foreground`, `destructive`, `destructive-foreground`                                     | primitives `components/ui`                                                    | —                                                                                                        |
| Marque                  | `brand`, `brand-soft`, `brand-foreground`, `brand-gradient-from`, `brand-gradient-to`                        | pictogramme, icône d'app, barre de chargement, accents de marque              | texte courant (blanc sur `brand` < 4,5:1), états système                                                 |
| Positions individuelles | `stance-l2`, `stance-l1`, `stance-neutral`, `stance-lm1`, `stance-lm2` (+ `-soft`)                           | **uniquement** une opinion individuelle sur une échelle de Likert à 5 niveaux | consensus agrégé, décoration, marque                                                                     |
| Retour système          | `feedback-success`, `-warning`, `-danger`, `-info` (+ `-soft`)                                               | états système : succès, erreur, alerte, info                                  | éditorial ; `feedback-*` plein comme couleur de petit texte (préférer fond `-soft` + texte `foreground`) |
| Navigation              | `nav-icon-active`, `nav-icon-rest`                                                                           | icônes de navigation                                                          | —                                                                                                        |
| Identités de contenu    | `content-group`, `content-project`, `editorial-*` (+ `-soft`)                                                | identité d'un type de contenu, mise en avant éditoriale                       | usage décoratif libre                                                                                    |
| Données                 | `chart-1` … `chart-5`                                                                                        | séries catégorielles de graphiques                                            | couleurs de stance ou de feedback dans un graphique non sémantique                                       |

Principes de marque qui s'appliquent partout : sobre et institutionnel, **WCAG AA minimum**, **jamais d'information portée par la seule couleur** (toujours un libellé, une icône ou un motif en plus), pas de couleur décorative sans fonction, pas de noir pur (le texte est `foreground` #141414).

## 3. Échelles

| Échelle         | Valeurs                                                                                        | Utilitaires                   |
| --------------- | ---------------------------------------------------------------------------------------------- | ----------------------------- |
| Espacement      | 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px (`spacing-0` … `spacing-16`)                        | `p-4`, `gap-2`, `mt-8`…       |
| Rayon           | `sm` 4 · `md` 8 · `lg` 12 · `xl` 16 · `2xl` 16 · `sheet` 18 · `full`                           | `rounded-lg`…                 |
| Taille de texte | `xs` 12 · `sm` 14 · `md` 16 · `lg` 18 · `xl` 20 · `2xl` 24 · `3xl` 30 · `4xl` 36 · `5xl` 48 px | `text-sm`…                    |
| Graisse         | `regular` 400 · `medium` 500 · `semibold` 600 · `bold` 700                                     | `font-medium`…                |
| Interligne      | `tight` 1.25 · `normal` 1.5 · `relaxed` 1.625                                                  | `leading-normal`…             |
| Élévation       | `sm` · `md` · `lg` · `xl` · `sheet`                                                            | `shadow-md`…                  |
| Mouvement       | `fade-up` ([`motion.css`](motion.css))                                                         | `motion-safe:animate-fade-up` |

Police : **Inter** (variable, auto-hébergée par `next/font`), exposée par le token `font-sans`. Aucune autre police dans l'interface.

## 4. Mode sombre

La palette définit des surcharges sombres pour les primitives clés (`paletteDark`). Le mode sombre est **incomplet** (pas de surcharge pour `likert-l1`, `likert-lm1`, les `editorial`, les `-soft`…) et **non activé** : pas de bascule tant que la marque ne l'a pas complété. Ne jamais introduire de `dark:` ad hoc pour compenser.

## 5. Exigence de factorisation (à respecter à chaque composant, même « vibe-codé »)

Les composants sont organisés en couches. **Une couche ne dépend que des couches inférieures.**

| Couche               | Dossier                          | Contenu                                                             | Connaît le métier ?                  |
| -------------------- | -------------------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| 1. Foundations       | `design-system/`                 | tokens, motion                                                      | non                                  |
| 2. Primitives        | `components/ui/`                 | Button, Badge, Card, Skeleton, Toaster… (shadcn / Radix, re-thémés) | non                                  |
| 3. Marque            | `components/brand/`              | DandelionMark, BrandLockup                                          | non                                  |
| 4. Patterns partagés | `components/shared/`             | compositions réutilisables (StatCard, EmptyState, DataTable…)       | non : données reçues en props typées |
| 5. Features          | `features/<domaine>/components/` | écrans et blocs métier                                              | oui                                  |

Règles :

1. **Chercher avant de créer.** Consulter [`components.md`](components.md). Si un composant existant couvre ≥ 80 % du besoin, l'étendre par une **variante** (`cva`) ou une prop, ne jamais le dupliquer en le retouchant.
2. **Deux occurrences = un composant.** Dès qu'un même assemblage de classes ou de JSX apparaît deux fois (dans une ou plusieurs features), il est extrait dans `components/shared/` (ou `components/ui/` s'il est générique) et les deux usages sont remplacés.
3. **Variantes plutôt que props de style.** L'apparence se choisit par des variantes nommées (`variant`, `size`, `tone`) définies avec `cva` ; pas de prop `color="#…"`, pas de `style={{…}}` visuel.
4. **Un composant DS ne connaît ni l'API ni le métier.** Pas de `useQuery`, pas d'appel Supabase, pas de texte en dur : il reçoit des données et des libellés déjà traduits en props. La feature fait le lien.
5. **API standard** : un fichier par composant, export nommé, props typées étendant les props HTML natives quand c'est pertinent (`React.ComponentProps<'button'>`), `className` fusionné en dernier via `cn()`, `data-slot` sur la racine, `asChild` à **un seul enfant**.
6. **Accessibilité incluse** : rôle et nom accessibles, focus visible (`ring`), contraste AA, états `disabled` / `aria-invalid` stylés par tokens.
7. **Quatre états pour tout composant de données** : chargement (`Skeleton`), vide, erreur, rempli.
8. **Tout ajout est enregistré** : nouveau composant ou nouvelle variante → ligne dans [`components.md`](components.md) dans la même PR. Nouveau token → `brand.json` + `pnpm tokens:build` + mention dans la PR.
9. **Logique de rendu pure à part** : calculs (géométrie, échelles de dataviz, sélecteurs de présentation) dans `lib/` ou `features/<domaine>/lib/`, testés (voir `lib/brand/dandelion-geometry.ts`).

Procédure détaillée : skill `creer-un-composant-ds` (`.claude/skills/` et `.cursor/skills/`).

## 6. Langue de l'interface

L'interface est **en anglais** (`defaultLocale: 'en'`, détection de langue désactivée). Les échanges avec les agents et la documentation peuvent être en français ; **tout texte visible par l'utilisateur est une clé i18n dont la valeur anglaise est la référence** (`i18n/messages/en.json`), le catalogue `fr.json` est maintenu en parallèle.

## 7. Portabilité

Les noms des tokens shadcn (`background`, `foreground`, `primary`, `muted-foreground`, `border`, `ring`, `card`, `destructive`…) et les échelles (espacement, rayon, typographie, élévation) sont **identiques** à ceux de l'application de référence : un composant qui ne consomme qu'eux se porte tel quel. Les tokens propres à cette marque (`cta-*`, `stance-*`, `feedback-*`, `brand-*`, `content-*`, `editorial-*`, `chart-*`, `surface-raised`, `foreground-secondary`, `subtle-foreground`) sont à ajouter à la source de tokens de la référence au moment du portage : les lister dans la PR de portage (voir `docs/portabilite.md`).

## Commandes

| Commande            | Rôle                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------ |
| `pnpm tokens:build` | régénère `generated.css`, `generated.ts`, `palette.generated.md` depuis `brand.json` |
| `pnpm tokens:check` | échoue si les fichiers générés sont obsolètes                                        |
| `pnpm lint:ds`      | échoue sur toute valeur visuelle brute hors design system                            |
| `pnpm check`        | lint + lint:ds + tokens:check + typecheck + tests                                    |
