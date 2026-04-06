# 📊 Budget — ce qu’il reste à faire

_Dernière mise à jour : avril 2026 (alignée sur le dépôt `starium-Orchestra` : apps web `features/budgets`, API `modules/budget-*`). **Statuts budget (`BudgetStatus`)** : cycle DRAFT → SUBMITTED → REVISED → VALIDATED → LOCKED → ARCHIVED (migration `20260412120000_budget_status_workflow_cycle`, ancien `ACTIVE` → `VALIDATED`). Les **lignes** (`BudgetLine`) n’ont **pas** de statut propre (migration `20260414120000_drop_budget_line_status`) : même principe que pour les enveloppes — le cycle de vie est sur le **budget**. Aucune **machine à états** imposée côté API (pas de règles de transition ni rôles DAF/DG) — voir ligne « Workflow budgétaire » ci-dessous. Grille prévisionnel : **Écart prév. / rév.** (€) et **% écart prév.** — [RFC-024 — Budget UI](./RFC-024%20%E2%80%94%20Budget%20UI.md) §5._

| RFC / Phase                      | Nom                                     | Description                                                                                                                                                       | État                    |
| -------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| RFC-022 + FE Dashboard           | Cockpit Budget & Dashboard              | Cockpit DG/DAF sur `/budgets/dashboard` (widgets, sélecteurs exercice/budget, drill-down vers lignes/enveloppes via drawers). Reste : finition « CODIR-ready », cohérence navigation globale, widgets avancés hors périmètre actuel | ⚠️ Partiel              |
| RFC-023 / RFC-024 + RFC-FE-029   | Planning budgétaire mensuel             | Planning 12 mois côté ligne (`BudgetLinePlanningTab`, API planning) ; **explorateur budget** : écart € + **% écart prév.** sur `/budgets/[budgetId]` (onglet Prévisionnel). Reste : parité scénarios avancés, UX tableur / saisie de masse, tests E2E métier, homogénéisation HT/TTC / forecast | ⚠️ Partiel              |
| RFC-024 + RFC-FE-030/031         | Cellule intelligente & calculs          | **Drawer ligne** (`BudgetLineIntelligenceDrawer`) : aperçu, prévisionnel, engagements, factures, allocations, timeline, infos DSI, création commande/facture/event. Reste : explicabilité encore perfectible (agrégations, parcours « une cellule = une histoire » documenté RFC) | ⚠️ Partiel              |
| RFC-029 + RFC-FE-032/033         | Vue enveloppe & atterrissage            | **Page enveloppe** `/budget-envelopes/[envelopeId]` : cartes résumé, KPI forecast, tableau forecast lignes, liste lignes, drawer ligne. Reste : vue « pilotage enveloppe » encore perfectible (comparatifs revised/forecast/consumed, projection fin d’année, finitions reporting) | ⚠️ Partiel              |
| Nouveau RFC Budget Workflow      | Workflow budgétaire (processus)         | Les **statuts** budget existent en schéma + UI + PATCH ; **pas** de processus imposé (transitions autorisées, rôles DAF/DG, files de validation, SLA) — à traiter dans un RFC dédié si besoin | ❌ À faire               |
| RFC-031 + RFC-FE-035             | Déversement & allocation stratégique    | Répartition décisionnelle vers lignes/enveloppes avec UX dédiée : **non** trouvé dans le code applicatif                                                         | ❌ À faire               |
| Extension RFC-016 + UI Alertes   | Alerting avancé & règles personnalisées | Alertes cockpit (panneau alertes, lignes critiques, seuils forecast/consommation côté reporting). Reste : règles multi-critères configurables, historique, paramétrage utilisateur avancé | ⚠️ Partiel              |
| RFC-019 + RFC-015-3 + UI compare | Versioning & snapshots exploitables     | Comparaison forecast/baseline/snapshot/version : UI MVP ([RFC-FE-BUD-030](./RFC-FE-BUD-030%20%E2%80%94%20Forecast%20et%20Comparaison%20budg%C3%A9taire%20UI.md)), pages `/budgets/[budgetId]/reporting`, `/budgets/[budgetId]/versions`, `/budgets/[budgetId]/snapshots`. Reste : timeline dédiée, écarts avancés, finitions hors MVP | ⚠️ Partiel (comparaison UI MVP) |
| RFC-021                          | Axes analytiques                        | **Partiel** : schéma + API + formulaire ligne (compte analytique, répartition cost centers avec libellés). Reste : comptes comptables « général », lecture consolidée DAF-ready, reporting analytique transversal | ⚠️ Partiel              |
| RFC-025 + UI procurement         | Intégration procurement                 | Dialogues création commande / facture depuis le drawer ligne, onglets engagements/factures. Reste : visibilité achat « bout en bout » dans tout le module budget | ⚠️ Partiel              |
| RFC-018 + UI import              | Import / Export & interop               | **Wizard** sur `/budgets/[budgetId]/import` : upload, mapping, prévisualisation, exécution (`BudgetImportWizard`). Hub `/budgets/imports` = point d’entrée minimal. Reste : export, réutilisation avancée des mappings, polish erreurs / gros fichiers | ⚠️ Partiel (import UI MVP+) |
| Extension reporting multi-client | Vue multi-client                        | Cockpit transversal multi-clients pour DSI à temps partagé : **non**                                                                                             | ❌ À faire               |

**Routes utiles (vérification code)** : liste `/budgets`, cockpit `/budgets/dashboard`, détail budget `/budgets/[budgetId]`, reporting & comparaison `/budgets/[budgetId]/reporting`, import `/budgets/[budgetId]/import`, enveloppe `/budget-envelopes/[envelopeId]`, exercices `/budgets/exercises`, configuration `/budgets/configuration`, réglages cockpit `/budgets/cockpit-settings`.

---

# ✅ Ce qui est déjà solide

| RFC        | Nom                       | Description                                   | État      |
| ---------- | ------------------------- | --------------------------------------------- | --------- |
| RFC-015-2  | Budget Management Backend | CRUD exercices, budgets, enveloppes, lignes   | ✅ Terminé |
| RFC-015-1B | Financial Core            | Allocations, événements, recalculs financiers | ✅ Terminé |
| RFC-016    | Budget Reporting API      | KPI et agrégations budgétaires                | ✅ Terminé |
| RFC-015-3  | Snapshots budgétaires     | Historisation backend                         | ✅ Terminé |
| RFC-019    | Budget Versioning         | Versioning backend                            | ✅ Terminé |
| RFC-018    | Budget Data Import        | Backend import / mapping / preview / execute  | ✅ Terminé |
| RFC-017    | Budget Reallocation       | Réallocation budgétaire                       | ✅ Terminé |
| RFC-021    | Analytical Dimensions     | Modèle & API partiels (compte analytique, splits cost centers sur ligne) ; reporting analytique complet **non** | ⚠️ Partiel |

Les RFC backend ci-dessus sont documentées dans les RFC budget ; le frontend a rattrapé une partie importante (cockpit, forecast, comparaison, import wizard, drawer ligne, page enveloppe) depuis les anciennes mentions « front manquant ».

---

# 🔴 Les vrais manques produit

| Domaine       | Ce qui manque réellement                                                               |
| ------------- | -------------------------------------------------------------------------------------- |
| Pilotage      | Le cockpit est exploitable en MVP mais pas encore totalement « DAF / DG ready » (finition widgets, parcours) |
| Explicabilité | Le drawer ligne couvre beaucoup de données ; il reste à finaliser le récit métier par cellule / écart (sans friction) |
| Gouvernance   | Statuts de cycle de vie présents ; **pas** de workflow métier piloté (validation obligatoire, files, rôles) — hors scope schéma actuel           |
| Analytique    | Données analytiques sur ligne en cours ; pas encore une lecture comptable / consolidée « DAF » |
| Adoption      | Import UI présent ; export, réutilisation des mappings et robustesse gros volumes à renforcer |
| Réel achats   | L’intégration procurement est amorcée (drawer) mais pas encore le fil conducteur achats dans tout le budget |

---

# 🎯 Priorité réelle recommandée

| Priorité | Sujet                      | Pourquoi                                            |
| -------- | -------------------------- | --------------------------------------------------- |
| 🔥 1     | Cockpit Budget & Dashboard | Vitrine métier DG/DAF ; affiner après socle déjà en place |
| 🔥 2     | Planning mensuel           | Cœur du remplacement d’Excel ; compléter scénarios + UX masse |
| 🔥 3     | Explicabilité / cellule    | Raffiner au-dessus du drawer existant (parcours, récit écarts) |
| 🔥 4     | Vue enveloppe & landing    | Socle enveloppe déjà là ; monter en gamme comparatifs / projection |
| 🔥 5     | Workflow budgétaire        | Gouvernance (toujours absent côté processus)         |
| 🔥 6     | Axes analytiques           | Passer du partiel au reporting DAF-ready              |
| 🔥 7     | Import polish + export     | Import wizard OK ; export et industrialisation imports |
| 🔥 8     | Alerting avancé            | Après socle cockpit / règles métier configurables   |

---

# 🧠 Conclusion

Le module budget est **très avancé techniquement côté backend**, et le **frontend a désormais** cockpit, forecast, comparaison, import transactionnel, page enveloppe pilotée et drawer ligne riche. Il reste à transformer ce socle en **expérience métier totalement aboutie** :

- finition cockpit et parcours CODIR,
- explicabilité et scénarios planning poussés,
- workflow de validation,
- analytique consolidée,
- déversement / allocation stratégique,
- et industrialisation import/export + alerting configurable.
