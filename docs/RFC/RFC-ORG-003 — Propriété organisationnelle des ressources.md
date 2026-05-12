# RFC-ORG-003 — Propriété organisationnelle des ressources (Direction propriétaire)

## Statut

**Draft** — non implémentée. Dépend de [RFC-ORG-001](./RFC-ORG-001%20%E2%80%94%20Socle%20Organisation%20Client.md) (`OrgUnit`, hiérarchie).

## Alignement plan

Référence : [_Plan de déploement Orgnisation et licences](./_Plan%20de%20déploement%20Orgnisation%20et%20licences.md).

| Élément | Valeur |
| --- | --- |
| **Priorité** | **P0** |
| **Ordre recommandé** | **2** |
| **Dépendances (plan)** | RFC-ORG-001 |
| **Livrables (plan)** | **`ResourceOrgOwnership`** au sens produit : propriété organisationnelle exposée par API, validations `clientId`, responsable métier optionnel, audit — que l’implémentation retenue soit **colonnes `ownerOrgUnitId` par table** (§2 option A) ou **table polymorphe** (option B). |

RFC-ACL-016 consomme la propriété ; [RFC-ACL-022](./RFC-ACL-022%20%E2%80%94%20Migration%20backfill%20et%20feature%20flags.md) couvre backfill / défauts d’`ownerOrgUnitId` en delivery couplée au portage métier.

## Objectif

Définir **quelle unité organisationnelle (typiquement une Direction)** est **propriétaire** d’une ressource métier (budget, projet, contrat, fournisseur, objectif stratégique, document métier, etc.), afin de :

1. Filtrer les listes en mode **`SCOPE`** (utilisateur limité à son sous-arbre ou à ses unités).
2. Afficher un **responsable métier** optionnel (souvent une `Resource` HUMAN) pour la gouvernance, distinct du propriétaire organisationnel.
3. Alimenter diagnostics et cockpits (ressources « sans Direction », RFC-ACL-021).

---

## 1. Analyse de l’existant

- **`OrgUnit`** : arbre par `clientId`, types dont `DIRECTION`, `DEPARTMENT`, etc.
- Entités métier : portent `clientId` ; peu n’ont pas encore de `ownerOrgUnitId` ou équivalent homogène.
- Vision stratégique : concepts proches (`directionId` dans certains filtres RFC-STRAT-*) — la RFC vise une **généralisation** et une **table ou colonnes cohérentes**, pas des exceptions module par module sans modèle commun.

---

## 2. Hypothèses

- Un enregistrement métier a **au plus une** unité propriétaire **primaire** (`ownerOrgUnitId`). Les périmètres composites (multi-directions) relèvent d’**ACL / partages** (RFC-ACL-005+), pas de la propriété primaire.
- L’`OrgUnit` référencée appartient au **même `clientId`** que la ressource ; interdiction stricte de mélange inter-clients.
- La propriété est **nullable** en transition : état « non assigné » explicitement géré (alertes, filtres cockpit).

### Deux options d’implémentation (à trancher en grooming)

| Option | Description | Avantages | Inconvénients |
| --- | --- | --- | --- |
| **A — Colonnes par table** | `ownerOrgUnitId` sur chaque modèle métier concerné | Requêtes simples, FK explicites | N migrations, risque d’oubli sur nouveaux modules |
| **B — Table polymorphe** `ResourceOrgOwnership` | `(clientId, entityKind, entityId, ownerOrgUnitId, stewardResourceId?)` | Un seul pattern générique | Jointures / intégrité : `entityId` string + kind, contraintes applicatives renforcées |

**Recommandation documentaire** : démarrer par **A** sur les modules déjà listés dans RFC-ACL-020 (clarté SQL + FK), introduire **B** seulement si explosion de types ou besoin d’audit centralisé unique.

---

## 3. Fichiers à créer / modifier (indicatif)

- `schema.prisma` + migrations par entité (ou table générique si option B).
- Services métier existants : validation à la création / mise à jour (`assertOrgUnitInClient`).
- DTOs : `ownerOrgUnitId` optionnel ; réponses enrichies avec `ownerOrgUnit: { id, name, type, code? }` (valeur affichée, pas ID seul).
- UI : sélecteur d’unité dans formulaires / fiches (arbre ou combobox filtré par client actif).
- Audit : `*.ownership.changed` avec old/new unité (libellés dans payload ou IDs + résolution documentée).

---

## 4. Règles métier

- **Création** : peut imposer `ownerOrgUnitId` selon politique client (feature flag RFC-ACL-022).
- **Transfert** : réservé aux rôles avec permission dédiée (ex. `organization.ownership.transfer` ou extension `organization.update`).
- **Archivage d’unité** : soit **interdit** si des ressources actives pointent encore vers elle, soit **cascade** documentée vers unité parente — à figer par produit (préférence : blocage + action admin).

---

## 5. Hors périmètre

- Calcul effectif `SCOPE` (RFC-ACL-016).
- ACL fine par utilisateur (RFC-ACL-005).

---

## 6. Tests

- Refus si `ownerOrgUnitId` hors client.
- Refus si unité `ARCHIVED` (selon règle retenue).
- Lecture liste : filtre par `ownerOrgUnitId` cohérent avec index `(clientId, ownerOrgUnitId)`.

---

## 7. Récapitulatif

RFC-ORG-003 matérialise la **Direction propriétaire** au sens gouvernance CODIR, base du filtrage organisationnel avant couche ACL.

---

## 8. Points de vigilance

- Alignement avec champs existants (ex. vision stratégique) : éviter **deux sources de vérité** ; planifier migration / dépréciation.
- Performance des listes portefeuille : indexation systématique sur `(clientId, ownerOrgUnitId)`.
