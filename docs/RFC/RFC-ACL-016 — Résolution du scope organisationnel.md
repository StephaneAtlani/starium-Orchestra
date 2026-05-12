# RFC-ACL-016 — Résolution du scope organisationnel

## Statut

**Draft** — non implémentée. Dépend de [RFC-ORG-002](./RFC-ORG-002%20%E2%80%94%20Lien%20ClientUser%20%E2%86%94%20Resource%20HUMAN.md) (**MVP livré** : `ClientUser.resourceId` + API), [RFC-ORG-003](./RFC-ORG-003%20%E2%80%94%20Propri%C3%A9t%C3%A9%20organisationnelle%20des%20ressources.md) et [RFC-ACL-015](./RFC-ACL-015%20%E2%80%94%20Permissions%20OWN%20SCOPE%20ALL.md).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P0** |
| **Ordre recommandé** | **4** |
| **Dépendances (plan)** | RFC-ORG-002, RFC-ORG-003, RFC-ACL-015 |
| **Livrables (plan)** | `OrganizationScopeService`, résolution `User → Resource HUMAN → OrgUnit`, `reasonCodes`, tests unitaires |

Bloque la chaîne **RFC-ACL-017 → 018 → 019** : sans résolution de scope fiable, ni politique d’accès ni moteur unifié ne peuvent être figés.

## Objectif

Fournir un service backend **`OrganizationScopeService`** (nom indicatif) qui, pour un **utilisateur**, un **client actif** et une **ressource métier cible** (ou son `ownerOrgUnitId`), retourne un verdict de périmètre :

- `NONE` — hors périmètre organisationnel pour une action `read_scope` / `write_scope`.
- `OWN` — correspondance « soi » selon règle module (ex. `resourceId` du sujet = `ClientUser.resourceId`).
- `SCOPE` — la ressource appartient à une unité **dans** le périmètre couvert par les memberships de la personne HUMAN (sous-arbre, ou règle « même direction » à trancher).
- `ALL` — court-circuit explicite (permission `*_all` ou rôle admin produit).

Chaque réponse porte des **`reasonCodes`** stables pour le diagnostic (RFC-ACL-019).

---

## 1. Analyse de l’existant

- [RFC-ORG-001](./RFC-ORG-001%20%E2%80%94%20Socle%20Organisation%20Client.md) : `OrgUnitMembership` lie `resourceId` (HUMAN) à `orgUnitId`.
- Hiérarchie `OrgUnit.parentId` : permet calcul sous-arbre (CTE récursif ou cache matérialisé ultérieur).
- [RFC-ORG-002](./RFC-ORG-002%20%E2%80%94%20Lien%20ClientUser%20%E2%86%94%20Resource%20HUMAN.md) : `ClientUser.resourceId` et API de liaison sont **livrés** ; il manque encore **`OrganizationScopeService`** et l’`ownerOrgUnitId` généralisé ([RFC-ORG-003](./RFC-ORG-003%20%E2%80%94%20Propri%C3%A9t%C3%A9%20organisationnelle%20des%20ressources.md)) pour brancher le calcul `OWN` / `SCOPE` cible.

---

## 2. Hypothèses

- **Règle SCOPE V1** : l’utilisateur couvre l’unité propriétaire `U` si une de ses memberships HUMAN est sur un nœud `M` tel que `U` est dans le sous-arbre **enraciné** à `M` **ou** `M` est dans le sous-arbre de `U` (choix produit : *descendants* vs *ancestors* — à figer ; recommandation initiale : **ressource dans sous-arbre descendant** des unités de l’utilisateur, cohérent avec « je vois ce que ma direction contient »).
- **OWN** : définition **par module** dans une table de stratégie ou constantes (`OWN_STRATEGY: CREATOR | STEWARD | HUMAN_RESOURCE_SELF`).
- Résultat **cacheable** par requête HTTP (pas de cache cross-tenant).

---

## 3. Fichiers à créer / modifier (indicatif)

- `apps/api/src/common/organization/` ou `modules/access-control/` — `organization-scope.service.ts`
- Helpers Prisma : chargement memberships + unité propriétaire de la ressource en **une** requête ou deux max (batch pour listes dans RFC-ACL-018).
- Types exportés : `OrgScopeVerdict`, `OrgScopeReasonCode` enum/string union.

---

## 4. API publique du service (conceptuelle)

```ts
resolveOrgScope(input: {
  clientId: string;
  userId: string;           // User.id
  resource: {
    ownerOrgUnitId: string | null;
    ownHints?: Record<string, unknown>; // module-specific
  };
}): Promise<{ level: 'NONE' | 'OWN' | 'SCOPE' | 'ALL'; reasonCodes: string[] }>;
```

- Pas d’exposition HTTP directe obligatoire ; consommation interne par `AccessDecisionService` (RFC-ACL-018).

---

## 5. Hors périmètre

- Décision finale accès (licence, module, ACL) — RFC-ACL-018.
- UI diagnostic — RFC-ACL-019.

---

## 6. Tests unitaires obligatoires

- Utilisateur **sans** `ClientUser.resourceId` → `OWN` impossible ; `SCOPE` selon cas (peut être `NONE` si aucune membership).
- Ressource **sans** `ownerOrgUnitId` → `SCOPE` = `NONE` avec `reasonCodes` incluant `MISSING_OWNER_ORG_UNIT`.
- Deux clients : aucune fuite d’`OrgUnit` d’un client vers l’autre.
- Hiérarchie profonde (fixture arbre 4 niveaux).

---

## 7. Récapitulatif

Cette RFC est le **cœur métier** du modèle « droits par périmètre organisationnel » annoncé dans le plan Organisation & licences.

---

## 8. Points de vigilance

- Performance sur **listes** : ne pas appeler un CTE récursif par ligne ; préférer **batch** + structure en mémoire ou **path matérialisé** (`materializedPath`) sur `OrgUnit` en évolution ultérieure.
- Cohérence avec **WorkTeam** / scopes managers (RFC-TEAM-005) : documenter l’ordre de composition avec RFC-ACL-018 pour éviter les contradictions silencieuses.
