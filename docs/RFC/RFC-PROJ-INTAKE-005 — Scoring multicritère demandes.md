# RFC-PROJ-INTAKE-005 — Scoring multicritère demandes

| | |
| --- | --- |
| **Statut** | 📝 Draft — stub contrat (détail d’implémentation à ouvrir en P8) |
| **Date** | 2026-09-14 |
| **Parent** | [RFC-PROJ-INTAKE-002](./RFC-PROJ-INTAKE-002%20—%20CDC%20Demandes%20de%20projet%20(circuit%20configurable%20et%20fidélité%20visuelle).md) §12.3 |
| **Phase** | P8 |
| **Réf. pattern** | Scores items cycles — [RFC-PROJ-CYCLE-001](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md) |

## Objectif

Aider l’arbitrage (instruction / comité) par des **axes configurables**, sans remplacer la priorité déclarative ni automatiser la décision.

## Contrat

1. Tables : `ProjectRequestScoreAxis` (client, label, poids, actif) ; `ProjectRequestScoreValue` (demande, axisId, score 0–5 ou 0–100 — à figer en P8).
2. Saisie : PMO en A5 (`project_requests.instruct`) ; lecture A3 / A7.
3. Agrégat pondéré exposé en DTO `scoreSummary` — **jamais** utilisé pour auto-approve / auto-reject / auto-route.
4. À l’inscription ODJ : copie optionnelle des scores vers `GovernanceCycleItem` si présent.
5. Priorité demandée (`priorityRequested`) reste indépendante.

## Hors scope stub

ML / scoring automatique, ranking portefeuille global.

## Conformité by design (rappel)

Axes = libellés métier ; contraste jauges ; audit modification scores ; isolation client.
