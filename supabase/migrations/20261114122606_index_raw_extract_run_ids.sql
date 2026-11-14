create index documents_extract_run_id_idx on raw.documents (extract_run_id);
create index dossiers_extract_run_id_idx on raw.dossiers (extract_run_id);
create index actes_extract_run_id_idx on raw.actes (extract_run_id);
create index articles_textes_extract_run_id_idx on raw.articles_textes (extract_run_id);
create index amendements_extract_run_id_idx on raw.amendements (extract_run_id);;
