"""Tests du pipeline : alignement et labels, renumérotation, données manquantes, absence de fuite temporelle.

Lancer depuis research/ml-feasibility : python -I -m pytest -q tests
Les dossiers sont synthétiques et servent aux tests techniques seulement, jamais à mesurer une précision.
"""

import copy
import json
import math
import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipeline"))
from build_dataset import LABELS, article_key_from_subject, build_dossier  # noqa: E402
from evaluate import prep_frame  # noqa: E402

STEPS = [
    {"directory": "00_1erelecture_senat_depot", "date": "2020-01-01", "enddate": "2020-01-01", "stage": "1ère lecture", "institution": "senat", "step": "depot", "nb_amendements": 0},
    {"directory": "01_1erelecture_senat_commission", "date": "2020-02-01", "enddate": "2020-02-02", "stage": "1ère lecture", "institution": "senat", "step": "commission", "nb_amendements": 3},
    {"directory": "02_1erelecture_senat_hemicycle", "date": "2020-03-01", "enddate": "2020-03-05", "stage": "1ère lecture", "institution": "senat", "step": "hemicycle", "nb_amendements": 0},
]
D0, D1, D2 = (s["directory"] for s in STEPS)


def rec(d, status, n_diff=0.0, length=100):
    return {"directory": d, "id_step": d, "status": status, "n_diff": n_diff, "length": length, "diff": "none"}


def base_articles():
    return {
        "1er": {"id": "1er", "order": 1, "steps": [rec(D0, "depot", 1, 100), rec(D1, "none", 0.0, 100), rec(D2, "none", 0.3, 130)]},
        "2": {"id": "2", "order": 2, "steps": [rec(D0, "depot", 1, 200), rec(D1, "sup", 0, 0)]},
        "3": {"id": "3", "order": 3, "steps": [rec(D0, "depot", 1, 50), rec(D2, "none", 0.0, 50)]},
        "4": {"id": "4", "order": 4, "steps": [rec(D0, "depot", 1, 400), rec(D1, "sup", 0, 0)]},
        "4_bis": {"id": "4_bis", "order": 5, "steps": [rec(D1, "new", 1, 404), rec(D2, "none", 0.0, 404)]},
    }


AMDT_D1 = {"id_step": D1, "groupes": {}, "sujets": {
    "Article 1er": {"titre": "Article 1er", "order": 1, "amendements": [
        {"numero": "COM-1", "date": "2020-01-20", "groupe": "Gouvernement", "sort": "adopté"},
        {"numero": "COM-2", "date": "2020-01-25", "groupe": "LR", "sort": "rejeté"},
        {"numero": "COM-3", "date": "2020-02-01", "groupe": "SOC", "sort": "adopté"},  # déposé le jour de l'examen : exclu
    ]},
    "Après l'article 1er": {"titre": "Après l'article 1er", "order": 2, "amendements": [{"numero": "COM-4", "date": "2020-01-20", "groupe": "LR", "sort": "rejeté"}]},
}}


def write_dossier(tmp_path, articles, amdt=AMDT_D1, name="ppl19-001"):
    d = tmp_path / name
    d.mkdir()
    (d / "procedure.json").write_text(json.dumps({"steps": STEPS, "urgence": True}), encoding="utf-8")
    (d / "articles_etapes.json").write_text(json.dumps({"articles": articles}), encoding="utf-8")
    if amdt is not None:
        (d / f"amendements_{D1}.json").write_text(json.dumps(amdt), encoding="utf-8")
    return d


def obs(rows, article, etape):
    hits = [r for r in rows if r["article"] == article and r["etape_dir"] == etape]
    assert len(hits) == 1, (article, etape, len(hits))
    return hits[0]


def test_labels_from_next_official_version(tmp_path):
    rows, _ = build_dossier(write_dossier(tmp_path, base_articles()), "train")
    assert obs(rows, "1er", D0)["label"] == "inchange"
    assert obs(rows, "1er", D1)["label"] == "modifie"
    assert obs(rows, "2", D0)["label"] == "supprime"
    assert not [r for r in rows if r["article"] == "2" and r["etape_dir"] == D1], "un article supprimé n'est plus une observation"


def test_missing_next_version_is_unknown_not_negative(tmp_path):
    rows, counts = build_dossier(write_dossier(tmp_path, base_articles()), "train")
    r = obs(rows, "3", D0)
    assert r["label"] == "non_apparie" and r["label"] not in LABELS
    last = obs(rows, "1er", D2)
    assert last["label"] == "derniere_etape" and last["label"] not in LABELS
    assert counts["non_apparie"] == 1


def test_deletion_next_to_similar_creation_is_flagged(tmp_path):
    rows, counts = build_dossier(write_dossier(tmp_path, base_articles()), "train")
    r = obs(rows, "4", D0)
    assert r["label"] == "supprime" and r["suspect_renum_ou_fusion"] == 1
    assert obs(rows, "2", D0)["suspect_renum_ou_fusion"] == 0
    assert counts["supprime_suspect_renum_ou_fusion"] == 1


def test_amendments_use_filing_date_before_cutoff_and_ignore_outcome(tmp_path):
    rows, _ = build_dossier(write_dossier(tmp_path, base_articles()), "train")
    r = obs(rows, "1er", D0)
    assert r["nb_amdt_deposes"] == 2 and r["nb_amdt_gouvernement"] == 1 and r["amdt_tardifs_exclus"] == 1
    flipped = copy.deepcopy(AMDT_D1)
    for a in flipped["sujets"]["Article 1er"]["amendements"]:
        a["sort"] = "rejeté" if a["sort"] == "adopté" else "adopté"
    rows2, _ = build_dossier(write_dossier(tmp_path, base_articles(), flipped, name="ppl19-002"), "train")
    assert obs(rows2, "1er", D0)["nb_amdt_deposes"] == 2, "le sort ne doit pas changer les entrées"


def test_no_temporal_leakage_future_changes_do_not_move_features(tmp_path):
    rows, _ = build_dossier(write_dossier(tmp_path, base_articles()), "train")
    future = base_articles()
    for art in future.values():
        for s in art["steps"]:
            if s["directory"] == D2:
                s["n_diff"], s["length"] = 0.99, 9999
    rows2, _ = build_dossier(write_dossier(tmp_path, future, name="ppl19-003"), "train")
    audit = {"label", "ndiff_suivant", "suspect_renum_ou_fusion", "dossier"}
    a, b = obs(rows, "1er", D1), obs(rows2, "1er", D1)
    for k in a:
        if k in audit:
            continue
        if isinstance(a[k], float) and math.isnan(a[k]):
            assert isinstance(b[k], float) and math.isnan(b[k]), k
        else:
            assert a[k] == b[k], f"fuite temporelle sur {k}"
    assert a["ndiff_suivant"] != b["ndiff_suivant"]


def test_article_created_later_does_not_move_position_at_cutoff(tmp_path):
    rows, _ = build_dossier(write_dossier(tmp_path, base_articles()), "train")
    future = base_articles()
    future["0_A"] = {"id": "0_A", "order": 0, "steps": [rec(D2, "new", 1, 80)]}
    rows2, _ = build_dossier(write_dossier(tmp_path, future, name="ppl19-004"), "train")
    for art in ("1er", "4_bis"):
        assert obs(rows, art, D1)["position_relative"] == obs(rows2, art, D1)["position_relative"]
        assert obs(rows, art, D1)["log_nb_articles_k"] == obs(rows2, art, D1)["log_nb_articles_k"]


@pytest.mark.parametrize("subject,key", [("Article 1er", "1er"), ("Article premier", "1er"), ("Article 11 bis A", "11_bis_A"), ("Article 2", "2"), ("Après l'article 10", None), ("Titre", None)])
def test_article_key_from_subject(subject, key):
    assert article_key_from_subject(subject) == key


def test_forbidden_columns_cannot_be_features():
    with pytest.raises(AssertionError):
        prep_frame(pd.DataFrame({"label": ["inchange"]}), [], ["label"])
