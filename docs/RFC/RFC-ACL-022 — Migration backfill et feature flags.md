# RFC-ACL-022 — Migration, backfill et feature flags

## Statut

**Draft** — non implémentée. Dépend des schémas et règles introduits par [RFC-ORG-003](./RFC-ORG-003%20%E2%80%94%20Propri%C3%A9t%C3%A9%20organisationnelle%20des%20ressources.md) et [RFC-ACL-017](./RFC-ACL-017%20%E2%80%94%20Politique%20d%27acc%C3%A8s%20ressource.md). Les scripts de backfill pour **RFC-ORG-002** (`ClientUser.resourceId`) s’appuient sur le modèle défini dans ORG-002 même si le plan ne répète pas ORG-002 dans la ligne « Dépendances » du tableau.

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md) (§ *Ordre prioritaire recommandé* : **022 avant 021**, couplage **022 ↔ 020**).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P1** |
| **Ordre recommandé** | **9** (en parallèle logique de la tranche **020** ordre **8** sur le même module) |
| **Dépendances (plan)** | RFC-ORG-003, RFC-ACL-017 |
| **Livrables (plan)** | Scripts de backfill, rapports d’écarts, feature flags, documentation de migration |

### Couplage obligatoire avec RFC-ACL-020

Les **feature flags**, migrations et rapports d’écarts doivent être **scopés par module métier** et activés **en même temps** que le branchement [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md) sur ce module. Pas d’activation des guards / filtrage scope (020) sans les leviers 022 correspondants.

**Position vs RFC-ACL-021** : **022** (et des données issues des rollouts **020+022**) précède le cockpit **021** pour des indicateurs exploitables.

## Objectif

Permettre un **déploiement contrôlé** du socle organisationnel + scope + moteur unifié sans rupture de service :

1. **Scripts de backfill** : liens `ClientUser.resourceId` (matching contrôlé), `ownerOrgUnitId` par défaut (ex. racine client ou unité « Non classé » créée ad hoc), politiques `DEFAULT`.
2. **Rapports d’écarts** : CSV/JSON listant lignes non résolues (plusieurs candidats HUMAN, aucune unité applicable).
3. **Feature flags** : activation par module (`projects`, `budgets`, …) et par capacité (`ORG_SCOPE_ENFORCEMENT`, `ACCESS_DECISION_V2`, etc.) — noms indicatifs à centraliser (`apps/api/src/config` ou table `ClientFeatureFlag` si dynamique client).
4. **Documentation de migration** : ordre d’exécution, rollback, critères de « done ».

---

## 1. Analyse de l’existant

- Migrations Prisma linéaires ; seeds environnement.
- Pas de moteur de feature flag documenté globalement pour ce périmètre (à introduire ou réutiliser un mécanisme existant `Client.metadata` / settings).

---

## 2. Hypothèses

- Tout backfill **idempotent** (rejouable).
- Logs d’audit **transactionnels** par batch (début/fin, compteurs).
- En cas de doute métier : **pas de lien auto** `ClientUser` → HUMAN (ligne dans rapport d’écart).

---

## 3. Livrables

| Livrable | Description |
| --- | --- |
| `scripts/migrations/org-scope/` | CLI interne (pnpm) avec options `--clientId`, `--dry-run`. |
| Rapports | Artefacts stockés localement ou export S3 selon infra (hors scope : choix équipe). |
| Flags | Lecture côté `AccessDecisionService` pour fallback comportement V1. |
| Runbook | `docs/runbooks/migration-org-scope-access.md` *(création seulement si validé par équipe — sinon section dans cette RFC jusqu’à implémentation)* |

---

## 4. Hors périmètre

- Migration des données **historiques audit** (inchangé).
- Double-écriture longue durée : objectif **courte fenêtre** avec bascule ; si double-run nécessaire, documenter explicitement.

---

## 5. Tests

- Tests des scripts en **dry-run** sur fixture SQLite/Postgres testcontainer.
- Test de **rollback** migration Prisma sur branche CI (clone schema).

---

## 6. Récapitulatif

RFC-ACL-022 est la **RFC d’opérations** : elle rend les RFC ORG/ACL **déployables** en production progressive.

---

## 7. Points de vigilance

- **Fenêtre maintenance** vs migrations online : choisir `CONCURRENTLY` pour index si volumétrie.
- Coordination avec équipe **support** : communication sur changements de comportement liste/filtre.
