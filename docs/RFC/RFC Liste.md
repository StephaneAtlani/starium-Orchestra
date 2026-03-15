| RFC            | Nom                    | Objectif                                      | Priorité | État         |
| -------------- | ---------------------- | --------------------------------------------- | -------- | ------------ |
| **RFC-015-1A** | Budget Prisma Schema   | Modèle de données budgets                     | Haute    | ✅ Terminé   |
| **RFC-015-1B** | Financial Core         | Allocations, événements et recalcul financier | Haute    | ✅ Terminé   |
| **RFC-015-2**  | Budget Management API  | CRUD exercices, budgets, enveloppes, lignes   | Haute    | ✅ Terminé   |
| **RFC-015-3**  | Budget Snapshots       | Historisation des budgets                     | Haute    | ✅ Terminé   |
| **RFC-016**    | Budget Reporting API   | KPI et agrégations budgétaires                | Haute    | ✅ Terminé   |
| **RFC-017**    | Budget Reallocation    | Transfert budgétaire entre lignes             | Moyenne  | ✅ Terminé   |
| **RFC-018**    | Budget Import / Export | Import / export Excel                         | Moyenne  | ✅ Terminé terminé |
| **RFC-019**    | Budget Versioning      | Baselines et versions                         | Moyenne  | ✅ Terminé   |
| **RFC-020**    | Budget Workflow        | Validation budgétaire                         | Moyenne  | Annulé      |
| **RFC-021**    | Analytical Dimensions  | Comptes comptables, ventilation par centres de coûts | Haute    | ✅ Terminé   |
| **RFC-022**    | Budget Dashboard API   | API cockpit de pilotage                       | Haute    | ✅ Terminé   |


| Ordre  | RFC            | Nom                                   | Objectif                                                                                                                 | Priorité | État    |
| ------ | -------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- | ------- |
| **1**  | **RFC-FE-001** | Budget Frontend Foundation            | Poser l’architecture frontend du module budget : structure feature-first, client API, hooks React Query, layout, routing | Haute    | ✅ Terminé |
| **2**  | **RFC-FE-003** | Budget Exercises & Budgets List UI    | Pages de listing des exercices et budgets avec filtres, recherche et pagination                                          | Haute    | À faire |
| **3**  | **RFC-FE-004** | Budget Envelopes & Lines Explorer UI  | Explorateur hiérarchique Budget → Enveloppes → Lignes (navigation principale du module)                                  | Haute    | À faire |
| **4**  | **RFC-FE-015** | Budget Forms UX                       | Formulaires create/edit pour exercices, budgets, enveloppes et lignes                                                    | Haute    | À faire |
| **5**  | **RFC-FE-005** | Budget Line Detail UI                 | Page détail d’une ligne budgétaire avec montants, allocations, événements                                                | Haute    | À faire |
| **6**  | **RFC-FE-010** | Budget Reporting Views UI             | Vues de reporting : synthèse exercice, budget, enveloppes et breakdowns                                                  | Haute    | À faire |
| **7**  | **RFC-FE-002** | Budget Dashboard UI                   | Cockpit budgétaire avec KPI, alertes et widgets de pilotage                                                              | Haute    | À faire |
| **8**  | **RFC-FE-009** | Budget Import UI                      | Interface d’import Excel : analyse, mapping, preview et exécution                                                        | Haute    | À faire |
| **9**  | **RFC-FE-006** | Budget Reallocation UI                | Interface de transfert budgétaire entre lignes                                                                           | Moyenne  | À faire |
| **10** | **RFC-FE-007** | Budget Snapshots UI                   | Interface snapshots : création, liste, consultation et comparaison                                                       | Moyenne  | À faire |
| **11** | **RFC-FE-008** | Budget Versioning UI                  | Interface baseline / révisions / activation / historique de versions                                                     | Moyenne  | À faire |
| **12** | **RFC-FE-011** | Analytical Dimensions UI              | Gestion des comptes analytiques, centres de coûts et ventilations                                                        | Moyenne  | À faire |
| **13** | **RFC-FE-012** | Budget Charts & Visual Analytics      | Graphiques et visualisations du cockpit budgétaire                                                                       | Moyenne  | À faire |
| **14** | **RFC-FE-013** | Budget Permissions & Navigation UX    | Gestion de l’affichage selon modules, permissions et client actif                                                        | Haute    | À faire |
| **15** | **RFC-FE-014** | Budget Empty / Error / Loading States | Uniformisation UX des états loading, empty et error                                                                      | Haute    | À faire |
