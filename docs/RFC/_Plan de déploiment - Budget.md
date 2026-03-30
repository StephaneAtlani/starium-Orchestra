# 📊 Budget — ce qu’il reste à faire


| RFC / Phase                      | Nom                                     | Description                                                                                                                                                       | État                    |
| -------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| RFC-022 + FE Dashboard           | Cockpit Budget & Dashboard              | Finaliser le cockpit DG/DAF : KPI, drill-down, cohérence navigation enveloppe → ligne, finition widgets et parcours hors grille                                   | ⚠️ Partiel              |
| RFC-023 / RFC-024 + RFC-FE-029   | Planning budgétaire mensuel             | Compléter la parité fonctionnelle avec tous les scénarios de planning, renforcer l’UX tableur, tests E2E métier et cohérence complète HT/TTC / forecast / landing | ⚠️ Partiel              |
| RFC-024 + RFC-FE-030/031         | Cellule intelligente & calculs          | Expliquer les montants d’une cellule : forecast, committed, consumed, allocations, événements, traçabilité détaillée via drawer                                   | ❌ À faire               |
| RFC-029 + RFC-FE-032/033         | Vue enveloppe & atterrissage            | Construire la vraie vue de pilotage enveloppe : KPI, comparatifs revised / forecast / consumed, projection fin d’année                                            | ❌ À faire               |
| Nouveau RFC Budget Workflow      | Workflow budgétaire                     | Mettre en place le cycle DRAFT → SUBMITTED → VALIDATED, rôles de validation DAF/DG, verrouillage après validation                                                 | ❌ À faire               |
| RFC-031 + RFC-FE-035             | Déversement & allocation stratégique    | Permettre la répartition réelle des décisions budgétaires vers les bonnes lignes / enveloppes avec UX dédiée                                                      | ❌ À faire               |
| Extension RFC-016 + UI Alertes   | Alerting avancé & règles personnalisées | Ajouter règles complexes, seuils multi-critères, personnalisation, historique des alertes et UX de paramétrage                                                    | ❌ À faire               |
| RFC-019 + RFC-015-3 + UI compare | Versioning & snapshots exploitables     | Rendre les snapshots et versions réellement exploitables côté métier : comparaison UI, timeline, lecture des écarts                                               | ⚠️ Backend OK / Front ❌ |
| RFC-021                          | Axes analytiques                        | Ajouter comptes comptables, comptes analytiques, cost centers, splits analytiques, lecture DAF-ready                                                              | ❌ À faire               |
| RFC-025 + UI procurement         | Intégration procurement                 | Exploiter pleinement les PO / factures / engagements côté UX budget pour relier budget au réel achats                                                             | ⚠️ Partiel              |
| RFC-018 + UI import              | Import / Export & interop               | Construire le wizard d’import UI : upload, mapping, preview, exécution, lecture des erreurs et réutilisation mapping                                              | ⚠️ Backend OK / Front ❌ |
| Extension reporting multi-client | Vue multi-client                        | Cockpit transversal DSI à temps partagé pour consolider plusieurs clients                                                                                         | ❌ À faire               |


# ✅ Ce qui est déjà solide


| RFC        | Nom                       | Description                                   | État      |
| ---------- | ------------------------- | --------------------------------------------- | --------- |
| RFC-015-2  | Budget Management Backend | CRUD exercices, budgets, enveloppes, lignes   | ✅ Terminé |
| RFC-015-1B | Financial Core            | Allocations, événements, recalculs financiers | ✅ Terminé |
| RFC-016    | Budget Reporting API      | KPI et agrégations budgétaires                | ✅ Terminé |
| RFC-015-3  | Snapshots budgétaires     | Historisation backend                         | ✅ Terminé |
| RFC-019    | Budget Versioning         | Versioning backend                            | ✅ Terminé |
| RFC-018    | Budget Data Import        | Backend import/mapping/preview/execute        | ✅ Terminé |
| RFC-017    | Budget Reallocation       | Réallocation budgétaire                       | ✅ Terminé |
| RFC-021    | Analytical Dimensions     | Prévu mais non livré                          | ❌ À faire |


Les RFC backend déjà abouties sont bien documentées dans l’état du module budget, le reporting, les snapshots, le versioning et l’import.    

# 🔴 Les vrais manques produit


| Domaine       | Ce qui manque réellement                                                               |
| ------------- | -------------------------------------------------------------------------------------- |
| Pilotage      | Le cockpit existe en MVP mais n’est pas encore totalement “DAF / DG ready”             |
| Explicabilité | Impossible aujourd’hui d’expliquer proprement une cellule ou un écart de façon fluide  |
| Gouvernance   | Pas encore de workflow budgétaire métier complet                                       |
| Analytique    | Pas encore de lecture comptable / analytique exploitable                               |
| Adoption      | Import/versioning/snapshots restent peu exploitables tant que l’UI métier n’existe pas |
| Réel achats   | L’intégration procurement n’est pas encore assez visible côté budget                   |


# 🎯 Priorité réelle recommandée


| Priorité | Sujet                      | Pourquoi                                            |
| -------- | -------------------------- | --------------------------------------------------- |
| 🔥 1     | Cockpit Budget & Dashboard | C’est la vitrine métier DG/DAF                      |
| 🔥 2     | Planning mensuel           | C’est le cœur de remplacement d’Excel               |
| 🔥 3     | Cellule intelligente       | Nécessaire pour rendre les chiffres compréhensibles |
| 🔥 4     | Vue enveloppe & landing    | Nécessaire pour le pilotage intermédiaire           |
| 🔥 5     | Workflow budgétaire        | Nécessaire pour la gouvernance                      |
| 🔥 6     | Axes analytiques           | Nécessaire pour la DAF                              |
| 🔥 7     | Import UI + versioning UI  | Nécessaire pour l’adoption réelle                   |
| 🔥 8     | Alerting avancé            | À faire après le socle cockpit/pilotage             |


# 🧠 Conclusion

Le module budget est **très avancé techniquement côté backend**, mais il reste encore à transformer ce socle en **vrai cockpit métier exploitable**. Le plus gros du travail restant n’est plus dans la donnée, mais dans :

- la finition cockpit,
- l’explicabilité des montants,
- le workflow,
- l’analytique,
- et l’UX métier complète.

