#!/usr/bin/env bash
# Collecte l'échantillon tiré par select_sample.py (La Fabrique de la Loi, licence ODbL), lecture seule, GET anonymes.
# Passe 1 : viz/procedure.json et viz/articles_etapes.json pour chaque dossier.
# Passe 2 : viz/amendements_<étape>.json des étapes avec nb_amendements > 0, pour les dossiers du split test.
# Usage : fetch_sample.sh <sample_ids.tsv> <dossier_de_sortie> [connexions=4]
set -euo pipefail
IDS="$1"; OUT="$2"; P="${3:-4}"
export UA="dandelion-ml-feasibility/0.1 (research, hackathon Open Data 2026-11-14)"
export BASE="https://www.lafabriquedelaloi.fr/api" OUT
get() {
  local d="$OUT/$1"; mkdir -p "$d"
  [ -s "$d/$2" ] && return 0
  curl -sfL --compressed -A "$UA" --max-time 150 -o "$d/$2.part" "$BASE/$1/viz/$2" && mv "$d/$2.part" "$d/$2" || { rm -f "$d/$2.part"; echo "$1 $2" >> "$OUT/_errors.log"; }
}
export -f get
cut -f2 "$IDS" | while read -r id; do echo "$id procedure.json"; echo "$id articles_etapes.json"; done | xargs -P "$P" -n 2 bash -c 'get "$0" "$1"'
awk -F'\t' '$1=="test"{print $2}' "$IDS" | while read -r id; do
  [ -s "$OUT/$id/procedure.json" ] || continue
  jq -r '.steps[] | select((.nb_amendements // 0) > 0) | "amendements_" + .directory + ".json"' "$OUT/$id/procedure.json" | while read -r f; do echo "$id $f"; done
done | xargs -P "$P" -n 2 bash -c 'get "$0" "$1"'
echo "procedure: $(ls "$OUT"/*/procedure.json | wc -l) articles: $(ls "$OUT"/*/articles_etapes.json | wc -l) amendements: $(ls "$OUT"/*/amendements_*.json 2>/dev/null | wc -l) errors: $(cat "$OUT/_errors.log" 2>/dev/null | wc -l)"
