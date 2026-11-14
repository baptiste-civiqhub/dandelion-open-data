"""Tire un échantillon stratifié et reproductible de dossiers promulgués (metrics.csv de La Fabrique de la Loi).
Usage: python -I select_sample.py <metrics.csv> <sortie_ids.tsv> [graine]
Périodes strictes : train = date initiale >= 2008 et promulgation <= 2015-12-31 ; valid = date initiale >= 2016-01-01 et
promulgation <= 2017-12-31 ; test = date initiale >= 2018-01-01. Exclut les textes de moins de 5 articles initiaux."""
import csv, random, sys
rows = list(csv.DictReader(open(sys.argv[1], encoding="utf-8")))
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 20261114
def did(r): return r["URL OpenData La Fabrique"].rstrip("/").rsplit("/", 1)[-1]
def num(x):
    try: return int(float(x))
    except Exception: return 0
pool = {"train": [], "valid": [], "test": []}
for r in rows:
    if num(r["Nombre d'articles initial"]) < 5: continue
    di, dp = r["Date initiale"][:10], r["Date de promulgation"][:10]
    if di >= "2008-01-01" and dp <= "2015-12-31": pool["train"].append(r)
    elif di >= "2016-01-01" and dp <= "2017-12-31": pool["valid"].append(r)
    elif di >= "2018-01-01": pool["test"].append(r)
quota = {"train": 25, "valid": 8, "test": 15}
rng = random.Random(seed)
with open(sys.argv[2], "w", encoding="utf-8") as out:
    for split, q in quota.items():
        cand = sorted(pool[split], key=did)
        pick = rng.sample(cand, min(q, len(cand)))
        print(split, "eligibles:", len(cand), "tires:", len(pick))
        for r in sorted(pick, key=did):
            n_art = r["Nombre d'articles initial"]
            out.write(f"{split}\t{did(r)}\t{r['Date initiale'][:10]}\t{n_art}\t{r['Titre court'][:50]}\n")
