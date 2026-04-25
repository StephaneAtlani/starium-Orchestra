# RFC-AI-001 — Cursor Starium Chatbot Core

## Statut
- Proposé (V1 cadrage)

## 1) Objectif produit

Créer un chatbot nommé **Cursor Starium** dont les réponses sont **entièrement configurées par le PLATFORM_ADMIN**, sans IA générative, sans LLM, sans RAG, et sans lecture directe des données métier.

Le chatbot V1 fonctionne comme une base de réponses administrées :
- questions fréquentes
- aides fonctionnelles
- réponses guidées
- liens vers modules/pages Starium
- réponses conditionnées par module, rôle, permission et scope client
- base de connaissance structurée en catégories et articles

Contraintes non négociables :
- Backend NestJS = source de vérité.
- Frontend Next.js = consommateur API uniquement.
- Multi-tenant strict.
- Aucun accès direct aux données métier.
- Aucune génération libre de réponse.
- Aucune écriture métier depuis le chatbot.
- Aucun ID brut affiché côté UI.

## 2) Périmètre fonctionnel V1

Le chatbot ne “réfléchit” pas : il **matche** une question utilisateur contre des entrées administrées actives.

Cas couverts :
- **Chatbot runtime** : l’utilisateur pose une question et reçoit une réponse courte préconfigurée (matching).
- **Knowledge base** : l’utilisateur explore catégories et articles (navigation slug / « Explorer ») sans poser de question.
- La réponse peut dépendre du module actif, du rôle et des permissions.
- La réponse peut être globale plateforme ou spécifique client.
- L’utilisateur retrouve son historique conversationnel minimal.

Comportement attendu :
- Si une réponse fiable existe et est autorisée, elle est retournée.
- Si aucune réponse fiable n’existe, retourner une réponse standard administrable, ou :
  - “Je n’ai pas encore de réponse configurée pour cette question.”

## 3) Architecture cible

Principes :
- Toute logique de matching, filtrage, RBAC et scope client reste côté backend NestJS.
- Le frontend n’exécute aucune logique métier de sélection de réponse.
- Le frontend affiche strictement les réponses API.

**Deux usages explicitement séparés (même domaine produit, responsabilités distinctes) :**

| Usage | Rôle | Parcours utilisateur typique |
|-------|------|------------------------------|
| **Chatbot runtime** | Matching question → **réponse courte** (`answer`), seuil `minScore`, fallback enrichi, historique. | Drawer chat, saisie libre. |
| **Knowledge base** | **Navigation** catégories → articles (slugs, contenu long), suggestions hors question. | Écran « Explorer », liens internes, recherche simple sur titres/slugs. |

Modules backend proposés :
- `chatbot-knowledge` (CRUD admin : entrées, catégories, slugs, liens typés, relations éditoriales).
- `chatbot-runtime` (message utilisateur, normalisation, matching, réponse courte + métadonnées article).
- `chatbot-knowledge-reader` (optionnel : agrégation lecture seule catégories / articles pour l’UI « Explorer » ; peut être fusionné dans `chatbot-knowledge` si préférence mono-module).
- `chatbot-conversations` (historique conversation/messages).

## 4) Modèle de données attendu

### 4.0 Structuration éditoriale (knowledge base)

La base chatbot est structurée en :
- catégories (`ChatbotCategory`) — navigation UX (homepage « Explorer », fil d’Ariane par slug).
- articles/entrées (`ChatbotKnowledgeEntry`) — FAQ matchables + articles éditoriaux navigables.
- réponses déclenchées par matching (**runtime** uniquement).

Cette structuration ne remplace pas le modèle existant : elle l’étend. Le **runtime** consomme les mêmes entrées pour le match ; la **knowledge base** les expose pour la découverte sans question.

### 4.1 Catégories

```prisma
model ChatbotCategory {
  id          String               @id @default(cuid())
  name        String
  slug        String
  description String?
  icon        String?
  isFeatured  Boolean              @default(false)
  scope       ChatbotKnowledgeScope
  clientId    String?
  isActive    Boolean              @default(true)
  archivedAt  DateTime?
  order       Int                  @default(0)
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
  entries     ChatbotKnowledgeEntry[]

  @@index([scope, isActive, order])
  @@index([clientId, isActive, order])
  @@unique([scope, clientId, slug])
}
```

Contraintes :
- `scope=CLIENT` impose `clientId != null`.
- `scope=GLOBAL` impose `clientId == null`.
- **Slug** : unique par périmètre via `@@unique([scope, clientId, slug])` (pour `GLOBAL`, `clientId` est `null` ; en base, valider qu’aucun doublon `(GLOBAL, null, slug)` — index unique partiel PostgreSQL si le SGBD l’exige pour les NULL).
- Filtrage multi-tenant obligatoire sur toutes les lectures.
- **UX** : `isFeatured` sert à mettre en avant des catégories sur la **homepage** du chatbot (écran « Explorer ») ; `slug` + `icon` pour navigation lisible sans afficher d’ID technique côté frontend (l’URL ou l’état client utilise le slug ; les réponses API peuvent inclure `slug` comme clé stable, pas comme ID interne affiché).

### 4.2 Base de réponses administrées

```prisma
model ChatbotKnowledgeEntry {
  id                 String   @id @default(cuid())
  slug               String
  title              String
  question           String
  answer             String
  keywords           String[]
  tags               String[]
  moduleCode         String?
  targetRole         String? // nullable, validé backend contre les rôles connus
  requiredPermission String?
  categoryId         String?
  type               ChatbotKnowledgeEntryType
  scope              ChatbotKnowledgeScope
  clientId           String?
  isActive           Boolean  @default(true)
  archivedAt         DateTime?
  priority           Int      @default(0)
  isFeatured         Boolean  @default(false)
  isPopular          Boolean  @default(false)
  icon               String?
  content            String?
  structuredLinks    Json?
  relatedEntryIds    String[]
  createdByUserId    String
  updatedByUserId    String
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  category           ChatbotCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  @@index([scope, isActive, priority])
  @@index([clientId, isActive, priority])
  @@index([moduleCode, requiredPermission, isActive])
  @@unique([scope, clientId, slug])
}

enum ChatbotKnowledgeScope {
  GLOBAL
  CLIENT
}

enum ChatbotKnowledgeEntryType {
  FAQ
  ARTICLE
}

enum ChatbotStructuredLinkType {
  INTERNAL_PAGE
  MODULE
}
```

Notes :
- `scope=GLOBAL` : entrée plateforme (gérée uniquement par PLATFORM_ADMIN).
- `scope=CLIENT` : entrée spécifique à un client (`clientId` obligatoire).
- `scope=CLIENT` impose `clientId != null` ; `scope=GLOBAL` impose `clientId == null` (contrainte métier backend stricte).
- **Cohérence catégorie / article** : si `categoryId` est renseigné, l’entrée et la catégorie doivent partager le même couple `(scope, clientId)` ; sinon rejet à la création/mise à jour.
- **Slug entrée** : même règle d’unicité que pour les catégories : `@@unique([scope, clientId, slug])` (mêmes précautions SGBD pour `clientId` null en `GLOBAL`).
- **`type=FAQ`** : réponse **directe** du chatbot (matching runtime sur `question` / mots-clés) ; `answer` = réponse courte affichée dans le fil de chat.
- **`type=ARTICLE`** : contenu **éditorial navigable** (knowledge base) ; `answer` peut servir d’extrait ou de résumé court dans le chat ; `content` = article long, affiché via **« Voir plus »** ou page détail « Explorer ».
- **`answer`** : toujours la **réponse courte** du runtime (chat). Pas d’URL libre dans `answer` ni dans `content` ; les actions vers l’app passent par `structuredLinks`.
- **`content`** : article long (hors chat condensé), optionnel selon le type.
- **`structuredLinks`** (optionnel) : tableau JSON typé côté contrat API / validation backend, **uniquement** des objets du forme :

```ts
// Contrat logique (validé à l’écriture admin + à la lecture runtime)
type StructuredLink = {
  label: string;
  route: string;
  type: "INTERNAL_PAGE" | "MODULE"; // aligné enum Prisma ChatbotStructuredLinkType
};
```

  - **Interdit** : toute URL externe (`http://`, `https://`, schémas tiers), toute chaîne `route` non listée dans l’allowlist backend (même principe que précédemment pour les routes internes).
- **`relatedEntryIds`** : liste d’IDs d’entrées liées (stockage interne) ; côté API lecture utilisateur, résoudre en **slugs + titres** (ou objets `{ slug, title, icon? }`) pour l’UI — **aucun ID brut affiché** ; les articles liés sont filtrés avec les mêmes règles `moduleCode` / `requiredPermission` / scope client.
- **`isFeatured` / `isPopular`** : pilotent les blocs UX « catégories recommandées » / « articles populaires » et le fallback enrichi (voir §6).

### 4.3 Historique conversationnel minimal

```prisma
model ChatbotConversation {
  id            String           @id @default(cuid())
  clientId      String
  userId        String
  title         String?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  messages      ChatbotMessage[]

  @@index([clientId, userId, updatedAt])
}

model ChatbotMessage {
  id                    String              @id @default(cuid())
  conversationId        String
  clientId              String
  userId                String
  role                  ChatbotMessageRole
  content               String
  matchedEntryId        String?
  noAnswerFallbackUsed  Boolean             @default(false)
  createdAt             DateTime            @default(now())
  conversation          ChatbotConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
  @@index([clientId, userId, createdAt])
}

enum ChatbotMessageRole {
  USER
  ASSISTANT
}
```

Règle de stockage :
- Historiser uniquement le minimum opérationnel (question, réponse, métadonnées de matching).
- Ne pas stocker de données sensibles inutiles.

## 5) Endpoints API

### 5.1 Endpoints plateforme admin (knowledge base)

- `GET /api/platform/chatbot/entries`
- `POST /api/platform/chatbot/entries`
- `GET /api/platform/chatbot/entries/:id`
- `PATCH /api/platform/chatbot/entries/:id`
- `PATCH /api/platform/chatbot/entries/:id/archive`
- `GET /api/platform/chatbot/categories`
- `POST /api/platform/chatbot/categories`
- `PATCH /api/platform/chatbot/categories/:id`
- `PATCH /api/platform/chatbot/categories/:id/archive`

Règles :
- `PLATFORM_ADMIN` peut gérer les entrées `GLOBAL` et `CLIENT`.
- Archive logique uniquement (`isActive=false` et/ou `archivedAt`), aucune suppression physique.
- Événement d’audit obligatoire : `chatbot.entry.archived`.
- Validation stricte :
  - création/update `scope=CLIENT` interdit sans `clientId`
  - création/update `scope=GLOBAL` interdit avec `clientId`

### 5.2 Chatbot runtime (conversation + matching)

- `POST /api/chatbot/message` — matching question → réponse courte ; corps de réponse enrichi (voir §6).
- `GET /api/chatbot/conversations`
- `GET /api/chatbot/conversations/:id/messages`

Règles :
- Aucune mutation métier possible.
- Toute lecture conversationnelle est filtrée par `clientId + userId`.
- Le matching et le fallback enrichi sont exclusivement côté backend.

### 5.3 Knowledge base (navigation, lecture seule)

- `GET /api/chatbot/categories` — liste catégories filtrées (scope client, modules, permissions).
- `GET /api/chatbot/categories/:slug/entries` — articles d’une catégorie identifiée par son **slug** unique dans le périmètre scope/client (même filtrage).
- (Optionnel V1) `GET /api/chatbot/explore` — agrégat homepage « Explorer » : catégories mises en avant, articles populaires, entrée recherche simple (param query) — peut être dérivé côté frontend de plusieurs GET si non implémenté.

Le paramètre `:slug` est le slug métier de la catégorie (pas l’ID technique Prisma), pour que le frontend n’ait pas besoin d’IDs dans l’URL.

Règles :
- Parcours **sans poser de question** : l’utilisateur navigue slug / catégorie comme une FAQ produit.
- Même filtrage sécurité que pour les entrées matchées : `clientId` actif, `moduleCode`, `requiredPermission`.
- Les réponses listent des **slugs et libellés** pour la navigation ; **aucun ID interne obligatoire côté UI** (voir contraintes §7).

## 6) Règles de matching V1

**Prétraitement du texte question (avant score)** — normaliser la chaîne utilisateur :
- passage en **lowercase** ;
- **suppression des accents** (NFD + suppression des marques diacritiques, ou équivalent Unicode) ;
- **tokenisation simple** : découpage sur espaces / ponctuation basique, suppression des tokens vides trop courts (seuil configurable, ex. longueur ≥ 2).

Ensuite :

1. Rechercher uniquement dans les entrées `isActive=true` et non archivées (`archivedAt` null si archive utilisée).
2. Filtrer par `scope` :
   - `GLOBAL`
   - ou `CLIENT` avec `clientId` = client actif.
3. Si `moduleCode` est renseigné, vérifier que le module est actif pour l’utilisateur.
4. Si `requiredPermission` est renseignée, vérifier la permission utilisateur.
5. Appliquer le même prétraitement aux champs comparés pertinents (`question`, `title`, `keywords`, `tags` selon implémentation).
6. Classer les candidats avec un score respectant la **hiérarchie** suivante (du plus fort au plus faible) :
   - **exact match** (ex. question normalisée === entrée normalisée, ou inclusion intégrale du texte question dans `question` / réciproque selon règle fixée) ;
   - **partial match** (sous-chaîne ou overlap fort sur `question` / `title`) ;
   - correspondance sur **keywords** ;
   - correspondance sur **tags** ;
   - **`priority`** : sert de **départage** entre candidats de score proche, pas comme signal lexical principal.
7. Appliquer un seuil backend `minScore`.
8. Retourner la meilleure réponse uniquement si `score >= minScore`.

**Fallback enrichi** (pas de match fiable, ou `score < minScore`) — corps de réponse `POST /api/chatbot/message` :
- `fallbackMessage` : message administrable (entrée fallback globale ou config dédiée) ;
- `recommendedCategories` : catégories avec `isFeatured=true`, actives, filtrées RBAC (même règles que listes KB) ;
- `popularArticles` : entrées avec `isPopular=true`, actives, typiquement `type=ARTICLE` (ou mix FAQ si produit le décide), filtrées RBAC ;
- si aucune config fallback : `fallbackMessage` = “Je n’ai pas encore de réponse configurée pour cette question.”

Comportement runtime quand match :
- Retourner `answer`, `entryId` (usage interne persistance ; **ne pas afficher** en UI), `slug` (navigation « Voir plus » / lien article), `hasFullContent` (bool, ex. `content` non vide), `structuredLinks` validés, et résolution des **`relatedEntryIds`** en objets affichables (slug + titre, pas d’ID brut).

## 7) Sécurité et conformité

Exigences obligatoires :
- Aucun contournement RBAC possible.
- Filtrage systématique des réponses selon :
  - client actif
  - modules actifs
  - permissions
- Isolation inter-client stricte (aucune fuite).
- Vérification `clientId + userId` sur conversations/messages.
- Même filtrage obligatoire pour catégories et articles listés.
- **Slugs** : unicité par périmètre `(scope, clientId)` pour catégories et entrées ; validation à l’écriture admin (format URL-safe, pas de collision).
- **Cohérence** : article rattaché à une catégorie ⇒ même `scope` et même `clientId` (règle §4).
- Interdiction d’utiliser des URLs arbitraires en réponse.
- Liens autorisés : uniquement `structuredLinks` au **format typé** `INTERNAL_PAGE` | `MODULE` (§4), allowlist `route`, **aucune URL externe**.
- Rejet explicite des URLs externes et des routes non autorisées.
- **Frontend** : aucun affichage d’**ID** technique (CUID, UUID, clés internes) comme libellé principal ; navigation et listes s’appuient sur **slug**, **titre**, **nom de catégorie**, **icônes** ; les IDs restent réservés au transport interne si strictement nécessaire, jamais affichés à l’utilisateur final.

## 8) UX / UI V1

Éléments attendus :
- Bouton global **“Cursor Starium”**.
- Drawer de chat global (**runtime** : saisie question, réponse courte, « Voir plus » vers `content` si `hasFullContent`).
- **Écran « Explorer »** (knowledge base, **sans** obligation de poser une question) :
  - liste des catégories (mise en avant des `isFeatured`) ;
  - bloc **articles populaires** (`isPopular`) ;
  - **recherche simple** sur titres / questions / slugs (appel API dédié ou query sur endpoints existants) ;
  - navigation **catégorie → liste d’articles** puis **fiche article** (slug + `content`, liens typés).
- Interface admin plateforme pour gérer les entrées chatbot.
- Navigation knowledge base dans le drawer (raccourci vers « Explorer ») ou onglet dédié selon produit.
- Action **« Voir plus »** dans le fil de chat : affiche `content` complet (article long) dans un panneau ou la route Explorer `/…/slug`.
- Suggestions :
  - **« Articles liés »** : résolution `relatedEntryIds` → cartes slug + titre (+ `icon` optionnel).
  - **« Catégories recommandées »** : catégories `isFeatured`, alignées fallback no-match (§6).

États UX obligatoires :
- `loading`
- `empty`
- `no answer`
- `unauthorized`
- `error`

Règle UI Starium :
- Le frontend n’affiche jamais d’ID brut.
- Toute référence visible est un libellé métier (valeur) et non un identifiant technique.

## 9) Hors scope V1

- IA générative.
- LLM/RAG.
- Lecture directe des tables métier pour construire une réponse.
- Exécution d’actions métier depuis le chatbot.
- Écriture métier via chatbot.
- Suppression physique d’une entrée de knowledge base.

## 10) Critères d’acceptation

- Un `PLATFORM_ADMIN` peut créer, modifier et archiver une réponse.
- Un utilisateur peut poser une question et recevoir uniquement une réponse configurée.
- Aucune réponse IA générée.
- Un utilisateur ne reçoit jamais une réponse liée à un module désactivé.
- Un utilisateur ne reçoit jamais une réponse liée à une permission non détenue.
- Aucune fuite inter-client.
- Historique conversationnel minimal opérationnel.
- Aucun ID brut affiché côté UI.
- Impossible de créer `scope=CLIENT` sans `clientId`.
- Impossible de créer `scope=GLOBAL` avec `clientId`.
- Impossible de retourner une route externe ou non autorisée.
- Impossible de supprimer physiquement une entrée.
- Une question avec score faible (`score < minScore`) retourne le fallback.
- Un admin peut créer une catégorie.
- Un article peut être rattaché à une catégorie.
- Un utilisateur peut naviguer dans les catégories sans poser de question.
- Une réponse chatbot peut ouvrir un article complet.
- Aucun article non autorisé n’est visible.
- Slug catégorie / entrée unique par périmètre `(scope, clientId)` ; impossible de lier une entrée à une catégorie d’un autre scope ou `clientId`.
- En no-match, la réponse API inclut `fallbackMessage` + catégories `isFeatured` + articles `isPopular` (tous filtrés RBAC).
- Le matching applique normalisation (lowercase, sans accents) et tokenisation simple ; le score respecte exact > partial > keywords > tags > priority comme départage.
- Aucun lien `structuredLinks` de type URL externe ; uniquement `INTERNAL_PAGE` | `MODULE` avec `route` allowlist.
- L’UI « Explorer » et le chat n’affichent jamais d’ID brut ; navigation par slug et libellés.

## 11) Plan d’implémentation par étapes

### Étape 1 — Socle data
- Ajouter `ChatbotCategory`, `ChatbotKnowledgeEntry`, `ChatbotConversation`, `ChatbotMessage`.
- Ajouter champs slug / featured / popular / icon / `relatedEntryIds`, enum `ChatbotStructuredLinkType`, contraintes unicité slug par périmètre.
- Ajouter index de filtrage scope/client/permission/module.
- Préparer migration.

### Étape 2 — Admin knowledge base
- Implémenter endpoints `/api/platform/chatbot/entries`.
- Ajouter validation DTO + RBAC plateforme.
- Ajouter endpoint d’archive logique `/archive` + audit `chatbot.entry.archived`.
- Ajouter gestion des catégories (`ChatbotCategory`) avec mêmes règles scope/client.

### Étape 3 — Runtime utilisateur
- Implémenter `POST /api/chatbot/message`.
- Implémenter pipeline de matching (prétraitement texte + filtrage + scoring hiérarchique + `minScore` + fallback enrichi).
- Persister les échanges minimaux conversation/messages.
- Enrichir la réponse runtime avec `entryId`, `slug`, `hasFullContent`, `fallbackMessage`, `recommendedCategories`, `popularArticles`, articles liés résolus.

### Étape 4 — Historique
- Implémenter `GET /api/chatbot/conversations`.
- Implémenter `GET /api/chatbot/conversations/:id/messages`.
- Vérifier contraintes `clientId + userId`.

### Étape 5 — UI globale
- Ajouter bouton global “Cursor Starium”.
- Ajouter drawer de chat avec états UX obligatoires.
- Connecter UI exclusivement aux endpoints API.
- Ajouter écran **« Explorer »** (knowledge base) : catégories, articles populaires, recherche simple.
- Ajouter navigation catégories -> articles (par slug).
- Ajouter action “Voir plus” pour afficher `content`.
- Ajouter suggestions “Articles liés” / “Catégories recommandées”.

### Étape 6 — UI admin plateforme
- Ajouter écran de gestion des entrées chatbot.
- Formulaire CRUD avec champs métier lisibles (aucun ID brut affiché).
- Gestion activation, priorité, scope, contraintes module/permission.

### Étape 7 — Validation conformité
- Tests backend : RBAC, isolation client, filtrage module/permission, fallback.
- Tests frontend : états UX, affichage valeur métier (jamais ID), routes internes contrôlées.
- Vérification finale : zéro génération libre, zéro écriture métier, zéro fuite inter-client.

