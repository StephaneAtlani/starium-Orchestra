# RFC-PROJ-022 — Validation de la fiche projet

## Statut

**Draft**

## Priorité

Haute (gouvernance portefeuille, traçabilité des engagements responsable / sponsor)

## Dépendances

- [RFC-PROJ-012 — Project Sheet](./RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md) — fiche décisionnelle, arbitrage multi-niveaux, snapshots décisionnels
- [RFC-PROJ-009 — Audit Logs Projet](./RFC-PROJ-009%20%E2%80%94%20Audit%20Logs%20Projet.md) — journalisation
- [RFC-PROJ-021 — Historique des modifications projet](./RFC-PROJ-021%20%E2%80%94%20Historique%20des%20modifications%20projet.md) — **retrait UI fiche** (cf. §4.4)
- [RFC-032 — Historisation décisions budgétaires](./RFC-032%20%E2%80%94%20Historisation%20d%C3%A9cisions%20budg%C3%A9taires.md) — pattern endpoint métier + timeline lisible
- [RFC-013 — Audit logs](./RFC-013%20%E2%80%94%20Audit%20logs.md)
- [docs/ARCHITECTURE.md](../ARCHITECTURE.md) — multi-client, guards
- [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) — Design System, états loading/empty/error

---

# 1. Analyse de l’existant

## 1.1 Fiche projet (backend)

Le module `apps/api/src/modules/projects/project-sheet/` expose déjà :

| Route | Rôle |
| --- | --- |
| `GET /api/projects/:id/project-sheet` | Lecture fiche (`projects.read`) |
| `PATCH /api/projects/:id/project-sheet` | Mise à jour fiche + arbitrage (`projects.update`) |
| `GET /api/projects/:id/project-sheet/decision-snapshots` | Liste snapshots arbitrage |
| `GET /api/projects/:id/project-sheet/decision-snapshots/:snapshotId` | Détail snapshot (payload JSON fiche) |

**Arbitrage** : trois niveaux (`arbitrationMetierStatus`, `arbitrationComiteStatus`, `arbitrationCodirStatus`) modifiables par tout utilisateur disposant de `projects.update` via un select UI — **sans contrôle de rôle métier** (responsable vs sponsor).

**Snapshots décisionnels** : table `ProjectSheetDecisionSnapshot` (`decisionLevel`: `METIER` | `COMITE` | `CODIR`). Création optionnelle via `recordDecisionSnapshot: true` sur le PATCH fiche, lors d’une transition impliquant `VALIDE` ou `REFUSE`. Historique consultable via modale « Historique des décisions » dans `ProjectSheetView`.

**Rôles projet** : `Project.ownerUserId` (responsable de projet) et `Project.sponsorUserId` (sponsor) sont déjà modélisés et synchronisés avec l’équipe projet (`ProjectTeamService`).

## 1.2 Fiche projet (frontend)

`ProjectSheetView` (`apps/web/src/features/projects/components/project-sheet-view.tsx`) :

- autosave fiche ;
- section **Arbitrage** (3 niveaux) + modale historique snapshots ;
- alerte **Fiche incomplète** via `cockpitMissingLinesFromForm` (coût, scores valeur/alignement/urgence, objectif métier) — **logique UI uniquement**, pas de garde serveur dédiée à la validation ;
- bloc **`ProjectAuditHistorySection`** (« Historique des modifications ») en bas de fiche — alimenté par `GET /api/projects/:id/history` (RFC-PROJ-021).

Page dédiée `/projects/[projectId]/history` : même composant d’audit, hors fiche principale.

## 1.3 Lacunes produit

1. **Pas d’action formalisée « Valider la fiche »** réservée au responsable ou au sponsor : aujourd’hui, n’importe quel éditeur peut changer les statuts d’arbitrage.
2. **Pas d’historique de validation lisible** (qui a validé / refusé, en quel rôle, avec quel commentaire, sur quelle version de fiche) — les snapshots arbitrage couvrent les transitions Validé/Refusé mais sans sémantique « validation responsable / sponsor » ni commentaire dédié.
3. **Historique des modifications** dans la fiche projet fait doublon avec la page `/history` et noie la lecture gouvernance ; demande produit : **retirer ce bloc de la fiche**.

## 1.4 Distinction des concepts

| Concept | Rôle |
| --- | --- |
| **Modification fiche** (autosave, PATCH) | Édition continue des champs |
| **Arbitrage multi-niveaux** | Workflow CODIR (métier → comité → sponsor/CODIR) |
| **Validation fiche (cette RFC)** | Engagement explicite du **responsable** ou du **sponsor** sur la version courante ; historisé |
| **Historique modifications** (RFC-PROJ-021) | Journal technique `AuditLog` — reste sur `/history`, **plus dans la fiche** |
| **Snapshots décisionnels** (RFC-PROJ-012) | Photo fiche lors d’une décision d’arbitrage ; complémentaire, conservé |

---

# 2. Hypothèses éventuelles

- **H1** — Une validation = une ligne d’historique immuable (append-only) ; pas de « dé-validation » silencieuse (une nouvelle validation ou un refus crée une nouvelle entrée).
- **H2** — Seuls `ownerUserId` et `sponsorUserId` du projet (utilisateurs du client actif) peuvent valider **dans leur rôle** ; les admins client avec `projects.update` peuvent éditer la fiche mais **pas** valider à la place du responsable/sponsor (sauf évolution ultérieure `projects.sheet.validate.override`).
- **H3** — La validation **propage** le statut d’arbitrage du niveau aligné : responsable → `arbitrationMetierStatus = VALIDE` ; sponsor → `arbitrationCodirStatus = VALIDE` (si niveaux précédents débloqués selon règles RFC-PROJ-012). Un **refus** positionne le niveau aligné sur `REFUSE` et exige un commentaire.
- **H4** — Les critères **fiche complète** (cockpit) sont **répliqués côté serveur** avant d’accepter une validation `VALIDATED` (pas seulement l’alerte UI).
- **H5** — Chaque validation crée **automatiquement** un `ProjectSheetDecisionSnapshot` lié (FK optionnelle) pour consultation de la version figée — pas de double saisie `recordDecisionSnapshot` côté client.
- **H6** — Volume d’historique par projet faible (< 100 entrées) : pagination simple `limit` / `offset`.

---

# 3. Liste des fichiers à créer / modifier

## 3.1 Backend

| Fichier | Action |
| --- | --- |
| `apps/api/prisma/schema.prisma` | **Modifié** — modèle `ProjectSheetValidation` + enums |
| `apps/api/prisma/migrations/…/migration.sql` | **Créé** — migration |
| `apps/api/src/modules/projects/project-sheet/dto/create-project-sheet-validation.dto.ts` | **Créé** |
| `apps/api/src/modules/projects/project-sheet/dto/list-project-sheet-validations.query.dto.ts` | **Créé** |
| `apps/api/src/modules/projects/project-sheet/project-sheet-validation.service.ts` | **Créé** — règles métier, garde rôle, complétude, propagation arbitrage, snapshot |
| `apps/api/src/modules/projects/project-sheet/project-sheet-validation.controller.ts` | **Créé** — routes validations |
| `apps/api/src/modules/projects/project-sheet/project-sheet-validation-summary.ts` | **Créé** — libellés FR timeline |
| `apps/api/src/modules/projects/project-sheet/project-sheet-completeness.ts` | **Créé** — critères cockpit (miroir `cockpitMissingLinesFromForm`) |
| `apps/api/src/modules/projects/project-audit.constants.ts` | **Modifié** — actions `project.sheet.validation.*` |
| `apps/api/src/modules/projects/projects.module.ts` | **Modifié** — providers / controller |
| `apps/api/prisma/seed.ts` (ou profils) | **Modifié** — permission `projects.sheet.validate` (optionnel MVP : réutiliser `projects.update` + garde rôle strict) |
| `apps/api/src/modules/projects/project-sheet/project-sheet-validation.service.spec.ts` | **Créé** |
| `apps/api/src/modules/projects/project-sheet/project-sheet-validation.controller.spec.ts` | **Créé** |

## 3.2 Frontend

| Fichier | Action |
| --- | --- |
| `apps/web/src/features/projects/components/project-sheet-validation-section.tsx` | **Créé** — actions Valider / Refuser + timeline |
| `apps/web/src/features/projects/hooks/use-project-sheet-validations.ts` | **Créé** |
| `apps/web/src/features/projects/api/projects.api.ts` | **Modifié** — `createProjectSheetValidation`, `listProjectSheetValidations` |
| `apps/web/src/features/projects/lib/project-query-keys.ts` | **Modifié** — clé `sheetValidations` |
| `apps/web/src/features/projects/types/project.types.ts` | **Modifié** — types validation |
| `apps/web/src/features/projects/components/project-sheet-view.tsx` | **Modifié** — intégrer section validation ; **retirer** `ProjectAuditHistorySection` |
| `apps/web/src/features/projects/components/project-audit-history-section.tsx` | **Conservé** — utilisé par `/projects/[id]/history` uniquement |
| `apps/web/src/features/projects/components/project-sheet-validation-section.spec.tsx` | **Créé** |

## 3.3 Documentation

| Fichier | Action |
| --- | --- |
| `docs/RFC/_RFC Liste.md` | **Mis à jour** — entrée RFC-PROJ-022 |
| `docs/RFC/RFC-PROJ-021 — Historique des modifications projet.md` | **Mis à jour** — préciser retrait UI fiche, page `/history` conservée |
| `docs/RFC/RFC-PROJ-012 — Project Sheet.md` | **Mis à jour** — § validation + API |
| `docs/API.md` | **Mis à jour** — routes validations |

---

# 4. Implémentation complète (spécification)

## 4.1 Objectif fonctionnel

Permettre au **responsable de projet** et au **sponsor** de :

1. **Valider** la fiche projet courante (engagement sur le contenu et les indicateurs cockpit) ;
2. **Refuser** la fiche avec motif obligatoire ;
3. Consulter un **historique chronologique** des validations (qui, rôle, décision, date, commentaire, lien vers version figée).

**Retrait UI** : supprimer le bloc « Historique des modifications » de `ProjectSheetView` (et tout embed snapshot de la fiche). L’historique technique reste accessible via `/projects/[projectId]/history`.

## 4.2 Modèle de données (Prisma)

```prisma
enum ProjectSheetValidationRole {
  OWNER   // Responsable de projet — Project.ownerUserId
  SPONSOR // Sponsor — Project.sponsorUserId
}

enum ProjectSheetValidationOutcome {
  VALIDATED
  REJECTED
}

model ProjectSheetValidation {
  id        String   @id @default(cuid())
  clientId  String
  projectId String

  validatorRole     ProjectSheetValidationRole
  outcome           ProjectSheetValidationOutcome
  /// Commentaire : obligatoire si REJECTED ; optionnel si VALIDATED (max 2000)
  comment           String?  @db.VarChar(2000)

  /// Utilisateur ayant déclenché la validation (DCP — lien User)
  validatorUserId   String

  /// Snapshot fiche au moment de la décision (aligné projectSheetFieldsAuditSnapshot)
  sheetPayload      Json

  /// Lien optionnel vers ProjectSheetDecisionSnapshot créé en même temps
  decisionSnapshotId String?

  createdAt DateTime @default(now())

  client           Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project          Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  validator        User    @relation("ProjectSheetValidationValidator", fields: [validatorUserId], references: [id], onDelete: Restrict)
  decisionSnapshot ProjectSheetDecisionSnapshot? @relation(fields: [decisionSnapshotId], references: [id], onDelete: SetNull)

  @@index([clientId, projectId, createdAt])
  @@index([projectId, createdAt])
}
```

**Extension `ProjectSheetDecisionSnapshot`** (optionnelle, recommandée) :

```prisma
validations ProjectSheetValidation[]
```

Pas de champ « état de validation courant » sur `Project` : l’état courant se déduit du **dernier** enregistrement par rôle + des statuts d’arbitrage propagés.

## 4.3 Règles métier (serveur)

### 4.3.1 Qui peut valider

| Rôle validation | Condition |
| --- | --- |
| `OWNER` | `actorUserId === project.ownerUserId` et `ownerUserId` non null |
| `SPONSOR` | `actorUserId === project.sponsorUserId` et `sponsorUserId` non null |

Sinon : `403 Forbidden` avec message explicite (« Seul le responsable de projet peut valider en tant que responsable », etc.).

**Permission HTTP** : `projects.update` **minimum** + garde rôle ci-dessus.  
**Post-MVP** : permission dédiée `projects.sheet.validate` pour affiner le RBAC sans élargir l’édition fiche.

### 4.3.2 Prérequis validation `VALIDATED`

Le service `assertSheetCompleteForValidation(project)` retourne la liste des manques (miroir cockpit) :

- `estimatedCost` renseigné ;
- `businessValueScore`, `strategicAlignment`, `urgencyScore` renseignés (1–5) ;
- `businessProblem` non vide.

Si incomplet → `400 Bad Request` avec `{ code: 'SHEET_INCOMPLETE', missing: string[] }`.

### 4.3.3 Prérequis validation `REJECTED`

- `comment` obligatoire, trim, longueur 1–2000.

### 4.3.4 Propagation arbitrage

Dans la **même transaction** Prisma :

| Rôle | Outcome | Effet sur arbitrage |
| --- | --- | --- |
| `OWNER` | `VALIDATED` | `arbitrationMetierStatus = VALIDE` ; recalcul `arbitrationStatus` legacy |
| `OWNER` | `REJECTED` | `arbitrationMetierStatus = REFUSE` ; `arbitrationMetierRefusalNote = comment` |
| `SPONSOR` | `VALIDATED` | Exiger `arbitrationMetierStatus = VALIDE` et `arbitrationComiteStatus = VALIDE` ; puis `arbitrationCodirStatus = VALIDE` |
| `SPONSOR` | `REJECTED` | Idem prérequis niveaux ; `arbitrationCodirStatus = REFUSE` ; note refus CODIR |

Les règles de déverrouillage restent celles de RFC-PROJ-012 (pas de raccourci sponsor si comité non validé).

### 4.3.5 Snapshot et audit

Pour chaque validation :

1. Capturer `sheetPayload` via `projectSheetFieldsAuditSnapshot(project)` **après** propagation arbitrage.
2. Créer `ProjectSheetDecisionSnapshot` avec `decisionLevel` mappé : `OWNER` → `METIER`, `SPONSOR` → `CODIR`.
3. Créer `ProjectSheetValidation` avec FK vers le snapshot.
4. Écrire `AuditLog` :
   - `project.sheet.validation.recorded` — payload `{ validationId, role, outcome, projectId }`
   - conserver `project.sheet.decision_snapshot.created` existant si snapshot créé.

### 4.3.6 Lecture historique

Réponse enrichie (jamais d’ID seul en libellé principal) :

```typescript
type ProjectSheetValidationListItem = {
  id: string;
  validatorRole: 'OWNER' | 'SPONSOR';
  validatorRoleLabel: string; // « Responsable de projet » | « Sponsor »
  outcome: 'VALIDATED' | 'REJECTED';
  outcomeLabel: string;       // « Validé » | « Refusé »
  comment: string | null;
  validatorDisplayName: string; // prénom nom ou email
  createdAt: string;          // ISO
  decisionSnapshotId: string | null;
  summary: string;            // phrase FR fixe API, ex. « Sponsor — fiche validée »
};
```

## 4.4 API

**Préfixe** : `/api`. **Guards** : `ActiveClientGuard`, `PermissionsGuard`, `AccessDecision` intent read/write sur `PROJECT`.

| Méthode | Route | Permission | Description |
| --- | --- | --- | --- |
| `POST` | `/projects/:id/project-sheet/validations` | `projects.update` + garde rôle | Enregistrer une validation / un refus |
| `GET` | `/projects/:id/project-sheet/validations` | `projects.read` | Historique paginé |
| `GET` | `/projects/:id/project-sheet/validations/:validationId` | `projects.read` | Détail (inclut `sheetPayload` si autorisé) |

### POST body (`CreateProjectSheetValidationDto`)

```json
{
  "validatorRole": "OWNER",
  "outcome": "VALIDATED",
  "comment": "Cadrage revu avec le métier, OK pour passage comité."
}
```

```json
{
  "validatorRole": "SPONSOR",
  "outcome": "REJECTED",
  "comment": "ROI insuffisant au regard des priorités 2026."
}
```

**Réponse 201** : `ProjectSheetValidationListItem` + `sheetPayload` optionnel.

**Erreurs** :

| Code HTTP | Cas |
| --- | --- |
| 400 | Fiche incomplète, commentaire manquant, rôle incohérent |
| 403 | Utilisateur n’est ni owner ni sponsor pour le rôle demandé |
| 404 | Projet hors client |

### GET query (`ListProjectSheetValidationsQueryDto`)

- `limit` (défaut 20, max 100), `offset`
- `validatorRole?` — filtre `OWNER` | `SPONSOR`
- `outcome?` — filtre `VALIDATED` | `REJECTED`

## 4.5 UI — Section « Validation de la fiche »

Emplacement : dans `ProjectSheetView`, **après** la section Arbitrage (ou fusion visuelle : arbitrage = état, validation = actions signataires).

### États affichés

- **Dernier avis par rôle** : badge « Validé » / « Refusé » / « En attente » + date + validateur (libellé métier).
- **Actions** (si utilisateur courant = owner ou sponsor et fiche non read-only) :
  - bouton primaire **Valider la fiche** (désactivé si cockpit incomplet, avec tooltip listant les manques) ;
  - bouton secondaire **Refuser** → modale motif obligatoire (`StariumModal`, textarea labelisé).
- **Timeline** : liste verticale des validations (pattern `budget-decision-timeline` / modale historique snapshots existante) ; clic sur une entrée → ouvrir fiche figée (réutiliser viewer snapshot existant).

### Retrait « Historique des modifications »

- Supprimer `<ProjectAuditHistorySection projectId={projectId} />` de `project-sheet-view.tsx` (ligne ~2625 actuelle).
- **Ne pas** supprimer le composant ni la route `GET /api/projects/:id/history` : la page `/projects/[projectId]/history` reste le point d’entrée audit technique.
- Mettre à jour RFC-PROJ-021 : statut UI fiche → **Supersédé par RFC-PROJ-022** pour l’emplacement ; périmètre API inchangé.

### Libellés (FR, valeur pas ID)

- Rôles : « Responsable de projet », « Sponsor »
- Validateurs : prénom + nom ou email
- Jamais `validatorUserId` / `projectId` comme texte principal

## 4.6 Cohérence avec cycles de pilotage

Si le module `governance_cycles` positionne `SOUMIS_VALIDATION` via candidature programme, la validation **responsable** (`OWNER` + `VALIDATED`) reste distincte : elle acte la complétude de la fiche par le responsable. Le passage en comité / CODIR continue de s’appuyer sur l’arbitrage et les cycles (RFC-PROJ-CYCLE-003). Documenter dans l’UI : « Valider en tant que responsable » ≠ « Soumettre au programme de pilotage ».

---

# 5. Modifications Prisma si nécessaire

**Oui** — table `ProjectSheetValidation` + enums §4.2.

Migration additive ; pas de backfill obligatoire (historique antérieur = snapshots arbitrage + `AuditLog` existants).

---

# 6. Tests

## Backend

| Cas | Attendu |
| --- | --- |
| Owner valide fiche complète | 201, `arbitrationMetierStatus = VALIDE`, snapshot + audit |
| Owner valide fiche incomplète | 400 `SHEET_INCOMPLETE` |
| Sponsor valide sans comité validé | 400 (niveaux non débloqués) |
| Sponsor refuse avec commentaire | 201, `arbitrationCodirStatus = REFUSE`, note renseignée |
| Utilisateur tiers (ni owner ni sponsor) | 403 |
| Lecture historique autre client | 404 / liste vide scopée |
| Isolation `clientId` | impossible de lire validations d’un projet hors client actif |

## Frontend

- Section validation masquée ou lecture seule si pas owner/sponsor.
- Bouton Valider désactivé si `missingCritical.length > 0`.
- Modale refus : validation formulaire motif vide.
- Timeline : empty / loading / error.
- **Absence** du titre « Historique des modifications » dans la fiche (`project-sheet-view`).

## Intégration

- `POST` validation → invalidation TanStack Query `projectSheet`, `sheetValidations`, `sheetDecisionSnapshots`.

---

# 7. Récapitulatif final

| Élément | Choix |
| --- | --- |
| Stockage historique validation | Table dédiée `ProjectSheetValidation` + snapshot lié |
| Acteurs | Responsable (`ownerUserId`) et sponsor (`sponsorUserId`) uniquement |
| Complétude | Règles cockpit **côté serveur** avant `VALIDATED` |
| Arbitrage | Propagation automatique sur le niveau aligné |
| Audit | `AuditLog` + snapshot existant |
| UI fiche | Nouvelle section validation + timeline ; **retrait** historique modifications |
| Historique technique | Conservé sur `/projects/:id/history` (RFC-PROJ-021) |

---

# 8. Points de vigilance

1. **Ne pas confondre** validation responsable/sponsor et modification libre des selects arbitrage par un admin — envisager en V2 la restriction du PATCH arbitrage aux seuls rôles habilités ou aux décisions de séance (cycles).
2. **Responsable / sponsor non renseignés** : afficher CTA « Affecter un responsable / sponsor » (équipe projet) plutôt qu’un bouton Valider mort.
3. **Double historique** : la timeline validation est le fil conducteur gouvernance ; les snapshots arbitrage restent pour la lecture version figée — lier via `decisionSnapshotId`.
4. **RFC-PROJ-021** : éviter la régression sur `/history` en ne supprimant que l’embed dans la fiche.
5. **Effacement utilisateur (RGPD)** : `validatorUserId` avec `onDelete: Restrict` ou anonymisation via job global — aligner sur politique `User` existante.
6. **Mobile** : boutons validation pleine largeur, timeline en cartes empilées, modales plein écran < `sm`.

---

# 9. Conformité by design

## RGPD

- **DCP** : `validatorUserId`, identité affichée (`validatorDisplayName`), éventuellement email dans les jointures ; `comment` peut contenir des données métier personnelles — finalité = traçabilité gouvernance projet.
- **Minimisation** : ne stocker que le payload fiche nécessaire à la preuve (`sheetPayload` aligné audit existant) ; pas de données hors scope client.
- **Rétention** : alignée sur durée de vie du projet + politique `AuditLog` ; pas de suppression isolée sans processus d’effacement projet.
- **Effacement / anonymisation** : si compte utilisateur supprimé, conserver la ligne avec auteur « Utilisateur archivé » (job à aligner sur RFC-013).
- **Logs** : ne pas logger le `comment` en clair dans les logs applicatifs ; audit structuré uniquement.
- **Scope client** : `clientId` sur chaque ligne ; toutes les requêtes filtrent le client actif.

## RGAA

- Section avec titre sémantique (`h4` ou `CardTitle`) « Validation de la fiche ».
- Boutons natifs, labels explicites (« Valider la fiche en tant que responsable »).
- Modale refus : focus piégé, `aria-describedby` sur le champ motif, annonce `aria-live="polite"` après succès/erreur.
- Timeline : liste `<ul>` / `<li>`, informations pas uniquement par la couleur (badge texte Validé/Refusé).
- Contraste badges via tokens thème ; états disabled explicites (pas seulement grisé).

## Design System

- Réutiliser `Card`, `Button`, `StariumModal`, `RegistryBadge`, `EmptyState`, `LoadingState`, `Alert`.
- Tokens Tailwind thème uniquement ; pas de couleur en dur.
- Pattern timeline calqué sur `budget-decision-timeline.tsx`.
- Libellés métier partout (rôle, validateur, projet).

## Sécurité

- Authn + `projects.read` / `projects.update` + **garde rôle** owner/sponsor sur POST.
- `AccessDecision` READ sur GET historique.
- DTO `class-validator` sur POST (enum rôle, outcome, longueur commentaire).
- `clientId` dérivé du scope authentifié, jamais du body.
- Audit log sur chaque validation (action sensible).
- Pas de sur-exposition : GET liste sans `sheetPayload` ; détail complet sur GET `:validationId` seulement.

## Interface mobile

- Section validation avant replis arbitrage si espace insuffisant (ordre DOM logique).
- Cibles tactiles ≥ 44px sur Valider / Refuser.
- Timeline : cartes pleine largeur, pas de tableau.
- Modale refus : `size` adaptatif mobile (plein écran).
- Tester ≥ 320px : pas de scroll horizontal sur la timeline.
