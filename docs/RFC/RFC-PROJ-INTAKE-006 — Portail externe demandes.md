# RFC-PROJ-INTAKE-006 — Portail externe demandes

| | |
| --- | --- |
| **Statut** | 📝 Draft — stub contrat (détail d’implémentation à ouvrir en P9) |
| **Date** | 2026-09-14 |
| **Parent** | [RFC-PROJ-INTAKE-002](./RFC-PROJ-INTAKE-002%20—%20CDC%20Demandes%20de%20projet%20(circuit%20configurable%20et%20fidélité%20visuelle).md) §12.4 |
| **Phase** | P9 |

## Objectif

Permettre à un **intervenant externe authentifié** (partenaire, métier hors SSO interne) de déposer et suivre une demande, sans formulaire public anonyme ni fuite inter-client.

## Contrat

1. Auth : compte invité client-scopé **ou** magic-link à usage limité (JWT court) — **pas** d’endpoint anonyme ouvert.
2. `ProjectRequest.source = EXTERNAL` ; `externalOrgLabel` (libellé) ; `requesterUserId` = compte invité.
3. Circuit identique (seuils, N+1, instruction, cycle) ; **pas** d’accès A4 config.
4. Visibilité : externe = ses demandes ; PMO / lecteurs internes = règles INTAKE-002.
5. UI : sous-ensemble A2 (création) + A3 lecture + journal ; pas d’actions instruct/agenda.

## RGPD (renforcé)

- Minimisation champs externes ; finalité dépôt besoin.
- Rétention / purge comptes invités (durée client) ; anonymisation à l’effacement.
- **Jamais** email / token en logs ; audit connexions magic-link (métadonnées seules).

## Sécurité

- Isolation `clientId` stricte ; rate-limit magic-link ; RBAC `project_requests.create` limité scope invité.
- Pas de listage cross-demandeur.

## Hors scope stub

Portail fournisseur achats (FOU), SSO IdP externe complet, white-label multi-marque.
