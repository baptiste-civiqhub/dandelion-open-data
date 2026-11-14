"""Build one audited, historical PLFSS example from frozen public Hémicycle data.

Offline, no credentials. Run from the repository root. Fails before writing if
archives, pagination, identities or official vote totals do not reconcile.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAMES = [
    'plfss-scrutin-4662', 'plfss-votes-4662-p1', 'plfss-votes-4662-p2',
    'plfss-amendement-346', 'plfss-groupes-17', 'plfss-texte-2141'
]


def build(data_dir):
    base = data_dir / 'evidence'
    archives, provenance = {}, {}
    for name in NAMES:
        raw = (base / (name + '.json')).read_bytes()
        meta = json.loads((base / (name + '-provenance.json')).read_text())
        assert hashlib.sha256(raw).hexdigest() == meta['sha256'], name + ': hash mismatch'
        data = json.loads(raw)
        assert data['nombre'] == len(data['lignes']), name + ': count mismatch'
        assert data['tronque'] is False, name + ': truncated response'
        archives[name], provenance[name] = data, meta

    first, last = [archives[f'plfss-votes-4662-p{i}'] for i in (1, 2)]
    assert first['decalage_suivant'] == 200 and last['decalage_suivant'] is None
    assert provenance['plfss-votes-4662-p2']['query']['decalage'] == 200
    for name in NAMES:
        if name != 'plfss-votes-4662-p1':
            assert archives[name]['decalage_suivant'] is None, name + ': incomplete'

    scrutin_rows = archives['plfss-scrutin-4662']['lignes']
    assert len(scrutin_rows) == 1
    scrutin = scrutin_rows[0]
    assert scrutin['uid'] == 'VTANR5L17V4662'
    votes = first['lignes'] + last['lignes']
    assert len({v['acteur_ref'] for v in votes}) == len(votes), 'duplicate voter'
    assert all(v['scrutin_ref'] == scrutin['uid'] for v in votes)
    totals = collections.Counter(v['position'] for v in votes)
    assert set(totals) <= {'pour', 'contre', 'abstention', 'nonVotant'}
    for position, field in [('pour', 'nb_pour'), ('contre', 'nb_contre'),
                            ('abstention', 'nb_abstentions'), ('nonVotant', 'nb_non_votants')]:
        assert totals[position] == scrutin[field], position + ': aggregate mismatch'
    assert totals['pour'] + totals['contre'] == scrutin['suffrages_exprimes']
    assert totals['pour'] + totals['contre'] + totals['abstention'] == scrutin['nombre_votants']
    assert [totals[k] for k in ('pour', 'contre', 'abstention')] == [132, 77, 7], 'official-page cross-check'

    # Number alone is ambiguous: AS346 and 346 belong to different examination bodies.
    candidates = archives['plfss-amendement-346']['lignes']
    matches = [a for a in candidates if a['ref_texte_legislatif'] == 'PRJLANR5L17B2141'
               and a['numero'] == '346' and a['organe_examen'] == 'AN']
    assert len(matches) == 1, 'ambiguous amendment'
    amendment = matches[0]
    assert amendment['uid'] == 'AMANR5L17PO838901B2141P0D1N000346'
    assert amendment['sort_en_seance'] == 'Adopté' and amendment['division_titre'] == 'Article 42'
    assert amendment['seance_discussion'] == scrutin['seance_ref']
    documents = archives['plfss-texte-2141']['lignes']
    assert len(documents) == 1 and documents[0]['uid'] == amendment['ref_texte_legislatif']
    document = documents[0]
    assert document['dossier_ref'] == 'DLR5L17N52922'

    org_rows = archives['plfss-groupes-17']['lignes']
    organes = {o['uid']: o for o in org_rows}
    assert len(organes) == len(org_rows)
    by_group = collections.defaultdict(collections.Counter)
    for vote in votes:
        org = organes[vote['groupe_ref']]
        assert org['date_debut'] <= scrutin['date_scrutin']
        assert org['date_fin'] is None or org['date_fin'] >= scrutin['date_scrutin']
        by_group[vote['groupe_ref']][vote['position']] += 1
    groups = []
    for uid, positions in sorted(by_group.items()):
        denominator = sum(positions[k] for k in ('pour', 'contre', 'abstention'))
        groups.append({
            'id': uid, 'label': organes[uid]['libelle'], 'abbreviation': organes[uid]['sigle'],
            'counts': {k: positions[k] for k in ('pour', 'contre', 'abstention', 'nonVotant')},
            'votingParticipants': denominator,
            'supportShareAmongParticipants': positions['pour'] / denominator if denominator else None,
        })

    result = {
        'schemaVersion': 1,
        'question': 'Quel vote a avancé la date prévue du congé supplémentaire de naissance ?',
        'questionKind': 'editorial-example',
        'scope': 'PLFSS 2026, nouvelle lecture, séance du 5 décembre 2025 : un vote historique, pas une réponse sur vos droits actuels.',
        'retrievedAtUtc': max(p['retrievedAtUtc'] for p in provenance.values()),
        'provider': 'Hémicycle API', 'upstreamPublisher': 'Assemblée nationale',
        'licence': 'Licence Ouverte (Etalab)',
        'licenceUrl': 'https://data.assemblee-nationale.fr/licence-ouverte-open-licence',
        'sources': [
            {'id': 'scrutin-official', 'url': 'https://www.assemblee-nationale.fr/dyn/17/scrutins/4662'},
            {'id': 'amendment-official', 'url': 'https://www.assemblee-nationale.fr/dyn/17/amendements/2141/AN/346'},
            {'id': 'hemicycle-api', 'url': 'https://api.hemicycle.ai/v1/jeux/interroger'},
        ],
        'scrutin': {k: scrutin[k] for k in ['uid', 'numero', 'titre', 'date_scrutin', 'sort_libelle',
                    'nombre_votants', 'suffrages_exprimes', 'nb_pour', 'nb_contre', 'nb_abstentions', 'nb_non_votants']},
        'amendment': {k: amendment[k] for k in ['uid', 'numero', 'organe_examen', 'ref_texte_legislatif',
                    'division_titre', 'dispositif', 'expose_sommaire', 'sort_en_seance', 'date_sort']},
        'document': document,
        'groups': groups,
        'joins': [
            {'from': 'votes.scrutin_ref', 'to': 'scrutins.uid', 'method': 'exact-foreign-key', 'matchedRows': len(votes)},
            {'from': 'votes.groupe_ref', 'to': 'organes.uid', 'method': 'exact-foreign-key-with-date-check', 'matchedRows': len(votes)},
            {'from': 'amendements.ref_texte_legislatif', 'to': 'documents.uid', 'method': 'exact-foreign-key', 'matchedRows': 1},
            {'from': scrutin['uid'], 'to': amendment['uid'], 'method': 'official-page-link-and-composite-key',
             'evidence': 'Page officielle du scrutin → /dyn/17/amendements/2141/AN/346 ; texte + organe AN + numéro 346, séance identique. Le seul numéro 346 donne deux résultats.',
             'sourceIds': ['scrutin-official', 'amendment-official']},
        ],
        'limitations': [
            'Une source primaire (Assemblée nationale), distribuée par Hémicycle : ce ne sont pas deux observations indépendantes.',
            '217 lignes nominatives : 216 participants au vote et 1 non-votant explicite. Ce jeu ne décrit pas les 577 sièges ni tous les absents.',
            'Pourcentage par groupe : pour / (pour + contre + abstentions). Afficher les effectifs avec les pourcentages. Ne pas confondre avec un pourcentage de tous les membres du groupe.',
            'La fiche du scrutin est datée du 5 décembre ; le sort de l’amendement est horodaté le 6 décembre après minuit. Conserver ces deux horodatages.',
            'Le vote porte aussi sur des amendements identiques ; il ne prouve pas une attribution exclusive de la mesure au premier signataire.',
            'Les corrections de vote annoncées après le scrutin ne sont pas réintégrées au résultat officiel.',
            'Le passage du projet à la loi promulguée puis aux décrets et au droit actuel demande des vérifications supplémentaires.',
        ],
        'archives': [{'file': n + '.json', 'sha256': provenance[n]['sha256'], 'query': provenance[n]['query']} for n in NAMES],
    }
    target = data_dir / 'naissance-evidence.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': 'verified', 'votes': len(votes), 'participants': scrutin['nombre_votants'],
                      'groups': len(groups), 'amendmentCandidates': len(candidates), 'selected': amendment['uid'],
                      'output': str(target)}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, default=ROOT / 'data/plfss')
    build(parser.parse_args().data_dir)
