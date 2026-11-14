# research/ml-feasibility

Étude de faisabilité de la prédiction « réécriture ou suppression d'un article à la prochaine étape parlementaire ». Indépendante de l'application : aucun fichier du frontend, de `supabase/` ni de la CI n'est modifié ou appelé. Le code est en Python, hors du périmètre de `pnpm check`.

Lire d'abord [RAPPORT.md](RAPPORT.md), puis [DATA_CARD.md](DATA_CARD.md). Les métriques sont dans [RESULTS.json](RESULTS.json), les alignements réels dans [examples/](examples/).

## Reproduire

Les données ne sont pas versionnées. Elles sont téléchargées en lecture seule depuis La Fabrique de la Loi (ODbL) dans un dossier hors du dépôt.

```bash
DATA=~/dandelion-ml-data            # hors du dépôt
cd research/ml-feasibility
uv venv --python 3.12 $DATA/venv && uv pip install --python $DATA/venv/bin/python -r requirements.txt
PY=$DATA/venv/bin/python

mkdir -p $DATA/lafabrique
curl -sL -o $DATA/lafabrique/metrics.csv https://www.lafabriquedelaloi.fr/api/stats/metrics.csv
$PY -I pipeline/select_sample.py $DATA/lafabrique/metrics.csv $DATA/lafabrique/sample_ids.tsv 20261114
pipeline/fetch_sample.sh $DATA/lafabrique/sample_ids.tsv $DATA/lafabrique/sample48 4   # environ 15 min à 12 s par requête
$PY -I pipeline/build_dataset.py $DATA/lafabrique/sample48 $DATA/lafabrique/sample_ids.tsv $DATA/observations.csv $DATA/coverage.json
OMP_NUM_THREADS=4 $PY -I pipeline/evaluate.py $DATA/observations.csv RESULTS.json --tabicl --tabicl-device cpu --tabicl-context 3000 --bootstrap 1000
$PY -I -m pytest -q tests
```

TabICL télécharge son checkpoint depuis Hugging Face (`jingang/TabICL`) au premier usage. Ne pas utiliser `--tabicl-device mps` sur un poste de 16 Go chargé : la première exécution de l'étude a épuisé la mémoire MPS.

## Fichiers

| Fichier | Rôle |
|---|---|
| `pipeline/select_sample.py` | tirage stratifié par période, graine fixe |
| `pipeline/fetch_sample.sh` | collecte en lecture seule, rejouable |
| `pipeline/build_dataset.py` | observations, labels, inconnus, variables à la coupure |
| `pipeline/evaluate.py` | références, modèles, ablation graphe, TabICL, réglage B, intervalles par dossiers |
| `pipeline/make_examples.py` | alignements avant et après avec les URL officielles |
| `tests/test_pipeline.py` | 13 tests : labels, renumérotation, données manquantes, fuites temporelles |
