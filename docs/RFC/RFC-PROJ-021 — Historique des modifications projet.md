# RFC-PROJ-021 — Historique des modifications projet

## Statut

Draft

## Priorité

Haute

## Dépendances

- RFC-PROJ-009 — Audit Logs Projet
- RFC-PROJ-012 — Project Sheet
- RFC-FE-PROJ-014 — Project Sheet UI
- docs/ARCHITECTURE.md
- docs/FRONTEND_UI-UX.md

---

# 1. Analyse de l’existant

## Backend

Le socle d’audit projet existe déjà :

- les actions métier projet sont normalisées dans `apps/api/src/modules/projects/project-audit.constants.ts`
- les services projet écrivent déjà des `AuditLog` (`project.updated`, `project.parent.*`, `project.sheet.updated`, etc.)
- l’API de lecture existe déjà via `GET /api/audit-logs`
- le contrôleur accepte déjà les filtres `resourceType`, `resourceId`, `action`, `actionPrefix`, `dateFrom`, `dateTo`, `limit`, `offset`

Conclusion :

- **aucun schéma Prisma supplémentaire n’est nécessaire**
- **aucun nouveau pipeline d’écriture n’est à inventer**
- le besoin est essentiellement un **besoin de lecture, d’agrégation légère et d’UI**

## Frontend

Le module Projets dispose déjà :

- d’une fiche projet `ProjectSheetView`
- d’un détail projet / aperçu
- d’exemples de lecture d’audit dans d’autres modules (`organization-admin-page.tsx`, admin audit)
- d’un historique spécifique pour les snapshots décisionnels de la fiche projet

Aujourd’hui il manque :

- un **historique lisible des modifications du projet**
- une vue unifiée pour répondre rapidement à :
  - qui a modifié le projet
  - quoi a changé
  - quand le changement a eu lieu

## Gap produit

Le cockpit projet est exploitable pour l’état courant, mais pas pour la **traçabilité temporelle**.

Sans cet historique :

- on voit l’état actuel, mais pas la séquence des modifications
- les changements de parent, statut, ownership, fiche projet ou champs sensibles restent peu lisibles côté UI
- la gouvernance CODIR / DSI manque d’un point d’entrée “historique des décisions et modifications”

---

# 2. Hypothèses éventuelles

- le volume d’audit par projet reste raisonnable pour un chargement paginé par défaut (`limit=20` ou `50`)
- les logs projet déjà écrits sont suffisamment riches pour une **V1** sans backfill
- l’historique V1 cible d’abord `resourceType=project`
- les sous-entités (`project_task`, `project_risk`, `project_milestone`, `project_scenario`) resteront **hors scope V1** pour éviter un feed trop bruité
- l’utilisateur autorisé à lire un projet dispose aussi de `audit_logs.read` si l’historique doit être visible

Si cette dernière hypothèse ne tient pas, il faudra prévoir un intent métier dédié du type `projects.audit.read`.

---

# 3. Liste des fichiers à créer / modifier

## Backend

### Option minimale recommandée

- **aucun fichier backend obligatoire**

### Option de confort backend (facultative mais recommandée)

- `apps/api/src/modules/projects/projects.controller.ts`
- `apps/api/src/modules/projects/projects.service.ts`
- éventuel DTO dédié de lecture historique projet

But :

- exposer un endpoint métier lisible du type `GET /api/projects/:id/history`
- encapsuler les filtres audit au lieu de les reconstruire côté frontend

## Frontend

- `apps/web/src/features/projects/api/get-project-audit-history.ts` — nouveau
- `apps/web/src/features/projects/hooks/use-project-audit-history.ts` — nouveau
- `apps/web/src/features/projects/types/project.types.ts` — enrichissement éventuel types historique
- `apps/web/src/features/projects/components/project-audit-history-section.tsx` — nouveau
- `apps/web/src/features/projects/components/project-sheet-view.tsx` — intégration

## Documentation

- `docs/RFC/RFC-PROJ-021 — Historique des modifications projet.md` — nouveau
- `docs/RFC/_RFC Liste.md` — mise à jour

---

# 4. Implémentation complète

## 4.1 Objectif produit

Ajouter dans la **fiche projet** un bloc **Historique des modifications** qui affiche, pour un projet donné :

- la date / heure
- l’action métier
- l’auteur
- un résumé lisible du changement

Exemples attendus :

- “Projet mis à jour”
- “Projet parent rattaché”
- “Projet parent modifié”
- “Projet parent détaché”
- “Fiche projet mise à jour”

## 4.2 Périmètre V1

### Inclus

- lecture des `AuditLog` de type `project`
- filtrage par `resourceId = projectId`
- affichage paginé ou limité des derniers événements
- formatage frontend des actions connues
- fallback texte si l’action est inconnue

### Exclus

- agrégation multi-ressources dans le même flux (`project_task`, `project_risk`, etc.)
- diff JSON détaillé champ par champ en V1
- recherche plein texte dans l’historique
- export CSV / PDF

## 4.3 API cible

### Variante A — sans backend supplémentaire

Le frontend appelle directement :

`GET /api/audit-logs?resourceType=project&resourceId=<projectId>&limit=20`

Avantages :

- zéro coût backend
- réutilisation immédiate

Inconvénients :

- couplage frontend au contrat générique d’audit
- logique de mapping métier partiellement dispersée côté UI

### Variante B — recommandée pour la lisibilité produit

Créer :

`GET /api/projects/:projectId/history`

Le backend traduit en interne vers la lecture d’audit déjà existante.

Réponse cible :

```ts
type ProjectHistoryItem = {
  id: string;
  action: string;
  label: string;
  createdAt: string;
  actorUserId: string | null;
  actorDisplayName: string | null;
  resourceType: string;
  resourceId: string | null;
  summary: string | null;
  oldValue?: unknown;
  newValue?: unknown;
};
```

Pour une V1, **la variante A suffit**.  
Pour une base propre long terme, **la variante B est préférable**.

## 4.4 Mapping UX des actions

Exemples de mapping frontend :

| Action | Libellé UI |
| --- | --- |
| `project.created` | Projet créé |
| `project.updated` | Projet mis à jour |
| `project.parent.assigned` | Projet parent rattaché |
| `project.parent.changed` | Projet parent modifié |
| `project.parent.detached` | Projet parent retiré |
| `project.status.updated` | Statut du projet modifié |
| `project.owner.updated` | Responsable modifié |
| `project.sheet.updated` | Fiche projet mise à jour |

Fallback :

- si l’action n’est pas mappée, afficher la chaîne brute

## 4.5 Position UI

Le meilleur emplacement V1 est :

- **dans `ProjectSheetView`**
- plutôt en bas ou dans une section dédiée, après les blocs de synthèse métier

Pourquoi :

- cohérent avec l’idée de fiche gouvernance
- faible bruit dans l’aperçu
- endroit naturel pour consulter l’historique d’un projet

## 4.6 Structure UI recommandée

Bloc `Card` dédié :

- titre : `Historique des modifications`
- description : `Derniers changements audités sur le projet`
- liste chronologique descendante

Chaque ligne :

- colonne gauche :
  - libellé action
  - résumé éventuel
- colonne droite :
  - date/heure
  - auteur

États obligatoires :

- `LoadingState`
- `EmptyState`
- `Alert` erreur

## 4.7 Résumé métier minimal à générer

Sans faire un diff JSON complet, produire des résumés ciblés sur les cas utiles :

- parent changé : ancien parent → nouveau parent
- statut changé : ancien statut → nouveau statut
- owner changé : ancien → nouveau
- fiche mise à jour : “modification de la fiche décisionnelle”

Pour les autres cas :

- “Modification enregistrée sur le projet”

## 4.8 Permissions

Deux options :

### Option 1

Le bloc n’est visible que si l’utilisateur a `audit_logs.read`.

### Option 2

Créer une permission métier dédiée plus fine.

**Recommandation V1** :

- démarrer avec `audit_logs.read`
- masquer proprement le bloc si la permission manque

---

# 5. Modifications Prisma si nécessaire

**Aucune** pour la V1.

Le modèle `AuditLog` existant suffit déjà.

---

# 6. Tests

## Backend

Si endpoint métier dédié `GET /api/projects/:id/history` :

- test lecture filtrée par `resourceType=project`
- test filtre `resourceId`
- test isolement client
- test permission refusée

## Frontend

- affiche l’état vide si aucun log
- affiche loading pendant la requête
- affiche erreur si l’API échoue
- mappe correctement les actions connues
- affiche le fallback si l’action n’est pas mappée
- n’affiche pas le bloc sans permission si on choisit cette règle

## Cas critiques

- `project.parent.assigned`
- `project.parent.changed`
- `project.parent.detached`
- `project.sheet.updated`

---

# 7. Récapitulatif final

Cette RFC propose une **V1 pragmatique** pour l’historique des modifications projet :

- pas de nouveau schéma
- réutilisation du socle `AuditLog` déjà implémenté
- affichage frontend dédié dans la fiche projet
- périmètre volontairement réduit au `resourceType=project`

Le résultat attendu est une traçabilité lisible, orientée gouvernance, sans sur-ingénierie.

---

# 8. Points de vigilance

- ne pas mélanger en V1 les audits projet et les audits des sous-entités, sinon l’UI devient bruitée
- ne pas exposer brut de décoffrage `oldValue/newValue` sans résumé lisible
- vérifier l’impact permissions : un utilisateur qui lit un projet n’a pas forcément `audit_logs.read`
- attention aux logs historiques legacy (`resourceType` RFC vs anciens alias) — le service audit gère déjà la rétrocompatibilité en lecture
- ne pas dupliquer l’historique des snapshots décisionnels : ce sont deux concepts voisins mais distincts

---

# 9. Conformité by design

## RGPD

- DCP concernées : `userId` / identité auteur si enrichie à l’affichage
- finalité : traçabilité des modifications projet et gouvernance
- minimisation : ne pas afficher de données perso inutiles dans les résumés
- rétention : suivre la politique existante des `AuditLog`
- effacement / anonymisation : si anonymisation utilisateur prévue globalement, l’historique doit rester lisible sans exposer indûment les DCP
- logs : ne jamais réafficher de secrets ou données sensibles issus de `oldValue/newValue`
- scope client : filtrage strict par `clientId` et `projectId`

## RGAA

- liste chronologique lisible au clavier
- titres de section sémantiques
- états loading / empty / error annoncés proprement
- contrastes AA sur métadonnées et badges
- pas d’information portée uniquement par la couleur

## Design System

- utiliser `Card`, `LoadingState`, `EmptyState` / `Alert`
- respecter les tokens existants (`bg-card`, `border-border`, `text-muted-foreground`)
- conserver des libellés métier lisibles, jamais d’ID brut
- éviter une timeline trop décorative ; viser une lecture cockpit sobre

## Sécurité

- lecture conditionnée par permissions
- aucune fuite inter-client
- pas de sur-exposition JSON brute si les `AuditLog` contiennent des champs non nécessaires
- si endpoint dédié, whitelist explicite des champs retournés

## Interface mobile

- lignes d’historique lisibles en une colonne
- date / auteur reflow sur petit écran
- cibles tactiles suffisantes si navigation vers détails futurs
- pas de tableau dense non responsive pour la V1
