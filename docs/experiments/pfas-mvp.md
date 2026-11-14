# Expérimentation PFAS : explorer et comparer des amendements sourcés

Route locale : `/experiments/pfas` (prototype de branche, isolé ; la page d'accueil n'est pas modifiée).

## Problème utilisateur

Un·e journaliste ou une association environnementale prépare une note sourcée sur un article d'une proposition de loi : retrouver les amendements pertinents, comparer leurs dispositifs et vérifier le sort de chacun, puis citer les sources officielles.

## Corpus : instantané public daté du Sénat

| Élément            | Valeur                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Texte              | Proposition de loi n° 620 (2023-2024) visant à protéger la population des risques liés aux PFAS              |
| Jeu de données     | <https://www.senat.fr/amendements/2023-2024/620/jeu_complet_2023-2024_620.csv>                               |
| Pages de référence | <https://www.senat.fr/amendements/2023-2024/620/accueil.html> · <https://www.senat.fr/leg/ppl23-620.html>    |
| Licence            | <https://data.senat.fr/licence/>                                                                             |
| Récupéré le        | 2026-11-13T21:43:06.239210+00:00 (UTC)                                                                       |
| Taille / SHA-256   | 62 948 octets · `08ed07be1de3dd53b1888484e5b209ba2a39ff43f0ade88f23a9c25128e49337`                           |
| Format observé     | cp1252, séparateur tabulation malgré l'extension `.csv`, ligne `sep=` initiale, en-têtes avec espaces finaux |

Ce n'est **ni le droit en vigueur ni un import Hemicycle en direct** : l'interface l'affiche en tête de page.

Fichiers dans `data/pfas/` :

- `jeu_complet_2023-2024_620.csv` : export original, octet pour octet (`.gitattributes` le marque `binary` pour préserver le hash) ;
- `amendments.json` : instantané normalisé servi par `app/api/pfas/route.ts` (route statique, aucune requête réseau ni base) ;
- `manifest.json` : provenance, comptages, version du parseur ;
- `curated-relations.json` : relations parent/enfant absentes des colonnes de l'export, saisies à la main avec leur preuve.

## Méthode d'import

`scripts/import-pfas.py` (Python, bibliothèque standard uniquement, déterministe, jamais lancé au runtime ni par les tests) :

1. décode le cp1252, retire la ligne `sep=`, lit le TSV avec `csv.reader` et vérifie la liste exacte des colonnes (en-têtes nettoyés) ;
2. convertit les fragments HTML en texte (`html.parser`, entités décodées, blocs → paragraphes, aucun HTML conservé) ;
3. conserve les sorts bruts (`Retiré` ≠ `Rejeté`, sort vide = `null`, jamais un vote déduit) ;
4. distingue `art. add. après Article X` (article nouveau, `targetPlacement.kind = additional-article`) d'une modification de l'article X ;
5. normalise les URL relatives au protocole en HTTPS et rejette tout hôte hors `senat.fr` ;
6. applique les relations de `curated-relations.json` après vérification (32 est un `S/Amt` dont le dispositif commence par « Amendement n° 14 ») ; aucune relation par proximité.

```bash
python3 scripts/import-pfas.py --input data/pfas/jeu_complet_2023-2024_620.csv --retrieved-at 2026-11-13T21:43:06.239210+00:00
python3 scripts/import-pfas.py --check   # échoue si amendments.json / manifest.json ne correspondent plus au CSV
```

Comptages observés : 32 lignes ; 17 sous « Article 1er » dont 1 sous-amendement (32) ; 18 rejetés, 7 adoptés, 6 retirés, 1 irrecevable (art. 40 C). L'amendement 19 (irrecevable) n'a pas d'URL dans l'export.

Vérification indépendante le 14 novembre 2026 : la page officielle `Amdt_32.html` confirme le parent 14 dans son titre et dans le marqueur `numero_amdt_pere=14`. Copie publique archivée dans `data/pfas/evidence/amendment-32.html` ; date et SHA-256 dans `curated-relations.json`. La VM initiale ne pouvait pas atteindre le Sénat ; cette limite a été levée lors de la revue locale.

## Architecture (portable)

- `apis/pfas-amendments/` : types de domaine (`PfasAmendment`, `PfasProvenance`…), `getPfasSnapshot()` via `request()`, `useGetPfasSnapshot()` (TanStack Query, `QueryKeysEnum.GET_PFAS_AMENDMENTS`). Pour lire Supabase plus tard, seul `request.ts` change.
- `features/pfas-amendments/lib/` (pur, testé) : `outcome`, `ordering` (articles 1er < 1er bis < 1er ter < 2, ajouts avant/après, numéros stables), `hierarchy` (texte → emplacement → amendement → sous-amendement sourcé, parents manquants et cycles gérés), `lexical-diff` (LCS sur jetons, ponctuation/négations/montants/dates conservés, option typographique), `source-url`, `markdown-note` (échappement du texte source).
- `features/pfas-amendments/components/` : écran, arbre accessible (listes, boutons `aria-expanded`/`aria-pressed`, cases à cocher étiquetées), détail, comparaison, bandeau de provenance. Primitives existantes `Card`, `Badge`, `Button`, `Skeleton` ; aucun nouveau composant partagé.
- Portage : tokens propres à la marque utilisés à ajouter à la référence : `editorial-yellow`, `feedback-info-soft`, `feedback-danger-soft`, `foreground-secondary` (variantes `success`/`warning`/`info` de `Badge`).

## Lancer et vérifier

```bash
pnpm install --frozen-lockfile
pnpm dev                                   # http://localhost:3000/experiments/pfas
pnpm check && pnpm build
pnpm exec playwright install chromium      # une fois
pnpm test:smoke                            # smoke + test/e2e/pfas.spec.mjs
```

Pour une vérification sur build local, lancer `pnpm exec next start --hostname localhost --port 3100`, puis `PLAYWRIGHT_BASE_URL=http://localhost:3100 PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_CHANNEL=chrome pnpm test:smoke` si Chrome est installé. Garder le même nom d'hôte `localhost` pour le serveur et les tests : un lancement explicite avec `--hostname 127.0.0.1` a provoqué une boucle de réécriture locale avec next-intl ; aucun changement de middleware n'a été nécessaire.

La revue a aussi corrigé deux cas : comparaison trop longue signalée comme indisponible dans l'export ; aperçu de note masqué après changement de paire ou d'option typographique. Les tests de régression reproduisaient les défauts avant correction.

## Script de démonstration

1. Ouvrir `/experiments/pfas` : bandeau « Dated public Senate snapshot », Article 1er déplié (17 amendements).
2. Cliquer « No. 32 » : détail, sort `Rejeté`, encadré « Sub-amendment of amendment no. 14 » avec preuve et méthode ; « View amendment no. 14 ».
3. Cocher 26 et 27 : textes complets côte à côte, tous deux `Retiré` ; seul « utilisant des fluoropolymères » est propre au 27. Comparer 26 et 28 : portées différentes (« textiles de construction » vs « fluoropolymères »).
4. Cocher 3 et 13 puis « Ignore typographic variants » : les écarts restants disparaissent (apostrophes, points de suspension).
5. « Export Markdown note » : fichier `.md` téléchargé localement avec numéros, sorts, liens, horodatage, hash, textes et limites.

## Limites

- Comparaison lexicale uniquement : aucun effet juridique ou environnemental simulé, aucune équivalence de portée affirmée, aucun score de similarité, aucune prédiction.
- Une seule étape (Sénat, 2023-2024) ; pas de navette, pas de texte consolidé.
- Une seule relation parent/enfant, curée à la main.
- Mode sombre non traité (non activé dans le design system).

## Fiche de benchmark (protocole, non mesuré)

Base de comparaison : liste filtrable des amendements (page Sénat ou tableur du CSV).

| Tâche                          | Outil               | Participant | Temps (s) | Réussite (o/n) | Erreurs | Commentaire |
| ------------------------------ | ------------------- | ----------- | --------- | -------------- | ------- | ----------- |
| Trouver le parent de 32 (→ 14) | Liste filtrable     |             |           |                |         |             |
| Trouver le parent de 32 (→ 14) | `/experiments/pfas` |             |           |                |         |             |
| Comparer la portée de 26 et 27 | Liste filtrable     |             |           |                |         |             |
| Comparer la portée de 26 et 27 | `/experiments/pfas` |             |           |                |         |             |
| Retrouver un sort et sa source | Liste filtrable     |             |           |                |         |             |
| Retrouver un sort et sa source | `/experiments/pfas` |             |           |                |         |             |

## Préparation de la présentation

- [Scénario vidéo et captures](pfas-video.md).
- [Protocole de mesure et revue distante](pfas-evaluation.md).
