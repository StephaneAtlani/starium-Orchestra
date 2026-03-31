Voici une proposition de RFC complète.

# RFC-PROJ-DOC-FE-001 — Frontend ProjectDocument UI

## Statut

Draft

## Dépendances

* RFC-PROJ-DOC-001 — registre métier `ProjectDocument` côté backend
* Architecture frontend Starium Orchestra
* Vision frontend Starium Orchestra
* RFC-014-2 — Auth / client actif / fetch authentifié
* RFC-013 — Audit logs

Le frontend Starium Orchestra doit rester un cockpit API-first, multi-client, sans logique métier critique côté UI, avec architecture feature-first, query keys tenant-aware, App Shell stable et usage exclusif du design system partagé.

---

# 1. Objectif

Implémenter l’interface frontend du registre documentaire projet afin de permettre à un utilisateur autorisé de :

* consulter les documents d’un projet
* créer un document métier
* modifier ses métadonnées
* consulter son détail
* supprimer logiquement un document si le backend le permet
* filtrer / rechercher / trier les documents d’un projet

Le frontend ne gère pas la logique métier documentaire comme source de vérité : il consomme l’API backend, applique les patterns UX Starium et reste strictement scoped au client actif et au projet courant.

---

# 2. Problème adressé

Aujourd’hui, les documents projet sont souvent dispersés entre SharePoint, Teams, mails, fichiers locaux et notes diverses. Dans Starium Orchestra, le besoin MVP n’est pas de bâtir une GED complète, mais de disposer d’un **registre documentaire projet** lisible dans le cockpit projet, cohérent avec le positionnement produit de gouvernance opérationnelle.

Cette RFC couvre uniquement l’interface du registre métier documentaire projet.

---

# 3. Périmètre

## Inclus

* page “Documents” dans le projet
* liste paginée / filtrable des documents
* vue détail document
* création d’un document
* édition d’un document
* suppression logique si exposée par le backend
* badges de statut / catégorie / stockage
* prise en charge des états loading / empty / error
* invalidation TanStack Query après mutations
* intégration au shell et à la navigation existante

## Exclus

* upload binaire avancé
* téléchargement binaire
* preview PDF / Office inline
* versionning documentaire
* arborescence GED
* drag & drop multi-fichiers
* workflow de validation documentaire
* synchronisation Microsoft / SharePoint / Teams
* droits documentaires spécifiques hors RBAC projet existant

---

# 4. Principes UX et architecture

## 4.1 Cockpit et cohérence

L’UI doit s’intégrer au workspace protégé existant, sans recréer de layout global. Toute nouvelle page métier doit vivre dans le shell existant, avec `PageHeader`, toolbar, card, table et états standards.

## 4.2 Feature-first

La feature doit être isolée dans `features/projects/documents/*`, avec séparation claire :

* `api/`
* `hooks/`
* `components/`
* `schemas/`
* `types/`
* `mappers/` si utile

C’est le pattern recommandé pour les features Starium.

## 4.3 Multi-client strict

Toutes les requêtes passent par le client API central et incluent `X-Client-Id` automatiquement puisque ce sont des routes métier. Les query keys doivent toujours inclure `clientId` pour éviter toute collision de cache inter-tenant.

## 4.4 Backend source de vérité

Le frontend peut masquer certaines actions selon permissions, mais seul le backend autorise ou refuse. Toute erreur `401/403/404/409/422` doit être rendue proprement dans l’UI.

---

# 5. Hypothèses de contrat backend

Cette RFC frontend suppose que le backend expose un contrat de type :

* `GET /api/projects/:projectId/documents`
* `POST /api/projects/:projectId/documents`
* `GET /api/projects/:projectId/documents/:documentId`
* `PATCH /api/projects/:projectId/documents/:documentId`
* `DELETE /api/projects/:projectId/documents/:documentId` ou équivalent si suppression supportée

Pagination attendue, alignée avec le standard Starium :

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

Ce format est déjà le standard recommandé dans les autres features métier et list APIs du projet.

Si le backend réel diffère, la présente RFC devra être ajustée sur les noms exacts des endpoints et DTOs, mais sans changer l’architecture UI.

---

# 6. Données manipulées côté frontend

## 6.1 Type principal

```ts
type ProjectDocument = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  category: ProjectDocumentCategory;
  status: ProjectDocumentStatus;
  storageType: ProjectDocumentStorageType;
  reference: string | null;
  fileName: string | null;
  mimeType: string | null;
  externalUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};
```

## 6.2 Enums attendus

```ts
type ProjectDocumentCategory =
  | "SPECIFICATION"
  | "CONTRACT"
  | "REPORT"
  | "MINUTES"
  | "DELIVERABLE"
  | "OTHER";

type ProjectDocumentStatus =
  | "DRAFT"
  | "ACTIVE"
  | "ARCHIVED";

type ProjectDocumentStorageType =
  | "MANUAL"
  | "LINK"
  | "MICROSOFT";
```

### Règle MVP importante

Même si `MICROSOFT` existe côté enum pour compatibilité future, il n’est pas supporté en création dans ce ticket. Le formulaire frontend ne doit donc pas proposer un mode Microsoft actif dans le MVP ; au mieux, il peut afficher un badge en lecture seule si une donnée existante a cette valeur.

---

# 7. Routing frontend

Créer les routes suivantes dans `apps/web/src/app/(protected)/projects/[projectId]/documents` :

* `page.tsx` → liste des documents du projet
* `[documentId]/page.tsx` → détail document
* optionnel : `new/page.tsx` et `[documentId]/edit/page.tsx`

Recommandation MVP : privilégier une UX mixte :

* page liste dédiée
* création / édition via `Dialog` ou `Sheet`
* détail soit en page dédiée, soit en drawer

Choix recommandé :

* **liste en page**
* **création / édition en dialog**
* **détail en page dédiée**

Cela reste cohérent avec le cockpit et évite de surcharger la page projet.

---

# 8. Structure de la feature

```text
apps/web/src/features/projects/documents/
├── api/
│   ├── get-project-documents.ts
│   ├── get-project-document.ts
│   ├── create-project-document.ts
│   ├── update-project-document.ts
│   └── delete-project-document.ts
├── components/
│   ├── project-documents-table.tsx
│   ├── project-document-filters.tsx
│   ├── project-document-status-badge.tsx
│   ├── project-document-category-badge.tsx
│   ├── create-project-document-dialog.tsx
│   ├── edit-project-document-dialog.tsx
│   └── project-document-form.tsx
├── hooks/
│   ├── use-project-documents-query.ts
│   ├── use-project-document-query.ts
│   ├── use-create-project-document-mutation.ts
│   ├── use-update-project-document-mutation.ts
│   └── use-delete-project-document-mutation.ts
├── schemas/
│   └── project-document-form.schema.ts
├── types/
│   └── project-document.types.ts
└── lib/
    └── project-document-query-keys.ts
```

---

# 9. Query keys

Toutes les query keys doivent être tenant-aware.

```ts
export const projectDocumentQueryKeys = {
  all: (clientId: string) => ["projects", "documents", clientId] as const,
  list: (
    clientId: string,
    projectId: string,
    params: ProjectDocumentListParams,
  ) => ["projects", "documents", clientId, projectId, "list", params] as const,
  detail: (clientId: string, projectId: string, documentId: string) =>
    ["projects", "documents", clientId, projectId, "detail", documentId] as const,
};
```

---

# 10. API frontend

Toutes les fonctions API passent par le client HTTP central existant.

## 10.1 Liste

`getProjectDocuments(projectId, params)`

Query params recommandés :

* `search`
* `category`
* `status`
* `storageType`
* `limit`
* `offset`

## 10.2 Détail

`getProjectDocument(projectId, documentId)`

## 10.3 Création

`createProjectDocument(projectId, payload)`

## 10.4 Mise à jour

`updateProjectDocument(projectId, documentId, payload)`

## 10.5 Suppression

`deleteProjectDocument(projectId, documentId)`

---

# 11. Écran liste

## 11.1 Objectif

Afficher le registre documentaire d’un projet sous forme exploitable en pilotage.

## 11.2 Composition

* `PageHeader`

  * titre : `Documents projet`
  * description : registre documentaire et livrables du projet
  * action primaire : `Nouveau document`
* `TableToolbar`

  * recherche texte
  * filtres catégorie / statut / stockage
* `Card`

  * `DataTable<ProjectDocument>`

## 11.3 Colonnes recommandées

* Titre
* Catégorie
* Statut
* Stockage
* Référence
* Dernière mise à jour
* Actions

## 11.4 Rendu des actions

* Voir
* Modifier
* Supprimer si permis et si support backend
* Ouvrir le lien externe si `externalUrl` renseignée

## 11.5 États

* `loading` via `LoadingState`
* `empty` via `EmptyState`
* `error` via `ErrorState`

Le pattern DataTable générique doit être réutilisé pour rester cohérent avec le reste du frontend.

---

# 12. Écran détail

## 12.1 Objectif

Donner une lecture claire des métadonnées du document.

## 12.2 Sections recommandées

### Header

* titre
* badges catégorie / statut / stockage
* actions modifier / supprimer

### Carte “Informations”

* référence
* nom de fichier
* type MIME
* URL externe
* dates création / mise à jour

### Carte “Description”

* description libre
* fallback si vide

### Carte “Traçabilité”

* créé par
* modifié par
* timestamps

## 12.3 Liens externes

Si `externalUrl` existe :

* afficher un bouton `Ouvrir le document`
* ouverture dans un nouvel onglet
* ne jamais tenter de faire du preview embarqué dans cette RFC

---

# 13. Création / édition

## 13.1 Composant formulaire

`ProjectDocumentForm`

Outils :

* `react-hook-form`
* `zod`

## 13.2 Champs MVP

* `title` obligatoire
* `description` optionnel
* `category` obligatoire
* `status` obligatoire
* `storageType` obligatoire
* `reference` optionnel
* `fileName` optionnel
* `mimeType` optionnel
* `externalUrl` optionnel selon `storageType`

## 13.3 Règles UI

### Si `storageType = MANUAL`

* `externalUrl` masqué ou vidé

### Si `storageType = LINK`

* `externalUrl` affiché
* validation URL côté Zod

### Si `storageType = MICROSOFT`

* non sélectionnable en création MVP
* si document existant en lecture, afficher le badge mais ne pas permettre de basculer vers cette valeur côté formulaire MVP

## 13.4 Validation frontend

Exemple :

```ts
const projectDocumentFormSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  category: z.enum([
    "SPECIFICATION",
    "CONTRACT",
    "REPORT",
    "MINUTES",
    "DELIVERABLE",
    "OTHER",
  ]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  storageType: z.enum(["MANUAL", "LINK"]),
  reference: z.string().max(150).optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  mimeType: z.string().max(150).optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
});
```

Le backend reste juge final.

---

# 14. Permissions et visibilité

Cette feature relève du module projets et doit suivre les conventions frontend de filtrage par permissions sans jamais remplacer la sécurité backend.

Recommandation MVP :

* lecture liste / détail : `projects.read`
* création / édition / suppression : `projects.update`

Comportement UI :

* bouton “Nouveau document” masqué si absence de `projects.update`
* actions modifier / supprimer masquées si absence de `projects.update`
* si accès direct à une action non autorisée et backend répond `403`, afficher un message propre

---

# 15. Navigation

Ajouter l’entrée “Documents” dans la navigation secondaire projet, pas dans la sidebar globale principale.

Exemple onglets projet :

* Vue d’ensemble
* Tâches
* Risques
* Jalons
* Documents

Cela évite de transformer les documents en module global alors qu’il s’agit d’une sous-feature du module `projects`.

---

# 16. Invalidation TanStack Query

Après création / mise à jour / suppression :

* invalider la liste des documents du projet
* invalider le détail du document si concerné
* invalider éventuellement le détail projet si celui-ci expose un compteur documentaire

Exemple :

```ts
queryClient.invalidateQueries({
  queryKey: projectDocumentQueryKeys.all(clientId),
});
```

---

# 17. Design system

## Règles impératives

* utiliser uniquement les composants partagés `components/ui/*`, `components/layout/*`, `components/feedback/*`, `components/data-table/*`
* ne pas coder d’HTML brut structurant
* utiliser les tokens de thème (`bg-card`, `text-muted-foreground`, `border-border`, etc.)
* aucune couleur hex codée en dur dans la feature

## Badges

Créer de petits composants dédiés :

* `ProjectDocumentStatusBadge`
* `ProjectDocumentCategoryBadge`

afin d’uniformiser les libellés et variants.

---

# 18. Gestion des erreurs

## Cas à traiter

* `401` : session expirée → laissé au client auth central
* `403` : accès refusé
* `404` : projet ou document introuvable
* `409` : conflit éventuel
* `422` / `400` : validation métier

## UX attendue

* toast d’erreur mutation
* message inline dans le formulaire si erreur de validation
* `ErrorState` si la page détail ne charge pas

---

# 19. Accessibilité

Minimum attendu :

* labels explicites
* focus management correct dans les dialogs
* navigation clavier
* boutons d’action lisibles
* badges non porteurs de sens uniquement par la couleur
* liens externes identifiables

---

# 20. Performance

* pagination backend obligatoire dès que la liste devient volumineuse
* pas de sur-fetching
* lazy loading possible des dialogs
* pas de refetch inutile en boucle
* mémorisation raisonnable des colonnes DataTable

Ces règles s’alignent avec la stratégie frontend globale du projet.

---

# 21. Tests frontend attendus

## Unit / component tests

* rendu liste loading / empty / error / success
* rendu badges catégorie / statut
* validation du formulaire
* masquage de `externalUrl` selon `storageType`

## Integration / feature tests

* création réussie
* mise à jour réussie
* suppression réussie
* invalidation liste après mutation
* respect du `clientId` actif via API central
* gestion d’un `403`

---

# 22. Critères d’acceptation

La RFC est considérée implémentée lorsque :

* un utilisateur autorisé peut lister les documents d’un projet
* un utilisateur autorisé peut créer et modifier un document métier
* la feature respecte l’architecture feature-first
* les query keys sont tenant-aware
* le design system partagé est respecté
* les états loading / empty / error sont présents
* `storageType=MICROSOFT` n’est pas proposé en création MVP
* aucune logique métier critique n’est dupliquée côté frontend

---

# 23. Ordre d’implémentation recommandé

1. définir `types` + query keys
2. implémenter API frontend
3. implémenter hooks TanStack Query
4. construire badges et table
5. construire formulaire + dialogs create/edit
6. créer page liste
7. créer page détail
8. brancher navigation projet
9. gérer invalidations et toasts
10. écrire les tests

---

# 24. Hors RFC suivante possible

Évolutions naturelles ensuite :

* RFC-PROJ-DOC-FE-002 — Upload / Download binaire
* RFC-PROJ-DOC-FE-003 — Preview documentaire
* RFC-PROJ-DOC-FE-004 — Synchronisation Microsoft Documents UI
* RFC-PROJ-DOC-FE-005 — Timeline documentaire / audit visuel
