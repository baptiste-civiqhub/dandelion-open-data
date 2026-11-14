"""Évalue des références et des modèles sur les observations de build_dataset.py.

Splits : dossiers entiers, périodes chronologiques (colonne `split`, fixée par select_sample.py).
Seuils et choix sur la validation ; le test n'est lu qu'une fois, pour le rapport.

Usage :
    python -I evaluate.py <observations.csv> <RESULTS.json> [--tabicl] [--seed 20261114] [--bootstrap 1000]
"""

from __future__ import annotations

import argparse
import json
import platform
import resource
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, confusion_matrix, f1_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_dataset import AMDT_NUMERIC, BASE_CATEGORICAL, BASE_NUMERIC, GRAPH_NUMERIC, LABELS  # noqa: E402

# Colonnes qui décrivent l'avenir ou l'audit : jamais des entrées.
FORBIDDEN = {"label", "ndiff_suivant", "suspect_renum_ou_fusion", "etape_suivante_dir", "amdt_tardifs_exclus", "date_coupure", "dossier", "article", "etape_dir", "split"}
CLASS_INDEX = {c: i for i, c in enumerate(LABELS)}
K_ALERTS = 5


def preprocessor(cat, num, scale):
    num_steps = [SimpleImputer(strategy="median")] + ([StandardScaler()] if scale else [])
    return ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat), ("num", make_pipeline(*num_steps), num)])


def prep_frame(df, cat, num):
    assert not (set(cat) | set(num)) & FORBIDDEN, "fuite : une colonne interdite est utilisée comme entrée"
    out = df[cat + num].copy()
    for c in cat:
        out[c] = out[c].fillna("").astype(str)
    for c in num:
        out[c] = pd.to_numeric(out[c], errors="coerce").astype(float)
    return out


def ranking_at_k(y_change, score, groups, k, seed):
    """Précision et rappel parmi les k premières alertes de chaque (dossier, étape). Égalités départagées au hasard."""
    rng = np.random.default_rng(seed)
    tie = rng.random(len(score))
    precs, recs = [], []
    for g in np.unique(groups):
        idx = np.where(groups == g)[0]
        order = idx[np.lexsort((tie[idx], -score[idx]))]
        top = order[: min(k, len(order))]
        hits = y_change[top].sum()
        precs.append(hits / len(top))
        pos = y_change[idx].sum()
        if pos > 0:
            recs.append(hits / pos)
    return {"precision_at_k": float(np.mean(precs)), "recall_at_k": float(np.mean(recs)) if recs else None, "groupes": int(len(precs))}


def ece(p, y, bins=10):
    edges = np.linspace(0, 1, bins + 1)
    err = 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (p >= lo) & ((p < hi) if hi < 1 else (p <= hi))
        if m.any():
            err += m.sum() / len(p) * abs(p[m].mean() - y[m].mean())
    return float(err)


def metrics(y, P, groups, seed):
    pred = P.argmax(axis=1)
    onehot = np.eye(len(LABELS))[y]
    p_change = P[:, 1] + P[:, 2]
    y_change = (y != 0).astype(int)
    out = {
        "n": int(len(y)),
        "macro_f1": float(f1_score(y, pred, average="macro", labels=list(range(len(LABELS))), zero_division=0)),
        "confusion_lignes_vrai_colonnes_predit": confusion_matrix(y, pred, labels=list(range(len(LABELS)))).tolist(),
        "pr_auc_changement": float(average_precision_score(y_change, p_change)) if 0 < y_change.sum() < len(y) else None,
        "pr_auc_supprime": float(average_precision_score(y == 2, P[:, 2])) if (y == 2).any() else None,
        "brier": float(np.mean(np.sum((P - onehot) ** 2, axis=1))),
        "ece_changement": ece(p_change, y_change),
    }
    out.update({f"{k}_k{K_ALERTS}": v for k, v in ranking_at_k(y_change, p_change, groups, K_ALERTS, seed).items()})
    return out


def bootstrap(y, P, dossiers, groups, B, seed):
    """Intervalles à 95 % par rééchantillonnage des dossiers du test, avec remise."""
    rng = np.random.default_rng(seed)
    uniq = np.unique(dossiers)
    by_d = {d: np.where(dossiers == d)[0] for d in uniq}
    keys = ["macro_f1", "pr_auc_changement", "pr_auc_supprime", "brier", f"precision_at_k_k{K_ALERTS}"]
    vals = {k: [] for k in keys}
    for b in range(B):
        pick = rng.choice(uniq, size=len(uniq), replace=True)
        idx = np.concatenate([by_d[d] for d in pick])
        g = np.concatenate([np.char.add(groups[by_d[d]].astype(str), f"#{j}") for j, d in enumerate(pick)])
        m = metrics(y[idx], P[idx], g, seed + b)
        for k in keys:
            if m.get(k) is not None:
                vals[k].append(m[k])
    return {k: ([round(float(np.percentile(v, 2.5)), 4), round(float(np.percentile(v, 97.5)), 4)] if v else None) for k, v in vals.items()}


def choose_threshold(p_valid, y_valid_change):
    best_t, best_f1 = 0.5, -1.0
    for t in np.unique(np.round(p_valid, 4)):
        pred = p_valid >= t
        if pred.sum() == 0:
            continue
        tp = (pred & (y_valid_change == 1)).sum()
        prec, rec = tp / pred.sum(), tp / max(1, y_valid_change.sum())
        f1 = 0 if prec + rec == 0 else 2 * prec * rec / (prec + rec)
        if f1 > best_f1:
            best_t, best_f1 = float(t), float(f1)
    return best_t


def alert_quality(p, y_change, t):
    pred = p >= t
    tp = int((pred & (y_change == 1)).sum())
    return {"seuil_choisi_sur_validation": t, "alertes": int(pred.sum()), "precision": tp / pred.sum() if pred.sum() else None, "rappel": tp / y_change.sum() if y_change.sum() else None}


class ConstantModel:
    def fit(self, X, y):
        self.p = np.bincount(y, minlength=len(LABELS)) / len(y)
        return self

    def predict_proba(self, X):
        return np.tile(self.p, (len(X), 1))


class RuleModel:
    """Fréquences d'entraînement par (type et institution de l'étape suivante, article modifié à k)."""

    keys = ["etape_suivante", "institution_suivante", "modifie_a_k"]

    def fit(self, X, y):
        self.prior = np.bincount(y, minlength=len(LABELS)) / len(y)
        self.table = {}
        for key, idx in X.groupby(self.keys).indices.items():
            c = np.bincount(y[idx], minlength=len(LABELS)) + 1.0  # lissage de Laplace
            self.table[key] = c / c.sum()
        return self

    def predict_proba(self, X):
        return np.vstack([self.table.get(tuple(r), self.prior) for r in X[self.keys].itertuples(index=False, name=None)])


def run(args):
    t0 = time.time()
    df = pd.read_csv(args.observations, low_memory=False)
    counts_all = df.groupby(["split", "label"]).size().unstack(fill_value=0)
    lab = df[df["label"].isin(LABELS)].reset_index(drop=True)
    y_all = lab["label"].map(CLASS_INDEX).to_numpy()
    parts = {s: lab.index[lab["split"] == s].to_numpy() for s in ("train", "valid", "test")}
    res = {
        "status": "run",
        "seed": args.seed,
        "bootstrap_tirages": args.bootstrap,
        "observations_par_split_et_label": {s: {k: int(v) for k, v in row.items()} for s, row in counts_all.iterrows()},
        "dossiers_par_split": {s: int(lab.loc[idx, "dossier"].nunique()) for s, idx in parts.items()},
        "observations_etiquetees_par_split": {s: int(len(idx)) for s, idx in parts.items()},
        "frequence_classes_train": {c: round(float((y_all[parts["train"]] == i).mean()), 4) for c, i in CLASS_INDEX.items()},
        "frequence_classes_test": {c: round(float((y_all[parts["test"]] == i).mean()), 4) for c, i in CLASS_INDEX.items()},
        "features": {"base": BASE_CATEGORICAL + BASE_NUMERIC, "graphe": GRAPH_NUMERIC, "amendements_reglage_B": AMDT_NUMERIC},
        "k_alertes": K_ALERTS,
        "modeles": {},
    }
    feature_sets = {"base": (BASE_CATEGORICAL, BASE_NUMERIC), "base+graphe": (BASE_CATEGORICAL, BASE_NUMERIC + GRAPH_NUMERIC)}
    tr, va, te = parts["train"], parts["valid"], parts["test"]
    y_tr, y_va, y_te = y_all[tr], y_all[va], y_all[te]
    g_va = (lab.loc[va, "dossier"] + "|" + lab.loc[va, "etape_dir"]).to_numpy()
    g_te = (lab.loc[te, "dossier"] + "|" + lab.loc[te, "etape_dir"]).to_numpy()
    d_te = lab.loc[te, "dossier"].to_numpy()
    preds_test = {}

    def evaluate(name, P_va, P_te, seconds, extra=None):
        t = choose_threshold(P_va[:, 1] + P_va[:, 2], (y_va != 0).astype(int))
        entry = {
            "secondes": round(seconds, 2),
            "validation": metrics(y_va, P_va, g_va, args.seed),
            "test": metrics(y_te, P_te, g_te, args.seed),
            "alerte_test": alert_quality(P_te[:, 1] + P_te[:, 2], (y_te != 0).astype(int), t),
            "ic95_test_par_dossiers": bootstrap(y_te, P_te, d_te, g_te, args.bootstrap, args.seed),
        }
        if extra:
            entry.update(extra)
        res["modeles"][name] = entry
        preds_test[name] = P_te
        tm = entry["test"]
        print(f"{name}: macroF1={tm['macro_f1']:.3f} PRAUCchg={tm['pr_auc_changement']:.3f} PRAUCsup={tm['pr_auc_supprime']:.3f} brier={tm['brier']:.3f} P@5={tm[f'precision_at_k_k{K_ALERTS}']:.3f} ({seconds:.1f}s)", flush=True)

    s = time.time()
    m = ConstantModel().fit(None, y_tr)
    evaluate("reference_aucun_changement", m.predict_proba(va), m.predict_proba(te), time.time() - s, {"note": "probabilités = fréquences d'entraînement ; prédiction = classe majoritaire « inchange »"})
    s = time.time()
    m = RuleModel().fit(lab.loc[tr].reset_index(drop=True), y_tr)
    evaluate("regle_publiee", m.predict_proba(lab.loc[va]), m.predict_proba(lab.loc[te]), time.time() - s, {"note": "fréquences d'entraînement par type et institution de l'étape suivante et modification à k"})

    for fs_name, (cat, num) in feature_sets.items():
        Xtr, Xva, Xte = (prep_frame(lab.loc[i], cat, num) for i in (tr, va, te))
        s = time.time()
        lr = make_pipeline(preprocessor(cat, num, scale=True), LogisticRegression(max_iter=3000, C=1.0))
        lr.fit(Xtr, y_tr)
        evaluate(f"regression_logistique[{fs_name}]", lr.predict_proba(Xva), lr.predict_proba(Xte), time.time() - s)
        s = time.time()
        hgb = make_pipeline(preprocessor(cat, num, scale=False), HistGradientBoostingClassifier(max_iter=200, early_stopping=False, random_state=args.seed))
        hgb.fit(Xtr, y_tr)
        evaluate(f"gradient_boosting[{fs_name}]", hgb.predict_proba(Xva), hgb.predict_proba(Xte), time.time() - s)

    if args.tabicl:
        try:
            import tabicl
            import torch
            from tabicl import TabICLClassifier

            cat, num = feature_sets["base+graphe"]
            pre = preprocessor(cat, num, scale=False)
            tr_ctx = tr
            if args.tabicl_context and len(tr) > args.tabicl_context:
                # contexte réduit par tirage aléatoire de lignes d'entraînement (mémoire du poste) ; le test reste complet
                tr_ctx = np.sort(np.random.default_rng(args.seed).choice(tr, size=args.tabicl_context, replace=False))
            y_ctx = y_all[tr_ctx]
            Xtr = pre.fit_transform(prep_frame(lab.loc[tr_ctx], cat, num))
            Xva = pre.transform(prep_frame(lab.loc[va], cat, num))
            Xte = pre.transform(prep_frame(lab.loc[te], cat, num))
            s = time.time()
            clf = TabICLClassifier(random_state=args.seed, device=args.tabicl_device, n_estimators=args.tabicl_n_estimators, batch_size=1)
            clf.fit(Xtr, y_ctx)
            fit_s = time.time() - s
            P_va = clf.predict_proba(Xva)
            P_te = clf.predict_proba(Xte)
            evaluate("tabicl[base+graphe]", P_va, P_te, time.time() - s, {
                "version_paquet": "2.2.0",
                "checkpoint": getattr(clf, "checkpoint_version", None),
                "n_estimators": getattr(clf, "n_estimators", None),
                "device": str(getattr(clf, "device_", args.tabicl_device)),
                "torch": torch.__version__,
                "secondes_fit": round(fit_s, 2),
                "contexte_entrainement_lignes": int(Xtr.shape[0]),
                "colonnes": int(Xtr.shape[1]),
            })
        except Exception as exc:
            res["modeles"]["tabicl[base+graphe]"] = {"status": "failed", "erreur": f"{type(exc).__name__}: {exc}"}
            print("tabicl failed:", exc, flush=True)

    # Réglage B : coupure à la veille de l'examen de l'étape suivante, amendements déjà déposés connus (test seulement).
    sub = lab.loc[te].reset_index(drop=True)
    mask = (sub["amdt_disponible"] == 1).to_numpy()
    if mask.any():
        y_sub = y_te[mask]
        yc = (y_sub != 0).astype(int)
        gs = g_te[mask]
        n_amdt = pd.to_numeric(sub.loc[mask, "nb_amdt_deposes"], errors="coerce").fillna(0).to_numpy()
        best_hist = "gradient_boosting[base+graphe]"
        p_hist = preds_test[best_hist][mask][:, 1] + preds_test[best_hist][mask][:, 2]
        out_b = {"observations": int(mask.sum()), "dossiers": int(sub.loc[mask, "dossier"].nunique()), "part_changement": round(float(yc.mean()), 4)}
        for name, score in {"regle_au_moins_un_amendement": n_amdt, f"historique_seul[{best_hist}]": p_hist, "amendements_puis_historique": n_amdt + p_hist}.items():
            r = ranking_at_k(yc, score, gs, K_ALERTS, args.seed)
            out_b[name] = {"pr_auc_changement": float(average_precision_score(yc, score)) if 0 < yc.sum() < len(yc) else None, f"precision_at_k_k{K_ALERTS}": r["precision_at_k"], f"recall_at_k_k{K_ALERTS}": r["recall_at_k"]}
            print("B", name, out_b[name], flush=True)
        alert = n_amdt >= 1
        tp = int((alert & (yc == 1)).sum())
        out_b["regle_au_moins_un_amendement"]["alerte"] = {"alertes": int(alert.sum()), "precision": tp / alert.sum() if alert.sum() else None, "rappel": tp / yc.sum() if yc.sum() else None}
        res["reglage_B_amendements_deposes_test"] = out_b
    else:
        res["reglage_B_amendements_deposes_test"] = {"status": "not_run", "motif": "aucune observation de test avec fichier d'amendements de l'étape suivante"}

    res["materiel"] = {"machine": platform.machine(), "systeme": platform.platform(), "ram_octets": _ram()}
    res["versions"] = {"python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__, "scikit_learn": sklearn.__version__}
    res["pic_memoire_octets"] = int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)  # octets sur macOS
    res["duree_totale_secondes"] = round(time.time() - t0, 1)
    res["cout"] = "poste local (CPU et GPU intégré), aucun GPU payant, aucun crédit Hémicycle ni Featherless consommé"
    return res


def _ram():
    try:
        return int(subprocess.check_output(["sysctl", "-n", "hw.memsize"]).strip())
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("observations")
    ap.add_argument("results")
    ap.add_argument("--seed", type=int, default=20261114)
    ap.add_argument("--bootstrap", type=int, default=1000)
    ap.add_argument("--tabicl", action="store_true")
    ap.add_argument("--tabicl-device", default="cpu")
    ap.add_argument("--tabicl-context", type=int, default=3000)
    ap.add_argument("--tabicl-n-estimators", type=int, default=8)
    args = ap.parse_args()
    res = run(args)
    Path(args.results).write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
    print("écrit :", args.results)


if __name__ == "__main__":
    main()
