"""Extrait des alignements réels et auditables entre deux versions officielles successives d'un texte.

Pour chaque catégorie de label (inchangé, modifié mineur, modifié important, supprimé, supprimé suspect de
renumérotation ou fusion), un exemple : URL des deux versions, label calculé, n_diff, et passages avant/après.

Usage :
    python -I make_examples.py <dossier_viz> <texte_k.json> <texte_k1.json> <etape_k> <etape_k1> <sortie.md>
"""

from __future__ import annotations

import difflib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_dataset import build_dossier, load_json  # noqa: E402

API = "https://www.lafabriquedelaloi.fr/api"


def texts_by_id(texte: dict) -> dict:
    out = {}
    for a in texte.get("articles", []):
        aid = (a.get("titre") or "").strip().replace(" ", "_")
        al = a.get("alineas") or {}
        out[aid] = [al[k] for k in sorted(al)] if isinstance(al, dict) else list(al)
    return out


def short(lines: list[str], limit: int = 420) -> str:
    s = " / ".join(x.strip() for x in lines if x.strip())
    return (s[:limit] + " [...]") if len(s) > limit else s


def diff_excerpt(a: list[str], b: list[str], limit: int = 6) -> list[str]:
    out = []
    for line in difflib.unified_diff(a, b, lineterm="", n=0):
        if line.startswith(("---", "+++", "@@")):
            continue
        out.append(line[:300])
        if len(out) >= limit:
            break
    return out


def main(argv):
    vdir, tk, tk1, step_k, step_k1, out = Path(argv[1]), Path(argv[2]), Path(argv[3]), argv[4], argv[5], Path(argv[6])
    proc = load_json(vdir / "procedure.json")
    src = {s["directory"]: s.get("source_url", "") for s in proc["steps"]}
    rows, _ = build_dossier(vdir, "exemple")
    rows = [r for r in rows if r["etape_dir"] == step_k and r.get("etape_suivante_dir") == step_k1]
    A, B = texts_by_id(load_json(tk)), texts_by_id(load_json(tk1))
    picks = {
        "inchange": [r for r in rows if r["label"] == "inchange"],
        "modifie_mineur (n_diff < 0,02)": sorted([r for r in rows if r["label"] == "modifie" and r["ndiff_suivant"] < 0.02], key=lambda r: r["ndiff_suivant"]),
        "modifie_important (n_diff >= 0,3)": sorted([r for r in rows if r["label"] == "modifie" and r["ndiff_suivant"] >= 0.3], key=lambda r: -r["ndiff_suivant"]),
        "supprime": [r for r in rows if r["label"] == "supprime" and not r["suspect_renum_ou_fusion"]],
        "supprime_suspect_renum_ou_fusion": [r for r in rows if r["label"] == "supprime" and r["suspect_renum_ou_fusion"]],
        "non_apparie": [r for r in rows if r["label"] == "non_apparie"],
    }
    lines = [
        f"# Alignements réels : {vdir.name}, de `{step_k}` à `{step_k1}`",
        "",
        "Données : La Fabrique de la Loi (Regards Citoyens), licence ODbL. Textes officiels : liens ci-dessous. "
        "Labels calculés par `build_dataset.py` d'après le statut et `n_diff` de `articles_etapes.json`.",
        "",
        f"- Version k : {src.get(step_k, '')} (API : {API}/{vdir.name}/procedure/{step_k}/texte/texte.json)",
        f"- Version k+1 : {src.get(step_k1, '')} (API : {API}/{vdir.name}/procedure/{step_k1}/texte/texte.json)",
        f"- Observations sur cette transition : {len(rows)}",
        "",
        "Un changement lexical ne prouve pas un changement de fond : chaque exemple est à relire sur les deux sources.",
        "",
    ]
    for cat, cands in picks.items():
        lines.append(f"## {cat} ({len(cands)} cas sur cette transition)")
        lines.append("")
        if not cands:
            lines += ["Aucun cas sur cette transition.", ""]
            continue
        r = cands[0]
        a, b = A.get(r["article"], []), B.get(r["article"], [])
        nd = "" if r["ndiff_suivant"] != r["ndiff_suivant"] else f"{r['ndiff_suivant']:.4f}"
        lines += [f"- Article : `{r['article']}`, label `{r['label']}`, n_diff à k+1 : {nd}", ""]
        lines += ["Avant (k) :", "", f"> {short(a) or '(texte absent du fichier)'}", ""]
        lines += ["Après (k+1) :", "", f"> {short(b) or '(article absent ou supprimé dans la version k+1)'}", ""]
        d = diff_excerpt(a, b)
        if d:
            lines += ["Différence par alinéa (extrait) :", "", "```diff", *d, "```", ""]
    out.write_text("\n".join(lines), encoding="utf-8")
    print("écrit :", out)


if __name__ == "__main__":
    main(sys.argv)
