# RFC-AI-001 — Cursor Starium Chatbot Core

## Statut
- Proposé (V1 cadrage)

## 1) Objectif produit

Définir le socle V1 d’un chatbot intégré à Starium Orchestra, nommé **Cursor Starium**, pour fournir une assistance de pilotage en **lecture seule** sur les données accessibles de l’utilisateur dans son **client actif**.

Objectifs clés :
- Offrir un point d’accès conversationnel unique aux informations de gouvernance (vision, projets, budgets, alertes, pilotage).
- Respecter strictement les principes Starium : **API-first**, **backend NestJS source de vérité**, **frontend Next.js consommateur API uniquement**.
- Garantir la sécurité multi-tenant et RBAC sans fuite inter-client.
- Tracer les échanges et les questions sensibles via audit.

## 2) Cas d’usage V1

Cas couverts :
- L’utilisateur pose une question sur la vision stratégique disponible pour son client actif.
- L’utilisateur demande un état de projets (avancement, risques, statuts accessibles).
- L’utilisateur interroge les budgets (consommé vs planifié, tendances visibles selon ses droits).
- L’utilisateur consulte les alertes et signaux de pilotage.
- L’utilisateur demande une synthèse sur des données de pilotage déjà présentes dans la plateforme.

Comportement attendu :
- Si la donnée existe mais n’est pas autorisée : réponse explicite indiquant l’absence d’accès.
- Si la donnée est absente : réponse explicite indiquant l’indisponibilité.
- Si la question sort du périmètre V1 : réponse explicite de non-couverture fonctionnelle.

## 3) Architecture backend

Principes :
- Backend NestJS = **source unique de vérité**.
- Toute logique métier, sécurité, filtrage client, et orchestration des réponses reste côté API.
- Aucun accès direct du frontend aux sources de données métier.

Composants proposés :
- Module `ai-chat` NestJS :
  - `ai-chat.controller.ts`
  - `ai-chat.service.ts`
  - DTOs de requête/réponse
  - Service d’orchestration des sources de données lisibles
  - Journalisation/audit des interactions
- Intégration aux modules métier existants via services internes en lecture seule.
- Stratégie de génération :
  - Construire un contexte uniquement à partir des données autorisées.
  - Ne jamais contourner les guards.
  - Produire une réponse textuelle traçable.

Contraintes techniques :
- Multi-tenant strict via client actif et `X-Client-Id`.
- Interdiction d’écrire dans les domaines métier en V1.
- Historique minimal stocké côté backend pour continuité conversationnelle basique.

## 4) Architecture frontend

Principes :
- Frontend Next.js = **consommateur API uniquement**.
- Aucune logique d’autorisation métier en dur côté UI.
- UI minimale, claire, et globale.

Composants proposés dans `apps/web` :
- Bouton global “Cursor Starium”.
- Panneau de chat global (ou drawer) accessible depuis l’interface.
- Zone messages (historique minimal) + champ de saisie + envoi.
- États UX : chargement, erreur, indisponible, non autorisé, vide.

Règle UI obligatoire :
- Aucun identifiant brut visible (UUID/ID interne) dans les messages et références UI.
- Afficher des valeurs métier (`name`, `title`, `code`, `label`) lorsque des entités sont citées.

## 5) Modèle de données Prisma proposé

Objectif : conserver un historique minimal, multi-tenant, auditable.

```prisma
model AiConversation {
  id             String      @id @default(cuid())
  clientId       String
  userId         String
  title          String?
  isSensitive    Boolean     @default(false)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  messages       AiMessage[]

  @@index([clientId, userId, createdAt])
  @@index([clientId, updatedAt])
}

model AiMessage {
  id               String   @id @default(cuid())
  conversationId   String
  clientId         String
  userId           String
  role             String   // "user" | "assistant" | "system"
  content          String
  containsSensitiveQuestion Boolean @default(false)
  createdAt        DateTime @default(now())

  conversation     AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
  @@index([clientId, userId, createdAt])
}
```

Notes :
- `clientId` sur les deux modèles pour isolation stricte et filtrage performant.
- Marqueurs de sensibilité pour audit renforcé.
- Historique volontairement simple en V1.

## 6) Endpoints API

### Endpoint principal V1
- `POST /api/ai/chat`

Contrat d’entrée (conceptuel) :
- `conversationId?` : conversation existante (optionnel)
- `message` : question utilisateur
- Contexte client actif dérivé du header `X-Client-Id` + token JWT (pas confiance aveugle au header seul)

Contrat de sortie (conceptuel) :
- `conversationId`
- `answer`
- `citations?` (optionnel V1, uniquement données accessibles)
- `metadata` minimal (ex. `restricted: true`, `missingData: true`)

Endpoints complémentaires minimaux (optionnels mais recommandés pour UX) :
- `GET /api/ai/conversations` (liste minimale utilisateur/client actif)
- `GET /api/ai/conversations/:id/messages` (historique minimal)

Tous les endpoints AI restent en lecture seule sur les domaines métier.

## 7) Guards et permissions

Guards obligatoires sur endpoints AI :
- `JwtAuthGuard`
- `ActiveClientGuard`
- `ModuleAccessGuard`
- `PermissionsGuard`

Règles :
- Rejeter toute requête sans client actif valide.
- Vérifier que l’utilisateur est autorisé au module et à la capacité de consultation AI.
- Appliquer le scope client sur **chaque** lecture de données contributrices à la réponse.
- Interdire toute tentative d’opération non read-only dans la chaîne de traitement.

## 8) Règles de sécurité

- Isolation stricte multi-tenant : aucune donnée hors `clientId` actif.
- Aucune donnée restituée sans droits explicites utilisateur.
- Journaliser les conversations avec horodatage, utilisateur, client, type de question.
- Marquer et tracer les questions sensibles (`isSensitive`, `containsSensitiveQuestion`).
- Ne pas exposer de secrets techniques ni de détails internes d’infrastructure dans les réponses.
- Réponses basées exclusivement sur les données accessibles au moment de la requête.

## 9) Règles UX

- Le chatbot doit indiquer clairement :
  - “Je n’ai pas accès à cette donnée dans votre périmètre.”
  - “La donnée n’est pas disponible actuellement.”
  - “Cette action n’est pas prise en charge en V1 (lecture seule).”
- Ton professionnel, concis, orienté aide à la décision.
- Transparence sur le périmètre : pas d’invention, pas d’affirmation sans donnée.
- Affichage de valeurs métier lisibles ; **jamais d’ID brut** côté UI.
- Le panneau doit rester non bloquant et utilisable globalement dans l’app.

## 10) Hors scope

- Agents autonomes.
- Exécution d’actions métier.
- Modification de données.
- Envoi d’email.
- Création automatique de projets, budgets ou alertes.
- RAG documentaire complet.
- Détails d’intégration OpenAI externe si non déjà configurés.

## 11) Critères d’acceptation

- Endpoint `POST /api/ai/chat` opérationnel avec guards obligatoires.
- Aucune écriture métier possible via chatbot (lecture seule stricte).
- Historique minimal conversation/messages persistant par utilisateur + client actif.
- Aucune fuite inter-client validée par tests d’isolation.
- Réponses bloquées/explicites si donnée absente ou non autorisée.
- UI globale “Cursor Starium” disponible dans `apps/web`.
- Aucune exposition d’ID brut dans l’UI chatbot.
- Audit présent pour conversations et questions sensibles.

## 12) Plan d’implémentation par étapes

### Étape 1 — Cadrage API et sécurité
- Définir DTO `POST /api/ai/chat`.
- Poser guards et permissions sur le contrôleur.
- Verrouiller le contexte `X-Client-Id` + utilisateur JWT.

### Étape 2 — Modèle de données
- Ajouter `AiConversation` et `AiMessage` dans Prisma.
- Créer migration et index orientés `clientId`, `userId`, `createdAt`.

### Étape 3 — Service d’orchestration read-only
- Construire les requêtes de contexte en lecture seule sur modules cibles.
- Ajouter politique de réponse “non accessible / non disponible”.
- Introduire classification simple des questions sensibles pour audit.

### Étape 4 — Endpoint principal
- Implémenter `POST /api/ai/chat`.
- Persister question/réponse dans l’historique minimal.
- Retourner réponse + métadonnées de périmètre.

### Étape 5 — UI minimale Next.js
- Ajouter bouton global “Cursor Starium”.
- Ajouter panel de chat + saisie + rendu messages + états.
- Connecter strictement à l’API backend (aucune logique métier locale).

### Étape 6 — Audit et conformité
- Vérifier journalisation des conversations sensibles.
- Vérifier absence d’ID brut côté UI.
- Vérifier règles multi-client et RBAC de bout en bout.

### Étape 7 — Validation V1
- Tests backend (guards, isolation client, read-only).
- Tests frontend (états UX, affichage valeurs métier, erreurs d’accès).
- Revue finale conformité architecture Starium.

