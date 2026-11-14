# Fleur intégrée au Stage (intégration équipe)

## Parcours

- Accueil `/` : le monde WebGL reste un **espace réservé** (signalé à l'écran) ; un widget liste les deux jeux branchés.
- Catalogue `/datasets` (filtré par `?q=`) et fleur `/datasets/<id>` :
  - `pfas-senat-620` : 32 amendements, export public daté du Sénat (`data/pfas/`), comparaison et parcours de preuves PFAS réutilisés (`AmendmentComparison`, `EvidenceJourney`, `PfasAssistant`) ;
  - `police-municipale-an-2464` : 392 amendements, instantané Hémicycle de l'équipe (`features/texte/fixtures/`). Aucun lien individuel ni texte manquant n'est inventé : les manques sont comptés et affichés.
- Les anciennes routes `/experiments/pfas`, `/experiments/pfas/cosmograph` et `/texte` sont inchangées.

## Contrôles

- Zoom avant / arrière (×1,5, borné 0,5–4), « Ajuster », fil d'Ariane avec « Vue globale ».
- Clavier : Tab sur les secteurs, Entrée/Espace pour ouvrir, `+`/`−`, `0`, Échap pour remonter.
- Recherche par numéro : révèle tout amendement réel, même replié dans un agrégat « Reste » (`cutTree` force le focus et ses ancêtres, budget 150 éléments).
- Les secteurs « Supprimer / Réécrire / Ajouter / Modifier » sont un **classement lexical de l'opération** (premiers mots du dispositif), pas une intention politique.

## Actions partagées

`features/dataviz-assistant/lib/plan.ts` : `focus`, `compare`, `show-evidence`, `open-location`, plus `zoom` (`in|out|fit`) et `reset-view`. Le plan entier est validé (schéma strict, identifiants enregistrés, capacités de l'hôte) avant toute action ; aucune exécution de JS, sélecteur, SQL ou URL.

## Parcours guidé

`features/texte/lib/tour.ts` : réducteur pur `idle → playing ⇄ paused → done`. Démarrage uniquement sur demande ; toute manipulation (clic, clavier, zoom, recherche, guide) met en pause ; arrêt et démontage annulent le minuteur. En mouvement réduit, aucun avancement automatique (« Étape suivante »). PFAS : vue d'ensemble → Article 1er → 26/27 → comparaison → sources → vue globale (la comparaison reste affichée).

## Fournisseur optionnel (Featherless)

`POST /api/dataviz/plan` (`app/api/dataviz/plan/`), serveur uniquement. Corps strict `{ question ≤ 600, datasetId }` (tout autre champ, dont un prompt système, est refusé). Le serveur charge les vrais enregistrements, construit une liste blanche bornée (≤ 40 nœuds structurels + ≤ 24 candidats par numéro exact / lexique, extraits de 140 caractères, prompt ≤ 16 000 caractères), appelle `chat/completions` (`temperature 0`, `max_tokens 400`, délai 20 s) puis valide la réponse avec `parseModelResponse`. Les faits affichés viennent des enregistrements. Sans `FEATHERLESS_API_KEY` : `{ mode: 'unconfigured' }`. Variables : `configs/env.ts` + `.env.example` (sans valeur). Les tests unitaires utilisent un fournisseur simulé. Trois appels réels locaux ont ensuite été vérifiés le 14 novembre avec `FEATHERLESS_MODEL=zai-org/GLM-5.3-Flash` : comparaison 26/27 (5,179 s), focus 32 (16,567 s), abstention sur un nombre de cancers évités (2,407 s). Les faits et URL retournés correspondent aux enregistrements. Ce contrôle ponctuel ne mesure pas la fiabilité statistique du modèle. Le modèle par défaut historique `GLM-5.2` était absent du catalogue au contrôle : renseigner explicitement un modèle disponible. La clé reste locale, ignorée par Git ; elle n’a pas été déployée sur Vercel.

## Mesures

- Pur : `node --import ./scripts/benchmark/register.mjs scripts/benchmark/flower-benchmark.ts [out.json]` (`BENCH_SIZES=1000,10000,100000` par défaut ; jeux synthétiques générés en mémoire, aucun gros fichier versionné).
- Navigateur : `BENCH_BASE_URL=http://127.0.0.1:3200 node scripts/benchmark/browser-benchmark.mjs out.json` sur un serveur de production (jeux réels 32 et 392).
- Seuls ≤ 150 éléments sont affichés à la fois, quelle que soit la taille du jeu.

## Validation locale du 14 novembre

- 216 tests unitaires, 38 tests navigateur ; lint, tokens, design system, typage, format et build réussis.
- Comparaison : panneau élargi en 3·3·6, graphe maintenu ; test sur largeur utile et position sous le header.
- Correction locale après livraison Devin : construction des poids d’amendements en post-ordre itératif, évitant une erreur de pile observée sur une chaîne de 3 000 sous-amendements. Cela ne certifie pas toutes les fonctions de rendu à une profondeur arbitraire.
- Benchmark navigateur local Chrome sur Mac Apple Silicon, serveur de production, une page par taille : données **synthétiques**, 48 articles, textes courts. Injection locale d’une réponse `/api/pfas`, aucune donnée publique modifiée.

| Lignes synthétiques | Chargement | Recherche + focus | Nœuds interactifs après focus | Plus longue tâche JS |
| ------------------- | ---------: | ----------------: | ----------------------------: | -------------------: |
| 1 000               |     216 ms |             67 ms |                            70 |       aucune > 50 ms |
| 10 000              |     367 ms |             69 ms |                           149 |                54 ms |
| 100 000             |   1 820 ms |            126 ms |                           149 |               600 ms |

Ces durées incluent l’automatisation Playwright ; elles ne sont ni des mesures utilisateur, ni un test serveur sous charge. À 100 000 lignes, la réponse JSON synthétique fait 62,6 Mo : la pause de chargement reste un point à améliorer (chargement progressif / calcul en worker). L’affichage limité à 150 nœuds ne signifie pas que 100 000 objets SVG sont rendus. Les corpus réels intégrés restent 32 et 392 amendements.
