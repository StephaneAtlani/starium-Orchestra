# RFC-PROJ-INTAKE-004 — Planning skeleton depuis demande

| | |
| --- | --- |
| **Statut** | 📝 Draft — stub contrat (détail d’implémentation à ouvrir en P7) |
| **Date** | 2026-09-14 |
| **Parent** | [RFC-PROJ-INTAKE-002](./RFC-PROJ-INTAKE-002%20—%20CDC%20Demandes%20de%20projet%20(circuit%20configurable%20et%20fidélité%20visuelle).md) §12.2 |
| **Phase** | P7 |

## Objectif

Interdire toute planification au stade demandeur ; à la conversion, initialiser un **squelette** de planning + plan d’action de cadrage, sans tâches métier.

## Contrat

1. Settings : `seedPlanningSkeleton` (bool, défaut `true` recommandé).
2. Avant `APPROVED` / conversion : **aucune** tâche / jalon / phase saisissable sur la demande.
3. À `convert` : (a) plan d’action + action « Cadrer le projet et désigner le chef de projet » (CDC) ; (b) si flag — 1 phase « Cadrage » + 1 jalon « Chef de projet nommé », 0 tâche.
4. Fiche demande convertie : lien lecture seule vers planning projet (`displayLabel` projet, pas d’UUID).

## Hors scope stub

Gantt complet, sync Microsoft, capacité (RFCs PROJ / scénarios existantes).

## Conformité by design (rappel)

Pas de DCP dans noms de phases ; mobile : lien planning accessible clavier ; isolation client.
