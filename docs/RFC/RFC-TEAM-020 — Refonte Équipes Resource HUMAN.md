# RFC-TEAM-020 — Refonte module Équipes (Resource HUMAN)

**Statut** : Implémentation en cours  
**Périmètre** : Module Équipes — référentiel métier personne = `Resource` avec `type = HUMAN` ; plus de dépendance à `Collaborator` pour équipes, affectations planifiées et temps réalisé.

## Décisions figées

- **ID canonique** : `Resource.id` (`type = HUMAN`) pour membres d’équipe, lead d’équipe, périmètres managers, affectations planifiées, temps réalisé.
- **Planifié** : `TeamResourceAssignment` sur `resourceId` — charge planifiée uniquement.
- **Réalisé** : entité **`ResourceTimeEntry`** (distincte) — `resourceId`, date/période, `durationHours`, champs optionnels projet / activité, statut workflow, audit.
- **Champs RH** : étendus sur `Resource` (`jobTitle`, `department`, `phone`, `mobile`, `employeeNumber`, …).

## Phases (alignement plan `.cursor/plans`)

0. Cadrage (ce document)  
1. Schéma cible Prisma + migration additive  
2. Données : résolution `Collaborator` → `Resource` HUMAN puis bascule FK  
3. API backend (work-teams, team-assignments, time-entries)  
4. Temps réalisé (CRUD + RBAC)  
5. Frontend  
6. Nettoyage références Collaborator dans le module Équipes  
7. Documentation index

## Non-objectifs de cette RFC

- Ne pas supprimer l’entité `Collaborator` du socle annuaire (hors périmètre module Équipes).  
- Ne pas réécrire ici l’intégralité des RFC TEAM-005 / 007 / 009 — elles sont mises à jour dans `docs/` après livraison.
