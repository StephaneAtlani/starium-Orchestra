# RFC-PROJ-OPT-001 — Project Options & Microsoft 365 Configuration UI

## Statut

Implémenté (web)

## Dépendances

* RFC-PROJ-INT-005 — Connexion client Microsoft
* RFC-PROJ-INT-006 — ProjectMicrosoftLink (liaison projet)
* RFC-PROJ-INT-009 — Synchronisation Microsoft
* Architecture frontend Starium Orchestra
* Module Projects

---

# 1. Objectif

Mettre en place un espace **“Options du projet”** permettant de :

* configurer les paramètres métier du projet
* gérer la liaison avec Microsoft 365 (Teams, Planner, SharePoint)
* piloter les mécanismes de synchronisation
* exposer l’état et l’historique des intégrations

Cet écran devient le **centre de configuration opérationnelle du projet**.

---

# 2. Positionnement produit

Starium reste :

* **source de vérité métier**
* **cockpit de gouvernance**

Microsoft 365 est :

* une **projection collaborative**
* jamais la source principale

Donc :

* la configuration se fait dans Starium
* la synchronisation est pilotée depuis Starium
* aucune logique métier critique n’est déléguée à Microsoft

---

# 3. Périmètre

## Inclus

* page Options projet
* configuration Microsoft 365 (Teams / Planner / Documents)
* activation / désactivation des synchronisations
* affichage état connexion + sync
* lancement manuel des synchronisations
* affichage des métadonnées de liaison

## Exclus

* création automatique Teams / Planner / SharePoint
* mapping avancé Planner
* sync bidirectionnelle complète
* gestion des conflits avancés
* provisioning Microsoft
* gestion des permissions Microsoft

---

# 4. Routing

Créer la route :

```
/app/(protected)/projects/[projectId]/options/page.tsx
```

Navigation projet :

* Overview
* Tasks
* Risks
* Documents
* **Options** ← nouveau

---

# 5. Structure frontend

```
features/projects/options/
├── api/
│   ├── get-project-options.ts
│   ├── update-project-options.ts
│   ├── get-project-microsoft-link.ts
│   ├── update-project-microsoft-link.ts
│   ├── trigger-tasks-sync.ts
│   └── trigger-documents-sync.ts
├── hooks/
├── components/
│   ├── project-options-tabs.tsx
│   ├── project-general-settings.tsx
│   ├── project-microsoft-settings.tsx
│   ├── project-sync-settings.tsx
│   ├── microsoft-teams-card.tsx
│   ├── microsoft-planner-card.tsx
│   ├── microsoft-documents-card.tsx
│   └── sync-status-card.tsx
├── types/
└── lib/project-options-query-keys.ts
```

---

# 6. Architecture UX

## Page structurée en 3 onglets

### 1. Général

Paramètres métier :

* nom
* description
* sponsor
* chef de projet
* catégorie
* statut
* dates

---

### 2. Microsoft 365

Configuration des liaisons.

#### Carte Teams

* teamName
* channelName
* bouton “Configurer”
* bouton “Dissocier”

#### Carte Planner

* plannerPlanTitle
* bouton “Configurer”
* bouton “Dissocier”

#### Carte Documents

* filesDriveId / site
* bouton “Configurer”
* bouton “Dissocier”

#### Carte état connexion

* connexion Microsoft client : ACTIVE / ABSENTE
* message si non connecté

---

### 3. Synchronisation

Pilotage du comportement.

#### Paramètres

* syncTasksEnabled (toggle)
* syncDocumentsEnabled (toggle)

#### Informations

* lastSyncAt
* lastTaskSyncAt
* lastDocumentSyncAt
* lastError éventuel

#### Actions

* “Synchroniser les tâches”
* “Synchroniser les documents”

---

# 7. Modèle frontend

## ProjectMicrosoftLink

```ts
type ProjectMicrosoftLink = {
  id: string;
  projectId: string;

  teamId: string | null;
  teamName: string | null;

  channelId: string | null;
  channelName: string | null;

  plannerPlanId: string | null;
  plannerPlanTitle: string | null;

  filesDriveId: string | null;

  isEnabled: boolean;

  syncTasksEnabled: boolean;
  syncDocumentsEnabled: boolean;

  lastSyncAt: string | null;
  lastTaskSyncAt: string | null;
  lastDocumentSyncAt: string | null;
};
```

---

# 8. Query keys

```ts
projectOptionsKeys = {
  all: (clientId) => ["projects", "options", clientId],
  detail: (clientId, projectId) =>
    ["projects", "options", clientId, projectId],

  microsoftLink: (clientId, projectId) =>
    ["projects", "microsoft-link", clientId, projectId],
};
```

---

# 9. API frontend

## Lecture

* `GET /api/projects/:projectId/microsoft-link`

## Mise à jour

* `PUT /api/projects/:projectId/microsoft-link`

Payload :

```ts
{
  isEnabled: boolean;

  teamId?: string;
  channelId?: string;
  plannerPlanId?: string;
  filesDriveId?: string;

  syncTasksEnabled?: boolean;
  syncDocumentsEnabled?: boolean;
}
```

---

## Synchronisation

* **Implémentation API réelle** (à utiliser côté frontend) :  
  `POST /api/projects/:projectId/microsoft-link/sync-tasks` et  
  `POST /api/projects/:projectId/microsoft-link/sync-documents`  
  (voir [docs/API.md](../API.md) § Module Projets — lien Microsoft).

---

# 10. Règles métier UI

## Activation

Si `isEnabled = true` :

* teamId requis
* channelId requis
* plannerPlanId requis

Sinon :

* aucune validation bloquante
* mode permissif

---

## Microsoft non connecté

Si pas de connexion Microsoft côté client :

* afficher état “Non connecté”
* désactiver toute configuration
* CTA : “Connecter Microsoft”

---

## Sync

* bouton actif uniquement si `isEnabled = true`
* bouton désactivé si sync déjà en cours (si info disponible)

---

# 11. Permissions

* lecture : `projects.read`
* modification : `projects.update`

UI :

* masquer boutons si pas de permission
* backend reste source de vérité

---

# 12. Invalidation TanStack Query

Après update :

```ts
invalidate microsoftLink
invalidate project detail
```

Après sync :

```ts
invalidate microsoftLink
invalidate tasks list (si existant)
invalidate documents (si existant)
```

---

# 13. Design system

Obligatoire :

* Card
* Button
* Switch
* Tabs
* Badge
* Alert
* Toast

Aucune UI custom brute.

---

# 14. États UI

## Loading

* skeleton cards

## Empty

* “Aucune configuration Microsoft”

## Error

* message clair + retry

---

# 15. Critères d’acceptation

* un utilisateur peut accéder à “Options projet”
* il peut configurer Teams / Planner / Documents
* il peut activer/désactiver les synchronisations
* il peut lancer une synchronisation
* l’état de la liaison est visible
* le tout respecte multi-tenant + query keys + design system

---

# 16. Ordre d’implémentation

1. query keys + types
2. API frontend
3. hook microsoft link
4. layout + tabs
5. cartes Microsoft
6. toggles sync
7. actions sync
8. gestion états
9. permissions
10. tests

---

# 17. Évolutions futures

* sélection dynamique Teams/Planner via Graph
* création automatique Team/Plan
* sync bidirectionnelle contrôlée
* audit détaillé
* logs de sync détaillés
* gestion des conflits

---

# Implémentation (référence code)

* **Route App Router** : `apps/web/src/app/(protected)/projects/[projectId]/options/page.tsx`
* **Feature** : `apps/web/src/features/projects/options/` (query keys `projectOptionsKeys`, API wrappers, hooks TanStack, onglets Général / Microsoft 365 / Synchronisation)
* **Navigation projet** : `apps/web/src/features/projects/components/project-workspace-tabs.tsx` (onglet **Options** → `projectProjectOptions(projectId)` dans `apps/web/src/features/projects/constants/project-routes.ts`)
* **Données** : `PATCH /api/projects/:id` (onglet Général) ; `GET|PUT /api/projects/:projectId/microsoft-link` (404 → état vide côté UI) ; `POST .../microsoft-link/sync-tasks|sync-documents` ; `GET /api/microsoft/connection` et `GET /api/microsoft/auth/url` (réponse JSON `authorizationUrl` puis redirection navigateur — pas d’URL d’endpoint en dur comme lien)
* **Permissions UI** : `projects.read` / `projects.update` via `usePermissions()` (aligné API)
* **Tests** : `apps/web/src/features/projects/options/lib/project-options-query-keys.spec.ts`
* **Écarts mineurs vs texte RFC** : onglet Sync — bascules `syncTasksEnabled` / `syncDocumentsEnabled` via cases à cocher accessibles (`role="switch"`), pas le composant shadcn `Switch` ; horodatage « dernière sync » = champ serveur `lastSyncAt` sur `ProjectMicrosoftLink` (pas de `lastTaskSyncAt` / `lastDocumentSyncAt` séparés en base au MVP)

---

# Conclusion

Cette RFC pose une brique clé :

👉 **le centre de configuration des intégrations projet**

C’est structurant pour tout le reste :

* sync tâches
* sync documents
* future IA
* cockpit DG
