# Dépôts observés et contribution Suzan AI — 14 novembre 2026

Implémenter le cadrage demandé par Wilfred à partir du handoff Claude 8d6f3c2, sans fusion de sa branche ni modèle prédictif. Lire `date_depot` et `type_auteur` dans les résumés déjà paginés. Calculer un contrat `observed_change` par article : dépôts datés, dont Gouvernement, dates et liens fournis ; exclure les doublons, dates futures/invalides et distinguer les ajouts avant/après l’article.

Le contrat ne peut annoncer « avant examen » que si une date officielle sourcée et un périmètre d’étape vérifié sont fournis. Ces deux éléments manquent dans l’import actuel : afficher le nombre de dépôts observés dans le corpus, sans probabilité ni affirmation de changement effectif. Compter explicitement les dates manquantes et liens absents ; un zéro signifie aucun dépôt daté dans le périmètre chargé, jamais absence de changement futur.

Ajouter un widget de veille à la fleur API, sans affecter les corpus archivés. Ajouter le logo officiel Suzan AI à À propos avec le texte validé par Wilfred : « Avec le soutien de Suzan AI, nous préparons la revue de gouvernance, conformité et sécurité de Dandelion : RGPD, AI Act et ISO/IEC 27001:2022. » Aucun certificat ni résultat d’audit annoncé.

Vérification : tests des dates, coupures, périmètres, doublons, Gouvernement, absence de probabilité ; scénario navigateur avec données techniques clairement synthétiques ; contrôles du dépôt. Mettre à jour séparément deck et vidéo V3 en conservant V2. Les chiffres historiques restent une étude exploratoire locale sur 15 lois de test (2018–2021), pas une mesure prospective du produit. Le suivi d’une disposition entre versions reste une direction de produit tant que l’import ne fournit pas plusieurs versions.
