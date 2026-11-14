"""Construit les observations de la cible « réécriture ou suppression à la prochaine étape parlementaire ».

Unité d'observation : (dossier, article, étape k, date de coupure). Label : statut de l'article dans la
prochaine version officielle observée du texte (étape k+1 du dossier qui porte des articles).

Source : La Fabrique de la Loi (Regards Citoyens, licence ODbL), fichiers viz/procedure.json,
viz/articles_etapes.json et viz/amendements_<étape>.json. Lecture seule, aucune donnée distante modifiée.

Usage :
    python -I build_dataset.py <dossier_donnees> <sample_ids.tsv> <sortie_observations.csv> <sortie_couverture.json>
"""

from __future__ import annotations

import csv
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

LABELS = ("inchange", "modifie", "supprime")
# Cas inconnus ou censurés : jamais des négatifs, exclus de l'entraînement et de l'évaluation.
UNKNOWN = ("non_apparie", "derniere_etape")
# Le contrôle du Conseil constitutionnel n'est pas une étape parlementaire : hors de la cible, compté à part.
OUT_OF_SCOPE_INSTITUTIONS = {"conseil constitutionnel"}

STAGE_CODES = {
    "1ère lecture": "L1",
    "2ème lecture": "L2",
    "3ème lecture": "L3",
    "nouv. lect.": "NL",
    "l. définitive": "LD",
    "CMP": "CMP",
}

BASE_CATEGORICAL = [
    "etape_k",
    "institution_k",
    "lecture_k",
    "etape_suivante",
    "institution_suivante",
    "lecture_suivante",
    "statut_k",
    "type_texte",
]
BASE_NUMERIC = [
    "modifie_a_k",
    "ndiff_k",
    "log_longueur_k",
    "nb_etapes_article",
    "position_relative",
    "log_nb_articles_k",
    "procedure_acceleree",
]
# Variables de graphe simples, calculées à la date de coupure : historique de réécriture de l'article
# et activité du dossier à l'étape k.
GRAPH_NUMERIC = [
    "nb_modifs_passees",
    "nb_suppressions_passees",
    "article_insere",
    "part_modifies_k",
    "part_crees_k",
]
# Réglage B (coupure : veille de l'examen de l'étape suivante). Disponible là où le fichier d'amendements de
# l'étape suivante a été collecté, ou quand procedure.json annonce 0 amendement.
AMDT_NUMERIC = ["nb_amdt_deposes", "nb_amdt_gouvernement", "nb_groupes_amdt"]


def load_json(path: Path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def ordered_text_steps(procedure: dict, articles: dict) -> list[dict]:
    """Étapes du dossier qui portent une version d'au moins un article, dans l'ordre de procedure.json."""
    used = {s["directory"] for a in articles.values() for s in a.get("steps", [])}
    out, seen = [], set()
    for idx, st in enumerate(procedure.get("steps", [])):
        d = st.get("directory")
        if d in used and d not in seen:
            seen.add(d)
            out.append(
                {
                    "directory": d,
                    "index": idx,
                    "date": st.get("date") or st.get("enddate") or "",
                    "enddate": st.get("enddate") or st.get("date") or "",
                    "lecture": STAGE_CODES.get(st.get("stage") or "", st.get("stage") or ""),
                    "institution": st.get("institution") or "",
                    "etape": st.get("step") or "",
                    "nb_amendements": st.get("nb_amendements"),
                    "source_url": st.get("source_url") or "",
                }
            )
    return out


def label_of(next_rec: dict | None) -> str:
    """Label d'un article existant à l'étape k, d'après son enregistrement à l'étape k+1."""
    if next_rec is None:
        return "non_apparie"
    status = next_rec.get("status")
    if status == "sup":
        return "supprime"
    if status == "none":
        return "inchange" if (next_rec.get("n_diff") or 0) == 0 else "modifie"
    return f"autre_{status}"


def article_key_from_subject(subject: str) -> str | None:
    """« Article 11 bis A » -> « 11_bis_A » ; « Article 1er » ou « Article premier » -> « 1er ».
    Les sujets « Après l'article … », « Avant l'article … », titres et intitulés ne visent pas l'article lui-même."""
    m = re.match(r"^Article\s+(.+)$", subject.strip(), flags=re.IGNORECASE)
    if not m:
        return None
    rest = re.sub(r"^(premier|1er|1)(?=\s|$)", "1er", m.group(1).strip(), flags=re.IGNORECASE)
    return re.sub(r"\s+", "_", rest)


def amendment_features(amdt_doc: dict | None, article_id: str, cutoff_date: str, declared_count) -> dict:
    """Amendements déposés sur l'article avant le début de l'examen de l'étape suivante.
    Le sort de l'amendement n'est jamais lu : c'est une information postérieure à la coupure."""
    if amdt_doc is None:
        if declared_count == 0:
            return {"nb_amdt_deposes": 0, "nb_amdt_gouvernement": 0, "nb_groupes_amdt": 0, "amdt_disponible": 1, "amdt_tardifs_exclus": 0}
        return {"nb_amdt_deposes": math.nan, "nb_amdt_gouvernement": math.nan, "nb_groupes_amdt": math.nan, "amdt_disponible": 0, "amdt_tardifs_exclus": 0}
    n = gov = late = 0
    groups = set()
    for subject, block in (amdt_doc.get("sujets") or {}).items():
        if article_key_from_subject(subject) != article_id:
            continue
        for a in block.get("amendements", []):
            date = (a.get("date") or "")[:10]
            if not date or (cutoff_date and date >= cutoff_date):
                late += 1
                continue
            n += 1
            g = a.get("groupe") or ""
            groups.add(g)
            if g == "Gouvernement":
                gov += 1
    return {"nb_amdt_deposes": n, "nb_amdt_gouvernement": gov, "nb_groupes_amdt": len(groups), "amdt_disponible": 1, "amdt_tardifs_exclus": late}


def build_dossier(dossier_dir: Path, split: str) -> tuple[list[dict], Counter]:
    procedure = load_json(dossier_dir / "procedure.json")
    articles = load_json(dossier_dir / "articles_etapes.json").get("articles", {})
    steps = ordered_text_steps(procedure, articles)
    pos = {s["directory"]: i for i, s in enumerate(steps)}
    counts: Counter = Counter()
    rows: list[dict] = []
    if len(steps) < 2:
        counts["dossier_moins_de_2_etapes"] += 1
        return rows, counts

    recs = {aid: {r["directory"]: r for r in a.get("steps", [])} for aid, a in articles.items()}
    # Rang de l'article parmi les articles présents à chaque étape. Le champ `order` de La Fabrique est calculé
    # sur tout l'historique (articles futurs compris) : on ne l'utilise que pour trier les articles présents à k.
    rank_at, activity = {}, {}
    for s in steps:
        d = s["directory"]
        present_ids = sorted((a for a in recs if d in recs[a] and recs[a][d].get("status") != "sup"), key=lambda a: (articles[a].get("order") or 0, a))
        n = len(present_ids)
        rank_at[d] = {a: (i + 1) / (n or 1) for i, a in enumerate(present_ids)}
        present = [recs[a][d] for a in present_ids]
        mod = sum(1 for r in present if r.get("status") == "none" and (r.get("n_diff") or 0) > 0)
        new = sum(1 for r in present if r.get("status") == "new")
        activity[d] = {"n": n, "part_mod": mod / n if n else 0.0, "part_new": new / n if n else 0.0}

    dossier_id = dossier_dir.name
    type_texte = re.sub(r"[^a-z].*$", "", dossier_id.lower()) or "autre"
    acceleree = int(bool(procedure.get("urgence")))
    amdt_cache: dict[str, dict | None] = {}

    def amdt_doc(directory: str):
        if directory not in amdt_cache:
            p = dossier_dir / f"amendements_{directory}.json"
            amdt_cache[directory] = load_json(p) if p.exists() and p.stat().st_size > 0 else None
        return amdt_cache[directory]

    for aid, art in articles.items():
        by_dir = recs[aid]
        history = sorted(by_dir.values(), key=lambda r: pos.get(r["directory"], 10**6))
        for i, s in enumerate(steps):
            d = s["directory"]
            cur = by_dir.get(d)
            if cur is None or cur.get("status") == "sup":
                continue  # article absent ou supprimé à l'étape k : pas une observation
            past = [r for r in history if pos.get(r["directory"], 10**6) <= i]
            nxt, nxt_step = None, None
            if i == len(steps) - 1:
                label = "derniere_etape"
            else:
                nxt_step = steps[i + 1]
                nxt = by_dir.get(nxt_step["directory"])
                label = label_of(nxt)
                if nxt_step["institution"] in OUT_OF_SCOPE_INSTITUTIONS:
                    label = "hors_cible_conseil_constitutionnel"
            counts[label] += 1
            row = {
                "split": split,
                "dossier": dossier_id,
                "article": aid,
                "etape_dir": d,
                "date_coupure": s["enddate"],
                "label": label,
                "etape_k": s["etape"],
                "institution_k": s["institution"],
                "lecture_k": s["lecture"],
                "statut_k": cur.get("status"),
                "modifie_a_k": int(cur.get("status") == "new" or (cur.get("status") == "none" and (cur.get("n_diff") or 0) > 0)),
                "ndiff_k": float(cur.get("n_diff") or 0.0),
                "log_longueur_k": math.log1p(cur.get("length") or 0),
                "nb_etapes_article": len(past),
                "position_relative": rank_at[d].get(aid, 0.0),
                "log_nb_articles_k": math.log1p(activity[d]["n"]),
                "type_texte": type_texte,
                "procedure_acceleree": acceleree,
                "nb_modifs_passees": sum(1 for r in past[1:] if r.get("status") == "none" and (r.get("n_diff") or 0) > 0),
                "nb_suppressions_passees": sum(1 for r in past if r.get("status") == "sup"),
                "article_insere": int(bool(history) and history[0].get("status") == "new"),
                "part_modifies_k": activity[d]["part_mod"],
                "part_crees_k": activity[d]["part_new"],
                "ndiff_suivant": float(nxt.get("n_diff") or 0.0) if nxt else math.nan,  # audit seulement, jamais une entrée
                "suspect_renum_ou_fusion": 0,
            }
            if nxt_step is not None:
                row.update({"etape_suivante": nxt_step["etape"], "institution_suivante": nxt_step["institution"], "lecture_suivante": nxt_step["lecture"], "etape_suivante_dir": nxt_step["directory"]})
                row.update(amendment_features(amdt_doc(nxt_step["directory"]), aid, nxt_step["date"][:10], nxt_step["nb_amendements"]))
                if label == "supprime":
                    # Suppression accompagnée, à la même étape, d'un article créé de longueur proche : renumérotation,
                    # scission ou fusion possible. Signalée, à vérifier sur le texte.
                    L = cur.get("length") or 0
                    for other, ob in recs.items():
                        r2 = ob.get(nxt_step["directory"])
                        if other != aid and r2 and r2.get("status") == "new" and L and abs((r2.get("length") or 0) - L) <= 0.05 * L:
                            row["suspect_renum_ou_fusion"] = 1
                            counts["supprime_suspect_renum_ou_fusion"] += 1
                            break
            else:
                row.update({"etape_suivante": "", "institution_suivante": "", "lecture_suivante": "", "etape_suivante_dir": ""})
                row.update({"nb_amdt_deposes": math.nan, "nb_amdt_gouvernement": math.nan, "nb_groupes_amdt": math.nan, "amdt_disponible": 0, "amdt_tardifs_exclus": 0})
            rows.append(row)
    return rows, counts


def main(argv: list[str]) -> None:
    data_dir, ids_path, out_csv, out_cov = Path(argv[1]), Path(argv[2]), Path(argv[3]), Path(argv[4])
    splits = {}
    for line in ids_path.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) >= 2:
            splits[parts[1]] = parts[0]
    all_rows, coverage = [], {"dossiers_attendus": len(splits), "dossiers_lus": 0, "dossiers_manquants": [], "labels": Counter(), "par_split": {}}
    for did, split in sorted(splits.items()):
        ddir = data_dir / did
        if not (ddir / "procedure.json").exists() or not (ddir / "articles_etapes.json").exists():
            coverage["dossiers_manquants"].append(did)
            continue
        rows, counts = build_dossier(ddir, split)
        coverage["dossiers_lus"] += 1
        coverage["labels"].update(counts)
        sp = coverage["par_split"].setdefault(split, {"dossiers": 0, "observations": Counter()})
        sp["dossiers"] += 1
        sp["observations"].update(r["label"] for r in rows)
        all_rows.extend(rows)
    if not all_rows:
        raise SystemExit("aucune observation construite")
    fields: list[str] = []
    for r in all_rows:
        for k in r:
            if k not in fields:
                fields.append(k)
    with open(out_csv, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(all_rows)
    coverage["labels"] = dict(coverage["labels"])
    for sp in coverage["par_split"].values():
        sp["observations"] = dict(sp["observations"])
    coverage["observations_total"] = len(all_rows)
    out_cov.write_text(json.dumps(coverage, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(coverage, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv)
