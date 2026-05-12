# RFC-ORG-002 — Lien `ClientUser` ↔ `Resource` (type HUMAN)

## Statut

**Draft** — spécification cible ; non implémentée au moment de la rédaction. Dépend de [RFC-ORG-001](./RFC-ORG-001%20%E2%80%94%20Socle%20Organisation%20Client.md) (socle `OrgUnit` / memberships sur `resourceId` HUMAN).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P0** |
| **Ordre recommandé** | **1** (après RFC-ORG-001, déjà livrée) |
| **Dépendances (plan)** | RFC-ORG-001, `ClientUser`, `Resource` |
| **Livrables (plan)** | Extension `ClientUser.resourceId`, service de liaison, endpoints, audit, UI d’administration |

Le **backfill** des liens existants relève de [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md) ; cette RFC définit le modèle, l’API et les règles de validation.

## Objectif

Relier explicitement le **compte d’appartenance au client** (`ClientUser`) à la **fiche personne** du catalogue ressources (`Resource` avec `type = HUMAN`) dans le **même `clientId`**, afin que les moteurs d’accès (RFC-ACL-016+) puissent résoudre : `User` authentifié → `ClientUser` actif → `Resource` HUMAN → rattachements organisationnels (`OrgUnitMembership`, etc.).

Sans ce lien, seuls des heuristiques fragiles (email, code interne) permettraient d’associer un utilisateur à une ressource humaine — inacceptable pour le calcul de périmètres `OWN` / `SCOPE`.

---

## 1. Analyse de l’existant

- **`ClientUser`** ([`schema.prisma`](../../apps/api/prisma/schema.prisma)) : couple unique `(userId, clientId)`, champs licence, `excludeFromResourceCatalog`, pas de `resourceId` aujourd’hui.
- **`Resource`** : `clientId`, `type`, contraintes d’unicité `(clientId, email)` et `(clientId, code)` ; relations `orgUnitMemberships` / `orgGroupMemberships` (RFC-ORG-001).
- **RFC-TEAM-020** : beaucoup de périmètres « équipes » reposent déjà sur `resourceId` (HUMAN) ; le lien `ClientUser` reste distinct (compte vs fiche métier).
- **Synchronisation annuaire** (RFC-TEAM-001) : peut créer `User` + `ClientUser` sans garantir une `Resource` HUMAN alignée — la RFC doit prévoir états partiels et UI de résolution.

---

## 2. Hypothèses

- Un même `User` ne possède qu’**un** `ClientUser` par client (déjà garanti) ; on autorise **au plus une** `Resource` HUMAN liée par `ClientUser` (cardinalité 0..1 côté `ClientUser`).
- La ressource liée doit satisfaire : `resource.clientId === clientUser.clientId` et `resource.type === HUMAN`.
- Le lien est **administrable** (CLIENT_ADMIN ou permission dédiée `organization.*` / future `members.human_link.update`) — pas choisi librement par l’utilisateur final sans droit.
- `excludeFromResourceCatalog === true` n’interdit pas techniquement un lien, mais l’UI doit signaler l’incohérence métier (personne masquée du catalogue mais compte lié).

---

## 3. Liste des fichiers à créer / modifier (indicatif)

| Zone | Fichiers / zones |
| --- | --- |
| Prisma | `schema.prisma` — `ClientUser.resourceId String?` + FK `Resource` + index `(clientId, resourceId)` + contrainte d’unicité partielle ou applicative « un `resourceId` au plus un `ClientUser` actif par client » |
| Migration | Nouvelle migration SQL + backfill optionnel derrière job (RFC-ACL-022) |
| Backend | Service dédié ou extension module `clients` / `me` / `organization` — validation stricte `clientId`, type HUMAN, pas de fuite inter-client |
| API | `PATCH` ciblé (ex. `/api/clients/:clientId/users/:clientUserId` ou route `me` admin) + enrichissement des listes membres avec `humanResource: { id, displayName, email? }` |
| Audit | Actions `client_user.human_resource.linked` / `…unlinked` avec old/new |
| Frontend | Écran ou panneau administration membres : sélecteur **libellé métier** (nom, email) sur catalogue HUMAN, jamais UUID seul ([règle inputs](../../.cursor/rules/inputs-value-not-id.mdc)) |
| Tests | Service : cas refus autre client, refus type non HUMAN, refus doublon `resourceId`, happy path ; contrôleur : 403/404 |

---

## 4. Modèle de données cible

```prisma
// Indicatif — à valider en implémentation
model ClientUser {
  // …champs existants
  resourceId String?  // FK vers Resource.id si type HUMAN
  humanResource Resource? @relation(fields: [resourceId], references: [id], onDelete: SetNull)
}
```

Contraintes recommandées :

- Index `(clientId, resourceId)` pour résolution rapide.
- Unicité : **`@@unique([clientId, resourceId])`** lorsque `resourceId` est non null (PostgreSQL : une seule ligne `NULL` autorisée par ensemble si mal modélisé — utiliser partial unique index `WHERE resourceId IS NOT NULL` si besoin).

---

## 5. API (principes)

- **Lecture** : les réponses « membre client » exposent `humanResourceSummary` (nom affiché, email, `resourceId`) pour alimenter l’UI sans N+1 abusif (batch ou include contrôlé).
- **Écriture** : body `{ resourceId: string | null }` ; le serveur vérifie rôle, client actif / scope plateforme, cohérence `Resource`.
- Aucun `clientId` dans le body pour contourner le scope.

---

## 6. Hors périmètre

- Calcul `OWN` / `SCOPE` / `ALL` (RFC-ACL-015 / RFC-ACL-016).
- Propriété Direction sur entités métier (RFC-ORG-003).
- Synchronisation automatique Graph → lien (peut être une évolution ; traiter au plus comme trigger d’alerte cockpit RFC-ACL-021).

---

## 7. Tests obligatoires

- Isolation **client** : impossible de lier une `Resource` d’un autre client.
- Type **HUMAN** seul.
- **Doublon** : deux `ClientUser` ne peuvent pas partager la même `resourceId` sur un même client.
- **Cascade** : comportement documenté si `Resource` supprimée (`SetNull` attendu).

---

## 8. Récapitulatif

La RFC ajoute une clé fonctionnelle minimale entre identité applicative et fiche humaine, prérequis direct du calcul de scope organisationnel (plan [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md)).

---

## 9. Points de vigilance

- Ne pas confondre avec **`OrgUnitMembership`** : celle-ci rattache la personne à une unité ; celle-ci rattache le **login membre** à la personne.
- Données historiques : membres sans ressource HUMAN — KPI et alertes (RFC-ACL-021) plutôt que blocage brutal des logins.
- Performance des listes cockpit : charger les résumés HUMAN en batch.
