# RFC-ACL-021 — Cockpit « modèle d’accès » (admin client)

## Statut

**Draft** — non implémentée. Priorité **P2**. Dépend de [RFC-ACL-019](./RFC-ACL-019%20%E2%80%94%20Diagnostic%20enrichi%20organisation%20et%20acc%C3%A8s.md) et [RFC-ACL-020](./RFC-ACL-020%20%E2%80%94%20Int%C3%A9gration%20modules%20m%C3%A9tier%20ownership%20et%20scope.md).

## Objectif

Fournir une **vue d’ensemble** pour les administrateurs client sur la santé du modèle d’accès :

- Ressources métier **sans Direction** (`ownerOrgUnitId` null) alors qu’elles devraient en avoir une (politique client).
- Utilisateurs **sans `Resource` HUMAN** liée ([RFC-ORG-002](./RFC-ORG-002%20%E2%80%94%20Lien%20ClientUser%20%E2%86%94%20Resource%20HUMAN.md)) alors qu’ils ont des permissions `*_scope` / `*_own`.
- **Partages ACL** atypiques (ex. beaucoup de `WRITE` externes à la direction propriétaire) — détection heuristique.
- **Conflits potentiels** (ex. policy `SHARING` + ACL vide + RBAC restreint — combinaisons documentées RFC-ACL-017).

Route UI cible (indicative) : **`/client/administration/access-model`** (à valider avec l’arborescence navigation existante — voir placeholder `access-cockpit`).

---

## 1. Analyse de l’existant

- [RFC-ACL-010](./RFC-ACL-010%20%E2%80%94%20UX%20cockpit%20licences%20et%20droits.md) : cockpit licences / quotas — périmètre différent.
- Pages administration client sous `(protected)/client/administration/`.

---

## 2. Hypothèses

- Les KPI sont calculés **côté serveur** (agrégations SQL ou jobs matérialisés si volumétrie) avec pagination ; pas de scan complet synchrone si > N milliers de lignes sans index.
- Toutes les listes affichent **nom / titre** métier, jamais UUID seul.

---

## 3. Fichiers à créer / modifier (indicatif)

- Backend : `GET /api/access-model/health` ou module dédié avec permissions `access_model.read` (nouvelle permission seed).
- Frontend : feature `access-model/` (KPI cards, tableaux filtrables, liens d’action vers fiches correctives).
- Actions correctives : deep-links vers écrans existants (édition membre, fiche budget, éditeur ACL).

---

## 4. Hors périmètre

- Modification massive automatique des données (pas de « magic fix » sans revue) — seulement **assist** + exports.

---

## 5. Tests

- API : isolation client, permission refusée, résultats stables sur fixture.
- UI : smoke tests sur rendu KPI + navigation.

---

## 6. Récapitulatif

RFC-ACL-021 transforme les briques techniques (ORG + ACL + scope) en **outillage de pilotage** pour une DSI fractionnée.

---

## 7. Points de vigilance

- Coût des agrégations en production : cache courte TTL ou job nocturne.
- Ne pas exposer de données nominatives sensibles aux rôles non autorisés (filtrer selon RBAC du viewer).
