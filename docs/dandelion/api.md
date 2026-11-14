# Contrat d'API DANDELION

Aucun serveur applicatif : l'API REST de Supabase expose directement les huit tables décrites dans [`schema.md`](schema.md).

> **État des preuves.** Les treize lectures (R1 à R13) ont été exécutées le 14 novembre 2026 avec la clé publiable, sous leurs deux formes (HTTP et `supabase-js` 2.119.0), sur le jeu fictif de [`essai-a-blanc.sql`](essai-a-blanc.sql). Aucune syntaxe n'a été refusée ni corrigée. Les réponses ci-dessous sont les réponses réelles ; leurs identifiants appartiennent à ce jeu d'essai, retiré depuis. Les écritures W1 à W6 n'ont pas été exécutées ; seul leur refus avec la clé publiable l'a été.

## Règles générales

- **Base** : `https://mloaychfjhajdjfktcjp.supabase.co/rest/v1`.
- **Lecture** : en-tête `apikey: <clé publiable>`. Côté front, `getSupabaseBrowserClient()` le pose tout seul.
- **Écriture** : clé secrète, depuis les scripts seulement (`getSupabaseAdminClient()`). Avec la clé publiable, toute écriture est refusée (voir [Refus d'écriture](#refus-décriture-avec-la-clé-publiable)).
- **Pagination** : en-tête `Range: 0-999` ou `.range(from, to)`, toujours avec un tri stable (`rang`, puis `id`).
- **Deux temps pour les amendements** : une forme légère pour dessiner l'arbre (R5, sans `dispositif` ni `expose_sommaire`), puis la fiche complète au clic (R7).
- **Tags** : le front-end charge tous les liens d'un type en une requête (R11), puis les regroupe par `tag_list_id` dans le navigateur. Les tags d'un objet se lisent alors par `objet.tag_list_id`.

Dans les formes `supabase-js` ci-dessous, `supabase` désigne `getSupabaseBrowserClient()` et `admin` désigne `getSupabaseAdminClient()`. Dans le dépôt, ces appels vivent dans `apis/<ressource>/request.ts`, enveloppés par `unwrap()` et suivis d'un mapping vers les types de domaine (voir [`README.md`](README.md)). Les `select=*` du contrat peuvent y être réduits aux colonnes réellement utilisées.

## Lecture

### R1. Ouvrir un jeu de données et ses textes

État : **exécutée**, HTTP 200.

```http
GET /rest/v1/datasets?slug=eq.{slug}&select=*,textes(id,uid,titre,slug,etape_texte,tag_list_id)
Accept: application/vnd.pgrst.object+json
```

```ts
supabase.from('datasets').select('*, textes(id, uid, titre, slug, etape_texte, tag_list_id)').eq('slug', slug).single()
```

Réponse pour `slug = essai-a-blanc` :

```json
{
  "id": "a11f9d24-9de3-400b-9497-ac173f4d3a32",
  "slug": "essai-a-blanc",
  "name": "Essai à blanc",
  "description": null,
  "source_label": "Assemblée nationale, données servies par Hémicycle",
  "license": "Licence Ouverte (Etalab 2.0)",
  "perimeter": {},
  "imported_at": "2026-11-14T13:21:40.709522+00:00",
  "tag_list_id": "e64af7fe-34e9-4c5a-a6d4-5a4b8f94460f",
  "textes": [
    {
      "id": "09007189-b4d0-449d-b420-816203385136",
      "uid": "ESSAI-TXT",
      "slug": "essai-texte",
      "titre": "Texte d'essai",
      "etape_texte": null,
      "tag_list_id": "e8855ab0-bbbd-416e-8f90-03acbc502832"
    }
  ]
}
```

### R2. Lister les articles d'un texte, avec leurs alinéas

État : **exécutée**, HTTP 200.

```http
GET /rest/v1/articles?texte_id=eq.{texteId}&select=id,uid,designation,titre,ordre,tag_list_id,alineas(id,numero,tag_list_id)&order=ordre.asc&alineas.order=numero.asc
```

```ts
supabase
  .from('articles')
  .select('id, uid, designation, titre, ordre, tag_list_id, alineas(id, numero, tag_list_id)')
  .eq('texte_id', texteId)
  .order('ordre')
  .order('numero', { referencedTable: 'alineas' })
```

Réponse :

```json
[
  {
    "id": "5f31b773-5d60-4f08-b9cc-3c13bfc0a2e4",
    "uid": "ESSAI-ART3",
    "designation": "Article 3",
    "titre": null,
    "ordre": 3,
    "tag_list_id": "13cbbcf3-1715-4b6c-8c0a-abe17adae31e",
    "alineas": [
      {
        "id": "0f4dd7ec-c18f-4b6e-9a60-1d7fd43dd037",
        "numero": 2,
        "tag_list_id": "7d14797b-b723-4f65-914b-e6fbd16514d8"
      }
    ]
  }
]
```

### R3. Lister tous les alinéas d'un texte, à plat

État : **exécutée**, HTTP 200.

```http
GET /rest/v1/alineas?texte_id=eq.{texteId}&select=id,article_id,numero,designation,tag_list_id&order=article_id.asc,numero.asc
```

```ts
supabase
  .from('alineas')
  .select('id, article_id, numero, designation, tag_list_id')
  .eq('texte_id', texteId)
  .order('article_id')
  .order('numero')
```

Réponse :

```json
[
  {
    "id": "0f4dd7ec-c18f-4b6e-9a60-1d7fd43dd037",
    "article_id": "5f31b773-5d60-4f08-b9cc-3c13bfc0a2e4",
    "numero": 2,
    "designation": null,
    "tag_list_id": "7d14797b-b723-4f65-914b-e6fbd16514d8"
  }
]
```

### R4. Lire un article et le texte de ses alinéas

État : **exécutée**, HTTP 200.

```http
GET /rest/v1/articles?id=eq.{articleId}&select=*,alineas(id,numero,designation,dispositif,tag_list_id)&alineas.order=numero.asc
Accept: application/vnd.pgrst.object+json
```

```ts
supabase
  .from('articles')
  .select('*, alineas(id, numero, designation, dispositif, tag_list_id)')
  .eq('id', articleId)
  .order('numero', { referencedTable: 'alineas' })
  .single()
```

Réponse :

```json
{
  "id": "5f31b773-5d60-4f08-b9cc-3c13bfc0a2e4",
  "dataset_id": "a11f9d24-9de3-400b-9497-ac173f4d3a32",
  "texte_id": "09007189-b4d0-449d-b420-816203385136",
  "uid": "ESSAI-ART3",
  "designation": "Article 3",
  "titre": null,
  "dispositif": null,
  "ordre": 3,
  "tag_list_id": "13cbbcf3-1715-4b6c-8c0a-abe17adae31e",
  "alineas": [
    {
      "id": "0f4dd7ec-c18f-4b6e-9a60-1d7fd43dd037",
      "numero": 2,
      "dispositif": null,
      "designation": null,
      "tag_list_id": "7d14797b-b723-4f65-914b-e6fbd16514d8"
    }
  ]
}
```

### R5. Lister les amendements d'un texte

État : **exécutée**, HTTP 200, en-tête de réponse `Content-Range: 0-2/3`.

```http
GET /rest/v1/amendements?texte_id=eq.{texteId}&select=id,uid,numero_long,article_id,division_avant_apres,alinea_id,amendement_parent_id,rang,sort,groupe_politique_ref,discussion_commune,discussion_identique,tag_list_id&order=rang.asc,id.asc
Range: 0-999
Prefer: count=exact
```

```ts
supabase
  .from('amendements')
  .select(
    'id, uid, numero_long, article_id, division_avant_apres, alinea_id, amendement_parent_id, rang, sort, groupe_politique_ref, discussion_commune, discussion_identique, tag_list_id',
    { count: 'exact' }
  )
  .eq('texte_id', texteId)
  .order('rang')
  .order('id')
  .range(0, 999)
```

Le total est après la barre oblique de `Content-Range` (`count` côté `supabase-js`, ici `3`). Pour un texte de plus de mille amendements, répéter avec `.range(1000, 1999)`, etc., jusqu'à atteindre ce total.

Réponse : l'amendement 12 (vise l'article, précise l'alinéa), le 45 (sous-amendement du 12), le 30 (article additionnel).

```json
[
  {
    "id": "9609a2e1-0c12-4762-be1f-965776ece024",
    "uid": "ESSAI-A12",
    "numero_long": "12",
    "article_id": "5f31b773-5d60-4f08-b9cc-3c13bfc0a2e4",
    "division_avant_apres": "A",
    "alinea_id": "0f4dd7ec-c18f-4b6e-9a60-1d7fd43dd037",
    "amendement_parent_id": null,
    "rang": 1,
    "sort": "retire",
    "groupe_politique_ref": null,
    "discussion_commune": null,
    "discussion_identique": null,
    "tag_list_id": "103779d4-e0a2-4863-a9b6-c7244c02a1ad"
  },
  {
    "id": "bc964f3f-82f8-4d19-adb6-ae0d6a13ea67",
    "uid": "ESSAI-A45",
    "numero_long": "45",
    "article_id": "5f31b773-5d60-4f08-b9cc-3c13bfc0a2e4",
    "division_avant_apres": "A",
    "alinea_id": null,
    "amendement_parent_id": "9609a2e1-0c12-4762-be1f-965776ece024",
    "rang": 2,
    "sort": "en_attente",
    "groupe_politique_ref": null,
    "discussion_commune": null,
    "discussion_identique": null,
    "tag_list_id": "c9669792-0841-435c-bc1a-f3dda355ba69"
  },
  {
    "id": "2d18f2c9-026a-4116-be08-5504ecb23554",
    "uid": "ESSAI-A30",
    "numero_long": "30",
    "article_id": "5f31b773-5d60-4f08-b9cc-3c13bfc0a2e4",
    "division_avant_apres": "APRES",
    "alinea_id": null,
    "amendement_parent_id": null,
    "rang": 3,
    "sort": "en_attente",
    "groupe_politique_ref": null,
    "discussion_commune": null,
    "discussion_identique": null,
    "tag_list_id": "6f994dd0-a754-4e9b-855b-4487f28ef944"
  }
]
```

### R6. Filtrer les amendements

État : **exécutée**, HTTP 200 pour les six filtres.

```http
GET /rest/v1/amendements?article_id=eq.{articleId}
GET /rest/v1/amendements?alinea_id=eq.{alineaId}
GET /rest/v1/amendements?amendement_parent_id=eq.{amendementId}
GET /rest/v1/amendements?texte_id=eq.{texteId}&sort=eq.adopte
GET /rest/v1/amendements?texte_id=eq.{texteId}&division_avant_apres=neq.A
GET /rest/v1/amendements?texte_id=eq.{texteId}&discussion_commune=eq.{cle}
```

```ts
supabase.from('amendements').select(colonnes).eq('article_id', articleId)
supabase.from('amendements').select(colonnes).eq('alinea_id', alineaId)
supabase.from('amendements').select(colonnes).eq('amendement_parent_id', amendementId)
supabase.from('amendements').select(colonnes).eq('texte_id', texteId).eq('sort', 'adopte')
supabase.from('amendements').select(colonnes).eq('texte_id', texteId).neq('division_avant_apres', 'A')
supabase.from('amendements').select(colonnes).eq('texte_id', texteId).eq('discussion_commune', cle)
```

`colonnes` est la liste légère de R5. Ajouter le tri `rang`, `id` dès que le résultat est paginé.

Réponses, exécutées avec `select=numero_long,sort,division_avant_apres` pour rester lisibles :

| Filtre                                    | Réponse                                             |
| ----------------------------------------- | --------------------------------------------------- |
| `article_id=eq.{article 3}`               | les amendements 12, 45 et 30                        |
| `alinea_id=eq.{alinéa 2}`                 | l'amendement 12                                     |
| `amendement_parent_id=eq.{amendement 12}` | l'amendement 45                                     |
| `sort=eq.adopte`                          | `[]` : le jeu d'essai n'a aucun adopté              |
| `sort=eq.retire`                          | l'amendement 12                                     |
| `division_avant_apres=neq.A`              | l'amendement 30                                     |
| `discussion_commune=eq.inconnue`          | `[]` : le jeu d'essai n'a aucune discussion commune |

Réponse du filtre par article :

```json
[
  {
    "numero_long": "12",
    "sort": "retire",
    "division_avant_apres": "A"
  },
  {
    "numero_long": "45",
    "sort": "en_attente",
    "division_avant_apres": "A"
  },
  {
    "numero_long": "30",
    "sort": "en_attente",
    "division_avant_apres": "APRES"
  }
]
```

### R7. Ouvrir la fiche d'un amendement

État : **exécutée**, HTTP 200.

```http
GET /rest/v1/amendements?id=eq.{amendementId}&select=*,article:articles(designation,titre),alinea:alineas(numero,designation)
Accept: application/vnd.pgrst.object+json
```

```ts
supabase
  .from('amendements')
  .select('*, article:articles(designation, titre), alinea:alineas(numero, designation)')
  .eq('id', amendementId)
  .single()
```

Réponse pour l'amendement 12. `alinea` vaut `null` quand l'amendement vise l'article entier.

```json
{
  "id": "9609a2e1-0c12-4762-be1f-965776ece024",
  "dataset_id": "a11f9d24-9de3-400b-9497-ac173f4d3a32",
  "texte_id": "09007189-b4d0-449d-b420-816203385136",
  "uid": "ESSAI-A12",
  "numero_long": "12",
  "article_id": "5f31b773-5d60-4f08-b9cc-3c13bfc0a2e4",
  "division_titre": null,
  "division_avant_apres": "A",
  "alinea_id": "0f4dd7ec-c18f-4b6e-9a60-1d7fd43dd037",
  "amendement_parent_id": null,
  "amendement_parent": null,
  "tri_amendement": null,
  "rang": 1,
  "sort": "retire",
  "sort_en_seance": null,
  "etat": null,
  "sous_etat": null,
  "dispositif": null,
  "expose_sommaire": null,
  "signataires_affichable": null,
  "acteur_ref": null,
  "type_auteur": null,
  "groupe_politique_ref": null,
  "discussion_commune": null,
  "discussion_identique": null,
  "date_depot": null,
  "date_sort": null,
  "document_uri": null,
  "tag_list_id": "103779d4-e0a2-4863-a9b6-c7244c02a1ad",
  "article": {
    "titre": null,
    "designation": "Article 3"
  },
  "alinea": {
    "numero": 2,
    "designation": null
  }
}
```

### R8. Charger la légende des sorts

État : **exécutée**, HTTP 200. C'est aussi la lecture du script `scripts/verify-supabase-read.mjs`.

```http
GET /rest/v1/sorts?order=display_order.asc
```

```ts
supabase.from('sorts').select('code, label, display_order, color_token').order('display_order')
```

Réponse :

```json
[
  {
    "code": "adopte",
    "label": "Voté : le texte est modifié",
    "display_order": 1,
    "color_token": "--sort-adopte"
  },
  {
    "code": "rejete",
    "label": "Repoussé par un vote : le texte ne change pas",
    "display_order": 2,
    "color_token": "--sort-rejete"
  },
  {
    "code": "tombe",
    "label": "Devenu sans objet après l'adoption d'un autre amendement",
    "display_order": 3,
    "color_token": "--sort-non-vote"
  },
  {
    "code": "retire",
    "label": "Son auteur y a renoncé",
    "display_order": 4,
    "color_token": "--sort-non-vote"
  },
  {
    "code": "non_soutenu",
    "label": "Personne ne l'a défendu en séance",
    "display_order": 5,
    "color_token": "--sort-non-vote"
  },
  {
    "code": "irrecevable",
    "label": "Écarté avant le débat, car contraire aux règles de dépôt",
    "display_order": 6,
    "color_token": "--sort-irrecevable"
  },
  {
    "code": "en_attente",
    "label": "Pas encore examiné",
    "display_order": 7,
    "color_token": "--sort-en-attente"
  },
  {
    "code": "autre",
    "label": "Sort non reconnu : à vérifier",
    "display_order": 8,
    "color_token": "--sort-en-attente"
  }
]
```

### R9. Lister le vocabulaire de tags

État : **exécutée**, HTTP 200.

```http
GET /rest/v1/tags?category=eq.{category}&order=label.asc
```

```ts
supabase.from('tags').select('id, slug, label, category, description').eq('category', category).order('label')
```

Réponse pour `category = theme` :

```json
[
  {
    "id": "280ee371-b26b-405e-9305-cf3d95300763",
    "slug": "essai-budget",
    "label": "Essai budget",
    "category": "theme",
    "description": null
  },
  {
    "id": "1e9eebf8-09f3-4447-8eaf-3af330b2f5f7",
    "slug": "essai-fiscalite",
    "label": "Essai fiscalité",
    "category": "theme",
    "description": null
  }
]
```

### R10. Lire tous les tags d'un objet

État : **exécutée**, HTTP 200.

```http
GET /rest/v1/tag_links?tag_list_id=eq.{tagListId}&select=source,confidence,model,tags(slug,label,category)
```

```ts
supabase.from('tag_links').select('source, confidence, model, tags(slug, label, category)').eq('tag_list_id', tagListId)
```

Réponse pour le `tag_list_id` de l'amendement 12 :

```json
[
  {
    "source": "inference",
    "confidence": 0.82,
    "model": "essai",
    "tags": {
      "slug": "essai-fiscalite",
      "label": "Essai fiscalité",
      "category": "theme"
    }
  },
  {
    "source": "manual",
    "confidence": null,
    "model": null,
    "tags": {
      "slug": "essai-budget",
      "label": "Essai budget",
      "category": "theme"
    }
  }
]
```

### R11. Charger tous les liens de tags d'un type, pour un jeu

État : **exécutée**, HTTP 200.

```http
GET /rest/v1/tag_links?dataset_id=eq.{datasetId}&target_type=eq.amendement&select=tag_list_id,tag_id,source,confidence&order=id.asc
Range: 0-999
```

```ts
supabase
  .from('tag_links')
  .select('tag_list_id, tag_id, source, confidence')
  .eq('dataset_id', datasetId)
  .eq('target_type', 'amendement')
  .order('id')
  .range(0, 999)
```

Réponse : deux liens, tous deux sur l'amendement 12, donc le même `tag_list_id`.

```json
[
  {
    "tag_list_id": "103779d4-e0a2-4863-a9b6-c7244c02a1ad",
    "tag_id": "1e9eebf8-09f3-4447-8eaf-3af330b2f5f7",
    "source": "inference",
    "confidence": 0.82
  },
  {
    "tag_list_id": "103779d4-e0a2-4863-a9b6-c7244c02a1ad",
    "tag_id": "280ee371-b26b-405e-9305-cf3d95300763",
    "source": "manual",
    "confidence": null
  }
]
```

### R12. Trouver les objets qui portent un tag

État : **exécutée**, HTTP 200 pour les deux requêtes.

```http
GET /rest/v1/tag_links?dataset_id=eq.{datasetId}&target_type=eq.amendement&tag_id=eq.{tagId}&select=tag_list_id

GET /rest/v1/amendements?tag_list_id=in.({liste})&select=id,numero_long,sort
```

```ts
const liens = await supabase
  .from('tag_links')
  .select('tag_list_id')
  .eq('dataset_id', datasetId)
  .eq('target_type', 'amendement')
  .eq('tag_id', tagId)

supabase
  .from('amendements')
  .select('id, numero_long, sort')
  .in(
    'tag_list_id',
    liens.data.map((lien) => lien.tag_list_id)
  )
```

Si R11 est déjà chargée, le filtre se fait dans le navigateur sans requête.

Réponses pour le tag `essai-fiscalite` : d'abord les listes, puis les amendements.

```json
[
  {
    "tag_list_id": "103779d4-e0a2-4863-a9b6-c7244c02a1ad"
  }
]
```

```json
[
  {
    "id": "9609a2e1-0c12-4762-be1f-965776ece024",
    "numero_long": "12",
    "sort": "retire"
  }
]
```

### R13. Compter sans charger

État : **exécutée**, HTTP 200, corps vide, en-tête de réponse `Content-Range: 0-2/3`.

```http
HEAD /rest/v1/amendements?texte_id=eq.{texteId}
Prefer: count=exact
```

```ts
supabase.from('amendements').select('*', { count: 'exact', head: true }).eq('texte_id', texteId)
```

Le total est après la barre oblique de `Content-Range` (`count` côté `supabase-js`, ici `3`).

## Refus d'écriture avec la clé publiable

État : **exécutée**. Les trois verbes d'écriture sont refusés en HTTP 401, code PostgreSQL `42501`.

```http
POST /rest/v1/tags
Content-Type: application/json

{ "slug": "essai-refus", "label": "refus attendu" }
```

Réponse :

```json
{
  "code": "42501",
  "details": null,
  "hint": "Grant the required privileges to the current role with: GRANT INSERT ON public.tags TO anon;",
  "message": "permission denied for table tags"
}
```

`PATCH` et `DELETE` sur `/rest/v1/tags` rendent la même erreur. Côté `supabase-js`, un `upsert` avec la clé publiable rend `status: 401` et `error.code: '42501'`.

## Écriture, scripts seuls

Clé secrète uniquement. État : **non exécutées**. L'essai à blanc écrit en SQL, pas par l'API REST : ces formes restent à valider par le script d'import.

Deux précautions pour les scripts :

- **Ne jamais envoyer `tag_list_id`** sur un objet : la base le génère à la création et un `upsert` qui ne le mentionne pas le conserve.
- **Mêmes clés dans toutes les lignes d'un lot.** Dans un envoi groupé, une colonne absente d'une ligne mais présente dans une autre peut être envoyée à `null` au lieu de prendre sa valeur par défaut, ce que refusent `sort` et `division_avant_apres` (`not null`). Donner les mêmes clés à toutes les lignes du lot. Ce point vient du comportement documenté de `supabase-js`, pas d'un essai sur cette base.

### W1. Créer ou mettre à jour le jeu et son texte

```http
POST /rest/v1/datasets?on_conflict=slug
Prefer: resolution=merge-duplicates,return=representation

POST /rest/v1/textes?on_conflict=uid
Prefer: resolution=merge-duplicates,return=representation
```

```ts
admin.from('datasets').upsert(dataset, { onConflict: 'slug' }).select().single()
admin.from('textes').upsert(texte, { onConflict: 'uid' }).select().single()
```

### W2. Charger les articles et les alinéas

```http
POST /rest/v1/articles?on_conflict=uid
Prefer: resolution=merge-duplicates,return=representation

POST /rest/v1/alineas?on_conflict=article_id,numero
Prefer: resolution=merge-duplicates,return=representation
```

```ts
admin.from('articles').upsert(articles, { onConflict: 'uid' }).select()
admin.from('alineas').upsert(alineas, { onConflict: 'article_id,numero' }).select()
```

### W3. Charger les amendements, en deux passes

Première passe : tous les amendements, sans parent. Seconde passe : le lien vers le parent, une fois que tous les `id` existent.

```http
POST /rest/v1/amendements?on_conflict=uid
Prefer: resolution=merge-duplicates

PATCH /rest/v1/amendements?uid=eq.{uid}
{ "amendement_parent_id": "…" }
```

```ts
admin.from('amendements').upsert(amendements, { onConflict: 'uid' })
admin.from('amendements').update({ amendement_parent_id: parentId }).eq('uid', uid)
```

### W4. Poser le vocabulaire de tags

```http
POST /rest/v1/tags?on_conflict=slug
Prefer: resolution=merge-duplicates
```

```ts
admin.from('tags').upsert(tags, { onConflict: 'slug' })
```

### W5. Poser des tags sur des objets

Le `tag_list_id` se lit sur l'objet étiqueté ; `dataset_id` et `target_type` se recopient depuis lui.

```http
POST /rest/v1/tag_links?on_conflict=tag_list_id,tag_id
Prefer: resolution=merge-duplicates
```

```ts
admin.from('tag_links').upsert(liens, { onConflict: 'tag_list_id,tag_id' })
```

### W6. Retirer les tags d'un passage d'inférence

```http
DELETE /rest/v1/tag_links?dataset_id=eq.{datasetId}&source=eq.inference&model=eq.{model}
```

```ts
admin.from('tag_links').delete().eq('dataset_id', datasetId).eq('source', 'inference').eq('model', model)
```
