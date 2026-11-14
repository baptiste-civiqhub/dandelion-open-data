#!/usr/bin/env python3
"""Vérifie les archives publiques et les croisements PFAS, sans réseau ni secret."""
import hashlib
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DATA = REPO / 'data/pfas'
EVIDENCE = DATA / 'evidence'


def read(path):
    return json.loads(path.read_text())


def require(condition, message):
    if not condition:
        raise SystemExit('Échec de vérification : ' + message)


archives = {}
for name in ['senat-amendements-620', 'senat-textes-620', 'senat-dossier-pfas']:
    path = EVIDENCE / (name + '.json')
    provenance = read(EVIDENCE / (name + '-provenance.json'))
    raw = path.read_bytes()
    require(hashlib.sha256(raw).hexdigest() == provenance['sha256'], name + ': empreinte incorrecte')
    require(len(raw) == provenance['bytes'], name + ': taille incorrecte')
    response = json.loads(raw)
    require(not response['tronque'] and response['decalage_suivant'] is None, name + ': réponse partielle')
    archives[name] = response['lignes']

snapshot = read(DATA / 'amendments.json')['amendments']
api_rows = archives['senat-amendements-620']
require(len(api_rows) == len(snapshot) == 32, 'nombre de lignes inattendu')
urls = [a['sourceUrl'] for a in snapshot if a['sourceUrl']]
require(len(urls) == len(set(urls)), 'URL dupliquée dans le CSV')
require(len({a['url'] for a in api_rows}) == len(api_rows), 'URL dupliquée dans l’API')
require(len({a['id'] for a in api_rows}) == len(api_rows), 'identifiant API dupliqué')
by_url = {a['sourceUrl']: a for a in snapshot if a['sourceUrl']}
by_id = {a['id']: a for a in api_rows}
audit = read(EVIDENCE / 'join-audit.json')
require(len(audit['records']) == len(api_rows), 'audit incomplet')
audit_by_id = {r['hemicycleId']: r for r in audit['records']}
require(len(audit_by_id) == len(api_rows), 'identifiant dupliqué dans l’audit')
matched = 0
unmatched = []
for row in api_rows:
    local = by_url.get(row['url'])
    record = audit_by_id.get(row['id'])
    require(record is not None, 'ligne absente de l’audit')
    require(record['sourceUrl'] == row['url'], 'URL audit divergente')
    if local:
        matched += 1
        require(record['match'] == 'exact-source-url' and record['snapshotId'] == local['id'], 'lien audit incorrect')
        require(local['number'] == row['numero'], 'numéro divergent')
        require(local['outcomeRaw'] == row['sort'], 'sort divergent')
    else:
        unmatched.append(row['numero'])
        require(record['match'] == 'unmatched' and record['snapshotId'] is None, 'lien inventé')
require(matched == 31 and unmatched == ['19'], 'couverture différente de la version publiée')
text = archives['senat-textes-620'][0]
dossier = archives['senat-dossier-pfas'][0]
require(len(archives['senat-textes-620']) == len(archives['senat-dossier-pfas']) == 1, 'texte ou dossier ambigu')
require(all(a['texte_id'] == text['id'] for a in api_rows), 'clé étrangère texte invalide')
require(text['numero'] == '620' and text['session_annee'] == 2023, 'mauvais texte/session')
require(text['dossier_signet'] == dossier['signet'] == 'ppl23-514', 'dossier divergent')
sub = next(a for a in api_rows if a['numero'] == '32')
require(by_id[sub['parent_id']]['numero'] == '14', 'parent du n° 32 divergent')
context = read(DATA / 'evidence-context.json')
require(context['hemicycle']['matchedRows'] == matched and context['hemicycle']['rows'] == 32, 'compteurs UI divergents')
require(context['hemicycle']['status'] == 'verified-snapshot', 'statut UI divergent')
require(dossier['numero_loi'] == '2025-188' and dossier['date_loi'] == '2025-02-27', 'référence de loi divergente')
print(json.dumps({'archivesVerified': 3, 'rows': 32, 'exactSourceUrlMatches': matched,
                  'unmatchedNumbers': unmatched, 'textIdJoins': 32, 'dossierJoin': dossier['signet'],
                  'parent32To14': True, 'matchedNumbersAndOutcomesAgree': True}, ensure_ascii=False, indent=2))
