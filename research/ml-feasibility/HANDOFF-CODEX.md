# HANDOFF-CODEX : faisabilité des prédictions Dandelion

14 novembre 2026. De Claude (étude ML) à Codex (intégration). Rien n'a été poussé, fusionné ni déployé.

## En une phrase

Le signal de réécriture existe sur 2008 à 2021 mais TabICL et les variables de graphe n'apportent pas de gain établi, aucune donnée ne couvre la législature actuelle, et une règle déterministe « amendements déposés » donne déjà une précision de 0,78 : **n'intégrer ce soir que des alertes `observed_change` sourcées, sans probabilité.**

## Où est le travail

- **Checkout :** `~/Projects/dandelion-ml-feasibility-20261114`, branche locale `claude/ml-feasibility-20261114`, partie de `develop` `3b9c3ab`. Commit local seulement, voir `git log -1`.
- **Emplacement prévu dans la mission :** `/private/tmp/dandelion-ml-feasibility-20261114`. Il a été perdu au crash du Mac (`/private/tmp` vidé au redémarrage), d'où le déplacement dans `~/Projects`.
- **Clone de Codex :** `/private/tmp/hemicycle-integration-20261114/repo`. Aucune commande n'y a été lancée. Il a probablement disparu lui aussi au redémarrage : à vérifier de ton côté.
- **Données téléchargées :** hors dépôt, dans `~/Projects/dandelion-ml-data-20261114`, sous licence ODbL et non versionnées.

## Fichiers ajoutés (tous sous `research/ml-feasibility/`)

| Fichier | Contenu |
|---|---|
| `RAPPORT.md` | recommandation d'une page, données vérifiées, protocole, résultats, limites, sources datées |
| `DATA_CARD.md` | unité, labels, inconnus, variables disponibles à la coupure, sources, licences, effectifs |
| `RESULTS.json` | métriques exécutées, IC 95 % par dossiers, tailles des splits, graine 20261114, versions, matériel, coût ; `gnn` et `simulation_openfisca` en `not_run` avec motif |
| `examples/pjl18-677_senat-seance_vers_an-commission.md` | 6 catégories d'alignement réel avec les deux URL officielles, passages avant et après, audit manuel d'une fausse renumérotation |
| `pipeline/*.py`, `pipeline/fetch_sample.sh`, `requirements.txt`, `README.md` | pipeline reproductible et commandes |
| `tests/test_pipeline.py` | 13 tests, tous verts : `python -I -m pytest -q tests` |
| `HANDOFF-CODEX.md` | ce fichier |

Aucun fichier hors de `research/ml-feasibility/` n'a été modifié : frontend, `supabase/`, CI, `package.json`, vidéo et `Memory.MD` sont intacts. La CI (`pnpm lint`, `typecheck`, `test`) n'est pas concernée, car aucun TypeScript n'a été ajouté.

## Commandes exécutées (principales)

```bash
git clone --branch develop https://github.com/baptiste-civiqhub/dandelion-open-data.git ~/Projects/dandelion-ml-feasibility-20261114
git switch -c claude/ml-feasibility-20261114
# collecte La Fabrique de la Loi, GET anonymes, 4 connexions : 48 dossiers, 85 fichiers d'amendements, 0 erreur
pipeline/select_sample.py ; pipeline/fetch_sample.sh ; pipeline/build_dataset.py
pipeline/evaluate.py --tabicl --tabicl-device cpu --tabicl-context 3000 --bootstrap 1000   # 112 s, pic 2,29 Go
pipeline/make_examples.py ; python -I -m pytest -q tests                                     # 13 passed
```

Aucun appel à l'API Hémicycle, aucune clé, aucun fichier `env` ouvert, aucun crédit consommé.

## Ce que l'interface peut afficher dès maintenant (contrat proposé)

Un seul type est alimentable aujourd'hui : `observed_change`. Les types `forecast` et `simulation` sont réservés et ne doivent rien afficher tant qu'aucun modèle validé ne les produit.

```json
{
  "kind": "observed_change",
  "subject": { "texte_uid": "PRJLANR5L17B3434", "article_uid": "PRJLANR5L17B3434:Article 5" },
  "as_of": "2026-11-14T16:00:00+01:00",
  "observation": {
    "rule": "amendements_deposes_avant_examen",
    "amendements_deposes": 12,
    "dont_gouvernement": 2,
    "etape_examen": "séance publique, Assemblée nationale",
    "date_debut_examen": "2026-12-03"
  },
  "source_urls": ["https://www.assemblee-nationale.fr/dyn/17/amendements/..."],
  "coverage": "amendements chargés pour ce texte et cette étape ; sort non utilisé",
  "method_version": "regle-v0-2026-11-14",
  "limitations": [
    "commission et séance mêlées dans l'import plffg-2026",
    "une modification textuelle n'est pas une modification de fond"
  ]
}
```

Les valeurs ci-dessus sont des **exemples de forme, pas des données réelles**.

Champs communs prévus pour `forecast` (non alimentés) : `as_of`, `horizon` (« prochaine version officielle »), `probability` (absente tant qu'aucun modèle n'est validé sur la législature en cours), `source_urls`, `coverage`, `method_version`, `limitations`.

Règles déterministes justifiées par l'étude, sans probabilité :
1. Article visé par au moins un amendement déposé avant l'examen : précision historique 0,78, rappel 0,75, sur 3 417 observations de 2018 à 2021.
2. Article adopté conforme par les deux chambres : ne change plus, sauf coordination. C'est une inférence sur les cas `non_apparie`, à vérifier.
3. Une suppression peut être rétablie plus tard : ne jamais afficher « supprimé définitivement » avant la promulgation.

Les données de `develop` permettent la règle 1 : la table `amendements` a `date_depot`, `type_auteur` et `article_id`. La séparation commission et séance reste à faire (limite documentée dans `docs/dandelion/import.md`).

## Limites à ne pas perdre

- Résultats exploratoires, 15 dossiers de test de 2018 à 2021. Aucune mesure sur la 17e législature.
- Labels textuels : un quart des « modifié » sont des retouches de forme (exemple réel dans `examples/`).
- TabICL tourné sur CPU avec un contexte de 3 000 lignes : la mémoire MPS a saturé une première fois sur ce poste de 16 Go.
- Aucun usage utilisateur mesuré.

## Prochaines étapes, si l'équipe poursuit

1. Couvrir 2022 à 2026 : relancer `the-law-factory-parser` (GPL-3.0, licence à examiner avant réemploi) ou partir des textes Akoma Ntoso du Sénat.
2. Faire auditer 200 labels par deux personnes (renumérotation, fusion, fond), en conservant les désaccords.
3. Réévaluer avec ce pipeline, test intact, contre la règle « amendements déposés ».
