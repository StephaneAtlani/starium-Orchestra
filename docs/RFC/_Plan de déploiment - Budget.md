# 🧭 PLAN DE DÉVELOPPEMENT — MODULE BUDGET

| Phase  | Désignation                                | Objectif métier                                                                 | Backend RFC                                                                 | Frontend RFC               | UX clé                                      | État                    |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------- | ------------------------------------------- | ----------------------- |
| **0**  | **Cockpit Budget & Dashboard**             | Vision lecture rapide + actions rapides : KPI, alertes simples, drill-down      | **RFC-016 + RFC-022 uniquement** (reporting / dashboard ; pas d’alerting avancé ici) | Budget Dashboard UI        | Cockpit, drill-down navigation              | ❌ À faire               |
| **1**  | **Planning budgétaire mensuel**            | Remplacer Excel par une planification 12 mois (surface **tableur cockpit**)  | **RFC-023** (prévisionnel / atterrissage — API existante) + **RFC-024** (UI pilotage onglet *Pilotage*) | RFC-FE-029 + refonte UX § ci-dessous | **Grille principale** sur `/budgets/[budgetId]` (Structure \| Pilotage), calculette secondaire, synthèse non dupliquée | 🟡 MVP front RFC-024 livré ; finitions UX / clavier / scénarios API |
| **2**  | **Cellule intelligente & calculs**         | Explication des montants (forecast / committed / consumed) + traçabilité      | RFC-024 (moteur de calcul) + **financial-core existant** (pas RFC-025)     | RFC-FE-030 / 031           | Drawer détail, drill-down navigation        | ❌ À faire               |
| **3**  | **Vue enveloppe & atterrissage**          | Pilotage enveloppe : KPI, comparatifs et projection                             | RFC-024 (agrégations) + **RFC-029** (rôle : modèle / API enveloppe & landing) | RFC-FE-032 / 033           | Drawer détail, drill-down navigation        | ❌ À faire               |
| **4**  | **Workflow budgétaire (gouvernance)**      | Cycle de vie budget : soumission, validation, figement                          | **RFC Budget Workflow** (nouveau ; remplace **RFC-020 annulée**)           | UI validation budget       | Workflow, états, verrouillage               | ❌ À faire               |
| **5**  | **Déversement & allocation stratégique**   | Transformer décisions en répartition réelle                                   | RFC-031                                                                     | RFC-FE-035                 | Grid / wizard allocation                    | ❌ À faire               |
| **6**  | **Alerting avancé & règles personnalisées** | Règles métier complexes, personnalisation, seuils avancés (hors cockpit)      | RFC-016 (extension règles avancées)                                         | Alert UI / badges          | Paramétrage règles, historique / badges       | ❌ À faire               |
| **7**  | **Versioning & snapshots exploitable**     | Historique, comparaison, audit                                                | RFC-019 + RFC-015-3                                                         | UI versioning / compare    | Compare, timeline                           | ⚠️ Backend OK / Front ❌ |
| **8**  | **Axes analytiques (DAF-ready)**           | Lecture comptable et analytique                                               | RFC-021                                                                     | UI dimensions analytiques  | Filtres, colonnes analytiques               | ❌ À faire               |
| **9**  | **Intégration procurement**                | Lier budget au réel (PO / factures)                                           | RFC-025 (procurement)                                                       | Supplier / PO / Invoice UI | Drawer lien réel                            | ⚠️ Partiel              |
| **10** | **Import / Export & interop**              | Intégration ERP / Excel                                                       | RFC-018                                                                     | UI import                  | Wizard import, mapping                      | ⚠️ Backend OK / Front ❌ |
| **11** | **Vue multi-client (DSI à temps partagé)** | Pilotage transversal                                                          | Extension reporting                                                         | Global cockpit UI          | Cockpit multi-client                        | ❌ À faire               |

**Alignement UX globale** : lecture rapide dans les vues synthétiques (cockpit, cartes KPI), action rapide via drill-down (enveloppe → ligne), détail approfondi dans un **drawer** ; la **grid planning** reste le mode principal pour la saisie mensuelle.

### Phase 0 — périmètre strict (implémentation)

* **Références backend** : **RFC-016** (reporting / agrégations exposées au dashboard) + **RFC-022** (cockpit budget). Ne pas implémenter ici les règles d’**alerting avancé** (phase 6) ni un moteur de règles métier complexe.
* **Niveaux de lecture** : **exercice** → **budget** → **enveloppe** (navigation et regroupements cohérents avec ces trois niveaux).
* **Widgets obligatoires** :
  * KPI globaux (synthèse budget / enveloppes / consommation vs prévu selon le modèle RFC-016 / 022) ;
  * **Alertes simples** intégrées au cockpit : dépassement (**overrun**), solde restant négatif (**negative remaining**) — seuils lisibles, pas de moteur de règles personnalisées ;
  * **Breakdown RUN / BUILD** (ou équivalent métier défini dans les RFC) ;
  * **Top dérives** (enveloppes ou lignes les plus en écart).
* **Actions** : drill-down depuis le cockpit vers **enveloppe** puis vers **ligne** (navigation continue, pas un écran isolé).

### Phase 2 — finalité et dépendances

* **Backend** : s’appuyer sur le **financial-core** déjà en place pour les montants et liaisons ; **RFC-024** pour le moteur de calcul côté module budget. **Ne pas référencer RFC-025** (procurement / réel achats) dans cette phase.
* **Métier** : rendre explicites les trois lectures **forecast / committed / consumed** (et cohérence avec les agrégations financial-core).
* **Complément** : **drill-down allocations** et **événements** (historique / mouvements liés à la cellule) pour expliquer *pourquoi* le montant affiché.

### Phase 3 — finalité et RFC-029

* **KPI enveloppe** : synthèse par enveloppe (engagement, consommation, reste, écarts).
* **Comparatifs** : **forecast** vs **revised** vs **consumed** (libellés métier alignés API / UI).
* **Projection fin d’année** : scénario ou tendance jusqu’à clôture d’exercice (selon règles RFC-024 / données disponibles).
* **RFC-029** : couche **vue enveloppe & atterrissage** (contrat données + comportements UI associés) ; complète RFC-024 côté agrégation sans dupliquer le moteur financier.

### Phase 4 — RFC Budget Workflow (nouveau)

* Remplace la portée de **RFC-020** (annulée) par une RFC dédiée **Budget Workflow**.
* **Minimum produit** :
  * Statuts de budget : **DRAFT** → **SUBMITTED** → **VALIDATED** ;
  * Circuit **validation DAF** / **DG** (rôles et transitions explicites dans la RFC) ;
  * **Verrouillage** des montants / structure concernés **après VALIDATED** (sauf réouverture réglementée si prévu).

### Phase 6 — distinction avec le cockpit

* **Cockpit (phase 0)** : alertes **simples** (overrun, negative remaining), visibilité immédiate, pas de personnalisation poussée des règles.
* **Phase 6** : **règles complexes**, personnalisation, seuils multi-critères, workflows d’alerte avancés — extension **RFC-016** et UI dédiée, sans refaire le socle du cockpit.

---

Chaque phase du tableau a une **finalité métier** distincte, une **dépendance backend** explicite (éviter de dupliquer une RFC existante sous un autre nom : une RFC = un périmètre livrable).

---

# 📊 Lecture rapide de l’état

### ✅ Solide (backend prêt)

* Structure budget (RFC-015-2) 
* Financial core
* Reporting API (RFC-016)
* Import (RFC-018)
* Versioning / snapshots

---

### ⚠️ Partiel (déséquilibré)

* Procurement (pas encore intégré UX)
* Versioning (pas exploitable métier)
* Import (pas utilisable UI)

---

### ❌ Critique (manquant)

* Dashboard cockpit (phase 0) et **alertes simples** associées
* Planning mensuel
* Workflow (RFC Budget Workflow)
* **Alerting avancé** (phase 6) et UX règles
* UX globale (cockpit + grid + drawer + drill-down)

---

# 🎯 Priorité réelle (ordre recommandé)

| Priorité | Phase                      |
| -------- | -------------------------- |
| 🔥 1     | Cockpit Budget & Dashboard |
| 🔥 2     | Planning mensuel           |
| 🔥 3     | Cellule intelligente       |
| 🔥 4     | Vue enveloppe & landing    |
| 🔥 5     | Workflow                   |
| 🔥 6     | Déversement                |

L’**alerting avancé** (phase 6 du plan) intervient après socle cockpit et pilotage ; les **alertes simples** sont livrées avec la phase 0.

---

# 🧠 Conclusion

👉 Ton backend est déjà **très avancé**
👉 Ton produit est encore **invisible côté métier**

Ce tableau te donne :

* une vision **pilotable**
* une roadmap **vendable**
* une base **alignée DG / DAF**
