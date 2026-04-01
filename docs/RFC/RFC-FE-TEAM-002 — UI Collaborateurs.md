# RFC-FE-TEAM-002 — UI Collaborateurs

## Statut

Implémentée (MVP FE)

## Priorité

Haute

## Dépendances

- RFC-TEAM-001 — Synchronisation des collaborateurs depuis AD DS
- RFC-TEAM-002 — Référentiel Collaborateurs métier
- RFC-FE-TEAM-001 — Frontend Foundation — Equipes
- `docs/ARCHITECTURE.md` — API-first, isolation multi-client, conventions frontend
- `docs/FRONTEND_UI-UX.md` — règles UX/UI de base
- `.cursorrules` + règle projet : afficher une valeur métier lisible, jamais un ID brut

---

# 1. Analyse de l'existant

Le backend collaborateur existe en base produit (socle sync + référentiel métier en cours), mais la couche UI dédiée aux collaborateurs n'est pas encore industrialisée dans le module Equipes.

Constats:

- pas d'écran standardisé unique pour liste + détail + édition collaborateur;
- pas de pattern FE unifié pour l'état de synchronisation annuaire (synced/manual/erreur sync);
- relation manager exposée côté données mais UX incomplète pour sélection/affichage robuste;
- filtres métier attendus (statut, source, manager, tags, recherche) non consolidés dans une UI cohérente;
- risque UX récurrent si l'UI affiche des IDs (UUID manager, status interne) au lieu de labels métiers.

Objectif de cette RFC: livrer une UI Collaborateurs exploitable en production, alignée multi-client, API-first, et prête pour les étapes Staffing/Compétences.

---

# 2. Hypothèses éventuelles

- Les endpoints backend `GET /api/collaborators`, `GET /api/collaborators/:id`, `PATCH /api/collaborators/:id` sont disponibles ou finalisables dans le même sprint.
- Le payload API inclut les champs d'affichage nécessaires: `displayName`, `email`, `jobTitle`, `managerDisplayName`, `status`, `source`.
- Le frontend opère strictement dans le client actif (`X-Client-Id`) et ne mélange jamais les données de plusieurs clients.
- La relation manager reste intra-client et doit être sélectionnable via options lisibles (nom/email), jamais via UUID brut.
- Les badges UI (`status`, `source`) mappent des valeurs canoniques backend vers libellés/couleurs frontend.
- Le MVP n'introduit pas de dépendance frontend à `lockedFields`.

---

# 3. Liste des fichiers à créer / modifier

## Frontend (Next.js)

- `apps/web/src/app/(protected)/teams/collaborators/page.tsx`
- `apps/web/src/app/(protected)/teams/collaborators/[collaboratorId]/page.tsx`
- `apps/web/src/features/teams/collaborators/api/collaborators.api.ts`
- `apps/web/src/features/teams/collaborators/hooks/use-collaborators-list.ts`
- `apps/web/src/features/teams/collaborators/hooks/use-collaborator-detail.ts`
- `apps/web/src/features/teams/collaborators/hooks/use-update-collaborator.ts`
- `apps/web/src/features/teams/collaborators/hooks/use-collaborator-manager-options.ts`
- `apps/web/src/features/teams/collaborators/components/collaborators-list-table.tsx`
- `apps/web/src/features/teams/collaborators/components/collaborator-filters-bar.tsx`
- `apps/web/src/features/teams/collaborators/components/collaborator-status-badge.tsx`
- `apps/web/src/features/teams/collaborators/components/collaborator-source-badge.tsx`
- `apps/web/src/features/teams/collaborators/components/collaborator-detail-header.tsx`
- `apps/web/src/features/teams/collaborators/components/collaborator-edit-form.tsx`
- `apps/web/src/features/teams/collaborators/lib/collaborator-query-keys.ts`
- `apps/web/src/features/teams/collaborators/lib/collaborator-label-mappers.ts`
- `apps/web/src/features/teams/collaborators/schemas/collaborator-edit.schema.ts`
- `apps/web/src/features/teams/collaborators/types/collaborator.types.ts`

## Documentation

- `docs/RFC/RFC-FE-TEAM-002 — UI Collaborateurs.md` (ce document)
- `docs/RFC/_Plan de déploiement - Equipe.md` (état + lien)

---

# 4. Implémentation complète

## 4.1 Périmètre fonctionnel UI

La RFC couvre:

- vue liste collaborateurs avec pagination serveur;
- vue détail collaborateur;
- édition partielle du collaborateur (champs autorisés);
- badges métier: statut, source;
- filtres avancés et recherche;
- gestion explicite de la relation manager;
- provenance visible via `source` dans liste et détail.

## 4.2 Routes frontend

- `GET /teams/collaborators` -> liste + filtres + actions
- `GET /teams/collaborators/[collaboratorId]` -> détail + édition

Option v2 (hors MVP): drawer détail inline depuis la liste.

## 4.3 Contrats API consommés

- `GET /api/collaborators?search=&status[]=&source[]=&managerId=&tag[]=&limit=&offset=`
- `GET /api/collaborators/:id`
- `PATCH /api/collaborators/:id`
- `GET /api/collaborators/options/managers`

Format liste attendu:

```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

## 4.4 Règle UX obligatoire: valeur métier, jamais ID

Application stricte sur:

- options manager (`label = displayName + email`, `value = id` interne);
- colonnes tableau (`managerDisplayName`, pas `managerId`);
- badges (`Actif`, `Inactif`, `Sync désactivée`, `Manuel`, `Annuaire`), pas de code brut;
- placeholders/select/filter chips (toujours des labels lisibles).

Exemples:

- OK: `Manager: Nadia Martin`
- KO: `Manager: 550e8400-e29b-41d4-a716-446655440000`

## 4.5 Vue liste

Colonnes minimales:

- Collaborateur (displayName + email secondaire)
- Fonction (`jobTitle`)
- Manager (label lisible)
- Statut (badge)
- Source (badge)
- Actions (voir/editer)

Etats UI:

- `loading`: skeleton table
- `empty`: message + reset filtres
- `error`: bloc erreur + retry

## 4.6 Filtres

Filtres MVP:

- recherche texte (nom/email/code RH)
- statut (multi-select)
- source (multi-select)
- manager (combobox)
- tags (multi-select)

Contraintes:

- debounce recherche (300ms recommande);
- synchronisation URL (`searchParams`) pour partage d'etat;
- bouton reset clair;
- badges/chips filtres lisibles (pas d'IDs).

## 4.7 Vue detail + edition

Bloc detail:

- identite
- fonction
- manager
- statut/source
- tags
- notes internes

Edition:

- formulaire RHF + Zod;
- le formulaire n'expose que les champs explicitement éditables par le backend;
- sauvegarde `PATCH` avec toast succes/erreur;
- invalidation queries liste + detail.

## 4.8 Relation manager

Regles UI:

- source options via endpoint managers;
- affichage option: `displayName` + `email`/`jobTitle` secondaire;
- prevention basique self-manager en frontend;
- backend reste arbitre final (meme client, droits, coherence).

## 4.9 Provenance annuaire (MVP)

Le MVP s'appuie sur le badge `source` déjà contractuel côté API:

- `MANUAL` -> badge "Manuel"
- `DIRECTORY_SYNC` -> badge "Annuaire"

Le champ `syncState` est hors scope de cette livraison FE.

## 4.10 Query keys / cache

Pattern tenant-aware obligatoire:

- `["teams", clientId, "collaborators", "list", paramsHash]`
- `["teams", clientId, "collaborators", "detail", collaboratorId]`
- `["teams", clientId, "collaborators", "manager-options", query]`

Jamais de query key sans `clientId`.

## 4.11 Accessibilite

- table navigable clavier;
- combobox manager ARIA compliant;
- focus visible;
- badges avec texte explicite (pas couleur seule).

---

# 5. Modifications Prisma si nécessaire

Aucune modification Prisma pour cette RFC frontend.

Prerequis: schema/backend exposent deja les champs necessaires au rendu lisible (`displayName`, `managerDisplayName`, `status`, `source`, etc.).

Si un champ manque dans l'API, ajuster DTO/reponse backend (pas la base) avant d'introduire des contournements frontend.

---

# 6. Tests

## 6.1 Unit tests frontend

- mapping badge status/source -> libelle/couleur;
- serialisation/deserialisation filtres URL;
- conversion options manager (`id` interne, `label` visible).

## 6.2 Integration/UI tests

- liste chargee avec colonnes attendues;
- filtres combinables et reset;
- navigation liste -> detail;
- edition valide + gestion erreur backend;
- relation manager mise a jour avec label visible.

## 6.3 Cas critiques

- aucun ID brut visible dans UI (table, select, badges, chips, placeholder);
- changement client actif invalide le cache et recharge les donnees;
- collaborateur synchronise: edition uniquement sur les champs explicitement autorises backend;
- aucun affichage d'ID brut en fallback sur manager/status/source.

---

# 7. Recapitulatif final

`RFC-FE-TEAM-002` formalise le premier ecran metier du module Equipes: une UI Collaborateurs complete (liste, detail, edition), orientee pilotage manager, avec filtres utiles et signalisation de provenance via `source`.

La decision centrale est d'imposer un rendu lisible partout (valeur metier) et d'interdire l'affichage d'IDs techniques en UI, tout en conservant les IDs pour les mutations.

Cette RFC prepare directement les lots FE suivants: competences, affectations et cockpit manager.

---

# 8. Points de vigilance

- ne pas laisser de fallback UI affichant `managerId` ou des enums bruts;
- eviter les regressions multi-client (query keys sans `clientId`, cache partage);
- garder l'edition frontend strictement alignee aux champs autorises backend;
- ne pas supposer un `syncState` frontend tant que le contrat API ne l'expose pas;
- verifier que les options managers retournent toujours des labels exploitables.
