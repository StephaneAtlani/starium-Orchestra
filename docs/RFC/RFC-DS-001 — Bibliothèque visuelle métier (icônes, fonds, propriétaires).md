# RFC-DS-001 — Bibliothèque visuelle métier (icônes, fonds, propriétaires)

## Statut

📝 Draft

## Titre

**Bibliothèque visuelle transverse pour budgets, projets et entités pilotées**

## Objectif

Mettre en place une **bibliothèque visuelle unifiée** permettant d’associer à une entité métier
(budget, projet, catégorie de portefeuille, direction propriétaire, créateur ou futur objet
configurable) :

- une **icône** issue d’un catalogue contrôlé ;
- un **fond / accent visuel** basé sur les tokens du Design System ;
- une **stratégie de fallback stable** quand aucune configuration explicite n’existe ;
- une **surface d’administration** réutilisable pour éviter les heuristiques dispersées.

Le besoin vise en priorité :

- les **budgets** (`/budgets`, fiches budget, cartes, tableaux, sélecteurs) ;
- les **projets** (`/projects`, cartes mobile, vues portefeuille, fiche, options) ;
- les cas où le **propriétaire**, la **direction propriétaire** ou le **créateur** doivent porter une
  identité visuelle lisible et cohérente.

---

# 1. Analyse de l’existant

## 1.1 Projets : un socle déjà présent mais spécifique

Le module Projets dispose déjà d’une logique partielle de visualisation :

- `apps/web/src/features/projects/lib/project-portfolio-category-icons.ts`
- `ProjectPortfolioCategory.icon`
- `ProjectPortfolioCategory.color`

Ce socle fournit :

- un **catalogue d’icônes Lucide autorisées** ;
- une **résolution par config admin** (`icon`, `color`) ;
- un **fallback heuristique** sur le nom de catégorie ;
- une **pastille colorée** générée côté frontend.

Limites actuelles :

- le catalogue n’est **pas transverse** ;
- la logique reste **centrée sur les catégories projets** ;
- aucune notion de **bibliothèque visuelle partagée** par type d’objet ;
- pas de séparation claire entre :
  - le **catalogue** (valeurs autorisées),
  - les **règles d’affectation**,
  - la **surface d’édition admin**,
  - le **fallback standardisé**.

## 1.2 Budgets : démarrage heuristique, pas de modèle durable

Le portefeuille budgets a commencé à introduire des helpers visuels :

- `apps/web/src/features/budgets/lib/budget-portfolio-display.ts`
- enrichissement de `BudgetListItemWithKpi` avec :
  - `ownerOrgUnitSummary`
  - `expenseMix`

Ces helpers dérivent aujourd’hui :

- une icône selon le nom / code / description ;
- une teinte de fond selon la nature ou des mots-clés ;
- un sous-titre métier basé sur `ownerOrgUnitSummary` / `description` / `code`.

Limites :

- pas de **source de vérité backend** ;
- logique **locale à budgets** ;
- pas de paramétrage admin ;
- pas de garantie de cohérence entre budget, projet, fournisseur, contrat, etc.

## 1.3 Owner / creator : données existantes, expression visuelle absente

Le modèle contient déjà plusieurs notions exploitables :

- `ownerOrgUnitId` / `ownerOrgUnitSummary` sur plusieurs modules ;
- `ownerUserId` sur `Budget`, `Project`, `Contract`, etc. ;
- `createdAt` / audit logs / auteur d’action ;
- des référentiels configurables comme `ProjectPortfolioCategory`.

En revanche, il n’existe pas encore de mécanisme officiel pour dire :

- « cette **direction propriétaire** utilise cette icône + ce fond » ;
- « ce **créateur** ou ce **type de propriétaire** doit s’afficher avec tel style » ;
- « cette **entité métier** hérite d’un visuel depuis une règle stable côté API ».

## 1.4 Design System : tokens et patterns déjà disponibles

Le DS fournit déjà les briques visuelles nécessaires :

- tokens couleur / fonds / bordures dans `tokens.css` ;
- classes `.starium-*` dans `globals.css` ;
- patterns de pastilles / cartes / badges ;
- usage standard de `lucide-react`.

Ce qu’il manque, ce n’est pas la couche visuelle brute, mais la **gouvernance de l’affectation**.

## 1.5 Constat produit

Aujourd’hui, plusieurs objets ont besoin d’une identité visuelle, mais chacun tend à reconstruire :

- sa liste d’icônes ;
- ses couleurs ;
- ses règles de fallback ;
- sa logique de mapping.

Sans RFC transverse, on risque :

- des **catalogues divergents** entre budgets et projets ;
- des couleurs qui ne suivent plus les tokens ;
- des heuristiques contradictoires ;
- une future UI admin difficile à factoriser.

---

# 2. Hypothèses éventuelles

| # | Hypothèse | Impact si fausse |
|---|-----------|------------------|
| H1 | Le besoin principal n’est **pas** de laisser un utilisateur uploader librement des SVG/images en V1 | Si faux, prévoir stockage document, sanitation, preview, et gouvernance sécurité |
| H2 | En V1, le catalogue d’icônes reste **fermé** (clés Lucide autorisées) | Si faux, il faut une politique de compatibilité, preview et migration d’icônes |
| H3 | Les couleurs/fonds visibles en UI doivent rester **dérivés des tokens DS**, pas de hex libres partout | Si faux, risque de dérive Design System et d’accessibilité |
| H4 | La visualisation du **propriétaire** passe d’abord par la **direction propriétaire** (`ownerOrgUnit`) plutôt que par l’utilisateur créateur | Si faux, il faut introduire une priorité creator > ownerOrgUnit ou un choix configurable |
| H5 | Les modules futurs (contrats, fournisseurs, objectifs, ressources) réutiliseront le même moteur | Si faux, la solution peut rester limitée à budgets/projets, mais avec moins de ROI transverse |

---

# 3. Liste des fichiers à créer / modifier

## Documentation

- `docs/RFC/RFC-DS-001 — Bibliothèque visuelle métier (icônes, fonds, propriétaires).md`
- `docs/RFC/_RFC Liste.md`
- potentiellement `docs/ARCHITECTURE.md`
- potentiellement `docs/FRONTEND_UI-UX.md`
- potentiellement `docs/INVENTAIRE-COMPOSANTS.md`

## Backend

- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/...` nouveau module ou sous-module `visual-library`
- DTOs `create-*`, `update-*`, `list-*`
- service / controller / module NestJS dédiés
- mappers de réponses pour budgets / projets

## Frontend

- `apps/web/src/features/admin-studio/` ou `apps/web/src/features/settings/` pour l’UI d’admin
- `apps/web/src/lib/` ou `apps/web/src/features/*/lib/` pour un resolver partagé
- composants de pastille / avatar visuel / preview
- intégration dans :
  - `apps/web/src/features/projects/lib/project-portfolio-category-icons.ts`
  - `apps/web/src/features/budgets/lib/budget-portfolio-display.ts`
  - listes / cartes budgets et projets

---

# 4. Implémentation complète

## 4.1 Principes de conception

La RFC introduit quatre couches bien séparées :

1. **Catalogue visuel** : la liste des icônes et accents autorisés.
2. **Règles d’affectation** : comment un visuel s’applique à une entité.
3. **Résolution backend** : l’API renvoie déjà le visuel résolu ou les clés nécessaires.
4. **Rendu frontend** : l’UI affiche la pastille/fond via un composant partagé.

Le frontend ne doit plus décider seul « quelle icône pour quel objet » en dehors des fallbacks
documentés.

## 4.2 Modèle cible

### Option retenue

Créer un **référentiel visuel partagé** client-scopé avec deux notions :

#### A. `VisualPreset`

Un preset représente un visuel réutilisable :

- `key` métier unique par client
- `label`
- `iconKey`
- `accentToken`
- `surfaceToken`
- `textToken` éventuel
- `isSystem`
- `isActive`
- `sortOrder`

Exemples :

- `budget-it`
- `budget-finance`
- `owner-dsi`
- `project-cyber`
- `project-data`

#### B. `VisualAssignmentRule`

Une règle dit : pour tel type de cible, dans telle condition, utiliser tel preset.

Types de cible V1 :

- `PROJECT_PORTFOLIO_CATEGORY`
- `PROJECT`
- `BUDGET`
- `ORG_UNIT`
- `USER`

Portées de règle V1 :

- affectation **directe** par `resourceId`
- affectation **par ownerOrgUnitId**
- affectation **par catégorie projet**
- affectation **par type / attribut métier**

### Pourquoi cette option

Elle permet :

- de mutualiser budgets et projets ;
- d’éviter d’ajouter `icon`, `color`, `background` dans chaque table métier ;
- de préparer les futurs modules ;
- de garder une gouvernance admin claire.

## 4.3 Contrat de résolution

Le moteur de résolution doit suivre un ordre explicite.

### Projets

1. règle explicite sur le projet
2. règle sur sa catégorie portefeuille
3. règle sur `ownerOrgUnit`
4. fallback existant par catégorie / kind
5. preset système neutre

### Budgets

1. règle explicite sur le budget
2. règle sur `ownerOrgUnit`
3. règle dérivée du `expenseMix`
4. fallback heuristique nom / code
5. preset système neutre

### Affichage du créateur

Le créateur ne doit **pas** devenir le critère principal par défaut pour l’objet lui-même.

Décision produit proposée :

- le **visuel principal de la carte/ligne** représente d’abord le **domaine métier / owner** ;
- le **créateur** peut apparaître dans un chip, un avatar secondaire ou un tooltip ;
- si l’utilisateur veut un mode « créateur », il doit être un **cas d’usage explicite** (ex. vues
  d’audit, listes admin, bibliothèque de modèles créés par un utilisateur).

Autrement dit : **owner visuel > creator visuel** pour les vues portefeuille.

## 4.4 Catalogue d’icônes

V1 : **catalogue fermé** de clés Lucide autorisées.

Exemples :

- `briefcase`
- `folder`
- `server`
- `shield`
- `database`
- `monitor`
- `wallet`
- `users`
- `building`
- `megaphone`
- `network`
- `activity`

Le backend stocke **la clé**, jamais le composant React.

Le frontend mappe la clé vers `lucide-react` dans un registre partagé, par exemple :

- `apps/web/src/lib/visual-library/visual-icon-registry.ts`

## 4.5 Fonds / accents

V1 : pas de couleurs libres non contrôlées.

Le preset référence des **tokens autorisés** :

- `brand-gold`
- `state-info`
- `state-success`
- `state-warning`
- `state-danger`
- `neutral`
- variantes supplémentaires validées DS

Le rendu UI dérive ensuite :

- fond pastille
- couleur icône
- éventuellement accent latéral
- éventuellement fond léger de badge ou chip

Cela garantit :

- cohérence visuelle ;
- contrastes maîtrisés ;
- mode sombre supportable ;
- pas de dérive hex côté feature.

## 4.6 API

### Nouveaux endpoints proposés

```http
GET    /api/visual-presets
POST   /api/visual-presets
PATCH  /api/visual-presets/:id
GET    /api/visual-assignment-rules
POST   /api/visual-assignment-rules
PATCH  /api/visual-assignment-rules/:id
POST   /api/visual-assignment-rules/recompute-preview
```

Optionnel V1.1 :

```http
GET /api/visual-library/catalog
```

pour exposer :

- les `iconKey` autorisés ;
- les tokens autorisés ;
- les presets système verrouillés.

### Endpoints enrichis

Les réponses métier importantes peuvent embarquer un bloc standard :

```ts
visual?: {
  presetKey: string | null;
  iconKey: string | null;
  accentToken: string | null;
  surfaceToken: string | null;
  source: 'direct' | 'category' | 'ownerOrgUnit' | 'fallback' | null;
}
```

Priorité V1 :

- `GET /api/projects`
- `GET /api/projects/:id`
- `GET /api/budget-reporting/exercises/:id/budgets`
- `GET /api/budgets/:id` si utile sur fiche

## 4.7 Administration

Une UI d’administration est nécessaire pour :

- lister les presets ;
- créer / modifier un preset ;
- voir un aperçu pastille / carte / ligne ;
- créer des règles d’affectation ;
- tester la résolution sur un budget / projet / owner réel.

L’écran doit proposer :

- un **preview live** ;
- des libellés métier uniquement ;
- des filtres par type de cible ;
- des validations empêchant les combinaisons invalides.

## 4.8 Frontend partagé

Créer un mini-kit transverse, par exemple :

- `apps/web/src/lib/visual-library/visual-icon-registry.ts`
- `apps/web/src/lib/visual-library/visual-token-registry.ts`
- `apps/web/src/lib/visual-library/visual-presentation.ts`
- `apps/web/src/components/ui/visual-badge.tsx`
- `apps/web/src/components/ui/visual-avatar.tsx`
- `apps/web/src/components/ui/visual-entity-marker.tsx`

But :

- **une seule façon** d’afficher icône + fond + accent ;
- plus de duplication budgets/projets ;
- migration progressive des heuristiques existantes.

## 4.9 Plan de migration

### Phase 1 — Socle

- introduire le catalogue d’icônes et tokens
- créer `VisualPreset`
- créer un composant frontend commun
- brancher Projets sans casser le système existant

### Phase 2 — Budgets

- remplacer les heuristiques budgets par la résolution standard
- brancher `ownerOrgUnit`
- garder un fallback heuristique documenté

### Phase 3 — Admin

- écran d’administration des presets
- écran d’affectation / preview

### Phase 4 — Extension transverse

- contrats
- fournisseurs
- objectifs stratégiques
- ressources / équipes si besoin

---

# 5. Modifications Prisma si nécessaire

## 5.1 Nouvelles tables proposées

```prisma
model VisualPreset {
  id           String   @id @default(cuid())
  clientId     String
  key          String
  label        String
  iconKey      String
  accentToken  String
  surfaceToken String?
  textToken    String?
  isSystem     Boolean  @default(false)
  isActive     Boolean  @default(true)
  sortOrder    Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([clientId, key])
  @@index([clientId, isActive])
}

model VisualAssignmentRule {
  id             String   @id @default(cuid())
  clientId       String
  targetType     VisualTargetType
  targetId       String?
  ownerOrgUnitId String?
  presetId       String
  priority       Int      @default(100)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  client       Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  preset       VisualPreset @relation(fields: [presetId], references: [id], onDelete: Restrict)
  ownerOrgUnit OrgUnit?     @relation(fields: [ownerOrgUnitId], references: [id], onDelete: Restrict)

  @@index([clientId, targetType, isActive])
  @@index([clientId, ownerOrgUnitId])
}
```

## 5.2 Enum proposée

```prisma
enum VisualTargetType {
  PROJECT
  PROJECT_PORTFOLIO_CATEGORY
  BUDGET
  ORG_UNIT
  USER
}
```

## 5.3 Pourquoi ne pas enrichir chaque table métier directement

Ajouter `iconKey`, `accentToken`, `surfaceToken` dans `Budget`, `Project`, `OrgUnit`, etc. :

- duplique la logique ;
- complique la maintenance ;
- fragilise la cohérence transverse ;
- rend l’admin multi-entités plus complexe.

Cette option ne doit être retenue qu’en **optimisation locale**, pas en modèle cible principal.

---

# 6. Tests

## Backend

- service de résolution visuelle :
  - priorité direct > catégorie > ownerOrgUnit > fallback
  - scoping client strict
  - refus si preset d’un autre client
  - refus si rule pointe un ownerOrgUnit d’un autre client
- tests controller :
  - authz lecture / écriture
  - validation DTO
- tests d’intégration :
  - projet A / budget A ne récupère jamais un preset client B

## Frontend

- tests unitaires :
  - mapping `iconKey` → composant
  - mapping token → classes/présentation
  - fallback neutre si visuel absent
- tests feature :
  - budgets affichent le visuel résolu
  - projets gardent un rendu cohérent avec l’ancien fallback
  - jamais d’ID visible en admin ni dans les selects

## Tests critiques

- isolation inter-clients des presets et des règles
- absence de couleurs non autorisées
- rendu accessible des icônes décoratives / porteuses de sens
- fallback stable quand owner/category change ou disparaît

---

# 7. Récapitulatif final

Cette RFC propose d’unifier la logique d’icônes et de fonds autour d’une **bibliothèque visuelle
métier transverse**, plutôt que de continuer à multiplier des heuristiques locales dans budgets et
projets.

Décisions clés :

- **catalogue fermé** d’icônes V1 ;
- **tokens DS uniquement** pour les accents/fonds ;
- **moteur de résolution backend** avec priorités explicites ;
- **ownerOrgUnit** prioritaire sur le **creator** pour les vues portefeuille ;
- **composants frontend partagés** pour le rendu ;
- **UI admin dédiée** pour gouverner les presets et les règles.

---

# 8. Points de vigilance

- risque de surconception si on ouvre trop vite le périmètre à toutes les entités ;
- bien distinguer **visuel principal métier** et **avatar du créateur** ;
- éviter les couleurs libres côté admin sans garde-fous DS ;
- attention à la migration des écrans déjà branchés sur des heuristiques ;
- ne pas faire porter à l’UI seule la résolution des règles ;
- prévoir un comportement robuste quand une règle cible une entité archivée ou supprimée.

---

# 9. Conformité by design

## RGPD

- DCP concernées : potentiellement `ownerUserId`, `createdBy`, nom affiché du créateur/propriétaire.
- Finalité : améliorer la lisibilité métier et le repérage visuel dans les vues portefeuille.
- Minimisation : ne pas exposer plus que nécessaire ; pour les portefeuilles, privilégier
  `ownerOrgUnitSummary` au lieu de données personnelles détaillées.
- Export : les presets/règles sont exportables comme configuration client ; pas besoin d’exposer des
  DCP additionnelles.
- Logs : ne pas journaliser de payload complet contenant des infos utilisateur non nécessaires.
- Scope client : presets et règles strictement client-scopés.

## RGAA

- les icônes décoratives doivent être `aria-hidden` ;
- quand l’icône porte une information utile, elle doit être redondée par un libellé texte ;
- contrastes AA garantis via tokens DS ;
- les previews admin doivent rester navigables clavier ;
- les états dynamiques du preview peuvent utiliser `aria-live="polite"` si recalcul instantané.

## Design System

- `lucide-react` uniquement en V1 ;
- tokens uniquement pour accent/fond/texte ;
- pas de hex arbitraire dans les features ;
- composants réutilisables (`visual-badge`, `visual-avatar`, `visual-entity-marker`) ;
- libellés métier partout, jamais d’ID brut dans l’admin des règles.

## Sécurité

- authz lecture/écriture sur la bibliothèque visuelle ;
- validation DTO stricte (`iconKey`, tokens, targetType`) ;
- isolation client sur toutes les lectures et écritures ;
- pas de SVG/html libre en V1 ;
- audit des changements de presets/règles recommandé (`visual_preset.*`, `visual_rule.*`).

## Interface mobile

- previews et selectors utilisables dès 320px ;
- pastilles et chips avec cibles tactiles ≥ 44px ;
- tableaux d’admin avec stratégie mobile (cartes ou colonnes prioritaires) ;
- rendu visuel compact et lisible dans cartes mobile budgets/projets.
