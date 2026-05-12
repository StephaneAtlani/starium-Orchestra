# RFC-ACL-017 — Politique d’accès ressource (`DEFAULT` / `RESTRICTIVE` / `SHARING`)

## Statut

**Draft** — non implémentée. Dépend de [RFC-ACL-005](./RFC-ACL-005%20%E2%80%94%20ACL%20ressources%20g%C3%A9n%C3%A9riques.md) et [RFC-ACL-016](./RFC-ACL-016%20%E2%80%94%20R%C3%A9solution%20du%20scope%20organisationnel.md). Priorité **P1** dans le plan [_Plan de déploement Orgnisation et licences](./_Plan%20de%20d%C3%A9ploement%20Orgnisation%20et%20licences.md).

## Objectif

Formaliser un **mode de gouvernance** par ressource (ou par type de ressource + défaut client) qui clarifie comment se combinent **RBAC**, **scope organisationnel** et **entrées `ResourceAcl`** :

| Mode | Comportement cible (intention) |
| --- | --- |
| **DEFAULT** | Comportement historique « RBAC public » tant qu’aucune ACL n’existe ; dès qu’une ACL existe, appliquer la sémantique restrictive actuelle (cf. `ResourceAclGuard` aujourd’hui). |
| **RESTRICTIVE** | Toute lecture/écriture doit satisfaire RBAC + scope + ACL explicite (même liste vide = pas d’accès par défaut pour les sujets non couverts — variante à valider produit). |
| **SHARING** | Le RBAC + scope définissent un **plancher** ; les entrées ACL **ajoutent** des sujets (partage explicite) sans basculer automatiquement en « tout le monde interdit sauf liste » tant que non configuré. |

> Les noms exacts peuvent rester `DEFAULT | RESTRICTIVE | SHARING` en enum Prisma ; l’important est la **matrice de décision** documentée et testée (RFC-ACL-018).

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

## 3. Fichiers à créer / modifier (indicatif)

- Prisma : modèle ou colonnes + migration + seed défaut.
- `ResourceAclGuard` / futur `AccessDecisionService` : lecture policy avant branche ACL.
- Audit : `resource_access_policy.changed`.
- UI : sélecteur dans l’éditeur ACL ou fiche ressource (libellés métier des modes + aide contextuelle).

---

## 4. Matrice de décision (à compléter en implémentation)

Document obligatoire dans la RFC lors du grooming : pour chaque combinaison `(mode, hasAclEntries, rbacLevel, orgScope, aclEntry)` → `ALLOW` / `DENY` + `reasonCode`.

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
