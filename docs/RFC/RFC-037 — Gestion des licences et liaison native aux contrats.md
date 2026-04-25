# RFC-037 — Gestion des licences et liaison native aux contrats

## Statut

**Draft (spécification)**.

## Priorité

Haute pour le **pilotage DSI / DAF multi-clients** : rendre visible le parc de licences, leurs échéances et leur rattachement contractuel sans transformer le module en simple GED.

## Dépendances

* [RFC-036 — Gestion des contrats](./RFC-036%20%E2%80%94%20Gestion%20des%20contrats.md) — module contractuel existant
* [RFC-025 — Procurement Core](./RFC-025%20%E2%80%94%20Procurement%20Core.md) — cohérence des liens métiers optionnels
* [RFC-013 — Audit logs](./RFC-013%20%E2%80%94%20Audit%20logs.md) — traçabilité des rattachements et changements de statut
* UI : [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) — affichage de valeurs métier (jamais d’ID brut)

---

# 1. Analyse de l’existant

## 1.1 Positionnement produit

Le module **Licenses** doit rester un module métier autonome dans **Pilotage**.  
Le module **Contracts** reste le référentiel contractuel.  
Le besoin est d’ajouter une **liaison métier native** entre les deux, sans fusion de modules.

## 1.2 Lacune actuelle à corriger

Sans relation structurée, le rattachement licence ↔ contrat devient un texte libre ou une convention fragile, ce qui dégrade le cockpit (pilotage des échéances, impacts, risques).

## 1.3 Décision d’architecture

La relation cible est : **Contract 1 -> N Licenses** avec lien **optionnel côté License**.

---

# 2. Hypothèses éventuelles

| ID | Hypothèse |
| --- | --- |
| **H1** | Le module **Licenses** conserve son cycle de vie propre (statuts, renouvellement, dates, alertes) même quand `contractId` est renseigné. |
| **H2** | Une licence peut exister sans contrat dans certains cas métier (achat isolé, migration en cours, régularisation), donc `contractId` reste nullable. |
| **H3** | Le lien est un vrai FK métier (pas un champ texte), validé dans le même `clientId`. |
| **H4** | Les vues cockpit doivent distinguer strictement l’échéance contrat et l’échéance/renouvellement licence. |

---

# 3. Liste des fichiers à créer / modifier (cible implémentation)

## 3.1 Backend

| Fichier / zone | Action |
| --- | --- |
| `apps/api/prisma/schema.prisma` | Ajouter `contractId?` sur `License` + relation vers `SupplierContract` |
| `apps/api/prisma/migrations/*` | Migration FK nullable + index `(clientId, contractId)` |
| `apps/api/src/modules/licenses/` | DTO/Service/Controller: gérer `contractId` optionnel en create/update/filter |
| `apps/api/src/modules/contracts/` | Exposer la liste des licences associées dans le détail contrat |
| `docs/API.md` | Documenter filtres et champs relationnels |

## 3.2 Frontend

| Fichier / zone | Action |
| --- | --- |
| `apps/web/src/features/licenses/` | Formulaire licence avec sélecteur contrat (libellé métier), affichage contrat lié |
| `apps/web/src/features/contracts/` | Fiche contrat avec liste des licences associées |
| Vues / filtres | Ajouter filtres: licences sans contrat, licences rattachées, contrats avec licences |

## 3.3 Documentation

| Fichier | Action |
| --- | --- |
| `docs/RFC/_RFC Liste.md` | Ajouter RFC-037 |

---

# 4. Plan modifié (sections nécessaires uniquement)

## 4.1 Modèle métier (ajustement)

**Conserver** la cohérence des liens métiers optionnels sur License :

* `budgetLineId?`
* `supplierId?`
* `contractId?`
* `applicationId?`
* `projectId?`

Décisions :

1. Ajouter **`contractId?`** sur `License`.
2. Imposer un **vrai lien métier** (FK) vers `SupplierContract`.
3. Ne pas rendre le contrat obligatoire pour toute licence.
4. Ne pas fusionner `Licenses` dans `Contracts`.

## 4.2 Relation cible

* **Contract 1 -> N Licenses**
* Une `License` a **0..1** `Contract`
* Un `Contract` a **0..N** `Licenses`

## 4.3 Vues et filtres (ajout ciblé)

Prévoir explicitement :

* **Licences sans contrat**
* **Licences rattachées à un contrat**
* **Contrats avec licences associées**

## 4.4 Distinction des échéances

Séparer clairement dans le modèle et l’UX :

* **Échéance du contrat** (cadre juridique/commercial)
* **Échéance / renouvellement de la licence** (actif opérationnel)

Pas d’amalgame des règles de renouvellement : chaque entité garde son propre cycle.

## 4.5 Cockpit (ajout ciblé)

Le cockpit doit afficher :

* Licences arrivant à échéance
* Licences sans contrat
* Contrats arrivant à échéance avec licences impactées

Objectif : pilotage/gouvernance DSI-DAF, pas simple archivage documentaire.

## 4.6 Fiches (navigation croisée)

Prévoir :

* Depuis une **licence** : accès direct au **contrat lié** (si présent)
* Depuis un **contrat** : **liste des licences associées**

---

# 5. Modifications Prisma (si nécessaire)

Extrait cible (indicatif) :

```prisma
model License {
  id          String   @id @default(cuid())
  clientId    String
  contractId  String?

  // ... autres champs existants

  contract    SupplierContract? @relation(fields: [contractId], references: [id], onDelete: SetNull)

  @@index([clientId, contractId])
}

model SupplierContract {
  id        String    @id @default(cuid())
  clientId  String

  // ... autres champs existants

  licenses  License[]
}
```

Règles :

* Validation service : `license.clientId === contract.clientId` quand `contractId` est renseigné.
* `contractId` nullable pour conserver les cas sans contrat.

---

# 6. Tests

## Backend

* Création licence avec `contractId` valide (même client) -> OK.
* Création licence sans `contractId` -> OK.
* Création / update avec `contractId` d’un autre client -> rejet (403/404 selon stratégie).
* Détail contrat -> renvoie les licences associées.
* Filtres API :
  * `withoutContract=true`
  * `contractId=<id>`
  * `withLinkedLicenses=true` côté contrats

## Frontend

* Le sélecteur contrat affiche un **libellé métier** (pas d’UUID).
* Les vues « sans contrat » / « rattachées » fonctionnent.
* La fiche licence permet l’accès au contrat lié.
* La fiche contrat affiche la liste des licences associées.

---

# 7. Récapitulatif final

Cette RFC ajoute un couplage métier propre entre **Licenses** et **Contracts** sans casser l’autonomie du module Licenses :

* lien natif via `contractId?` sur `License`
* cardinalité cible **1 contrat -> N licences**
* support natif des cas **avec** et **sans** contrat dès la V1
* enrichissement ciblé des vues cockpit, filtres et fiches croisées

---

# 8. Points de vigilance

* Ne pas dériver vers une dépendance « contrat obligatoire » pour toute licence.
* Ne pas confondre échéance contrat et échéance licence dans les KPI.
* Ne pas afficher d’ID brut en UI (contrat, licence, fournisseur).
* Garder l’orientation **pilotage / gouvernance / visibilité DSI-DAF**.
