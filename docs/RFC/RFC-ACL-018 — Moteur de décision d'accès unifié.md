# RFC-ACL-018 — Moteur de décision d’accès unifié

## Statut

**Draft** — non implémentée. Dépend de [RFC-ACL-016](./RFC-ACL-016%20%E2%80%94%20R%C3%A9solution%20du%20scope%20organisationnel.md) et [RFC-ACL-017](./RFC-ACL-017%20%E2%80%94%20Politique%20d%27acc%C3%A8s%20ressource.md). Priorité **P1**.

## Objectif

Centraliser la décision **autorisé / refusé** pour une intention d’accès (`read`, `write`, `admin`, `list`, …) sur une ressource métier dans un **`AccessDecisionService`** consommé par :

- un **`ResourceAccessDecisionGuard`** Nest (ou extension des guards existants) ;
- des **decorators** (`@RequireAccess({ resourceParam: 'id', intent: 'read' })`) pour réduire la duplication ;
- le **filtrage de listes** (`WHERE` / `filterReadableResourceIds` évolution) ;
- les **mutations** (même verdict que le détail).

### Ordre d’évaluation recommandé (court-circuit)

1. **Authentification** + **client actif** valides.
2. **Licence / abonnement** utilisateur (RFC-ACL-001 / 002) — si bloquant, refus immédiat + `reasonCode`.
3. **Visibilité module** (RFC-ACL-004).
4. **RBAC** : permission requise pour l’intention, incluant suffixe `own|scope|all` (RFC-ACL-015) — si `read_all` accordé, enregistrer quand même si ACL/policy restreint (étape suivante).
5. **Périmètre organisationnel** (RFC-ACL-016) pour les intents `*_own` / `*_scope`.
6. **Politique d’accès ressource** + **ACL** (RFC-ACL-005 + RFC-ACL-017).

Chaque refus / autorisation partielle doit être **justifiable** par une liste ordonnée de `reasonCodes` pour RFC-ACL-019.

---

## 1. Analyse de l’existant

- `ModuleAccessGuard`, `ResourceAclGuard`, services licences, `filterReadableResourceIds` ([RFC-ACL-006](./RFC-ACL-006%20%E2%80%94%20Int%C3%A9gration%20ACL%20dans%20les%20modules%20m%C3%A9tier.md)) — logique **dispersée**.
- Risque de divergence liste vs détail si non unifié.

---

## 2. Hypothèses

- Le service est **stateless** ; pas de cache global cross-tenant.
- Pour **listes paginées**, deux modes : (a) filtre SQL préalable sur IDs autorisés ; (b) post-filtre interdit au-delà de petits jeux — documenter les limites.
- **PLATFORM_ADMIN** : règles existantes (Option A, `X-Client-Id`) inchangées ; le moteur accepte un contexte « impersonation » explicite.

---

## 3. Fichiers à créer / modifier (indicatif)

- `access-decision.service.ts`, `access-decision.types.ts`
- `resource-access-decision.guard.ts`
- Refactor progressif des contrôleurs ciblés par RFC-ACL-020.
- Intégration avec `EffectivePermissionsService`.

---

## 4. Hors périmètre

- UI diagnostic (RFC-ACL-019).
- Cockpit agrégé RFC-ACL-021.

---

## 5. Tests

- Tests unitaires du service : grilles combinées licence × module × rbac × org × acl × policy.
- Tests d’intégration sur **un** module pilote (ex. `GET /api/projects/:id` vs liste) avant généralisation.

---

## 6. Récapitulatif

RFC-ACL-018 est le **point d’ancrage technique** pour éviter les failles « liste permissive / détail restrictif » et pour intégrer proprement **OWN / SCOPE / ALL**.

---

## 7. Points de vigilance

- **Latence** : éviter N appels au moteur dans une boucle ; API batch `assertAccessMany`.
- **Compatibilité** : feature flags (RFC-ACL-022) pour activer le guard unifié module par module.
