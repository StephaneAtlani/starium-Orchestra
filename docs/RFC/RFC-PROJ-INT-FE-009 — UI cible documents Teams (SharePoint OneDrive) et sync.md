# RFC-PROJ-INT-FE-009 — UI cible documents Teams (SharePoint / OneDrive) et sync

| | |
| --- | --- |
| **Statut** | 📝 Draft (spécification — à implémenter) |
| **Date** | 2026-09-14 |
| **Parents** | [RFC-PROJ-INT-009](./RFC-PROJ-INT-009%20—%20Sync%20documents%20vers%20Teams.md) (backend sync) ; [RFC-PROJ-OPT-001](./RFC-PROJ-OPT-001%20—%20Project%20Options.md) (Options projet / carte Documents) ; [RFC-PROJ-DOC-002](./RFC-PROJ-DOC-002%20—%20Silo%20Documents%20projet%2C%20upload%20et%20rattachements.md) (silo documents) ; [RFC-PROJ-INT-006](./RFC-PROJ-INT-006%20—%20Sélection%20ressources%20Microsoft.md) ; [RFC-PROJ-INT-007](./RFC-PROJ-INT-007%20—%20Lien%20projet%20Microsoft.md) |
| **Backlog** | V11.14 ; plan Microsoft phase FE ordre 11 |
| **UI cible** | Carte **Documents (SharePoint / OneDrive)** — Options projet → Microsoft 365 |
| **Glossaire** | **Cible documents** = couple `filesDriveId` + `filesFolderId` (+ libellés) sur `ProjectMicrosoftLink`. **Sync** = push one-way Starium → Drive du canal Teams (INT-009). Starium reste la **source de vérité** ; Teams/SharePoint = projection collaborative. |

---

## 0. Objet

Rendre **opérationnel et conforme DS / « valeur, pas ID »** le stockage projet vers Teams via la carte Options :

1. **Configurer** une cible SharePoint / OneDrive (drive + dossier du canal Teams) **sans saisir d’IDs Graph** ;
2. **Afficher** des libellés métier (équipe / canal / drive / dossier) sur la carte ;
3. **Dissocier** la cible documents **sans** forcément casser le lien Teams / Planner ;
4. **Activer / lancer** la sync documents et **voir le statut par fichier** dans le silo Documents (DOC-002).

Cette RFC **ne remplace pas** INT-009 (backend) : elle complète le **parcours produit** manquant entre la carte OPT-001 et le batch `POST …/sync-documents`.

---

## 1. Analyse de l’existant

### 1.1 Carte actuelle (écart produit)

| Élément | État | Écart |
| --- | --- | --- |
| `MicrosoftDocumentsCard` | ✅ rendu | Affiche `filesDriveId` / `filesFolderId` en **mono** (IDs bruts — **interdit**) |
| Boutons Configurer / Dissocier | ✅ | Ouvrent / réutilisent le **même** flux que Teams+Planner (`MicrosoftLinkConfigureDialog`) — pas de parcours documents dédié |
| Inputs Drive / Dossier dans la modale | ✅ textuels | Placeholders = IDs ; aucun picker / résolution Graph |
| `syncDocumentsEnabled` + bouton « Synchroniser les documents » | ✅ `ProjectSyncSettings` | Dépend d’un `filesDriveId` souvent **jamais renseigné** correctement |
| Statuts par document (`ProjectDocumentMicrosoftSync`) | ✅ Prisma + écriture INT-009 | **Non exposés** dans les DTO liste documents / UI silo |
| Résolution `GET …/channels/{id}/filesFolder` | ❌ | Prévue INT-010 lot 5 / INT-001 ; **pas** de route sélection dédiée aujourd’hui |
| Libellés dénormalisés drive/dossier | ❌ | Seuls `teamName` / `channelName` / `plannerPlanTitle` existent |

### 1.2 Socle backend déjà livré (INT-009)

- `ProjectMicrosoftLink.filesDriveId` / `filesFolderId`
- `POST /api/projects/:projectId/microsoft-link/sync-documents`
- Mapping `ProjectDocumentMicrosoftSync` (`PENDING` / `SYNCED` / `ERROR`, `lastPushedAt`, `lastError`)
- Création dossier `starium-project-{projectId}` sous le drive racine lors du sync
- Lecture binaire STARIUM via stockage documents client (domaine `projets`)

### 1.3 Décision d’architecture

| Option | Verdict |
| --- | --- |
| **A — Résolution auto depuis canal Teams + modale Documents dédiée + libellés + statut silo** | **Retenue** |
| B — Garder la saisie manuelle d’IDs Graph | Rejeté (RGAA + règle valeur/pas ID + dette OPT-001) |
| C — Stockage primaire côté Microsoft (`storageType=MICROSOFT` upload direct) | **Hors scope V1** — Starium reste SoT ; MICROSOFT = lecture sync / badge seulement (DOC-002) |
| D — Attendre provisioning INT-010 lot 5 seul | Insuffisant : projets déjà liés Teams doivent pouvoir configurer la cible **manuellement** |

---

## 2. Hypothèses

1. **H1 — Prérequis Teams** : la cible documents n’est configurable que si le lien projet a déjà un **`teamId` + `channelId`** valides (équipe / canal connus). Sinon CTA désactivé + message « Rattachez d’abord une équipe Teams ».
2. **H2 — Source de vérité drive** : résolution Graph `GET /teams/{teamId}/channels/{channelId}/filesFolder` → `parentReference.driveId` + `id` (folder item). Persistance sur le lien projet.
3. **H3 — Dossier projet Starium** : le sous-dossier `starium-project-{projectId}` reste **créé à la sync** (INT-009), pas à la configuration. La cible = **drive (+ folder racine canal)** ; `filesFolderId` = item folder du canal (ou `null` si on ne persiste que le drive — **trancher H3bis**).
4. **H3bis (retenue)** : persister **les deux** : `filesDriveId` + `filesFolderId` (folder files du canal) + libellés `filesDriveName` / `filesFolderName` (ex. « Fichiers — {channelName} » / displayName Graph).
5. **H4 — Dissocier documents** : `PUT` qui met `filesDriveId`/`filesFolderId`/`filesDriveName`/`filesFolderName` à `null` et `syncDocumentsEnabled=false` ; **ne touche pas** `teamId` / Planner. Les lignes `ProjectDocumentMicrosoftSync` restent (historique) ; pas de suppression côté Microsoft.
6. **H5 — Sync** : one-way Starium → Teams uniquement ; pas de pull, pas de delete remote, pas de retry unitaire V1 (aligné plan FE MVP).
7. **H6 — Permissions** : `projects.read` lecture ; `projects.update` config / sync / dissocier. Pas de permission `documents.microsoft.*` V1.
8. **H7 — Planner non bloquant** : configurer la cible documents **ne doit pas** exiger `plannerPlanId` (aujourd’hui le dialog Teams force plan — à corriger pour le parcours Documents).
9. **H8 — Libellés absents** : `displayLabel(name, 'Drive non nommé')` / `'Dossier du canal'` — **jamais** repli sur l’ID.
10. **H9 — Statut silo** : liste documents expose `microsoftSync: { status, lastPushedAt, lastError } | null` ; UI badge + tooltip erreur ; documents non-STARIUM = « Non applicable » (pas d’ID).

---

## 3. Fichiers à créer / modifier (implémentation)

### Backend

| Fichier | Action |
| --- | --- |
| `apps/api/prisma/schema.prisma` | Ajouter `filesDriveName` / `filesFolderName` sur `ProjectMicrosoftLink` |
| Migration Prisma | Additive nullable |
| `microsoft-graph.service.ts` | `getChannelFilesFolder(accessToken, teamId, channelId)` |
| `microsoft-selection.controller.ts` + `.service.ts` | `GET /api/microsoft/teams/:teamId/channels/:channelId/files-folder` |
| `update-project-microsoft-link.dto.ts` | Accepter `filesDriveName` / `filesFolderName` ; autoriser clear explicite (`null`) des champs fichiers |
| `project-microsoft-links.service.ts` | Endpoint dédié optionnel `POST …/microsoft-link/resolve-documents-target` **ou** résolution côté FE via selection + PUT ; clear documents target ; toDto libellés |
| `project-documents.service.ts` (liste/get) | Inclure `microsoftSync` (join `ProjectDocumentMicrosoftSync`) — whitelist champs |
| Tests | selection files-folder ; isolation client ; clear cible ; DTO documents sync |

### Frontend

| Fichier | Action |
| --- | --- |
| `microsoft-documents-card.tsx` | Libellés métier ; états empty / configuré ; CTA Configurer / Dissocier |
| **Nouveau** `microsoft-documents-configure-dialog.tsx` | `StariumModal` dédiée : prérequis canal, résolution, résumé libellés, option activer sync |
| `project-microsoft-settings.tsx` | Brancher dialog Documents (ne plus ouvrir le dialog Teams pour cette carte) ; dissocier = clear cible docs |
| `microsoft-link-configure-dialog.tsx` | **Retirer** les inputs Drive/Dossier ID (déplacés) |
| `project-options.types.ts` + API | `filesDriveName` / `filesFolderName` ; payload clear |
| `microsoft-resources.api.ts` | `getChannelFilesFolder` |
| `project-sync-settings.tsx` | Feedback run documents (`synced` / `skipped` / `failed`) ; désactiver sync si pas de cible ; `aria-live` |
| Silo DOC-002 (liste documents) | Colonne / badge « Sync Teams » + empty si lien non configuré |
| Tests Vitest | carte libellés ; dialog ; mutation clear ; badge sync |

### Doc

| Fichier | Action |
| --- | --- |
| `docs/RFC/_RFC Liste.md` | Indexer cette RFC |
| `docs/RFC/_Plan de déploement - Microsofr.md` | Pointer le fichier RFC |
| `docs/API.md` | Route `files-folder` + champs DTO documents / link (à la livraison) |
| OPT-001 / INT-009 | Note « UI complétée par INT-FE-009 » (à la livraison) |

---

## 4. Implémentation (spécification)

### 4.1 Parcours UX — carte Documents

```
[Empty]
  Drive — Non configuré
  Dossier — —
  [Configurer]  (disabled si pas team+channel ou !canEdit ou connexion inactive)

[Configuré]
  Drive — {filesDriveName}
  Dossier — {filesFolderName}
  Sync — Activée | Désactivée (chip texte, pas couleur seule)
  [Configurer] [Dissocier]
```

- Description carte : « Cible SharePoint / OneDrive du canal Teams pour projeter les documents du projet. »
- Loading : `LoadingState` / skeleton carte.
- Erreur chargement lien : `Alert` destructive + retry parent.

### 4.2 Modale « Configurer la cible documents »

`StariumModal` (`size="md"`, icon Lucide `FolderOpen` ou `Cloud`) :

1. Rappel contexte : **Équipe** `{teamName}` · **Canal** `{channelName}` (libellés, jamais IDs).
2. Action primaire de résolution : bouton « Utiliser le dossier fichiers du canal » → appelle API selection `files-folder`.
3. États :
   - loading résolution ;
   - succès : résumé Drive / Dossier (noms) ;
   - erreur Graph : `Alert` + message métier (droits, canal privé, connexion expirée).
4. Switch « Activer la synchronisation des documents » → `syncDocumentsEnabled`.
5. Pied : Annuler · **Enregistrer** (`PUT` microsoft-link avec ids + names + flag sync).

**Hors V1** : navigateur d’arborescence SharePoint libre (autre site / autre drive).

### 4.3 Dissocier

Confirmation `StariumModal` :

- Texte : retire la cible documents et désactive la sync ; l’équipe Teams et Planner restent liés ; les fichiers déjà poussés sur Teams **ne sont pas** supprimés.
- Confirm → `PUT` clear + `syncDocumentsEnabled: false`.

### 4.4 Sync manuelle (Options → Synchronisation)

Déjà présent ; à aligner :

| Condition | UI |
| --- | --- |
| Pas de `filesDriveId` | Bouton disabled + hint « Configurez d’abord la cible Documents » |
| `syncDocumentsEnabled=false` | Disabled + hint |
| Run OK | Résumé `synced` / `skipped` / `failed` dans zone `aria-live="polite"` |
| Run erreur métier | `Alert` destructive (message API, pas stack) |

### 4.5 Silo Documents (DOC-002)

| `storageType` | Badge Sync Teams |
| --- | --- |
| `STARIUM` + pas de mapping | Non synchronisé |
| `STARIUM` + `PENDING` | En attente |
| `STARIUM` + `SYNCED` | Synchronisé · date relative `lastPushedAt` |
| `STARIUM` + `ERROR` | Erreur · tooltip / `aria-describedby` = `lastError` (sans DCP) |
| `EXTERNAL` / `MICROSOFT` | Non applicable |

Pas de bouton sync unitaire V1 (batch projet seulement).

### 4.6 API

#### Sélection — nouveau

```
GET /api/microsoft/teams/:teamId/channels/:channelId/files-folder
```

Guards : Jwt + ActiveClient + connexion Microsoft active + permissions alignées INT-006 (`projects.read` ou équivalent sélection M365 client).

Réponse (exemple) :

```json
{
  "driveId": "b!…",
  "driveName": "Documents",
  "folderId": "01ABC…",
  "folderName": "Fichiers du canal Général",
  "webUrl": "https://…"
}
```

UI n’affiche que `driveName` / `folderName` (et éventuellement ouverture `webUrl` en lien externe). Les ids partent uniquement dans le `PUT`.

#### Lien projet — enrichissement PUT/GET

Champs additionnels :

- `filesDriveName?: string | null`
- `filesFolderName?: string | null`

Clear cible : envoyer explicitement `filesDriveId: null`, `filesFolderId: null`, names `null`, `syncDocumentsEnabled: false` (DTO : `@IsOptional` + `@ValidateIf` / transform null — pattern déjà utilisé ailleurs si présent ; sinon endpoint `DELETE …/microsoft-link/documents-target`).

#### Documents — liste

Chaque item :

```ts
microsoftSync: {
  status: 'PENDING' | 'SYNCED' | 'ERROR';
  lastPushedAt: string | null;
  lastError: string | null;
} | null
```

Pas d’exposition de `driveItemId` / `driveId` en UI (optionnel en API debug : **ne pas** renvoyer en V1 produit).

### 4.7 Graph

```
GET https://graph.microsoft.com/v1.0/teams/{teamId}/channels/{channelId}/filesFolder
  ?$select=id,name,webUrl,parentReference
```

Mapper : `id` → folderId ; `parentReference.driveId` → driveId ; `name` → folderName ; drive name via `GET /drives/{id}` `$select=name` si besoin (sinon libellé dérivé « Bibliothèque du canal {channelName} »).

---

## 5. Modifications Prisma

```prisma
model ProjectMicrosoftLink {
  // … existant …
  filesDriveId    String?
  filesFolderId   String?
  filesDriveName  String?   // NEW — libellé UI
  filesFolderName String?   // NEW — libellé UI
}
```

- Nullable, pas de backfill obligatoire (UI empty jusqu’à reconfiguration).
- Migration additive uniquement.
- Scope client inchangé (`clientId` sur le lien).

**Pas** de nouveau modèle pour la cible (reste sur le lien 1–1 projet).

---

## 6. Tests

### Backend

- `getChannelFilesFolder` : mapping OK ; 404 canal ; 403 Graph → exception métier ; isolation `clientId` (connexion du mauvais client refusée).
- PUT clear cible documents : nullifie ids + names + `syncDocumentsEnabled=false` ; **conserve** team/channel/planner.
- Liste documents : `microsoftSync` présent pour mapping existant ; `null` sinon ; jamais de fuite inter-projet.
- Sync INT-009 régression : prérequis `filesDriveId` inchangé.

### Frontend

- Carte : aucun rendu d’ID (`pnpm audit:ui-ids` vert).
- Dialog : Configurer disabled sans canal ; succès résolution affiche noms.
- Dissocier : confirmation + mutation clear.
- Badge silo : 4 états STARIUM + non applicable.
- Modale via `StariumModal` uniquement (`pnpm audit:modals`).

### Critères d’acceptation

1. Depuis Options → Microsoft 365, un utilisateur avec `projects.update` configure la cible documents **en un clic de résolution** après liaison Teams/canal.
2. La carte n’affiche **aucun** UUID Graph.
3. Dissocier documents laisse Teams/Planner intacts.
4. « Synchroniser les documents » pousse les STARIUM actifs vers le drive du canal (INT-009).
5. L’onglet Documents montre le statut sync par fichier.
6. Mobile ≥ 320px : carte empilée, CTA ≥ 44px, modale centrée DS.

---

## 7. Récapitulatif

| | |
| --- | --- |
| Produit | Cible SharePoint/OneDrive du canal Teams configurable depuis la carte Documents ; sync one-way pilotable ; statuts visibles dans le silo |
| Technique | Route Graph `files-folder` + libellés dénormalisés + modale dédiée + exposition `microsoftSync` |
| Statut | Draft — **pas encore implémenté** |
| Dépendances bloquantes | INT-009 ✅ ; lien Teams+canal (INT-007/OPT-001) ; DOC-002 pour colonne silo |

---

## 8. Points de vigilance

1. **Dialog Teams actuel force `plannerPlanId`** — le parcours Documents doit être **indépendant** (H7) sinon bloquant pour projets sans Planner.
2. **Canaux privés / permissions Graph** : message clair si `filesFolder` inaccessible.
3. **Dissocier ≠ delete remote** : communiquer explicitement (pas de surprise CODIR).
4. **INT-010 lot 5** (`setupDocumentsFolder`) : doit **réutiliser** la même résolution Graph + peupler names ; éviter deux chemins divergents.
5. **IDs déjà affichés** sur la carte actuelle = dette à corriger dans ce lot (audit-ui-ids).
6. **Pas de stockage primaire Microsoft V1** : upload reste STARIUM (DOC-002) ; Teams = projection.
7. **`filesFolderId` vs dossier `starium-project-*`** : ne pas confondre folder canal (cible) et sous-dossier sync (créé au push).
8. **lastError** : sanitizer — pas d’email / token Graph dans le message UI/logs.

---

## 9. Conformité by design

### RGPD

- **DCP** : éventuels noms de fichiers / chemins ; pas de nouveau traitement identité.
- **Finalité** : projection collaborative des documents projet vers le tenant M365 du client.
- **Minimisation** : pas d’indexation du contenu SharePoint dans Starium ; mapping id fichier seulement.
- **Rétention** : mapping sync suit le cycle de vie `ProjectDocument` (cascade) ; clear cible ne purge pas l’historique sync V1 (documenter ; purge optionnelle V1.1).
- **Logs / audit** : actions `project.microsoft_documents.synced` / config updated — **pas** d’IDs utilisateur Microsoft en clair ni de contenu fichier.
- **Scope** : tout filtré `clientId` + `projectId` autorisé ; token Graph = connexion du client actif.

### RGAA

- Carte / modale : labels associés, focus visible, Esc ferme, ordre de tabulation logique.
- Statuts sync : texte + icône (pas couleur seule).
- Erreurs / fin de sync : `aria-live="polite"` (assertive si erreur bloquante).
- CTA ≥ 44px sur mobile (`min-h-11`).

### Design System

- `Card` / `StariumModal` / `Button` / `Alert` / `LoadingState` / `EmptyState` / chips statut existants.
- Tokens uniquement ; pas d’hex ; libellés FR sentence case.
- États loading / empty / error sur carte, modale, silo.

### Sécurité

- Authz `projects.read` / `projects.update` + ActiveClient + connexion M365 client.
- `clientId` jamais depuis le payload brut.
- DTO validés ; whitelist réponse (pas de `driveItemId` en liste documents V1).
- Audit sur config cible + sync batch.
- Pas d’appel Graph depuis le navigateur (Bearer Starium uniquement).

### Interface mobile

- Grille Options : carte pleine largeur sous `lg`.
- Modale centrée tous viewports (norme DS — pas bottom-sheet).
- Tableau silo : badge sync dans menu ⋯ ou colonne prioritaire selon pattern DOC-002 mobile.

---

## 10. Hors scope (rappel)

- Sync bidirectionnelle documents
- Upload direct vers SharePoint comme SoT
- Picker site SharePoint arbitraire / multi-drives
- Suppression / rename côté Microsoft
- Retry par document
- Création automatique Teams (INT-010) — seulement **alignement** de la résolution folder
