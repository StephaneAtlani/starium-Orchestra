# RFC-014-1 — UX/UI et Design System de l’application

## Statut

Draft

## Complète

* RFC-014 — Admin Studio

## Objectif

Définir les **standards UX/UI globaux de Starium Orchestra** afin de garantir :

* une interface **SaaS professionnelle et cohérente**
* une **architecture UI réutilisable**
* une expérience utilisateur **claire et prévisible**

Cette RFC couvre :

* le **design system**
* le **layout de l’application**
* les **patterns UX**
* les **composants UI**
* les **règles de structure des pages**

Cette RFC s’applique à **toutes les zones du produit** :

* cockpit principal
* Admin Studio
* modules métier
* pages utilisateurs

Elle **ne modifie aucune logique backend**.

---

# 1. Principes UX

L’application est un **cockpit SaaS B2B** destiné aux fonctions de direction et aux équipes IT.

L’expérience utilisateur repose sur quatre principes fondamentaux.

## Clarté

L’information doit être immédiatement compréhensible.

Règles :

* titres explicites
* hiérarchie visuelle claire
* tables lisibles
* filtres simples

---

## Rapidité

Les actions principales doivent être accessibles rapidement.

Règles :

* actions visibles
* création rapide
* navigation claire
* peu de clics nécessaires

---

## Cohérence

Toutes les pages doivent suivre **les mêmes patterns UX**.

Un utilisateur doit reconnaître immédiatement la structure d’une page.

---

## Prévisibilité

Les interactions doivent être standardisées.

Exemples :

* création → dialog
* listes → tables
* actions principales → bouton primaire

---

# 2. Stack UI

Le frontend utilise obligatoirement :

* **TailwindCSS**
* **shadcn/ui**

Les composants UI doivent être construits **à partir des composants shadcn**.

Les éléments HTML bruts ne doivent pas être utilisés pour structurer l’interface principale.

---

# 3. Composants UI standards

Les composants suivants constituent la base du design system :

* Button
* Card
* Dialog
* Input
* Label
* Table
* Badge
* Select
* DropdownMenu
* Skeleton
* Alert
* Tooltip
* Tabs

Ces composants doivent être réutilisés dans toute l’application.

---

# 4. Palette visuelle

## Couleurs principales

| Couleur    | Code    |
| ---------- | ------- |
| Or Starium | #DB9801 |
| Noir       | #1B1B1B |
| Blanc      | #FFFFFF |

---

## Couleurs d’interface

| Élément          | Couleur     |
| ---------------- | ----------- |
| Fond application | #F8F6F1     |
| Cartes           | #FFFFFF     |
| Bordures         | #E8E1D1     |
| Texte principal  | #1B1B1B     |
| Texte secondaire | gris neutre |

---

## Couleur primaire

La couleur primaire de l’application est :

**Or Starium**

Elle est utilisée pour :

* boutons principaux
* éléments actifs
* indicateurs visuels

## Tokens additionnels

* `--radius` : rayon des bords (ex. 0.75rem)
* `--shadow-card` : ombre des cartes
* `--color-hover` : fond au survol / item actif (ex. rgba or)

(Voir FRONTEND_ARCHITECTURE.md §21 pour les valeurs.)

---

# 5. Layout global (Board / App Shell)

L'application utilise un **layout cockpit unique** (un seul board pour toute l'app). Il ne doit jamais exister plusieurs layouts principaux.

**Structure visuelle** (conforme FRONTEND_ARCHITECTURE.md) :

* **Menu à gauche** : Sidebar persistante (logo, navigation par sections, profil). Largeur `w-72`, fond noir, texte blanc.
* **Header en haut** : WorkspaceHeader (titre de page, breadcrumb, client actif, recherche, profil). Fond blanc, bordure basse, sticky.
* **Contenu au centre** : zone principale (`main`) où les pages rendent leur contenu (via `PageContainer`). Aucun second menu ni layout alternatif.

Structure logique :

```
AppShell
 ├ Sidebar
 ├ WorkspaceArea
 │   ├ WorkspaceHeader
 │   └ main (children = PageContainer → PageHeader | TableToolbar | Card → DataTable | contenu)
```

---

# 6. Sidebar

La sidebar est **persistante**.

Largeur recommandée :

```
w-72
```

Style :

* fond noir
* texte blanc
* bordure légère

Contenu :

* logo
* navigation modules
* navigation plateforme
* profil utilisateur

---

## Item actif

Un item actif doit être identifiable visuellement :

* accent couleur or
* fond léger
* texte plus marqué

---

# 7. Header (workspace header)

Le header est la barre supérieure du cockpit.

Contenu possible :

* titre page
* breadcrumb
* actions rapides
* profil utilisateur
* recherche

Style :

* fond blanc
* bordure basse légère
* sticky en haut

---

# 8. Structure standard d’une page

Toutes les pages doivent suivre le même pattern UX.

Structure :

```
PageHeader
Actions
Card principale
Contenu (table, dashboard, formulaire)
Pagination
Dialogs
```

Ce pattern garantit la cohérence de l’application.

---

# 9. PageHeader

Chaque page commence par un **PageHeader**.

Contenu :

* titre
* description courte
* actions principales

Exemple :

Titre

```
Clients
```

Description

```
Gérez les organisations de la plateforme.
```

Actions

```
Créer un client
```

---

# 10. Cards

Les informations principales doivent être contenues dans des **Card**.

Objectifs :

* structurer l’information
* améliorer la lisibilité
* créer une hiérarchie visuelle

Une page peut contenir plusieurs cards.

---

# 11. Tables

Les tables sont un élément central de l’application.

Règles :

* toujours placées dans une Card
* lignes aérées
* hover léger
* alignement propre

Les dates doivent être lisibles.

---

# 12. Formulaires

Les formulaires utilisent les composants suivants :

* Input
* Label
* Select
* Button

Règles :

* champs obligatoires identifiés
* erreurs visibles
* labels explicites

---

# 13. Dialogs

Les actions de création ou modification doivent utiliser **Dialog**.

Exemples :

* création client
* création utilisateur
* modification d’un objet

Cela évite de casser le contexte de la page.

---

# 14. États UI

Toutes les pages doivent gérer les états suivants.

## Loading

Utiliser **Skeleton**.

---

## Empty

Afficher un message clair.

Exemple :

```
Aucun client pour le moment
```

---

## Error

Afficher un message d’erreur explicite avec possibilité de réessayer.

---

## Success

Afficher les données.

---

# 15. Pagination

Les listes longues doivent proposer une pagination.

La pagination doit être simple et lisible.

---

# 16. Espacement

Pour maintenir une interface propre.

Padding principal :

```
p-6
```

Espacement sections :

```
space-y-6
```

Tables :

```
py-3
```

---

# 17. Typographie

Titres :

```
text-2xl font-semibold
```

Sous-titres :

```
text-sm text-muted-foreground
```

Texte standard :

```
text-sm
```

---

# 18. Composants utilitaires

Les composants suivants doivent être créés et réutilisés :

* LoadingState
* EmptyState
* ErrorState
* PageHeader

Ces composants garantissent la cohérence UX.

---

# 19. Accessibilité

Les composants doivent respecter :

* navigation clavier
* focus visible
* contraste suffisant

---

# 20. Application de la RFC

Cette RFC s’applique à :

* Admin Studio
* modules métier
* cockpit principal
* pages utilisateur

Toute nouvelle feature doit respecter ce design system.

---

# 20 bis. Design system obligatoire

Les pages doivent utiliser **exclusivement** :

* `components/ui/*` — composants shadcn
* `components/layout/*` — PageContainer, PageHeader, TableToolbar
* `components/feedback/*` — LoadingState, EmptyState, ErrorState
* `components/data-table/*` — DataTable
* `components/shell/*` — AppShell, Sidebar, WorkspaceHeader

**HTML brut interdit** pour structurer l'interface. Toute nouvelle page (et tout outil d'aide au code) doit utiliser : PageContainer, PageHeader, Card, DataTable (ou contenu métier adapté), LoadingState, EmptyState, ErrorState.

---

# 21. Non objectifs

Cette RFC ne couvre pas :

* pages marketing
* landing pages
* branding avancé

> **Note** : le **dark mode / light mode** est géré par une couche technique transversale (ThemeProvider + classe `dark` sur `<html>`), mais ne modifie pas les règles UX de structure des pages ni le design system de base (tokens, composants shadcn, patterns de layout).

---

# 22. Critères d’acceptation

L’UX/UI est conforme si :

* toutes les pages utilisent Tailwind + shadcn
* toutes les pages suivent le pattern UX défini
* aucune page n’utilise de HTML brut non stylé
* les états loading / empty / error sont implémentés
* l’interface est cohérente sur tout le cockpit

---

# Résumé

RFC-014-1 définit le **design system et les règles UX/UI globales** de Starium Orchestra.

Elle garantit :

* une interface SaaS cohérente
* un cockpit homogène
* des composants réutilisables
* une expérience utilisateur claire et professionnelle.

