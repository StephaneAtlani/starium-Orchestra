# RFC-ACL-017 — Politique d’accès ressource (`DEFAULT` / `RESTRICTIVE` / `SHARING`)

## Statut

**Implémentée V1 — politique `ResourceAccessPolicy` livrée, plancher SHARING basé RBAC, scope organisationnel branché ultérieurement par RFC-ACL-018.**

Dépend de [RFC-ACL-005](./RFC-ACL-005%20%E2%80%94%20ACL%20ressources%20g%C3%A9n%C3%A9riques.md) et [RFC-ACL-016](./RFC-ACL-016%20%E2%80%94%20R%C3%A9solution%20du%20scope%20organisationnel.md). [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d'acc%C3%A8s%20unifi%C3%A9.md) couvre le **moteur de décision complet** et le diagnostic enrichi ; la présente RFC fournit les **entrées policy** (`mode`, `reasonCode`, champs API `accessPolicy` / `effectiveAccessMode`) consommées par ce moteur — **sans** promettre que le scope organisationnel est déjà dans le même pipeline que tous les `can*` métier.

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P1** |
| **Ordre recommandé** | **5** |
| **Dépendances (plan)** | RFC-ACL-005, RFC-ACL-016 |
| **Livrables (plan)** | `ResourceAccessPolicy`, API policy, compatibilité ACL existante, tests non-régression |

**Chaîne de mise en prod (plan)** : **RFC-ACL-017 → 018 → 019** — la politique d’accès est livrée **avant** le moteur unifié et le diagnostic enrichi, pour figer la matrice `DEFAULT` / `RESTRICTIVE` / `SHARING` consommée par RFC-ACL-018.

## Objectif

Formaliser un **mode de gouvernance** par ressource (ou par type de ressource + défaut client) qui clarifie comment se combinent **RBAC**, **scope organisationnel** et **entrées `ResourceAcl`** :

| Mode | Comportement cible (intention) |
| --- | --- |
| **DEFAULT** | Comportement historique « RBAC public » tant qu’aucune ACL n’existe ; dès qu’une ACL existe, appliquer la sémantique restrictive actuelle (cf. `ResourceAclGuard` aujourd’hui). |
| **RESTRICTIVE** | RBAC + ACL explicite côté couche ACL : liste vide = refus pour tout le monde sur cette couche (V1 alignée produit, voir matrice §4). |
| **SHARING** | Le RBAC + scope définissent un **plancher** ; les entrées ACL **ajoutent** des sujets (partage explicite) sans basculer automatiquement en « tout le monde interdit sauf liste » tant que non configuré. |

> Les noms exacts restent `DEFAULT | RESTRICTIVE | SHARING` en enum Prisma ; la **matrice de décision** documentée et testée est en §4 (implémentation V1) ; RFC-ACL-018 unifiera le moteur avec les autres couches.

---

## 1. Analyse de l’existant

- Aujourd’hui : passage « mode public RBAC » → « ACL stricte » dès la première entrée ACL sur une ressource ([RFC-ACL-013](./RFC-ACL-013%20%E2%80%94%20%C3%89diteur%20ACL%20par%20ressource.md) / RFC-ACL-005).
- Risque : introduction de `SCOPE` sans ajuster cette transition crée des **régressions** (utilisateurs avec RBAC global mais hors ACL stricte perdent l’accès).

---

## 2. Hypothèses

- La politique est stockée au niveau **`ResourceAccessPolicy`** : soit colonne sur entités métier, soit table `(clientId, resourceType, resourceId, mode)` avec override optionnel par défaut client.
- Seuls **CLIENT_ADMIN** (et Option A plateforme si applicable) modifient la politique.
- Migration : toutes les ressources existantes → **`DEFAULT`** pour préserver le comportement actuel.

---

## 3. Implémentation V1 (réalisée)

- **Prisma** : enum `ResourceAccessPolicyMode`, modèle `ResourceAccessPolicy` (`@@unique([clientId, resourceType, resourceId])`), migration ; absence de ligne = mode **`DEFAULT`**.
- **Backend** : `apps/api/src/modules/access-control/resource-access-policy.decision.ts` (`evaluateResourceAccessDecision`, `reasonCode`, `effectiveAccessMode`) ; `AccessControlService` (`resolveAccessPolicy` / batch `resolveAccessPolicies`, `can*` / `filterReadableResourceIds` avec `sharingFloorAllows`, `upsertAccessPolicy`).
- **API** : `GET` liste enrichi (`accessPolicy`, `effectiveAccessMode`, `restricted` inchangé = `entries.length > 0`) ; `PATCH /api/resource-acl/:resourceType/:resourceId/access-policy` body `{ mode }` ; audit `resource_access_policy.changed`.
- **Frontend** : `apps/web/src/features/resource-acl/` — sélecteur politique, bannières sur `(accessPolicy, effectiveAccessMode)`.

---

## 4. Matrice de décision (V1 — implémentation)

La logique canonique est `evaluateResourceAccessDecision` dans `apps/api/src/modules/access-control/resource-access-policy.decision.ts`. Les colonnes **RBAC / scope** ne sont pas re-évaluées ici : elles doivent déjà autoriser l’opération avant l’appel ; `sharingFloorAllows` n’est `true` que si le guard métier a validé le plancher pour la même opération.

Légende : **ACL** = présence d’au moins une entrée `ResourceAcl` sur la ressource ; **match** = le sujet a un rang ACL ≥ rang minimal de l’opération (ordre croissant : `read`, `write`, `admin`).

| Mode | ACL vide | ACL + match | ACL + pas match |
| --- | --- | --- | --- |
| **DEFAULT** | ALLOW (`POLICY_DEFAULT_NO_ACL_PUBLIC`) — `effectiveAccessMode`: `PUBLIC_DEFAULT` | ALLOW (`POLICY_DEFAULT_ACL_MATCH`) — `ACL_RESTRICTED` | DENY (`POLICY_DEFAULT_ACL_NO_MATCH`) — `ACL_RESTRICTED` |
| **RESTRICTIVE** | DENY (`POLICY_RESTRICTIVE_EMPTY_DENY`) — `RESTRICTIVE_EMPTY_DENY` | ALLOW (`POLICY_RESTRICTIVE_ACL_MATCH`) — `ACL_RESTRICTED` | DENY (`POLICY_RESTRICTIVE_ACL_NO_MATCH`) — `ACL_RESTRICTED` |
| **SHARING** | ALLOW si `sharingFloorAllows` (`POLICY_SHARING_NO_ACL_FLOOR_ALLOW`, `SHARING_FLOOR_ALLOW`), sinon DENY (`POLICY_SHARING_NO_ACL_FLOOR_DENY`, `SHARING_FLOOR_DENY`) | ALLOW (`POLICY_SHARING_ACL_MATCH`, `SHARING_ACL_PLUS_FLOOR`) | ALLOW si `sharingFloorAllows` (`POLICY_SHARING_ACL_NO_MATCH_FLOOR_ALLOW`), sinon DENY (`POLICY_SHARING_ACL_NO_MATCH_FLOOR_DENY`) — `effectiveAccessMode`: `SHARING_ACL_PLUS_FLOOR` |

**Liste vide + RESTRICTIVE** : refus explicite (pas d’accès par défaut pour les sujets non couverts par ACL). **GET liste ACL (admin)** : le calcul d’`effectiveAccessMode` côté API utilise `sharingFloorAllows: true` pour refléter la bannière « plancher » sans élargir les droits métier des autres endpoints.

---

## 5. Hors périmètre

- Moteur complet RFC-ACL-018 (cette RFC fournit les **inputs** policy).
- Migration de données RFC-ACL-022 (mais les feature flags peuvent réutiliser le même mécanisme).

---

## 6. Tests

- **Non-régression** : ressource en `DEFAULT` sans ACL → accès inchangé vs baseline actuelle.
- `SHARING` : scénario « partage utilisateur B sans retirer A » couvert par cas documenté.
- Interdiction cross-`clientId`.

---

## 7. Récapitulatif

RFC-ACL-017 sécurise la **transition** vers un modèle où l’ACL n’est plus seulement « couper le monde », mais aussi **partager explicitement** sans casser le RBAC + scope.

---

## 8. Points de vigilance

- UX admin : expliquer clairement la différence DEFAULT vs SHARING (risque erreur humaine).
- Interaction avec **lockout** dernière capacité ADMIN ACL ([RFC-ACL-014](./RFC-ACL-014%20%E2%80%94%20Conformit%C3%A9%20mod%C3%A8le%20R%C3%B4les%2C%20Groupes%20et%20ACL.md)) : aucune régression sur les garde-fous existants.
