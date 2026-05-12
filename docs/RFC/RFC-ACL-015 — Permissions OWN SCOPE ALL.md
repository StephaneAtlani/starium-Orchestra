# RFC-ACL-015 — Permissions `OWN` / `SCOPE` / `ALL`

## Statut

**Draft** — non implémentée. Étend le RBAC existant (permissions par module + rôles) sans remplacer [RFC-ACL-005](./RFC-ACL-005%20%E2%80%94%20ACL%20ressources%20g%C3%A9n%C3%A9riques.md) (ACL par ressource `READ|WRITE|ADMIN`).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P0** |
| **Ordre recommandé** | **3** (après ORG-002 et ORG-003) |
| **Dépendances (plan)** | RBAC existant (seeds, profils, `EffectivePermissionsService`) |
| **Livrables (plan)** | Permissions seedées (`read_own`, `read_scope`, `read_all`, `write_scope`, `manage_all`, etc.), profils mis à jour, tests RBAC, documentation des mappings |

Les codes doivent être **figés avant** le durcissement enforcement dans [RFC-ACL-016](./RFC-ACL-016%20%E2%80%94%20R%C3%A9solution%20du%20scope%20organisationnel.md) / [RFC-ACL-018](./RFC-ACL-018%20%E2%80%94%20Moteur%20de%20d%C3%A9cision%20d%27acc%C3%A8s%20unifi%C3%A9.md).

## Objectif

Introduire une **granularité de périmètre** dans les capacités RBAC, exprimée par des **suffixes ou codes** normalisés :

| Périmètre | Signification métier (liste / détail) |
| --- | --- |
| **OWN** | Uniquement les enregistrements où l’utilisateur est acteur direct (ex. assigné, créateur, ou ressource HUMAN « soi » selon règle module). |
| **SCOPE** | Enregistrements dont la **propriété organisationnelle** (RFC-ORG-003) ou l’appartenance **OrgUnit** de l’utilisateur (RFC-ACL-016) tombe dans le sous-périmètre autorisé. |
| **ALL** | Tout le client (sous réserve licence module + ACL ressource éventuelle). |

Exemples de codes cibles (à figer dans un registre unique, ex. `permissions.catalog.ts` + seed) :

- `budgets.read_own`, `budgets.read_scope`, `budgets.read_all`
- `budgets.write_scope`, `budgets.manage_all`
- Symétrie pour `projects`, `contracts`, `suppliers`, `strategic_vision`, `documents`, etc.

Les permissions **sans** suffixe existantes restent valides : règle de **compatibilité** — mapping explicite ancien → nouveau (ex. `budgets.read` → `budgets.read_all` ou garde-fou double jusqu’à migration).

---

## 1. Analyse de l’existant

- Seeds profils / rôles (`default-profiles.json`, tables `Permission` / liaisons rôle-permission selon implémentation réelle).
- `EffectivePermissionsService` + guards Nest consommant des codes string.
- Pas aujourd’hui de notion **SCOPE** organisationnelle dans les guards métier (hors cas particuliers locaux).

---

## 2. Hypothèses

- Les codes sont des **strings stables** côté API ; le front affiche des **libellés FR** issus d’un dictionnaire.
- **`ALL` implicite pour `CLIENT_ADMIN`** reste une règle produit possible, mais doit être **codée explicitement** dans le moteur (RFC-ACL-018) pour éviter les divergences module par module.
- **`PLATFORM_ADMIN`** hors scope client : inchangé ; pas de `SCOPE` inter-clients.

---

## 3. Fichiers à créer / modifier (indicatif)

- Registre permissions + migration seed des nouvelles lignes.
- Mise à jour **profils par défaut** : équivalence fonctionnelle post-migration.
- `EffectivePermissionsService` : résolution des suffixes (préparation ; le calcul géographique du scope = RFC-ACL-016).
- Documentation [ACCESS-MODEL.md](../ACCESS-MODEL.md) après implémentation.
- `/me/permissions` : exposer les nouveaux codes pour que le front adapte menus (ou masque) progressivement.

---

## 4. Hors périmètre

- Implémentation du calcul de sous-arbre `OrgUnit` (RFC-ACL-016).
- Politique `ResourceAccessPolicy` (RFC-ACL-017).
- UI cockpit RFC-ACL-021.

---

## 5. Tests

- Matrice : utilisateur avec seulement `read_scope` ne reçoit pas `read_all` effectivement une fois RFC-ACL-018 branché ; pour cette RFC seule, tests sur **catalogue** et **résolution naive** (présence codes en base + non-régression profils).
- Aucune permission ne cible un autre `clientId`.

---

## 6. Récapitulatif

RFC-ACL-015 fournit le **vocabulaire** RBAC ; RFC-ACL-016 et RFC-ACL-018 donnent la **sémantique** et l’**enforcement**.

---

## 7. Points de vigilance

- Explosion combinatoire : limiter aux **actions** réellement distinctes (read vs write vs manage) ; éviter `write_own` si non pertinent.
- Cohérence avec **ACL ressource** : RBAC `read_all` n’outrepasse pas une ACL `RESTRICTIVE` sans entrée (RFC-ACL-017).
