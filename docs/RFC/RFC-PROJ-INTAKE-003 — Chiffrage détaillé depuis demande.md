# RFC-PROJ-INTAKE-003 — Chiffrage détaillé depuis demande

| | |
| --- | --- |
| **Statut** | 📝 Draft — stub contrat (détail d’implémentation à ouvrir en P6) |
| **Date** | 2026-09-14 |
| **Parent** | [RFC-PROJ-INTAKE-002](./RFC-PROJ-INTAKE-002%20—%20CDC%20Demandes%20de%20projet%20(circuit%20configurable%20et%20fidélité%20visuelle).md) §12.1 |
| **Phase** | P6 (après pilote CDC P0–P5) |

## Objectif

Passer d’une enveloppe macro (`estimatedBudget` / `retainedBudget`) à un **chiffrage structuré** sans créer de lignes de dépense au stade demande, puis ouvrir le chiffrage fin dans le module Budget à la conversion.

## Contrat

1. Settings client : `allowStructuredEstimate` (bool, défaut `false`).
2. Sur `ProjectRequest` (si flag) : `capexAmount`, `opexAmount`, `effortDaysStructured` — somme informative ; le routage continue d’utiliser `retainedBudget ?? estimatedBudget`.
3. Conversion : créer / lier enveloppe Budget projet = montant retenu ; **zéro** `BudgetLine` auto.
4. UI : panneau A3/A5 uniquement si flag ; sinon parcours CDC inchangé.
5. Module Budget reste source de vérité du chiffrage fin post-projet.

## Hors scope stub

Écrans Budget complets, imports comptables, multi-devises.

## Conformité by design (rappel)

Montants hors DCP ; audit conversion ; isolation `clientId` ; libellés métier (pas d’ID budget en UI demande).
