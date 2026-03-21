# RFC-PROJ-001 — Cadrage fonctionnel du module Projets

## Statut

**Accepted** — 2026-03-21  

**Implemented** (MVP backend + API pilotage + UI portefeuille cockpit) — 2026-03-21

## Titre

**Cadrage fonctionnel — Module Projets**
**Définir le périmètre et clarifier la différence entre projet, activité et tâche**

---

## 1. Objectif

Définir le cadre fonctionnel du module **Projects** de Starium Orchestra afin de :

* poser une vision claire du module
* distinguer précisément **projet**, **activité récurrente** et **tâche**
* éviter de transformer Starium Orchestra en outil de ticketing, ITSM ou time-tracking opérationnel
* préparer une implémentation cohérente côté backend et frontend
* garantir un positionnement aligné avec la vision produit globale de Starium Orchestra, qui inclut déjà le **pilotage des projets, des tâches et des risques** dans un cockpit de gouvernance opérationnelle 

---

## 2. Contexte

Starium Orchestra est conçu comme une plateforme SaaS de **gouvernance opérationnelle** pour les fonctions support, notamment les DSI à temps partagé, DSI internes, chefs de projet IT et directions. Le produit centralise budgets, projets, fournisseurs, contrats, licences, équipes, actifs IT et documentation dans une logique de **cockpit unique** 

Dans cette vision, le module **Pilotage projets** fait explicitement partie des modules cœur, avec :

* projets
* tâches
* risques 

Le frontend cible confirme également que Starium Orchestra doit permettre de :

* suivre les projets et budgets
* identifier les risques et alertes
* centraliser les tâches à réaliser
* offrir une vue cockpit, pas une simple succession de formulaires  

---

## 3. Problème adressé

Dans la pratique, les organisations mélangent souvent plusieurs notions :

* les **projets**
* les **activités récurrentes**
* les **tâches ponctuelles**
* les **tickets / demandes**
* les **actions de gouvernance**

Résultat :

* confusion dans les priorités
* reporting illisible
* impossibilité de distinguer ce qui relève du **run** et du **change**
* difficulté à suivre les risques, échéances et arbitrages
* glissement vers un faux outil ITSM ou vers une todo-list sans structure

Cette RFC vise donc à établir un **langage métier stable**.

---

## 4. Positionnement du module

Le module Projects de Starium Orchestra est un module de **pilotage et de gouvernance de projets**.

Il ne doit pas devenir :

* un outil de ticketing
* un outil ITSM
* un gestionnaire d’incidents
* un outil DevOps
* un timesheet détaillé
* un outil de planification ultra-fine type MS Project / Primavera

Il doit servir à :

* structurer les initiatives
* suivre leur avancement
* piloter les responsabilités
* suivre les échéances
* remonter les risques, alertes et arbitrages
* offrir une vision consolidée par client et à terme une vision transverse multi-clients  

---

## 5. Décision de cadrage essentielle

### 5.1 Distinction normative

#### Projet

Un **projet** est une initiative temporaire, cadrée, visant un résultat identifiable.

Caractéristiques :

* a un début
* a une fin prévisionnelle
* a un objectif explicite
* produit un livrable, un changement ou une transformation
* a un responsable
* peut comporter des tâches, jalons, risques, décisions et indicateurs

Exemples :

* migration Microsoft 365
* refonte du réseau WAN
* déploiement d’un ERP
* mise en conformité NIS2
* déploiement d’un PRA

#### Activité

Une **activité** est un ensemble d’actions récurrentes, continues ou permanentes.

Caractéristiques :

* pas de fin intrinsèque
* relève du fonctionnement courant
* se répète dans le temps
* peut être suivie via des indicateurs ou des revues, mais ce n’est pas un projet

Exemples :

* gestion fournisseurs IT
* revue licences mensuelle
* suivi cybersécurité récurrent
* maintien en condition opérationnelle
* animation COPIL mensuel

#### Tâche

Une **tâche** est une unité d’exécution.

Caractéristiques :

* action concrète et finie
* rattachée à un projet, ou éventuellement à une activité
* assignable à une personne
* datable
* suivie en statut simple

Exemples :

* rédiger le cahier des charges
* relancer le fournisseur
* valider le planning
* préparer le comité de pilotage

---

## 6. Décision produit pour le MVP

Pour le MVP du module Projects :

### Inclus

* gestion des **projets**
* gestion des **tâches de projet**
* gestion des **risques projet**
* jalons / échéances clés
* responsables et parties prenantes principales
* vues de synthèse et cockpit

### Exclus

* gestion des **activités récurrentes** comme objet métier complet
* timesheets détaillés
* dépendances de planning avancées
* diagramme de Gantt complexe
* tickets / incidents / demandes de support
* workflow BPM avancé
* charge/capacité fine par heure
* sous-projets complexes multi-niveaux

### Arbitrage clé

Dans le MVP, **l’activité n’est pas un objet métier de premier niveau**.

Deux options seulement :

1. soit elle reste **hors module projets**
2. soit certaines activités structurantes sont modélisées provisoirement comme des **projets récurrents ou projets permanents de pilotage**, mais sans brouiller la définition métier

La bonne ligne de conduite est donc :

> **Le module Projects pilote le changement.
> Le run récurrent n’est pas le cœur du module.**

---

## 7. Périmètre fonctionnel MVP

### 7.1 Projet

Chaque projet doit pouvoir porter au minimum :

* clientId
* nom
* code
* description
* type
* statut
* priorité
* sponsor
* chef de projet / owner
* date de début
* date cible de fin
* date réelle de fin
* niveau de criticité
* pourcentage d’avancement
* santé globale
* budget cible éventuel
* commentaires de pilotage

### 7.2 Tâches

Chaque tâche doit pouvoir porter :

* projet de rattachement
* titre
* description
* responsable
* statut
* priorité
* échéance
* date de réalisation
* ordre / position
* indicateur de retard

### 7.3 Risques

Chaque risque doit pouvoir porter :

* projet de rattachement
* titre
* description
* probabilité
* impact
* criticité
* plan d’action
* responsable
* statut
* date de revue

### 7.4 Jalons

Chaque projet doit pouvoir exposer des jalons simples :

* nom du jalon
* date cible
* date réelle
* statut

---

## 8. Modèle métier cible

### 8.1 Objet central

L’objet central du module est **Project**.

### 8.2 Sous-objets MVP

* Project
* ProjectTask
* ProjectRisk
* ProjectMilestone

### 8.3 Activité : hors modèle central MVP

L’objet **Activity** n’est pas implémenté dans RFC-PROJ-001.

Il pourra faire l’objet plus tard d’une RFC dédiée si besoin, par exemple pour :

* portefeuille d’activités DSI
* activités récurrentes de gouvernance
* routines opérationnelles

Mais pas dans ce premier cadrage.

---

## 9. Classification recommandée des projets

Pour éviter la confusion, un projet peut avoir un `projectType` :

* TRANSFORMATION
* INFRASTRUCTURE
* APPLICATION
* CYBERSECURITY
* COMPLIANCE
* ORGANIZATION
* PROCUREMENT
* GOVERNANCE

Cela permet d’avoir une lecture CODIR / DSI plus utile que des catégories trop techniques.

---

## 10. Statuts recommandés

### Projet

* DRAFT
* PLANNED
* IN_PROGRESS
* ON_HOLD
* COMPLETED
* CANCELLED
* ARCHIVED

### Tâche

* TODO
* IN_PROGRESS
* BLOCKED
* DONE
* CANCELLED

### Risque

* OPEN
* MITIGATED
* CLOSED
* ACCEPTED

### Jalon

* PLANNED
* REACHED
* DELAYED
* CANCELLED

---

## 11. Règles métier structurantes

### 11.1 Scope client

Comme tout Starium Orchestra, chaque donnée du module appartient à un `clientId` et doit être strictement isolée par client  

### 11.2 Backend source de vérité

Les calculs critiques, règles de statut, cohérences hiérarchiques et contrôles d’accès restent côté backend, conformément aux règles d’architecture globales  

### 11.3 Une tâche doit appartenir à un projet

Dans le MVP, une tâche sans projet n’existe pas.

### 11.4 Un risque doit appartenir à un projet

Dans le MVP, le risque est un objet de pilotage projet.

### 11.5 Un projet peut exister sans tâche

Pour permettre un pilotage macro.

### 11.6 Un projet peut exister sans risque

Mais le cockpit doit pouvoir signaler “aucun risque renseigné”.

---

## 12. Cas d’usage couverts

### Cas 1 — Pilotage d’un projet de migration

Le DSI suit :

* avancement global
* tâches majeures
* jalons
* risques
* retard éventuel

### Cas 2 — Vue portefeuille projets

La direction voit :

* projets en retard
* projets critiques
* projets bloqués
* échéances proches

### Cas 3 — Vue chef de projet

Le chef de projet suit :

* ses tâches ouvertes
* les risques actifs
* les jalons à venir

### Cas 4 — DSI à temps partagé multi-clients

À terme, une vue transverse permet d’identifier :

* les projets critiques par client
* les actions prioritaires
* les échéances à venir 

---

## 13. Ce que le module ne doit pas faire au départ

À refuser explicitement dans le cadrage initial :

* “mettre toutes les demandes dedans”
* gérer les tickets helpdesk
* faire du suivi minute par minute
* remplacer Planner, Jira, GLPI ou MS Project sur leur cœur natif
* absorber toutes les activités de run

Sinon le module devient flou et perd sa valeur.

---

## 14. Impacts architecture

Cette RFC est cohérente avec l’architecture cible de Starium Orchestra qui prévoit déjà des routes métier `/projects` dans le scope client, au même titre que `/budgets`, `/contracts`, etc.  

### Backend cible

Module NestJS dédié :

```text
apps/api/src/modules/projects/
```

### Frontend cible

Feature frontend dédiée :

```text
apps/web/src/features/projects/
apps/web/src/app/(protected)/projects/
```

Ce positionnement est déjà compatible avec l’architecture frontend feature-first documentée 

---

## 15. RFC filles à prévoir

Après RFC-PROJ-001, je recommande ce découpage :

* **RFC-PROJ-002** — Modèle de données Prisma Projects
* **RFC-PROJ-003** — API Backend Projects CRUD
* **RFC-PROJ-004** — Project Tasks Backend
* **RFC-PROJ-005** — Project Risks Backend
* **RFC-PROJ-006** — Project Reporting / Cockpit API
* **RFC-PROJ-FE-001** — Projects List UI
* **RFC-PROJ-FE-002** — Project Detail UI
* **RFC-PROJ-FE-003** — Tasks & Risks UI

---

## 16. Décision finale

La décision de cadrage de cette RFC est :

> **Le module Projects de Starium Orchestra sert à piloter des initiatives temporaires de transformation ou de changement.**
> **Les activités récurrentes ne sont pas des projets.**
> **Les tâches sont des unités d’exécution rattachées à un projet.**
> **Les risques sont des objets de pilotage rattachés à un projet.**

---

## 17. Critères de succès

La RFC est considérée comme validée si :

* la différence **projet / activité / tâche** est explicite et non ambiguë
* le périmètre MVP est clair
* les exclusions sont assumées
* le module reste aligné avec le positionnement cockpit / gouvernance de Starium Orchestra
* les futures RFC backend/frontend peuvent être dérivées sans reposer les bases

---

## 18. Implémentation MVP (2026-03-21)

* **Backend** : modèles Prisma `Project`, `ProjectTask`, `ProjectRisk`, `ProjectMilestone` ; API REST sécurisée multi-client ; `projects-pilotage.service.ts` (santé, signaux, warnings, agrégats) ; `GET /api/projects/portfolio-summary`.
* **Frontend** : routes `/projects` (KPI + liste enrichie + filtres / tri / recherche via query string alignés backend), `/projects/new`, `/projects/[projectId]` (fiche + sections tâches / risques / jalons) ; navigation module `projects` + `projects.read` / `projects.create`.
