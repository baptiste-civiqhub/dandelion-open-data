# Pissenlit — planification puis orchestration

Instruction de départ pour un agent multitâche. Il planifie d’abord, il délègue ensuite, il vérifie, il pousse la branche. Il ne redemande pas les décisions déjà figées ci-dessous.

Premier jet seulement : une fleur radiale pour **un** texte de loi réel, de taille modérée, testée en local. Pas le curseur de dates.

## Décisions figées

| Sujet       | Décision                                                                                                                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Données     | Un snapshot Hémicycle, enregistré dans le repo. Ensuite la page et les tests tournent sans réseau.                                                                                                                                                                                                                 |
| Texte       | Les agents choisissent un texte réel d’environ 150 à 400 amendements. Ils notent lequel. Au-delà de 500, ils en prennent un autre.                                                                                                                                                                                 |
| Jet         | Fleur au repos, fisheye qui ouvre un pétale, graine « reste », fiche d’un amendement, tests de la coupe, vérification dans le navigateur.                                                                                                                                                                          |
| Temps       | Pas de curseur `date_depot` dans ce jet.                                                                                                                                                                                                                                                                           |
| Git         | Branche `feat/pissenlit-texte` depuis `main`, commit, `git push -u origin HEAD`. Pas de pull request, pas de force-push, pas de push sur `main`. Seul l’orchestrateur commit, une fois le jet vert.                                                                                                                |
| Dépendances | Aucune dépendance nouvelle. Courbes SVG écrites en TypeScript. Échappatoire unique, sans redemander : `d3-hierarchy@3.1.3` seulement, si le layout radial est faux après une tentative en TypeScript pur. `pnpm add --save-exact`. sigma, graphology, ForceAtlas2, d3-zoom et tout autre paquet restent interdits. |
| Remote      | `origin` = `https://github.com/baptiste-civiqhub/dandelion-open-data`.                                                                                                                                                                                                                                             |

## Permissions

Nécessaire, et borné :

- MCP Hémicycle en **lecture seule** : `lister_jeux`, `rechercher`, `interroger`. Plafond **15 crédits**. Un seul texte, ses amendements, rien d’autre. `lister_jeux` est gratuit : l’appeler une fois pour connaître les filtres de `amendements` avant toute page payante.
- Écrire la fixture JSON. Données publiques déjà renvoyées par l’API. Citer dans le JSON la source et la licence renvoyées avec la réponse.
- `pnpm check` autant de fois que nécessaire.
- `pnpm dev` **hors bac à sable** (`all`), pour que Next lise `.env.local` tout seul. Ne jamais ouvrir, afficher, logger ni committer `.env`, `.env.local`, `.env.*.local`, ni une variable d’environnement.
- Navigateur intégré sur `http://localhost:3000` uniquement : charger la page, survoler un pétale, ouvrir une feuille, lire la fiche.
- Créer et modifier les fichiers listés dans le plan. Ajouter une clé à `types/queryKeyEnum.ts` et un lien sur l’écran d’accueil.

Interdit :

- Lire un fichier `.env*`.
- Modifier `middleware.ts`, `app/[locale]/layout.tsx`, `configs/env.ts`.
- Migration Supabase, RLS, `execute_sql`, client admin, clé secrète.
- Déploiement Vercel, changement de variables d’environnement.
- Dépenser plus de 15 crédits, paginer toute la législature, appeler un outil Hémicycle d’écriture ou de prédiction.
- `git push --force`, pousser `main`, ouvrir une PR, changer la config git, `--no-verify`.

S’arrêter et le dire, sans contourner :

- le serveur de dev ne démarre pas ;
- les crédits ne suffisent pas ;
- aucun texte entre 150 et 400 amendements n’est trouvable dans le plafond de crédits ;
- `pnpm check` est déjà rouge avant la première modification.

## Instruction de planification

Tu es le planificateur. Tu ne dessines pas la fleur et tu n’appelles pas Hémicycle. Tu produis deux artefacts, puis tu t’arrêtes :

1. `docs/pissenlit-plan.md` — le plan d’exécution, daté, qui reprend les décisions figées et les précise.
2. `apis/texte/types.ts` — le contrat TypeScript. Pas de logique.

Le plan contient, dans cet ordre :

1. **Fichiers et propriétaire.** Reprendre le tableau d’orchestration. Un fichier n’a qu’un propriétaire.
2. **Contrat de données.** Les types ci-dessous, copiés tels quels dans `apis/texte/types.ts`.
3. **Contrat des fonctions pures.** Signatures, constantes, règles de la coupe et du layout. Les sous-agents n’en changent pas le sens.
4. **Cas de test.** La liste de la section Tests, un `it` par cas.
5. **Définition de fini.** La section Vérification, cochée plus tard par l’orchestrateur.
6. **Emplacement du texte choisi.** Laissé vide : l’agent données le remplira (identifiant, titre, nombre d’amendements, source, licence, crédits dépensés).

### Contrat de types

```ts
export type Intention = 'supprimer' | 'reecrire' | 'ajouter' | 'modifier' | 'autre'

export type Amendment = {
  id: string
  numero: string
  article: string
  dispositif: string
  expose: string | null
  parentId: string | null
  discussionCommune: string | null
  discussionIdentique: string | null
  authorLabel: string | null
  groupLabel: string | null
  sort: string | null
}

export type TexteSnapshot = {
  id: string
  titre: string
  sourceNom: string
  sourceUrl: string
  licence: string
  amendments: Amendment[]
}

export type NodeKind = 'texte' | 'article' | 'intention' | 'discussion' | 'doublon' | 'amendement' | 'reste'

export type DandelionNode = {
  id: string
  kind: NodeKind
  label: string
  weight: number
  children: DandelionNode[]
  amendmentId?: string
}

export type LayoutNode = {
  id: string
  kind: NodeKind
  label: string
  weight: number
  depth: number
  angle0: number
  angle1: number
  radius: number
  x: number
  y: number
  parentId: string | null
  amendmentId?: string
}
```

`article` vient de la division de l’amendement (`article_designation_courte`, sinon `division_titre`, sinon `"texte entier"`). `authorLabel` vient de `signataires_affichable`. Ne pas appeler une fiche acteur par amendement.

Niveaux de l’arbre, du centre vers l’extérieur. Un niveau sauté si le champ est vide pour tous les enfants du parent :

1. `texte`
2. `article`
3. `intention` — formule en tête du `dispositif` (premiers ~400 caractères) : supprimer ; « rédiger ainsi » → réécrire ; compléter / insérer / après l’alinéa → ajouter ; substituer / remplacer → modifier ; sinon `autre`
4. `discussion` — `discussionCommune`
5. `doublon` — `discussionIdentique`
6. `amendement` — feuille
7. les sous-amendements (`parentId`) sont enfants de leur amendement, pas de l’article. Un parent absent du snapshot se rattache à l’article.

### Contrat des fonctions

Constantes dans `features/texte/lib/constants.ts` :

- `MAX_VISIBLE = 150`
- `FOCUS_SHARE = 0.4`
- `EXPAND_ARC_PX = 36`
- `LABEL_ARC_PX = 48`
- `OUTER_RADIUS_PX = 320` pour les tests ; l’écran passe le rayon réel

Fonctions, sans import de React, Next, next-intl, Supabase ni `services/` :

- `classifyIntention(dispositif: string): Intention`
- `buildTree(snapshot: TexteSnapshot): DandelionNode`
- `cutTree(tree, args: { focusId: string | null; budget: number; outerRadiusPx: number }): DandelionNode`
- `layoutRadial(visible, args: { focusId: string | null; focusShare: number; outerRadiusPx: number }): LayoutNode[]`

Règles de `cutTree` :

- Une feuille ne se fend pas.
- Sans focus, la coupe s’arrête au niveau `intention`. Les amendements ne sont pas des points.
- L’arc en pixels vaut `(angle1 - angle0) * outerRadiusPx`. En dessous de `EXPAND_ARC_PX`, le nœud reste une graine (enfants retirés de l’arbre visible, `weight` conservé).
- Le focus et ses ancêtres s’ouvrent en priorité.
- Les enfants sont pris du plus lourd au plus léger tant que le budget le permet. Le surplus devient **un** nœud `reste`.
- Le nombre de nœuds visibles ne dépasse jamais `budget`.

Règles de `layoutRadial` :

- Angles en radians, somme `2π`, ordre des articles stable.
- L’angle d’un article est proportionnel à son `weight`, avec un plancher pour rester visable.
- Si `focusId` est dans un article, cet article occupe `focusShare` du cercle et les autres se partagent le reste, sans changer d’ordre.
- Les enfants se répartissent **dans** l’angle du parent.
- Le rayon extérieur est fixe. La profondeur visible s’y répartit. Le centre est à l’origine.
- `x` et `y` sont le point milieu de l’arc, au rayon du nœud.

Tige SVG, dans le composant : quadratique du parent vers l’enfant. Pas de librairie.

### Fichiers

| Fichier                                                                                                                                                                    | Propriétaire  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `docs/pissenlit-plan.md`, `apis/texte/types.ts`                                                                                                                            | Planificateur |
| `features/texte/fixtures/texte-amendements.json`, `apis/texte/request.ts`, `queries.ts`, `index.ts`, clé dans `types/queryKeyEnum.ts`, paragraphe « texte choisi » du plan | Données       |
| `features/texte/lib/**`                                                                                                                                                    | Algorithmes   |
| `features/texte/components/**`, `app/[locale]/texte/page.tsx`, `constant/path.ts`, `i18n/messages/fr.json`, `i18n/messages/en.json`, lien sur l’écran d’accueil            | Interface     |

`request.ts` importe la fixture et renvoie un `TexteSnapshot`. Pas d’appel Supabase, pas de `fetch`. `useQuery` avec `QueryKeysEnum.GET_TEXTE_AMENDEMENTS` et un `staleTime` long. La page est fine : `PUBLIC_PATHS.TEXTE = '/texte'`, metadata traduites, écran dans `features/texte/components/`. Namespace i18n `texte`, clés en français et en anglais. Aucune chaîne visible en dur. Couleurs par les tokens sémantiques et `--chart-1` … `--chart-5` lus depuis le DOM pour les cinq intentions. Pas de couleur en dur dans le JSX.

La fiche d’une feuille affiche le numéro, l’auteur, le groupe, l’intention, un extrait du dispositif, le sort. Les libellés de chrome passent par i18n. Au survol, la lignée jusqu’au centre reste opaque et le reste s’atténue. L’ouverture du pétale s’anime avec `motion`, déjà installé.

## Instruction d’orchestration

Tu es l’orchestrateur. Tu suis l’instruction de planification et tu écris le plan et `apis/texte/types.ts`. Ensuite seulement tu délègues. Tu ne réécris pas le code des sous-agents, sauf pour raccorder un import cassé à l’intégration.

Les sous-agents ne committent pas, ne poussent pas, n’appellent pas Hémicycle hors de l’agent données, et ne sortent pas de leur liste de fichiers. S’ils doivent changer `apis/texte/types.ts`, ils s’arrêtent et te le disent.

### Vague 1 — en parallèle, après le plan

**Données.** Choisir le texte et écrire la fixture.

- `lister_jeux` une fois. Repérer les colonnes et filtres de `amendements`.
- Trouver un texte hors budget (un PLF dépasse le plafond) dont le nombre d’amendements tombe entre 150 et 400. Compter en paginant **ce texte seul**, 200 lignes par page. Si une troisième page revient pleine, le texte dépasse 500 : l’abandonner sans le stocker.
- Mapper vers `Amendment`. Inclure dans le JSON `id`, `titre`, `sourceNom`, `sourceUrl`, `licence`.
- Tenir le compte des crédits. S’arrêter à 15.
- Remplir la section « texte choisi » du plan.
- `pnpm test apis/texte` n’est pas requis. Un test de mapping n’est utile que s’il y a une fonction pure de mapping hors du JSON ; dans ce cas il vit à côté, sans réseau.

**Algorithmes.** Implémenter les quatre fonctions, les constantes et les tests co-localisés `*.test.ts`. Importer `describe`, `it`, `expect` depuis `vitest`. Builders minimaux. Aucun import de la fixture complète dans les tests : des jeux de cinq à vingt amendements suffisent. Couvrir au moins :

- dispositif vide ou formule inconnue → `autre` ; « Supprimer cet article » → `supprimer` ; « Rédiger ainsi » → `reecrire` ; « Compléter » / « Après l’alinéa » → `ajouter` ; « Substituer » → `modifier` ;
- snapshot sans amendement → un nœud texte de poids 0 ;
- `discussionCommune` et `discussionIdentique` nuls → ces niveaux n’apparaissent pas ;
- parent inconnu → l’amendement est sous son article ;
- sous-amendement → enfant de son parent, pas de l’article ;
- sans focus, aucune feuille `amendement` dans la coupe, et le nombre de nœuds ≤ `MAX_VISIBLE` ;
- avec un article de plus de `MAX_VISIBLE` enfants, une graine `reste` existe et le budget tient ;
- une feuille ne gagne pas d’enfants dans la coupe ;
- l’ordre circulaire des articles est le même avec et sans focus ; l’article focal occupe davantage d’angle ; les enfants restent dans l’angle du parent.

`pnpm test features/texte` doit être vert avant de rendre la main.

### Vague 2 — interface, après la vague 1

Brancher l’écran sur `useQuery` et sur `cutTree` + `layoutRadial`. Au repos, pas de focus : articles et intentions seulement. Le pointeur sur un pétale passe son id en focus. Un clic épingle. Un clic sur une feuille ouvre la fiche. Un second clic sur le fond délie. Rayon extérieur = environ 40 % du plus petit côté du cadre, transmis aux fonctions pures.

Ajouter le lien d’accueil vers `PUBLIC_PATHS.TEXTE`.

### Vague 3 — vérification, toi seul

1. `pnpm check` vert. S’il est rouge, corriger ou renvoyer au propriétaire du fichier. Ne pas supprimer ni `skip` un test.
2. Regarder si un `pnpm dev` tourne déjà. Sinon le lancer hors bac à sable, sans afficher l’environnement. Ouvrir `http://localhost:3000/texte`.
3. Dans le navigateur : la fleur montre des pétales, pas une nuée de points ; survoler un pétale l’ouvre ; cliquer une feuille affiche numéro et extrait ; la console n’a pas d’erreur de rendu. Si ça échoue, corriger et refaire ce parcours.
4. `pnpm format` sur les fichiers touchés si le style s’écarte (sans `;`, quotes simples, largeur 120).
5. Branche `feat/pissenlit-texte` depuis `main` à jour. Si la branche existe déjà sur le remote, s’arrêter. Commit unique, message conventional :

```
feat(texte): afficher un texte et ses amendements en fleur radiale

```

6. `git push -u origin HEAD`. Donner l’URL de la branche. Pas de pull request.
