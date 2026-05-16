# RFC-ACL-023 — Backfill lien `ClientUser` ↔ `Resource` HUMAN

## Statut

**Implémentée** — 2026-05. Complète [RFC-ORG-002](./RFC-ORG-002%20%E2%80%94%20Lien%20ClientUser%20%E2%86%94%20Resource%20HUMAN.md) et le lot migration [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md). Runbook : [migration-org-scope-access.md](../runbooks/migration-org-scope-access.md) §0.

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P0** |
| **Ordre recommandé** | **8a** — **avant** activation `ACCESS_DECISION_V2_*` sur un client utilisant `read_own` / `write_scope` |
| **Dépendances** | RFC-ORG-002, référentiel `Resource` HUMAN actif |
| **Livrables** | CLI idempotent, CSV d’écarts, audit batch, section runbook |

**Couplage** : exécuter sur un client **avant** ou **en parallèle** du backfill `ownerOrgUnitId` ([RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md)) ; **obligatoire** avant rollout scope si des profils portent des permissions `*_own` / `*_scope`.

---

## 1. Analyse de l’existant

- Modèle : `ClientUser.resourceId` nullable, `@@unique([resourceId])` quand renseigné.
- API/UI : assignation manuelle via `PATCH` client/plateforme + catalogue `GET …/human-resources-catalog`.
- Script existant : `apps/api/scripts/backfill-owner-org-unit.ts` (ownership uniquement).
- Cockpit [RFC-ACL-021](./RFC-ACL-021%20%E2%80%94%20Cockpit%20mod%C3%A8le%20d%27acc%C3%A8s%20admin%20client.md) : catégorie `missing_human` pour membres ACTIVE sans fiche HUMAN avec permissions scopées.

---

## 2. Hypothèses

- Matching **déterministe** uniquement : pas de lien automatique si ambiguïté (0 ou N candidats HUMAN).
- Stratégies V1 (ordre de tentative, configurable par flag CLI) :
  1. Email principal `User` = email métier `Resource` (HUMAN, même `clientId`, statut actif).
  2. Email identité par défaut du `ClientUser` (`defaultEmailIdentityId`) si présent.
  3. *(Optionnel, désactivé par défaut)* : nom + prénom normalisés **uniquement** si un seul candidat.
- Idempotent : seuls les membres `resourceId` null sont traités ; pas de `--force` en V1 (remplacement via API `patchHumanResourceLinkForClientMember`).

---

## 3. Fichiers à créer / modifier

| Fichier | Action |
| --- | --- |
| `apps/api/scripts/backfill-client-user-human-resource.ts` | CLI |
| `apps/api/src/common/backfill/client-user-human-resource.matcher.ts` | Matcher pur + tests |
| `apps/api/src/common/backfill/client-user-human-resource.backfill.ts` | Runner + `parseBackfillCliArgs` + tests |
| `docs/runbooks/migration-org-scope-access.md` | §0 prérequis HUMAN |

---

## 4. Implémentation

### CLI

Mode **obligatoire et exclusif** : `--dry-run` (simulation) ou `--apply` (écriture). Voir runbook §0.

```bash
pnpm --filter @starium-orchestra/api exec ts-node --transpile-only \
  scripts/backfill-client-user-human-resource.ts \
  --client-id <CLIENT_ID> \
  --dry-run   # ou --apply
  [--strategy email-default|email-identity|name-strict|all] \
  [--enable-name-strict] [--limit N]
```

**Colonnes CSV** (`tmp/backfill-human-link-<clientId>-<timestamp>.csv`) :  
`clientUserId`, `clientUserLabel`, `userEmail`, `defaultEmailIdentity`, `mode`, `action`, `resourceId`, `resourceLabel`, `matchedBy`, `candidateCount`, `reason`.

**Audit** (mode `--apply` uniquement) : `client_user.human_resource.backfill.linked` par batch.

### Règles métier (résumé)

- `ClientUser` **ACTIVE**, `resourceId` null ; candidats `Resource` type `HUMAN`, même `clientId`.
- Matching déterministe (pipeline email → identité → name-strict optionnel ; mode `--strategy all`).
- Candidat déjà lié à un autre membre → `SKIP` `resource_already_linked` (pas `NO_CANDIDATE` en mode `all`).
- `--dry-run` : CSV, 0 update, 0 audit ; `--apply` : écritures + audit.

---

## 5. Modifications Prisma

**Aucune** — réutilise le schéma RFC-ORG-002.

---

## 6. Tests

- `client-user-human-resource.matcher.spec.ts` — pipeline, `strategy=all`, ambiguïté, `resource_already_linked`, garde `already_linked`.
- `client-user-human-resource.backfill.spec.ts` — modes CLI (`--dry-run` / `--apply`), CSV, `P2002`, isolation `clientId`.

---

## 7. Récapitulatif

RFC-ACL-023 rend le lien **compte → fiche HUMAN** **déployable à l’échelle** sans bricolage SQL, condition nécessaire à un rollout **OWN/SCOPE** fiable ([RFC-ACL-016](./RFC-ACL-016%20%E2%80%94%20R%C3%A9solution%20du%20scope%20organisationnel.md) / [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md)).

---

## 8. Points de vigilance

- RGPD / RH : le matching email doit respecter la politique client (doublons, comptes partagés).
- Ne pas lier des comptes **techniques** ou **support** sans validation métier.
- Communiquer avant batch : les utilisateurs « sans fiche » verront un changement de comportement scope après rollout V2.
