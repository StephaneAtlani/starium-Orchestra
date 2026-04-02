# RFC-TEAM-008 — Staffing projet par manager / responsable projet

## Statut

À implémenter — spécification **fonctionnelle et d’exposition** (routes, permissions, UX projet). **Aucun nouveau modèle métier** : réutilise les affectations définies dans [RFC-TEAM-007](./RFC-TEAM-007%20%E2%80%94%20Affectations%20ressources.md). Le backend générique des affectations peut être livré avant ou en même temps que cette RFC.

## Priorité

Très haute — **Phase 3** du plan Équipes ; réponse directe au besoin **« depuis le projet, affecter la charge des équipes sur les activités (taxonomie) »**. Suite naturelle de **TEAM-007** ; prérequis UX pour **RFC-FE-TEAM-005** (onglet / panneau staffing projet).

## Dépendances

- [RFC-TEAM-007](./RFC-TEAM-007%20%E2%80%94%20Affectations%20ressources.md) — entité `TeamResourceAssignment`, API `/team-resource-assignments`, règles `projectId` + `activityTypeId`
- [RFC-TEAM-006](./RFC-TEAM-006%20%E2%80%94%20Taxonomie%20des%20activit%C3%A9s.md) — sélection du type d’activité (kind + libellés client)
- Module **Projets** — `Project`, `ownerUserId`, `sponsorUserId`, équipe projet (`ProjectTeamMember`, `ProjectTeamRole`)
- [RFC-TEAM-005](./RFC-TEAM-005%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20%C3%89quipes%20p%C3%A9rim%C3%A8tres%20managers.md) — filtrage lecture selon périmètre manager (collaborateurs visibles)
- `docs/ARCHITECTURE.md` — multi-client, client actif
- `docs/FRONTEND_UI-UX.md` — fiche projet, onglets workspace, états loading / empty
- `.cursorrules` — **inputs UI : libellés métier**, jamais d’UUID seul

## Consommateurs prévus

- **RFC-FE-TEAM-005** — UI affectations (vue équipe **et** vue projet)
- **RFC-TEAM-009** — préremplissage timesheet à partir des lignes de staffing du projet
- **RFC-TEAM-011 / 012** — charge planifiée agrégée par projet

---

# 1. Analyse de l’existant

## 1.1 Rappel TEAM-007 vs besoin « vue projet »

| Élément | Rôle |
| --- | --- |
| **`TeamResourceAssignment`** | Ligne de **charge planifiée** : collaborateur, **projet optionnel**, **type d’activité** obligatoire, période, rôle, % allocation. |
| **API générique** `GET/POST/PATCH … /team-resource-assignments` | Suffisante pour créer une affectation **en fixant `projectId`** dans le body. |
| **Manque côté produit** | Parcours **contextualisé projet** : liste filtrée, création avec `projectId` **verrouillé**, droits **responsable / sponsor / PM** sans exposer le détail technique, et **cohérence** avec l’équipe projet affichée. |

**Constat** : TEAM-007 fournit la **vérité** ; TEAM-008 définit **qui** agit depuis la fiche projet, **comment** l’UI et les routes se comportent, et **quelles** permissions combiner.

## 1.2 Distinctions utiles

| Concept | Rôle | Rapport avec staffing |
| --- | --- | --- |
| **`ProjectTeamMember`** | Roster : rôles projet, user ou libellé libre. | **Complémentaire** : indique « qui est dans l’équipe projet » **sans** temporalité ni %. Ne remplace pas une ligne `TeamResourceAssignment`. |
| **`TeamResourceAssignment`** | Charge **planifiée** sur une période. | Peut cibler un collaborateur **présent ou non** dans `ProjectTeamMember` (ex. renfort planifié avant mise à jour du roster). |
| **`ActivityType` (TEAM-006)** | Axe PROJECT / RUN / … | Pour une affectation **liée au projet**, `activityTypeId` reste **obligatoire** (souvent un type de **kind** `PROJECT` pour ce client). |
| **`ownerUserId` / `sponsorUserId`** | Pilotage projet côté `User`. | Sert de base pour une politique **« le responsable peut staffer son projet »** sans conflit avec le référentiel `Collaborator`. |

## 1.3 Objectif de la RFC

1. Permettre au **manager de ligne**, au **responsable projet** (owner) et aux rôles **staffing** habilités de **lire et saisir** les affectations **dont le `projectId` est celui du projet ouvert**, depuis le **workspace Projet**.
2. Garantir **isolation client** et **respect des périmètres** (TEAM-005) : un manager ne staff que des collaborateurs **dans son périmètre** si la politique RBAC le impose.
3. Exposer des **points d’entrée API** clairs (réutilisant le service TEAM-007) : filtre `projectId` obligatoire côté route « projet », création avec projet implicite.
4. Décrire l’**UX** (onglet ou section, tableaux, formulaires) alignée **FRONTEND_UI-UX** — détail d’implémentation dans **RFC-FE-TEAM-005**.

---

# 2. Hypothèses éventuelles

1. **Pas de duplication de données** — Les créations / mises à jour passent par le **même** service que TEAM-007 ; les routes « sous projet » sont des **adaptateurs** (fixent `projectId`, vérifient l’accès au projet).

2. **Qui peut écrire** — Arbitrage produit (à figer au seed / profils) :
   - **Minimum** : `team_assignments.manage` **et** `projects.read` sur le client, **et** le projet est accessible (même `clientId`).
   - **Option « responsable projet »** : en plus, soit `projects.update`, soit l’utilisateur courant est `ownerUserId` ou `sponsorUserId` **ou** membre d’une liste étendue (future : rôle COPIL) — **une seule règle** retenue par implémentation pour éviter les ambiguïtés.

3. **Collaborateurs sélectionnables** — La liste des collaborateurs pour le select doit respecter **TEAM-005** (périmètre manager) + **lecture** `collaborators.read` ou équivalent ; les réponses API restent **enrichies** (`displayName`, etc.).

4. **Type d’activité par défaut** — À l’ouverture du formulaire « nouvelle affectation » depuis un projet, pré-sélectionner le **`ActivityType` par défaut pour `kind` = `PROJECT`** du client (TEAM-006), avec possibilité de changer si plusieurs lignes existent.

5. **Lien roster ↔ staffing (MVP)** — Aucune obligation d’auto-créer `ProjectTeamMember` lors d’une affectation ; **option** ultérieure : suggestion « ajouter au roster » si le collaborateur staffé a un `User` lié et n’est pas encore dans l’équipe projet.

---

# 3. Liste des fichiers à créer / modifier

## Backend

- **Option A (recommandée)** — Étendre le module **projets** ou ajouter un sous-module léger `project-resource-assignments` :
  - Contrôleur déléguant au `TeamAssignmentsService` (nom exact selon implémentation TEAM-007)
  - Routes du type `GET/POST/PATCH … /projects/:projectId/resource-assignments` (+ `…/:assignmentId` pour PATCH ciblé)
- **Option B** — Ne pas ajouter de routes : l’UI appelle uniquement `GET /team-resource-assignments?projectId=` avec `projectId` issu de la route Next.js — **moins** expressif pour les guards « membre projet ».

Fichiers typiques (Option A) :

- `project-resource-assignments.controller.ts` (ou méthodes dans `projects.controller.ts` si cohérent avec le repo)
- DTOs fins : `CreateProjectResourceAssignmentDto` — **sans** `projectId` dans le body (injecté par la route)
- Guards / policy : `ProjectStaffingAccess` — vérifie client + droit projet + règle owner/sponsor si activée
- Tests : contrôleur + cas refus (hors périmètre manager)

## Frontend (spécification — détail RFC-FE-TEAM-005)

- Route workspace projet : onglet **« Charge / Staffing »** ou équivalent
- Composants : tableau des affectations, dialogue création / édition, query keys incluant `clientId` et `projectId`

## Documentation

- Ce document
- Mise à jour `docs/API.md` lors de l’implémentation (section Projets ou Équipes)

---

# 4. Implémentation complète

## 4.1 Règles métier (vue projet)

1. **Lecture** — Retourner uniquement les `TeamResourceAssignment` avec `projectId = :projectId`, `clientId` = client actif, et **filtrage périmètre manager** sur le `collaboratorId` si l’utilisateur n’est pas « staffing large ».

2. **Création** — `projectId` **imposé** par l’URL ; le body contient `collaboratorId`, `activityTypeId`, `roleLabel`, période, `allocationPercent`, champs optionnels TEAM-007 (`projectTeamRoleId`, `notes`). Validation identique à TEAM-007 pour la cohérence `ActivityType` / projet.

3. **Mise à jour / annulation** — Même logique que TEAM-007, avec contrôle que l’affectation appartient bien au **projet** de l’URL (anti-ID enumeration cross-projet).

4. **Cohérence avec `Project.kind`** — Aucune règle supplémentaire imposée par cette RFC au-delà des règles projet existantes ; un `ProjectKind.ACTIVITY` reste un conteneur projet valide pour le staffing.

## 4.2 API REST proposée (convenience — préfixe `/api`)

Toutes les routes : JWT, client actif, module `teams` / `team_assignments` **et** module `projects` selon politique d’activation.

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/projects/:projectId/resource-assignments` | Liste paginée des affectations **de ce projet** (même shape enrichi que TEAM-007) |
| `GET` | `/projects/:projectId/resource-assignments/:assignmentId` | Détail (404 si `projectId` ne correspond pas) |
| `POST` | `/projects/:projectId/resource-assignments` | Création ; `projectId` **non** accepté dans le body |
| `PATCH` | `/projects/:projectId/resource-assignments/:assignmentId` | Mise à jour partielle |
| `POST` | `/projects/:projectId/resource-assignments/:assignmentId/cancel` | Annulation logique (alias TEAM-007) |

**Query `GET` (liste)** : réutiliser les filtres temporels de TEAM-007 (`from`, `to`, `activeOn`, `includeCancelled`) **en restreignant** implicitement à ce projet.

**Réponses** — Identiques à TEAM-007 : pour chaque item, champs **affichables** (`collaboratorDisplayName`, `activityTypeName`, `activityTypeKind`, `roleLabel`, `projectName` / `projectCode` redondants mais utiles pour exports).

## 4.3 RBAC

| Permission / condition | Lecture liste / détail | Création / modification / annulation |
| --- | --- | --- |
| `team_assignments.read` + `projects.read` | Oui (sous filtre périmètre) | Non |
| `team_assignments.manage` + `projects.read` | Oui | Oui si règle « projet » satisfaite (voir §2.2) |
| Admin client large (profil équipe) | Oui | Oui |

**Règle optionnelle « responsable »** — Si le produit restreint la saisie aux seuls pilotage projet :

- Autoriser `team_assignments.manage` **uniquement** si **au moins une** des conditions : `projects.update`, ou `currentUser.id === project.ownerUserId`, ou `currentUser.id === project.sponsorUserId`.

Documenter le choix dans le seed des profils.

## 4.4 Audit (RFC-013)

Réutiliser les mêmes événements que TEAM-007, avec **contexte** `projectId` et `projectCode` dans le payload d’audit pour faciliter la recherche métier « par projet ».

## 4.5 UX (résumé — détail FE-TEAM-005)

- **Emplacement** : onglet dédié dans la fiche projet (bandeau `ProjectWorkspaceTabs`), après **Équipe** ou **Pilotage** selon l’arborescence retenue.
- **Tableau** : colonnes — Collaborateur (nom), Type d’activité (nom + badge `kind`), Rôle, Période, % charge, Statut (actif / annulé), actions.
- **Formulaire** : `Combobox` collaborateur (libellé), select type d’activité (libellés + filtre sur kinds pertinents pour un projet), champs période et %, rôle texte ou lien `ProjectTeamRole` si présent.
- **Empty state** : message incitatif + CTA « Affecter un collaborateur ».
- **Valeur affichée, pas ID** : conformité stricte `.cursorrules` / `inputs-value-not-id.mdc`.

---

# 5. Modifications Prisma

**Aucune** pour cette RFC — le modèle `TeamResourceAssignment` et ses relations sont définis dans **TEAM-007** (déjà présents dans le schéma cible).

Si l’implémentation ajoute un champ d’audit « dernier éditeur », le faire dans le cadre TEAM-007 ou une RFC transverse audit.

---

# 6. Tests

- **Contrôleur** « sous projet » : 404 si projet hors client ; 403 si utilisateur sans droit staffing / hors règle owner ; body sans `projectId` refuse toute substitution de projet.
- **Isolation** : impossible de lire ou modifier une affectation d’un **autre** `projectId` en jouant sur `:assignmentId`.
- **Périmètre manager** : utilisateur à scope restreint ne voit pas les lignes dont le collaborateur est hors périmètre (alignement TEAM-005 / TEAM-007).
- **Service** : délégation correcte au service TEAM-007 (pas de duplication de validation métier).

---

# 7. Récapitulatif final

**RFC-TEAM-008** ne crée pas une nouvelle entité : elle **spécifie le staffing depuis le projet** — routes dédiées, **règles d’accès** pour managers / responsables, **pré-remplissage** taxonomie projet, et **UX** cohérente avec la fiche projet. Elle s’appuie sur **TEAM-007** pour la persistance et la validation, sur **TEAM-006** pour les types d’activité, et sur le module **Projets** pour le contexte et les rôles `owner` / `sponsor`.

---

# 8. Points de vigilance

- **Ne pas** confondre **effectif projet** (`ProjectTeamMember`) et **charge planifiée** : communication produit claire dans les libellés UI.
- **Permissions** : éviter que seul un admin client puisse staffer si l’objectif est le **responsable projet** — sinon la fonctionnalité ne sert pas le cas d’usage nominal.
- **Périmètre manager** : une incohérence entre « je vois le projet » et « je ne vois pas le collaborateur » doit produire un **empty** ou un message explicite, pas une erreur 500.
- **Performance** : index `@@index([clientId, projectId])` déjà prévu côté TEAM-007 ; listes paginées.
- **Nommage UI** — Préférer **« Charge planifiée »** / **« Affectations »** plutôt que « ressource » seul (ambigu avec le référentiel `Resource`).

---

# 9. Références croisées

- [RFC-TEAM-007](./RFC-TEAM-007%20%E2%80%94%20Affectations%20ressources.md)
- [RFC-TEAM-006](./RFC-TEAM-006%20%E2%80%94%20Taxonomie%20des%20activit%C3%A9s.md)
- Plan Équipes : [`docs/RFC/_Plan de déploiement - Equipe.md`](./_Plan%20de%20d%C3%A9ploiement%20-%20Equipe.md)
- UI : RFC-FE-TEAM-005 (à synchroniser sur les routes finales)
