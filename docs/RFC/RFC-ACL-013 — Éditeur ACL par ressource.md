# RFC-ACL-013 — Éditeur ACL par ressource (UI)

## Statut

✅ Implémentée (V1 — frontend uniquement, consomme [RFC-ACL-005](./RFC-ACL-005%20%E2%80%94%20ACL%20ressources%20g%C3%A9n%C3%A9riques.md))

## 1. Analyse de l’existant

- Le backend RFC-ACL-005 expose un CRUD ACL générique : `GET|PUT|POST /api/resource-acl/:resourceType/:resourceId[/entries[/:id]]`, protégé `JwtAuthGuard + ActiveClientGuard + ClientAdminGuard`.
- `AccessControlService.listEntries` retourne `{ restricted, entries: { id, subjectType, subjectId, permission, subjectLabel, createdAt, updatedAt }[] }`. `subjectLabel` est déjà construit côté service (libellé `prénom nom (email)` pour `USER`, nom du groupe pour `GROUP`).
- DTO d’écriture (`ResourceAclEntryInputDto`) : `subjectType` ∈ `USER|GROUP`, `subjectId` (CUID 25), `permission` ∈ `READ|WRITE|ADMIN`. Une seule entrée par couple `(resource, subjectType, subjectId)`. `clientId` interdit dans le body (toujours dérivé du contexte).
- Whitelist V1 **UI** consommée par le front : `PROJECT`, `BUDGET`, `CONTRACT`, `SUPPLIER`, `STRATEGIC_OBJECTIVE` (alignée sur les intégrations livrées). Types additionnels backend (`RISK`, `DOCUMENT`, `GOVERNANCE_CYCLE`) : hors scope V1 UI jusqu’à branchement métier confirmé. Branchement métier (RFC-ACL-006) : les fiches détail listées en §3 exposent l’éditeur ; **lignes budget** : ACL du **budget parent** en lecture seule + CTA.
- Sémantique restrictive : tant qu’aucune entrée n’existe, l’accès est gouverné par RBAC (« mode public RBAC »). Dès qu’une entrée existe → ACL stricte sur cette ressource (cf. `ResourceAclGuard`).
- Côté front : la feature **`apps/web/src/features/resource-acl/`** (RFC-ACL-013) consomme `GET|POST|DELETE /api/resource-acl/*` depuis les fiches métier (bouton « Permissions » ou onglet « Accès »), **visible uniquement si `activeClient.role === 'CLIENT_ADMIN'`** — aucun fetch ACL pour les autres rôles. Le « cockpit accès » (RFC-ACL-010) reste distinct (groupes, visibilité modules, membres, rôles, diagnostic).
- Hooks réutilisables existants : `useClientMembers` (membres + libellés), `useAccessGroups` (groupes), `effective-rights-matrix` (RFC-ACL-011 pour debug accès).
- RFC-ACL-007 (frontend administration ACL) reste à l’état Draft et est volontairement large (licences, abonnements, groupes, visibilité, ACL). RFC-ACL-013 traite **uniquement** l’éditeur ACL par ressource intégré dans les pages détail métier ; pas de superposition fonctionnelle.

## 2. Hypothèses éventuelles

- Pas de nouvelle migration Prisma : la shape `ResourceAcl` couvre toutes les permissions V1.
- L’éditeur s’intègre à chaque page détail des ressources de la whitelist V1, à la demande, sans imposer de refonte des écrans existants.
- L’UI applique un blocage en écriture basé sur `CLIENT_ADMIN` (le backend reste source de vérité). Cohérent avec la dette technique RFC-ACL-010 (pas de permission `acl.write` exposée).
- Les libellés métier sont obligatoires sur tout l’éditeur : pas d’UUID brut comme texte principal — `subjectLabel` côté API + nom de ressource pré-fourni par la page hôte (cf. règle workspace `inputs-value-not-id`).
- L’audit est déjà géré côté backend (`resource_acl.created/replaced/removed`) — rien à ajouter côté UI.
- Pas d’endpoint dédié à inventer ; on consomme strictement RFC-ACL-005 + endpoints existants pour les autocompletes (`/api/users/me-client-members` style ou `useClientMembers`, `/api/access-groups`).

## 3. Liste des fichiers créés / modifiés

### Backend

- *(facultatif, au choix d’implémentation)* `apps/api/src/modules/access-control/dto/resource-acl-entry.dto.ts` — pas de modification structurelle ; aucun changement de contrat HTTP.
- Aucun nouvel endpoint, aucune migration. Cette RFC est exclusivement frontend et consomme RFC-ACL-005.

### Frontend — feature `resource-acl`

- `apps/web/src/features/resource-acl/api/resource-acl.ts` *(nouveau)* — fetchers : `listResourceAcl`, `replaceResourceAcl`, `addResourceAclEntry`, `removeResourceAclEntry`. Encodage strict des paths `(resourceType, resourceId)`.
- `apps/web/src/features/resource-acl/api/resource-acl.types.ts` *(nouveau)* — `ResourceAclEntry`, `ResourceAclListResponse`, `ResourceAclSubjectType`, `ResourceAclPermission`, `ResourceAclResourceType` (whitelist alignée backend).
- `apps/web/src/features/resource-acl/query-keys.ts` *(nouveau)* — clés tenant-aware **avec `activeClientId` explicite** dans la signature : `resourceAclKeys.list(activeClientId, resourceType, resourceId)`. Aucune dépendance à un préfixe global implicite — l’`activeClientId` doit apparaître dans la `queryKey` pour garantir l’isolation client en cas de switch.
- `apps/web/src/features/resource-acl/hooks/use-resource-acl.ts` *(nouveau)* — `useResourceAcl({ resourceType, resourceId, enabled? })` (lecture ; `enabled` pour éviter tout fetch hors `CLIENT_ADMIN` côté hôte).
- `apps/web/src/features/resource-acl/hooks/use-resource-acl-mutations.ts` *(nouveau)* — `useAddResourceAclEntry`, `useRemoveResourceAclEntry` (`invalidateQueries` sur succès ; pas d’optimistic update). Le retour mode public (série de `DELETE`) est orchestré dans l’éditeur avec **`await refetch()`** entre chaque suppression ([`lib/delete-sequence.ts`](../../apps/web/src/features/resource-acl/lib/delete-sequence.ts)), pas `invalidateQueries` dans la boucle.
- `apps/web/src/features/resource-acl/hooks/use-group-memberships.ts` *(nouveau)* — agrégation `useQueries` des membres de **tous** les groupes présents dans les entrées ACL (respect des règles React Hooks ; alimente le calcul USER+GROUP de la capacité ADMIN effective).
- `apps/web/src/features/resource-acl/lib/labels.ts` *(nouveau)* — `RESOURCE_ACL_PERMISSION_LABEL`, `RESOURCE_ACL_PERMISSION_HINT`, `RESOURCE_ACL_SUBJECT_TYPE_LABEL`. Aucun ID dans les libellés.
- `apps/web/src/features/resource-acl/lib/policy.ts` *(nouveau)* — `canEditResourceAcl`, `resolveEffectiveCanEdit` (override `canEdit` **réducteur** uniquement ; aligné RFC-ACL-010 tant qu’aucune permission `acl.manage` n’est exposée).
- `apps/web/src/features/resource-acl/lib/admin-capacity.ts` + `lib/delete-sequence.ts` + `lib/filter-available-subjects.ts` *(nouveaux)* — logique pure testée (capacité ADMIN effective, séquence DELETE+refetch, filtre autocomplete / doublons).
- `apps/web/src/features/resource-acl/components/resource-acl-confirmation-dialog.tsx` *(nouveau)* — confirmation à double cran (phrase `JE COMPRENDS LE RISQUE`).
- `apps/web/src/features/resource-acl/components/resource-acl-dialog.tsx` + `resource-acl-trigger-button.tsx` *(nouveaux)* — dialog uniforme ; trigger avec early return `CLIENT_ADMIN` avant toute query ACL.
- `apps/web/src/features/resource-acl/components/resource-acl-editor.tsx` *(nouveau)* — éditeur générique (props : `resourceType`, `resourceId`, `resourceLabel`).
- `apps/web/src/features/resource-acl/components/resource-acl-entry-row.tsx` *(nouveau)* — ligne édition (subject + permission + actions).
- `apps/web/src/features/resource-acl/components/resource-acl-add-entry-form.tsx` *(nouveau)* — formulaire d’ajout (autocomplete user/group, select permission).
- `apps/web/src/features/resource-acl/components/resource-acl-public-banner.tsx` *(nouveau)* — bandeau « Mode RBAC public » lorsque le serveur confirme `restricted === false` et liste vide.

### Frontend — intégrations modules métier (V1)

> **Pré-requis bloquant (à exécuter avant d’écrire la moindre intégration)** : lire `apps/api/src/modules/access-control/resource-acl.constants.ts` pour figer la liste des `resourceType` réellement utilisables. **Toute intégration doit cibler exclusivement les valeurs de `RESOURCE_ACL_RESOURCE_TYPE_WHITELIST`** ; tout `resourceType` non whitelisté est interdit (le backend renverra `400 RESOURCE_ACL_RESOURCE_TYPE_UNSUPPORTED`).
>
> Les écrans hôtes ne doivent afficher l’onglet « Accès » / le bouton « Permissions » **que pour les utilisateurs `CLIENT_ADMIN`** (cf. §4.5). Les autres rôles ne voient ni l’onglet, ni le bouton, ni le dialogue : pas de tentative d’appel à `/api/resource-acl/*` (qui serait refusée par `ClientAdminGuard` côté backend).

- `apps/web/src/features/projects/components/project-detail-view.tsx` — `ResourceAclTriggerButton` dans les actions du `PageHeader` (`PROJECT`, `project.id`, `project.name`).
- `apps/web/src/features/contracts/components/contract-detail-page.tsx` — `ResourceAclTriggerButton` dans la barre d’actions (`CONTRACT`, `c.id`, `c.title`).
- `apps/web/src/features/contracts/.../contract-attachments-*` — **hors scope V1** tant que la couverture ACL des pièces jointes n’est pas confirmée par lecture de `resource-acl.constants.ts` (le `resourceType` à utiliser n’est pas figé : pas d’`ATTACHMENT` whitelisté ; `DOCUMENT` ne couvre pas nécessairement les `contract-attachments` au sens RFC-ACL-006). À traiter en V1.5 dans une RFC dédiée si le mapping est confirmé. En attendant, l’UI **n’expose aucun bouton « Permissions » sur les pièces jointes**.
- `apps/web/src/app/(protected)/budgets/[budgetId]/page.tsx` — `ResourceAclTriggerButton` à côté du lien d’édition budget (`BUDGET`, `budget.id`, `budget.name`).
- `apps/web/src/features/budgets/components/budget-line-drawer/budget-line-intelligence-drawer.tsx` — onglet **Accès** (uniquement `CLIENT_ADMIN`) : bandeau héritage parent + `<ResourceAclEditor … readOnly canEdit={false} />` sur le budget parent + CTA ouvrant `<ResourceAclDialog …>` pour l’édition au niveau budget.
- `apps/web/src/features/procurement/components/suppliers/supplier-visualization-modal.tsx` — `ResourceAclTriggerButton` (`SUPPLIER`, `supplierId`, nom chargé).
- `apps/web/src/features/strategic-vision/components/strategic-objective-card.tsx` — `ResourceAclTriggerButton` à côté de « Modifier » (`STRATEGIC_OBJECTIVE`, `objective.id`, `objective.title`).
- **`RISK`, `GOVERNANCE_CYCLE`, `DOCUMENT`** : whitelistés côté backend mais **hors scope V1** côté UI. Réservés à une itération ultérieure (RFC dédiée), conditionnée à la confirmation de leur mapping métier dans `resource-acl.constants.ts` et au branchement effectif (RFC-ACL-006).

### Tests

- `apps/web/src/features/resource-acl/api/resource-acl.spec.ts` — encodage URL des paths, body sans `clientId`, gestion 400/403/404 (messages).
- `apps/web/src/features/resource-acl/query-keys.spec.ts` *(nouveau)* — `activeClientId` explicite dans la clé ; deux clients = deux clés ; absence d’`activeClientId` non confondue avec un autre tenant.
- `apps/web/src/features/resource-acl/lib/policy.spec.ts` — `canEditResourceAcl` accepte uniquement `CLIENT_ADMIN` ; override `canEdit` réduit mais n’élargit pas.
- `apps/web/src/features/resource-acl/components/resource-acl-trigger-button.spec.tsx` *(nouveau)* — non-`CLIENT_ADMIN` → `null`, aucun fetch ACL ; `CLIENT_ADMIN` → bouton visible sans appel avant ouverture.
- `apps/web/src/features/resource-acl/components/resource-acl-editor.spec.tsx` — `subjectLabel` (pas d’UUID), bandeau public uniquement après `GET` confirmant liste vide, désactivation contrôles si `canEdit === false`, self-lockout (première entrée + dernière capacité ADMIN effective USER+GROUP), retour mode public OK + erreur partielle.
- `apps/web/src/features/resource-acl/components/resource-acl-add-entry-form.spec.tsx` — filtre / libellés permission ; pas d’UUID en option visible.
- `apps/web/vitest.config.ts` + `apps/web/vitest.setup.ts` — environnement `jsdom`, specs `.tsx`, `@testing-library/jest-dom`, `afterEach(cleanup)`.

## 4. Implémentation complète

### 4.1 API client (`features/resource-acl/api/resource-acl.ts`)

- `listResourceAcl(authFetch, resourceType, resourceId): Promise<ResourceAclListResponse>` — `GET /api/resource-acl/:resourceType/:resourceId`.
- `replaceResourceAcl(authFetch, resourceType, resourceId, entries): Promise<ResourceAclListResponse>` — `PUT` (le backend exige `entries.length >= 1`).
- `addResourceAclEntry(authFetch, resourceType, resourceId, entry)` — `POST :resourceType/:resourceId/entries` (upsert sur le couple `(subjectType, subjectId)`).
- `removeResourceAclEntry(authFetch, resourceType, resourceId, entryId)` — `DELETE :resourceType/:resourceId/entries/:entryId`.
- `encodeURIComponent` systématique sur `resourceType`, `resourceId`, `entryId`. Le `clientId` n’est **jamais** dans le path/body : il est résolu côté backend via le header `X-Client-Id` propagé par `useAuthenticatedFetch`.

### 4.2 Hooks React Query

- `useResourceAcl({ resourceType, resourceId, enabled? })` :
  - lit `activeClientId` depuis `useActiveClient()` ;
  - `enabled: !!activeClientId && !!resourceType && !!resourceId` (combinable avec `enabled: false` côté hôte pour ne jamais monter la query hors contexte autorisé) ;
  - `queryKey: resourceAclKeys.list(activeClientId, resourceType, resourceId)` — l’`activeClientId` est **explicitement** dans la clé (pas de dépendance à un préfixe global implicite). Au switch de client actif, la query est mise à `disabled` puis re-créée avec la nouvelle clé ;
  - `staleTime: 30_000`.
- Mutations : `useAddResourceAclEntry`, `useRemoveResourceAclEntry`.
  - **Pas d’optimistic update** : `onSuccess` → `invalidateQueries` sur la clé liste tenant-aware (mutations unitaires add/remove depuis l’éditeur).
  - **Bulk delete (retour mode public)** : orchestration via `runSequentialDelete` — après **chaque** `DELETE`, **`await refetch()`** sur la query ACL (pas `invalidateQueries` dans la boucle), pour recalculer la capacité ADMIN et n’afficher le bandeau « mode public » qu’après confirmation serveur.
  - Exposent `error`/`isPending` pour pilotage des feedbacks UI.

### 4.3 Composant générique `<ResourceAclEditor />`

Props :

```ts
interface ResourceAclEditorProps {
  resourceType: ResourceAclResourceType; // canonique (ex. 'PROJECT')
  resourceId: string;                    // CUID
  resourceLabel: string;                 // libellé métier (titre fiche)
  /** Quand true, force le mode lecture (héritage parent ou rôle insuffisant). */
  readOnly?: boolean;
  /** Hook custom pour adapter la policy d'écriture (par défaut CLIENT_ADMIN). */
  canEdit?: boolean;
}
```

États rendus :

1. **Chargement** : message « Chargement des permissions… » (pas de skeleton multi-lignes imposé).
2. **Erreur** : `Alert` destructive + retry.
3. **Mode public RBAC** (`restricted === false`) : `<ResourceAclPublicBanner />` + formulaire d’ajout d’une **première** entrée. Texte : « Aucune ACL définie. L’accès est gouverné par les rôles RBAC. Ajouter une entrée passera la ressource en mode restreint. »
4. **Mode restreint** (`restricted === true`) : table compacte (`subjectLabel`, badge type `Utilisateur` / `Groupe`, badge permission, date `updatedAt` au format fr, actions). Formulaire d’ajout en pied. Bouton « Tout supprimer » retourne au mode public — implémenté via N suppressions séquentielles (backend interdit `entries=[]` en `PUT` V1, voir 8.).

Règles UX :

- Désactivation totale des contrôles si `canEdit === false` (rôle insuffisant ou `readOnly`).
- **Bascule public → restreint (première entrée)** : avant le `POST` de la première entrée, l’UI propose (et idéalement impose) l’ajout du **user courant** comme `ADMIN`. Si l’utilisateur refuse de s’ajouter lui-même, une **confirmation forte** explicite le risque (« Vous n’avez pas inclus votre compte. Sans entrée `ADMIN` couvrant votre identité — directement ou via un groupe dont vous êtes membre — vous perdrez la capacité de modifier ces accès. Continuer ? »).
- **Capacité ADMIN effective** : à tout moment, l’UI calcule la « capacité ADMIN effective » du user courant comme l’union des entrées :
  - `subjectType=USER && subjectId=currentUserId && permission=ADMIN`
  - `subjectType=GROUP && permission=ADMIN && currentUserId ∈ group.memberUserIds` (croisement avec `useAccessGroups()` détaillé / `groupMembers` chargés à la demande pour les groupes présents dans la liste ACL)
- **Suppression de la dernière capacité ADMIN effective** : si la suppression d’une entrée (USER ou GROUP) ferait passer la capacité ADMIN effective de `≥1` à `0` pour le user courant, l’UI **interdit le DELETE par défaut** et demande une confirmation explicite à double cran (`type "JE COMPRENDS LE RISQUE" pour confirmer`). Aucune affirmation du type « le rôle CLIENT_ADMIN garantit l’accès » n’est faite : en mode restreint, seule l’ACL gouverne l’accès à la ressource (RBAC ne le rouvre pas).
- Un seul couple `(USER|GROUP, id)` par ligne — l’add-form bloque les doublons côté UI avant `POST` (`409 Conflict` géré aussi en fallback).
- Tooltip `RESOURCE_ACL_PERMISSION_HINT` sur chaque permission :
  - `READ` : « Voir la ressource ».
  - `WRITE` : « Modifier la ressource (inclut la lecture) ».
  - `ADMIN` : « Gérer les accès, modifier, supprimer ».

### 4.4 Add-entry form

- Onglets shadcn `Utilisateur` / `Groupe` + champ de recherche qui filtre les options. Pas d’input « ID brut ».
- `Utilisateur` : autocomplete sur `useClientMembers()` — recherche sur `firstName/lastName/email`. Affichage option = `prénom nom (email)`. La valeur soumise est `userId`.
- `Groupe` : autocomplete sur `useAccessGroups()` — recherche sur `name`. La valeur soumise est `accessGroupId`.
- Permission : `Select` avec `Lecture` / `Écriture` / `Administration` (pas l’enum brut).
- Submit : `addResourceAclEntry`, refresh, reset form.
- Erreurs typées : `400 RESOURCE_ACL_RESOURCE_TYPE_UNSUPPORTED`, `400 RESOURCE_ACL_INVALID_RESOURCE_ID`, `403`, `404` (ressource hors client) → message générique stable côté UI (pas de fuite).

### 4.5 Intégrations module par module

**Règle de visibilité unique (V1)** : l’onglet « Accès » / le bouton « Permissions » / le dialogue ne s’affichent que pour `activeClient.role === 'CLIENT_ADMIN'`. Aucun appel à `/api/resource-acl/*` n’est jamais déclenché pour un autre rôle (qui serait de toute façon refusé par `ClientAdminGuard`). On supprime explicitement la règle « visible si `canEdit || restricted` » : `restricted` n’est connu qu’après un `GET` ACL, lui-même réservé à `CLIENT_ADMIN`.

- **Projects** : bouton « Permissions » (`ResourceAclTriggerButton`) dans le header fiche projet, **uniquement** si `CLIENT_ADMIN`. Dialog avec `<ResourceAclEditor resourceType="PROJECT" … />`.
- **Contracts** : bouton « Permissions » dans la barre d’actions, **uniquement** si `CLIENT_ADMIN`. `<ResourceAclDialog resourceType="CONTRACT" resourceId={contract.id} resourceLabel={contract.title} />`.
- **Contract attachments** : hors scope V1 (cf. §3 — vérification `resource-acl.constants.ts` requise).
- **Suppliers** : bouton « Permissions » dans la vue fournisseur consolidée, **uniquement** si `CLIENT_ADMIN`, `resourceType="SUPPLIER"`.
- **Budgets** : bouton « Permissions » sur fiche budget (uniquement `CLIENT_ADMIN`). Sur **lignes** : onglet **Accès** (uniquement `CLIENT_ADMIN`) — éditeur lecture seule sur le budget parent + CTA ouvrant le dialog d’édition au niveau budget (héritage RFC-ACL-006).
- **Strategic objectives** : bouton « Permissions » sur la carte objectif, **uniquement** si `CLIENT_ADMIN`, `resourceType="STRATEGIC_OBJECTIVE"`.
- **Risk / Governance cycle / Document** : whitelistés backend mais hors scope V1 côté UI (cf. §3).

### 4.6 Policy (`lib/policy.ts`)

```ts
export function canEditResourceAcl(input: {
  activeClientRole: 'CLIENT_ADMIN' | 'CLIENT_USER' | string | undefined;
}): boolean {
  return input.activeClientRole === 'CLIENT_ADMIN';
}
```

- **Source unique côté UI** : `activeClient.role` issu de `useActiveClient()`. Aucune autre dérivation (jeton, rôle global, etc.) n’est utilisée.
- **Override props** : `<ResourceAclEditor canEdit={...} />` accepte un override explicite, mais la **valeur par défaut** est `canEditResourceAcl({ activeClientRole: useActiveClient().activeClient?.role })`. L’override sert uniquement à forcer le mode lecture (ex. cas budget-line en héritage), jamais à élargir au-delà de `CLIENT_ADMIN`.
- **Backend = source de vérité** : `ClientAdminGuard` côté API tranche définitivement. L’UI masque/désactive uniquement, ne se substitue pas à la sécurité serveur.
- Documenté comme dette technique alignée sur `license-quick-actions-policy.ts` (RFC-ACL-010), retirable dès qu’une permission API dédiée (`acl.manage`, `acl.read`) sera introduite — le contrat composant reste alors stable (drop-in via `useCanEditResourceAcl`).

### 4.7 Anti-fuite et défense en profondeur

- L’éditeur ne s’affiche **pas** dans une page hors contexte client (Next.js route `(protected)/client/...`). Pas d’injection dans les routes plateforme : la gestion ACL inter-clients sortirait du scope `ClientAdminGuard` actuel.
- En cas de `404` (resourceId hors client) : message générique « Ressource introuvable ou non accessible » + log frontal (pas de stacktrace).
- Aucune option ne permet de saisir un `resourceId` brut côté UI — il est toujours fourni par la page hôte qui l’a chargé en RBAC ; impossible d’interagir avec une ressource d’un autre client par accident.

### 4.8 Retour au mode public (suppression totale des entrées)

Le backend V1 interdit `PUT entries=[]`. Pour repasser une ressource du mode restreint au mode public RBAC, l’UI doit donc supprimer toutes les entrées une par une via `DELETE`. Règles obligatoires :

- **DELETE séquentiel**, jamais parallèle : éviter les courses Prisma + audit, et permettre d’interrompre proprement à mi-chemin.
- **Pas d’optimistic update** : aucune mutation locale du cache React Query avant retour serveur. Toute mutation invalide la query liste et attend le refetch.
- **Refetch / invalidation systématique** après chaque suppression unitaire : la décision d’afficher « mode public » s’appuie **exclusivement** sur la réponse `GET /api/resource-acl/...` (`restricted === false`), jamais sur un état local supposé.
- **Erreurs partielles** : si l’une des suppressions échoue (`403`, `404`, `409`, réseau), l’UI s’arrête au premier échec, conserve la liste des entrées effectivement supprimées et celles restantes, et affiche un message explicite (« 3 entrées sur 5 supprimées. Ressource toujours en mode restreint. Réessayer ? »). Bouton « Reprendre » qui relance la séquence sur les entrées encore présentes.
- **Garde-fou ADMIN** : si l’une des entrées à supprimer est la dernière capacité ADMIN effective du user courant (cf. §4.3), la séquence s’arrête avant cette entrée et déclenche la confirmation forte décrite §4.3. L’utilisateur peut soit confirmer le self-lockout, soit annuler.
- **Banner final** : « Mode RBAC public » n’est affiché qu’après un `GET` confirmant `restricted === false` ET `entries.length === 0`. Tant que le serveur renvoie au moins une entrée, le bandeau reste « Mode restreint ».

## 5. Modifications Prisma si nécessaire

- **Aucune.**
- Optionnel V1.5 : nouvel index sur `(clientId, resourceType, updatedAt)` pour un futur cockpit ACL global. Hors scope de cette RFC.

## 6. Tests

### Backend

- Aucun ajout requis. La couverture RFC-ACL-005 est déjà en place (`access-control.service.spec.ts`, `resource-acl.guard.spec.ts`).

### Frontend

- `resource-acl.spec.ts`
  - `listResourceAcl` cible exactement `/api/resource-acl/:type/:id` (header `X-Client-Id` géré par `useAuthenticatedFetch`, jamais injecté manuellement dans le fetcher).
  - `replaceResourceAcl` envoie `{ entries }` non vide conformément au backend V1.
  - `addResourceAclEntry` envoie un body sans `clientId`.
  - `removeResourceAclEntry` encode `entryId`.
- `query-keys.spec.ts`
  - `resourceAclKeys.list(activeClientId, resourceType, resourceId)` inclut **explicitement** `activeClientId` dans la clé retournée.
  - Deux `activeClientId` distincts produisent deux clés distinctes (test d’isolation tenant).
  - L’absence d’`activeClientId` (undefined) lève une erreur ou produit une clé reconnaissable invalide non reprise par `enabled`.
- `policy.spec.ts`
  - `CLIENT_ADMIN` → `true` ; `CLIENT_USER` → `false` ; `undefined` → `false`.
  - Override `canEdit={false}` force `false` même pour `CLIENT_ADMIN` ; override ne peut pas élargir au-delà (test : `CLIENT_USER` + `canEdit={true}` → composant masqué côté hôte, l’éditeur ne déclenche aucun appel ACL).
- `resource-acl-trigger-button.spec.tsx` — visibilité `CLIENT_ADMIN` ; non-admin → aucun appel `/api/resource-acl/*` ; pas de test E2E par hôte (couverture centralisée sur le trigger + éditeur).
- `resource-acl-editor.spec.tsx`
  - Bandeau « Mode RBAC public » uniquement quand un `GET` retourne `restricted === false && entries.length === 0` (jamais déduit d’un état local).
  - Affiche `subjectLabel`, jamais l’UUID brut.
  - Désactivation totale des contrôles quand `canEdit === false`.
  - **Self-lockout — première entrée** : dialog d’ajout impose ou confirme l’ajout du user courant en `ADMIN` ; la confirmation forte est obligatoire si l’user ne s’ajoute pas.
  - **Self-lockout — dernière capacité ADMIN effective** : suppression bloquée par défaut si elle ferait passer la capacité ADMIN effective de `≥1` à `0` pour le user courant ; confirmation à double cran exigée. La capacité effective tient compte des entrées USER **et** GROUP (test avec un groupe contenant le user courant).
  - **Retour au mode public — succès** : N suppressions séquentielles, aucun `PUT entries=[]` n’est tenté, le bandeau « Mode public » n’apparaît qu’après le `GET` confirmant la liste vide.
  - **Retour au mode public — erreur partielle** : si la 3ᵉ suppression échoue, l’éditeur arrête la séquence, n’affiche pas « Mode public », expose le compteur (« 2/5 supprimées ») + bouton « Reprendre » qui repart sur les entrées restantes après refetch.
- `resource-acl-add-entry-form.spec.tsx`
  - Autocomplete user filtre sur `nom + email` (jamais l’UUID).
  - Doublon (`USER`, déjà présent) → bloque le submit.

## 7. Récapitulatif final

RFC-ACL-013 livre l’UI pour piloter les ACL ressources V1 sans curl. `<ResourceAclEditor />` + `<ResourceAclDialog />` / `<ResourceAclTriggerButton />` consomment strictement les endpoints RFC-ACL-005. Visibilité **strictement `CLIENT_ADMIN`**, policy `activeClient.role` avec override `canEdit` réducteur uniquement, clés React Query avec `activeClientId` explicite, retour mode public via `DELETE` séquentiels + `await refetch()` entre chaque suppression, self-lockout USER+GROUP. Intégrations : Projects, Contracts, Suppliers, Budget (header + drawer ligne « Accès »), Strategic objective (carte). Pièces jointes contrat et types `RISK`/`DOCUMENT`/`GOVERNANCE_CYCLE` : hors V1 UI. Aucune migration, aucun nouvel endpoint.

## 8. Points de vigilance

- **Visibilité V1 = `CLIENT_ADMIN` strict** : aucun autre rôle ne voit l’onglet/bouton/dialogue, et aucune requête `/api/resource-acl/*` n’est émise pour eux. Pas de fallback « si `restricted` alors visible ».
- **Mode public ↔ restreint** : dès qu’on ajoute la première entrée, la ressource bascule en restreint. Bandeau explicite + invitation forte à s’ajouter en `ADMIN` (cf. self-lockout).
- **`PUT` interdit avec `entries=[]` (V1)** : pour repasser en public, l’UI fait des `DELETE` séquentiels avec gestion d’erreur partielle (cf. §4.8). Le bandeau « Mode public » ne s’affiche qu’après confirmation serveur (`GET` retourne `entries=[]`). À documenter dans une note RFC-ACL-005 V2 (route reset) si besoin opérationnel récurrent.
- **Self-lockout (correctif)** : en mode restreint, **seule l’ACL gouverne l’accès** à la ressource — le rôle `CLIENT_ADMIN` ne rouvre **pas** l’accès métier ; il permet uniquement d’éditer l’ACL via l’API. La perte de la dernière capacité `ADMIN` effective (USER + appartenance GROUP confondus) coupe l’accès métier au sens RBAC `WRITE/READ` sur cette ressource. L’UI doit donc :
  1. proposer/imposer l’ajout du user courant en `ADMIN` lors de la première entrée ;
  2. exiger une confirmation forte si le user refuse de s’ajouter ;
  3. interdire (ou exiger une confirmation à double cran) la suppression de la dernière capacité `ADMIN` effective ;
  4. calculer la capacité `ADMIN` effective en croisant les entrées `USER` et `GROUP` (en chargeant les membres des groupes présents dans la liste ACL).
- **`resourceType` whitelist** : avant toute intégration, lecture obligatoire de `apps/api/src/modules/access-control/resource-acl.constants.ts`. Aucune valeur hors `RESOURCE_ACL_RESOURCE_TYPE_WHITELIST` n’est utilisable. **Contract attachments** restent hors scope V1 tant que leur mapping ACL n’est pas confirmé (pas d’`ATTACHMENT` whitelisté ; couverture par `DOCUMENT` non garantie côté RFC-ACL-006).
- **Query keys tenant-aware** : toutes les clés ACL incluent **explicitement** `activeClientId` dans leur tableau. Pas de dépendance à un préfixe global implicite. Test dédié dans `query-keys.spec.ts`.
- **Pas d’optimistic update** : toute mutation invalide la query liste et attend le refetch. Aucun affichage de l’état « mode public » ou de la liste mise à jour avant retour serveur.
- **Inputs valeur, pas ID** : autocomplete user/group obligatoires ; pas de champ texte CUID. `subjectLabel` côté API utilisé tel quel.
- **Anti-fuite** : `404 / 403` mappés en message UI générique stable. Pas de log technique exposé à l’utilisateur.
- **Permissions futures** : prévoir le passage à `acl.manage` dans `policy.ts` sans changer le contrat composant (drop-in via hook `useCanEditResourceAcl`).
- **Imbrication ressources** : sur les budgets, l’héritage parent est lecture seule côté lignes — l’éditeur affiche un message `Hérité du budget <name>` + CTA. Pas de risque de divergence avec la résolution backend (`AccessControlService.canRead/Write/Admin`).
- **Performance** : la liste ACL d’une ressource est petite (< 50 entrées typiquement). Pas de pagination V1. Cache React Query 30 s.
- **Cohabitation RFC-ACL-007** : RFC-ACL-013 traite uniquement l’éditeur **par ressource** intégré dans les fiches métier. RFC-ACL-007 reste le porteur d’une éventuelle vue admin globale ACL (cockpit transverse) — non bloquant pour cette RFC.
