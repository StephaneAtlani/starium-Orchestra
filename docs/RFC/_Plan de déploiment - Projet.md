# Plan de développement — Module Portefeuille Projets & Activités

> **Note (2026-03)** : le **MVP livré** suit **RFC-PROJ-001** avec l’entité **`Project`** (et tâches / risques / jalons), pas le modèle historique « `PortfolioItem` » / projet+activité décrit plus bas. Synthèse implémentation : [docs/modules/projects-mvp.md](../modules/projects-mvp.md). Ce document reste une **vision long terme** et un ordre de travail ; les lignes « À faire » du tableau en fin de fichier ne reflètent pas l’état du MVP déjà mergé.

## Vue d’ensemble

Le module doit couvrir 4 besoins :

1. **Créer un portefeuille projets et activités**
2. **Piloter un projet / une activité**
3. **Relier le portefeuille au budget sans dupliquer la finance**
4. **Relier le portefeuille aux fournisseurs et poser les bases des ressources**

---

# Ordre recommandé de développement

## PHASE 1 — Fondations métier

Objectif : poser le socle propre du module.

### **RFC-PROJ-001 — Cadrage fonctionnel du module Portefeuille Projets & Activités**

**Objectif**
Définir le périmètre exact du module, ses frontières, ses objets métiers, et ce qu’il ne gère pas.

**À cadrer**

* différence entre **projet** et **activité**
* notion de **portefeuille**
* notion de **pilotage**
* frontière avec :

  * budget
  * fournisseurs
  * ressources
* vues métier attendues
* permissions de base
* règles multi-client

**Résultat concret**

* document de référence produit/métier
* source de vérité pour toutes les RFC suivantes

**Priorité**
🔥🔥🔥 Critique

---

### **RFC-PROJ-002 — Prisma Schema Portefeuille**

**Objectif**
Créer le modèle de données principal du module.

**Entités MVP**

* `PortfolioItem`
* `PortfolioTask`
* `PortfolioRisk`
* `PortfolioMilestone` *(optionnel mais conseillé dès le départ)*
* `PortfolioLink`
* `PortfolioTag` *(optionnel)*

**Structure recommandée**

### `PortfolioItem`

Objet central de pilotage.

* `id`
* `clientId`
* `type` → `PROJECT | ACTIVITY`
* `name`
* `code`
* `description?`
* `status`
* `priority`
* `healthStatus`
* `ownerUserId?`
* `managerUserId?`
* `startDate?`
* `targetEndDate?`
* `actualEndDate?`
* `progressPercent`
* `isArchived`
* `createdAt`
* `updatedAt`

### `PortfolioTask`

* `id`
* `clientId`
* `portfolioItemId`
* `parentTaskId?`
* `title`
* `description?`
* `status`
* `priority`
* `assigneeUserId?`
* `startDate?`
* `dueDate?`
* `completedAt?`
* `progressPercent`
* `sortOrder`
* `createdAt`
* `updatedAt`

### `PortfolioRisk`

* `id`
* `clientId`
* `portfolioItemId`
* `title`
* `description?`
* `category`
* `probability`
* `impact`
* `severity`
* `status`
* `ownerUserId?`
* `mitigationPlan?`
* `dueDate?`
* `closedAt?`
* `createdAt`
* `updatedAt`

### `PortfolioMilestone`

* `id`
* `clientId`
* `portfolioItemId`
* `title`
* `targetDate`
* `actualDate?`
* `status`
* `description?`

### `PortfolioLink`

Pour relier budget / fournisseur / contrat / commande / document / ressource plus tard.

* `id`
* `clientId`
* `portfolioItemId`
* `linkType`
* `targetModule`
* `targetEntityType`
* `targetEntityId`
* `metadata?`

**Résultat concret**

* migration Prisma
* enums
* relations
* index par `clientId`

**Priorité**
🔥🔥🔥 Critique

---

### **RFC-PROJ-003 — Règles métier du portefeuille**

**Objectif**
Figer les règles métier backend avant d’ouvrir les API.

**Règles clés**

* toute entité appartient à un `clientId`
* une tâche, un risque ou un jalon ne peut appartenir qu’à un item du même client
* `progressPercent` entre 0 et 100
* calcul de `severity` côté backend
* un item clôturé limite certaines modifications
* un item peut être marqué en alerte si :

  * échéance dépassée
  * risque critique ouvert
  * trop de tâches en retard

**Résultat concret**

* règles de validation explicites
* comportements normalisés pour services et DTO

**Priorité**
🔥🔥🔥 Critique

---

## PHASE 2 — Backend métier

Objectif : rendre le module exploitable par API.

### **RFC-PROJ-004 — Portfolio Management Backend**

**Objectif**
Créer le module NestJS principal.

**Endpoints MVP**

### Portfolio items

* `GET /api/portfolio-items`
* `POST /api/portfolio-items`
* `GET /api/portfolio-items/:id`
* `PATCH /api/portfolio-items/:id`

### Filtres attendus

* type
* statut
* priorité
* santé
* responsable
* recherche
* archivage oui/non

**Résultat concret**

* CRUD principal portefeuille
* pagination
* filtres
* validation DTO

**Priorité**
🔥🔥🔥 Critique

---

### **RFC-PROJ-005 — Tasks Backend**

**Objectif**
Gérer l’exécution opérationnelle.

**Endpoints**

* `GET /api/portfolio-items/:id/tasks`
* `POST /api/portfolio-items/:id/tasks`
* `GET /api/portfolio-tasks/:id`
* `PATCH /api/portfolio-tasks/:id`

**Règles**

* hiérarchie parent/enfant simple
* tri manuel
* dates
* avancement
* statut
* responsable

**Résultat concret**

* gestion des tâches projet/activité
* base pour la vue détail

**Priorité**
🔥🔥🔥 Critique

---

### **RFC-PROJ-006 — Risks Backend**

**Objectif**
Permettre le pilotage des risques.

**Endpoints**

* `GET /api/portfolio-items/:id/risks`
* `POST /api/portfolio-items/:id/risks`
* `GET /api/portfolio-risks/:id`
* `PATCH /api/portfolio-risks/:id`

**Résultat concret**

* registre de risques par projet/activité
* priorisation par sévérité

**Priorité**
🔥🔥 Haute

---

### **RFC-PROJ-007 — Milestones Backend**

**Objectif**
Ajouter une logique de jalons simple.

**Endpoints**

* `GET /api/portfolio-items/:id/milestones`
* `POST /api/portfolio-items/:id/milestones`
* `PATCH /api/portfolio-milestones/:id`

**Résultat concret**

* jalons clés d’un projet
* lecture planning macro sans Gantt complexe

**Priorité**
🔥 Haute

---

### **RFC-PROJ-008 — Permissions & Module Activation**

**Objectif**
Raccorder le module à ton core plateforme.

**Permissions recommandées**

* `projects.read`
* `projects.create`
* `projects.update`
* `projects.risks.read`
* `projects.risks.update`
* `projects.tasks.read`
* `projects.tasks.update`

**Résultat concret**

* guards fonctionnels
* affichage frontend basé sur permissions
* module activable proprement

**Priorité**
🔥🔥🔥 Critique

---

### **RFC-PROJ-009 — Audit Logs Projet**

**Objectif**
Tracer toutes les actions sensibles.

**Événements à auditer** (contrat `PROJECT_AUDIT_ACTION` — préfixes `project`, `project_task`, `project_risk`, `project_milestone`)

* création / mise à jour / suppression par entité
* événements granulaires : statut projet, owner projet ; statut / assignation tâche ; niveau risque ; etc. (liste complète dans RFC-PROJ-009)

**Résultat concret**

* traçabilité métier
* cohérence avec le core plateforme

**Priorité**
🔥🔥 Haute

---

## PHASE 3 — Intégration transverse

Objectif : brancher le module aux autres briques sans casser les frontières.

### **RFC-PROJ-010 — Budget Links**

**Objectif**
Rattacher un projet ou une activité aux objets budgétaires sans stocker la finance dans le module projet.

**Ce qu’on fait**

* lier un `PortfolioItem` à :

  * `Budget`
  * `BudgetEnvelope`
  * `BudgetLine`

**Ce qu’on ne fait pas**

* pas de calcul financier source de vérité dans ce module
* pas de duplication des montants métier

**Endpoints**

* `GET /api/portfolio-items/:id/budget-links`
* `POST /api/portfolio-items/:id/budget-links`
* `DELETE /api/portfolio-items/:id/budget-links/:linkId`

**Résultat concret**

* un projet peut être relié au bon périmètre budgétaire

**Priorité**
🔥🔥 Haute

---

### **RFC-PROJ-011 — Supplier Links**

**Objectif**
Lier les projets/activités aux fournisseurs et objets associés.

**Cibles possibles**

* supplier
* contract
* purchase-order
* license

**Résultat concret**

* vision transverse sans réimplémenter le module fournisseur

**Priorité**
🔥🔥 Haute

---

### **RFC-PROJ-012 — Documents & Attachments Links**

**Objectif**
Rattacher les documents utiles au projet.

**Exemples**

* cadrage
* compte-rendu
* cahier des charges
* PV recette
* planning PDF

**Résultat concret**

* un item projet devient un vrai conteneur de pilotage

**Priorité**
🔥 Moyenne

---

## PHASE 4 — Fondations du module Ressources

Objectif : préparer le futur sans construire tout le module RH/Assets.

### **RFC-RES-001 — Resource Registry Foundations**

**Objectif**
Créer un registre générique de ressources mobilisables.

**Entité**
`Resource`

**Champs recommandés**

* `id`
* `clientId`
* `name`
* `code?`
* `category`
* `type`
* `status`
* `description?`
* `createdAt`
* `updatedAt`

**Catégories MVP**

* `HUMAN_INTERNAL`
* `HUMAN_EXTERNAL`
* `SOFTWARE`
* `HARDWARE`
* `OTHER`

**Résultat concret**

* socle pour les affectations futures

**Priorité**
🔥🔥 Haute

---

### **RFC-RES-002 — Resource Assignment Backend**

**Objectif**
Permettre l’affectation de ressources à un projet/activité.

**Entité**
`PortfolioResourceAssignment`

**Champs**

* `id`
* `clientId`
* `portfolioItemId`
* `resourceId`
* `roleOnItem?`
* `allocationPercent?`
* `startDate?`
* `endDate?`
* `notes?`

**Résultat concret**

* lien entre projet et ressource
* fondation des vues de charge futures

**Priorité**
🔥🔥 Haute

---

### **RFC-RES-003 — Resource Types & Specialized Metadata**

**Objectif**
Préparer des métadonnées spécifiques selon le type.

**Exemples**

* interne : rôle, équipe, compétence principale
* externe : société, prestation, référent
* logiciel : éditeur, famille, environnement
* matériel : type d’actif, usage

**Résultat concret**

* modèle extensible sans surcharger le MVP

**Priorité**
🔥 Moyenne

---

## PHASE 5 — Frontend cockpit

Objectif : rendre le module réellement utilisable.

### **RFC-FE-PROJ-001 — Portfolio List UI**

**Objectif**
Créer la page liste portefeuille.

**Route**

* `/portfolio`
  ou
* `/projects` si tu veux rester plus simple au début

**Contenu**

* KPIs
* filtres
* recherche
* table portefeuille
* badges type / santé / statut / priorité

**Résultat concret**

* vue consolidée projets + activités

**Priorité**
🔥🔥🔥 Critique

---

### **RFC-FE-PROJ-002 — Portfolio Detail UI**

**Objectif**
Créer la page détail d’un projet/activité.

**Route**

* `/portfolio/[id]`

**Onglets**

* Synthèse
* Tâches
* Risques
* Jalons
* Ressources
* Budget
* Fournisseurs
* Documents

**Résultat concret**

* cockpit détaillé par item

**Priorité**
🔥🔥🔥 Critique

---

### **RFC-FE-PROJ-003 — Tasks Tab UI**

**Objectif**
Rendre pilotables les tâches.

**Contenu**

* liste
* statut
* priorité
* responsable
* dates
* progression
* édition inline légère ou drawer

**Priorité**
🔥🔥 Haute

---

### **RFC-FE-PROJ-004 — Risks Tab UI**

**Objectif**
Afficher et maintenir les risques.

**Contenu**

* probabilité
* impact
* sévérité
* statut
* plan de mitigation
* propriétaire

**Priorité**
🔥🔥 Haute

---

### **RFC-FE-PROJ-005 — Resources Tab UI**

**Objectif**
Voir les ressources affectées.

**Contenu**

* catégorie
* type
* rôle
* allocation
* période

**Priorité**
🔥 Haute

---

### **RFC-FE-PROJ-006 — Budget Links Tab UI**

**Objectif**
Afficher les rattachements budgétaires.

**Contenu**

* liens vers budget / enveloppe / ligne
* badges
* navigation vers le module budget

**Priorité**
🔥 Haute

---

### **RFC-FE-PROJ-007 — Supplier Links Tab UI**

**Objectif**
Afficher les rattachements fournisseurs.

**Contenu**

* fournisseur principal
* contrats liés
* commandes liées
* navigation vers le module fournisseur

**Priorité**
🔥 Haute

---

## PHASE 6 — Cockpit avancé

Objectif : passer du CRUD au vrai pilotage.

### **RFC-PROJ-013 — Portfolio Dashboard API**

> **Note (numérotation)** : dans le dépôt, **RFC-PROJ-013** correspond au document [RFC-PROJ-013 — Points Projet COPIL-COPRO et Historisation](RFC-PROJ-013%20—%20Points%20Projet%20COPIL-COPRO%20et%20Historisation.md). La section ci-dessous décrit les **KPI portefeuille** déjà exposés par `GET /api/projects/portfolio-summary` (voir RFC-PROJ-004 / module projets) ; conserver ce titre évite de renumérer toute la roadmap historique du fichier.

**Objectif**
Exposer les KPI du portefeuille.

**KPI possibles**

* total projets
* total activités
* en retard
* critiques
* tâches en retard
* risques critiques ouverts
* jalons à venir
* ressources fortement sollicitées

**Priorité**
🔥🔥 Haute

---

### **RFC-FE-PROJ-008 — Portfolio Cockpit UI**

**Objectif**
Créer le cockpit global.

**Widgets**

* projets à risque
* activités en dérive
* échéances à 30 jours
* risques critiques
* éléments sans responsable
* items sans lien budget

**Priorité**
🔥🔥 Haute

---

### **RFC-PROJ-014 — Alerts & Integrity Rules**

**Objectif**
Ajouter de l’intelligence opérationnelle.

**Exemples**

* projet sans responsable
* activité sans échéance
* tâche en retard
* jalon dépassé
* risque critique non traité
* projet sans lien budget
* projet sans fournisseur alors qu’un achat est lié ailleurs

**Priorité**
🔥 Moyenne/Haute

---

# Roadmap recommandée

## Niveau 1 — Produit utilisable

À faire en premier :

1. **RFC-PROJ-001** — Cadrage fonctionnel
2. **RFC-PROJ-002** — Prisma Schema Portefeuille
3. **RFC-PROJ-003** — Règles métier
4. **RFC-PROJ-004** — Portfolio Management Backend
5. **RFC-PROJ-005** — Tasks Backend
6. **RFC-PROJ-006** — Risks Backend
7. **RFC-PROJ-008** — Permissions & Module Activation
8. **RFC-PROJ-009** — Audit Logs Projet
9. **RFC-FE-PROJ-001** — Portfolio List UI
10. **RFC-FE-PROJ-002** — Portfolio Detail UI
11. **RFC-FE-PROJ-003** — Tasks Tab UI
12. **RFC-FE-PROJ-004** — Risks Tab UI

---

## Niveau 2 — Produit solide

13. **RFC-PROJ-007** — Milestones Backend
14. **RFC-PROJ-010** — Budget Links
15. **RFC-PROJ-011** — Supplier Links
16. **RFC-RES-001** — Resource Registry Foundations
17. **RFC-RES-002** — Resource Assignment Backend
18. **RFC-FE-PROJ-005** — Resources Tab UI
19. **RFC-FE-PROJ-006** — Budget Links Tab UI
20. **RFC-FE-PROJ-007** — Supplier Links Tab UI

---

## Niveau 3 — Cockpit avancé

21. **RFC-PROJ-013** — Portfolio Dashboard API
22. **RFC-FE-PROJ-008** — Portfolio Cockpit UI
23. **RFC-PROJ-014** — Alerts & Integrity Rules
24. **RFC-RES-003** — Resource Types & Specialized Metadata
25. **RFC-PROJ-012** — Documents & Attachments Links

---

# Ce que je te conseille de faire tout de suite

## Démarrage le plus propre

Commence par ces 3 RFC :

### **1. RFC-PROJ-001 — Cadrage fonctionnel**

Parce qu’il faut figer :

* projet vs activité
* frontières budget/fournisseur/ressource
* vocabulaire officiel du module

### **2. RFC-PROJ-002 — Prisma Schema Portefeuille**

Parce que tout le reste dépend du modèle.

### **3. RFC-PROJ-004 — Portfolio Management Backend**

Parce qu’il faut vite rendre le module manipulable.

---

# Nommage que je recommande

Au lieu de “Gestion de projet”, je te conseille officiellement :

## **Module Portefeuille Projets & Activités**

ou

## **Pilotage Projets & Activités**

C’est plus fidèle à ton besoin réel.

---

# Tableau synthétique

| RFC             | Nom                             | Objectif                                | Priorité      | État    |
| --------------- | ------------------------------- | --------------------------------------- | ------------- | ------- |
| RFC-PROJ-001    | Cadrage fonctionnel             | Définir le périmètre du module          | Haute         | Implémenté (MVP) |
| RFC-PROJ-002    | Prisma Schema Portefeuille      | Modèle de données principal             | Haute         | Remplacé par schéma MVP `Project` + enfants — [projects-mvp.md](../modules/projects-mvp.md) |
| RFC-PROJ-003    | Règles métier                   | Normaliser validations et comportements | Haute         | Couvert (MVP) — `projects-pilotage.service.ts` |
| RFC-PROJ-004    | Portfolio Management Backend    | CRUD portefeuille                       | Haute         | Couvert (MVP) — `GET/POST/PATCH/DELETE /api/projects` |
| RFC-PROJ-005    | Tasks Backend                   | Gestion des tâches                      | Haute         | Couvert (MVP) |
| RFC-PROJ-006    | Risks Backend                   | Gestion des risques                     | Haute         | Couvert (MVP) |
| RFC-PROJ-007    | Milestones Backend              | Jalons et échéances macro               | Moyenne/Haute | Couvert (MVP) |
| RFC-PROJ-008    | Permissions & Module Activation | RBAC et activation module               | Haute         | Couvert (MVP) — `projects.*` |
| RFC-PROJ-009    | Audit Logs Projet               | Traçabilité métier                      | Haute         | Couvert (MVP) — audit projet / tâches / risques / jalons + actions granulaires (statut, owner, assignation, niveau risque) |
| RFC-PROJ-010    | Budget Links                    | Liens vers module budget                | Haute         | À faire |
| RFC-PROJ-011    | Supplier Links                  | Liens vers module fournisseur           | Haute         | À faire |
| RFC-PROJ-012    | Documents & Attachments Links   | Documents liés                          | Moyenne       | À faire |
| RFC-RES-001     | Resource Registry Foundations   | Registre ressource générique            | Haute         | À faire |
| RFC-RES-002     | Resource Assignment Backend     | Affectations ressources                 | Haute         | À faire |
| RFC-RES-003     | Resource Types Metadata         | Métadonnées spécialisées                | Moyenne       | À faire |
| RFC-FE-PROJ-001 | Portfolio List UI               | Vue portefeuille                        | Haute         | Couvert (MVP) — `/projects` |
| RFC-FE-PROJ-002 | Portfolio Detail UI             | Vue détail                              | Haute         | Couvert (MVP) — `/projects/[projectId]` |
| RFC-FE-PROJ-003 | Tasks Tab UI                    | Onglet tâches                           | Haute         | Couvert (MVP) — section fiche |
| RFC-FE-PROJ-004 | Risks Tab UI                    | Onglet risques                          | Haute         | Couvert (MVP) — section fiche |
| RFC-FE-PROJ-005 | Resources Tab UI                | Onglet ressources                       | Moyenne/Haute | À faire |
| RFC-FE-PROJ-006 | Budget Links Tab UI             | Onglet budget                           | Moyenne/Haute | À faire |
| RFC-FE-PROJ-007 | Supplier Links Tab UI           | Onglet fournisseurs                     | Moyenne/Haute | À faire |
| RFC-PROJ-013    | Portfolio Dashboard API         | KPI portefeuille                        | Haute         | Couvert (MVP) — `GET /api/projects/portfolio-summary` |
| RFC-FE-PROJ-008 | Portfolio Cockpit UI            | Cockpit pilotage                        | Haute         | Couvert (MVP) — bandeau KPI `/projects` |
| RFC-PROJ-014    | Alerts & Integrity Rules        | Alertes et cohérence                    | Moyenne/Haute | À faire |
