#!/usr/bin/env python3
"""Import déterministe de l'export public des amendements du Sénat (texte 620, session 2023-2024).

Entrée : le fichier déjà téléchargé (jamais de téléchargement ici, jamais à l'affichage d'une page).
Sortie : data/pfas/amendments.json (instantané normalisé) et data/pfas/manifest.json (provenance).

    python3 scripts/import-pfas.py \
        --retrieved-at 2026-11-13T21:43:06.239210+00:00 \
        [--input data/pfas/jeu_complet_2023-2024_620.csv] [--check]

Bibliothèque standard uniquement. Les sources sont des données non fiables : le HTML des champs
Dispositif / Objet n'est jamais conservé, seulement converti en texte lisible.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import sys
import unicodedata
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

PARSER_VERSION = "1.0.0"
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "pfas"
DEFAULT_INPUT = DATA_DIR / "jeu_complet_2023-2024_620.csv"
CURATED = DATA_DIR / "curated-relations.json"
SNAPSHOT = DATA_DIR / "amendments.json"
MANIFEST = DATA_DIR / "manifest.json"

SOURCE = {
    "datasetUrl": "https://www.senat.fr/amendements/2023-2024/620/jeu_complet_2023-2024_620.csv",
    "referencePageUrl": "https://www.senat.fr/amendements/2023-2024/620/accueil.html",
    "referenceTextUrl": "https://www.senat.fr/leg/ppl23-620.html",
    "licenceUrl": "https://data.senat.fr/licence/",
    "publisher": "Sénat",
    "text": "Proposition de loi n° 620 (2023-2024) visant à protéger la population des risques liés aux substances perfluoroalkylées et polyfluoroalkylées",
}
ALLOWED_HOSTS = {"www.senat.fr", "senat.fr"}
EXPECTED_COLUMNS = [
    "Nature", "Numéro", "Subdivision", "Alinéa", "Auteur", "Au nom de", "Date de dépôt",
    "Dispositif", "Objet", "Sort", "Date de saisie du sort", "Url amendement", "Fiche Sénateur",
]
BLOCK_TAGS = {"p", "br", "div", "li", "ul", "ol", "table", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "body"}
SKIP_TAGS = {"script", "style"}
SPACES = re.compile(r"[ \t\u00a0\u202f\u2007\u2009]+")


class _TextExtractor(HTMLParser):
    """Texte lisible : blocs → paragraphes, balises en ligne (sup, b…) sans espace ajouté (« 1<sup>er</sup> » → « 1er »)."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self.skip += 1
        elif tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS:
            self.skip = max(0, self.skip - 1)
        elif tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_startendtag(self, tag, attrs):
        if tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def html_to_text(value: str) -> str:
    extractor = _TextExtractor()
    extractor.feed(value)
    extractor.close()
    paragraphs = []
    for line in "".join(extractor.parts).split("\n"):
        line = SPACES.sub(" ", line).strip()
        if line:
            paragraphs.append(line)
    return "\n\n".join(paragraphs)


def clean(value: str) -> str:
    return SPACES.sub(" ", value).strip()


def or_none(value: str) -> str | None:
    value = clean(value)
    return value or None


def safe_senate_url(raw: str) -> str | None:
    raw = raw.strip()
    if not raw:
        return None
    if raw.startswith("//"):
        raw = "https:" + raw
    parts = urlsplit(raw)
    if parts.scheme not in {"http", "https"} or parts.hostname not in ALLOWED_HOSTS:
        return None
    return parts._replace(scheme="https").geturl()


def read_rows(raw: bytes) -> list[dict[str, str]]:
    text = raw.decode("cp1252")
    if text.startswith("sep="):
        text = text.split("\n", 1)[1]
    reader = csv.reader(io.StringIO(text, newline=""), delimiter="\t")
    header = [unicodedata.normalize("NFC", h.strip()) for h in next(reader)]
    if header != EXPECTED_COLUMNS:
        raise SystemExit(f"Colonnes inattendues : {header}")
    rows = []
    for line_number, values in enumerate(reader, start=3):
        if not any(v.strip() for v in values):
            continue
        if len(values) != len(header):
            raise SystemExit(f"Ligne {line_number} : {len(values)} colonnes au lieu de {len(header)}")
        rows.append(dict(zip(header, values)))
    return rows


def target_placement(subdivision: str) -> dict:
    """« art. add. après/avant Article X » insère un article nouveau ; il ne modifie pas l'article X."""
    match = re.fullmatch(r"art\. add\. (après|avant) (Article .+)", subdivision)
    if match:
        position = "after" if match.group(1) == "après" else "before"
        return {"kind": "additional-article", "position": position, "article": match.group(2)}
    if re.fullmatch(r"Article \S+(?: \S+)?", subdivision):
        return {"kind": "article", "position": None, "article": subdivision}
    return {"kind": "unknown", "position": None, "article": None}


def number_parts(raw: str) -> tuple[str, str | None]:
    match = re.fullmatch(r"(\d+)\s*(.*)", clean(raw))
    if not match:
        raise SystemExit(f"Numéro d'amendement illisible : {raw!r}")
    return match.group(1), (match.group(2) or None)


def build(raw: bytes, retrieved_at: str) -> tuple[dict, dict]:
    rows = read_rows(raw)
    sha256 = hashlib.sha256(raw).hexdigest()
    amendments = []
    by_number: dict[str, dict] = {}
    for index, row in enumerate(rows):
        number, rectification = number_parts(row["Numéro"])
        if number in by_number:
            raise SystemExit(f"Numéro en double : {number}")
        source_url_raw = row["Url amendement"].strip() or None
        source_url = safe_senate_url(row["Url amendement"])
        if source_url_raw and not source_url:
            raise SystemExit(f"URL hors domaine du Sénat pour {number} : {source_url_raw!r}")
        amendment = {
            "id": f"senat-2023-2024-620-amdt-{number}",
            "number": number,
            "numberLabel": clean(row["Numéro"]),
            "rectification": rectification,
            "nature": clean(row["Nature"]),
            "subdivision": clean(row["Subdivision"]),
            "subdivisionRaw": row["Subdivision"],
            "targetPlacement": target_placement(clean(row["Subdivision"])),
            "paragraph": or_none(row["Alinéa"]),
            "author": or_none(row["Auteur"]),
            "onBehalfOf": or_none(row["Au nom de"]),
            "filedOn": or_none(row["Date de dépôt"]),
            "proposalText": html_to_text(row["Dispositif"]),
            "explanatoryText": html_to_text(row["Objet"]),
            "outcomeRaw": or_none(row["Sort"]),
            "outcomeRecordedAt": or_none(row["Date de saisie du sort"]),
            "sourceUrl": source_url,
            "sourceUrlRaw": source_url_raw,
            "senatorUrl": safe_senate_url(row["Fiche Sénateur"]),
            "parentId": None,
            "parentRelation": None,
            "rowIndex": index,
        }
        amendments.append(amendment)
        by_number[number] = amendment

    curated = json.loads(CURATED.read_text(encoding="utf-8"))
    for relation in curated["relations"]:
        child = by_number.get(relation["childNumber"])
        parent = by_number.get(relation["parentNumber"])
        if not child or not parent:
            raise SystemExit(f"Relation sans ligne correspondante : {relation}")
        if child["nature"] != "S/Amt":
            raise SystemExit(f"{child['number']} n'est pas un sous-amendement dans l'export")
        if not child["proposalText"].startswith(f"Amendement n° {parent['number']}"):
            raise SystemExit(f"Le Dispositif de {child['number']} ne cite pas l'amendement {parent['number']}")
        child["parentId"] = parent["id"]
        child["parentRelation"] = {
            "parentNumber": parent["number"],
            "relation": relation["relation"],
            "sourceUrl": safe_senate_url(relation["sourceUrl"]),
            "evidence": relation["evidence"],
            "method": relation["method"],
            "officialPageCheck": relation.get("officialPageCheck"),
        }
    unlinked = [a["number"] for a in amendments if a["nature"] == "S/Amt" and not a["parentId"]]
    if unlinked:
        raise SystemExit(f"Sous-amendements sans relation sourcée : {unlinked}")

    counts = {
        "rows": len(amendments),
        "bySubdivision": dict(sorted(Counter(a["subdivision"] for a in amendments).items())),
        "byOutcome": dict(sorted(Counter(a["outcomeRaw"] or "(vide)" for a in amendments).items())),
        "byNature": dict(sorted(Counter(a["nature"] for a in amendments).items())),
    }
    provenance = {
        **SOURCE,
        "retrievedAtUtc": retrieved_at,
        "bytes": len(raw),
        "sha256": sha256,
        "encoding": "cp1252",
        "format": "TSV (tabulations) malgré l'extension .csv, première ligne « sep= », en-têtes avec espaces finaux",
        "parserVersion": PARSER_VERSION,
        "importScript": "scripts/import-pfas.py",
    }
    snapshot = {"schemaVersion": 1, "provenance": provenance, "counts": counts, "amendments": amendments}
    manifest = {
        "provenance": provenance,
        "counts": counts,
        "files": {
            "original": DEFAULT_INPUT.relative_to(ROOT).as_posix(),
            "curatedRelations": CURATED.relative_to(ROOT).as_posix(),
            "snapshot": SNAPSHOT.relative_to(ROOT).as_posix(),
        },
        "curatedRelations": len(curated["relations"]),
    }
    return snapshot, manifest


def dump(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--retrieved-at", help="Date ISO 8601 UTC du téléchargement (défaut : celle du manifeste)")
    parser.add_argument("--check", action="store_true", help="Échoue si les fichiers générés ne sont pas à jour")
    args = parser.parse_args()

    retrieved_at = args.retrieved_at
    if not retrieved_at and MANIFEST.exists():
        retrieved_at = json.loads(MANIFEST.read_text(encoding="utf-8"))["provenance"]["retrievedAtUtc"]
    if not retrieved_at:
        parser.error("--retrieved-at est requis au premier import")

    snapshot, manifest = build(args.input.read_bytes(), retrieved_at)
    outputs = {SNAPSHOT: dump(snapshot), MANIFEST: dump(manifest)}
    if args.check:
        stale = [p.name for p, c in outputs.items() if not p.exists() or p.read_text(encoding="utf-8") != c]
        if stale:
            print(f"Instantané PFAS périmé : {stale}", file=sys.stderr)
            return 1
        print("Instantané PFAS à jour.")
        return 0
    for path, content in outputs.items():
        path.write_text(content, encoding="utf-8")
    print(f"{manifest['counts']['rows']} lignes, sha256 {manifest['provenance']['sha256']}")
    print(json.dumps(manifest["counts"], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
