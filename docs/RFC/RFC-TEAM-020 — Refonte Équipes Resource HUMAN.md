# RFC-TEAM-020 — Refonte module Équipes (Resource HUMAN)

**Statut** : Socle implémenté (work-teams, temps réalisé) ; **staffing planifié retiré** (voir migration `20260404213000_drop_team_resource_assignment`).  
**Périmètre** : Module Équipes — référentiel métier personne = `Resource` avec `type = HUMAN` ; plus de dépendance à `Collaborator` pour équipes et temps réalisé.

## Décisions figées

- **ID canonique** : `Resource.id` (`type = HUMAN`) pour membres d’équipe, lead d’équipe, périmètres managers, temps réalisé.
- **Planifié** : l’ancien modèle **`TeamResourceAssignment`** a été **retiré** du schéma (spec historique : RFC-TEAM-007 / 008).
- **Réalisé** : entité **`ResourceTimeEntry`** — `resourceId`, date/période, `durationHours`, champs optionnels projet / activité, statut workflow, audit ; RBAC `resources.read` / `resources.update`. Fiche **mensuelle** **`ResourceTimesheetMonth`** et routes **`/api/resource-timesheet-months/...`** (soumission / déverrouillage) ; UI **`/teams/time-entries`** (grille mensuelle, alignement [API.md](../API.md) § temps réalisé).
- **Champs RH** : étendus sur `Resource` (`jobTitle`, `department`, `phone`, `mobile`, `employeeNumber`, …).

## Phases (alignement plan `.cursor/plans`)

0. Cadrage (ce document)  
1. Schéma cible Prisma + migration additive  
2. Données : résolution `Collaborator` → `Resource` HUMAN puis bascule FK  
3. API backend (work-teams, ~~team-assignments~~ retiré, time-entries)  
4. Temps réalisé (CRUD + RBAC)  
5. Frontend  
6. Nettoyage références Collaborator dans le module Équipes  
7. Documentation index

## Non-objectifs de cette RFC

- Ne pas supprimer l’entité `Collaborator` du socle annuaire (hors périmètre module Équipes).  
- Ne pas réécrire ici l’intégralité des RFC TEAM-005 / 007 / 009 — elles sont mises à jour dans `docs/` après livraison.
