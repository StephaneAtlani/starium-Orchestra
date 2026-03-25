Voici le plan complet structuré des RFC pour ton intégration Microsoft — **aligné avec ton architecture actuelle (NestJS, guards, multi-tenant, modules)** et découpé proprement pour Cursor.

---

# 🔥 PHASE — MODULE INTÉGRATION MICROSOFT

| Ordre | RFC                  | Nom                            | Description                                                              | État       | Commentaire           |
| ----- | -------------------- | ------------------------------ | ------------------------------------------------------------------------ | ---------- | --------------------- |
| 1     | **RFC-PROJ-INT-001** | Cadrage fonctionnel            | Définition du périmètre (Teams, Planner, Documents, sync one-way)        | Draft | Source de vérité cadrage — voir [_RFC Liste](./_RFC%20Liste.md) |
| 2     | **RFC-PROJ-INT-002** | Prisma Schema                  | Modélisation DB : MicrosoftConnection, ProjectMicrosoftLink, Sync tables | 🟡 Partiel | `MicrosoftConnection` OK ; liens projet / sync à venir |
| 3     | **RFC-PROJ-INT-003** | Auth Microsoft OAuth           | Intégration OAuth2 + stockage tokens + refresh                           | ✅ Fait    | `apps/api/src/modules/microsoft/` ; plateforme `GET|PATCH /api/platform/microsoft-settings` ; client `GET|PUT /api/clients/active/microsoft-oauth` ; doc [docs/API.md](../API.md), [docs/ARCHITECTURE.md](../ARCHITECTURE.md) |
| 4     | **RFC-PROJ-INT-004** | Microsoft Graph Service        | Client HTTP `graph.microsoft.com/v1.0` (transport uniquement)             | ✅ Fait    | `MicrosoftGraphService`, `microsoft-graph.types.ts`, tests — pas de métier Teams/Planner dans ce service |
| 5     | **RFC-PROJ-INT-005** | Gestion connexion client       | Connexion / révocation MicrosoftConnection (client-level)                | ✅ Fait    | Aligné RFC-003 ; UI `/client/administration/microsoft-365` (guard = API) ; tests `microsoft-oauth.service.spec` + `microsoft-auth.controller.spec` — [RFC-005](./RFC-PROJ-INT-005%20—%20Connexion%20client%20Microsoft.md) |
| 6     | **RFC-PROJ-INT-006** | Sélection ressources Microsoft | API Teams / Channels / Planner                                           | 🟡 Partiel (routes + UI de sélection; plans team-based provisoires, neutres vis-à-vis `channelId`) | UI dépendante         |
| 7     | **RFC-PROJ-INT-007** | Configuration projet           | Lien Project ↔ Microsoft (team/channel/plan)                             | ✅ Implémenté | 1:1 obligatoire       |
| 8     | **RFC-PROJ-INT-008** | Sync tâches → Planner          | Création / update tâches Starium vers Planner                            | ✅ Implémenté | MVP core              |
| 9     | **RFC-PROJ-INT-009** | Sync documents → Teams         | Upload fichiers vers SharePoint (channel folder)                         | 🆕 À faire | dépend Graph Files    |
| 10    | **RFC-PROJ-INT-010** | Statut de synchronisation      | Tracking sync (PENDING / SYNCED / ERROR)                                 | 🆕 À faire | Observabilité         |
| 11    | **RFC-PROJ-INT-011** | Retry & résilience             | Gestion erreurs Graph + retry + logs                                     | 🆕 À faire | important prod        |
| 12    | **RFC-PROJ-INT-012** | Audit logs                     | Traçabilité des actions Microsoft                                        | 🆕 À faire | aligné RFC-013        |
| 13    | **RFC-PROJ-INT-013** | Permissions & sécurité         | Sécurisation accès intégration (RBAC + guards)                           | 🆕 À faire | cohérence globale     |
| 14    | **RFC-PROJ-INT-014** | API orchestration projet       | Endpoints `/projects/:id/microsoft-link`                                 | 🆕 À faire | point d’entrée UX     |
| 15    | **RFC-PROJ-INT-015** | Frontend intégration           | UI projet (Teams selector, toggles sync, états)                          | 🆕 À faire | cockpit UX            |

---

# 🧠 PHASE 2 — ÉVOLUTIONS (à ne pas faire maintenant)

| Ordre | RFC                  | Nom                   | Description                            | État      | Commentaire    |
| ----- | -------------------- | --------------------- | -------------------------------------- | --------- | -------------- |
| 16    | **RFC-PROJ-INT-016** | Sync bidirectionnelle | Webhooks Graph + mise à jour Starium   | 🔒 Future | complexe       |
| 17    | **RFC-PROJ-INT-017** | Mapping utilisateurs  | Assignation users ↔ Azure AD           | 🔒 Future | dépend IAM     |
| 18    | **RFC-PROJ-INT-018** | Création auto Teams   | Création Team / Channel depuis Starium | 🔒 Future | produit avancé |
| 19    | **RFC-PROJ-INT-019** | Sync commentaires     | Synchronisation conversations Teams    | 🔒 Future | lourd          |
| 20    | **RFC-PROJ-INT-020** | Monitoring avancé     | Dashboard sync + erreurs               | 🔒 Future | UX cockpit     |

---

# 🎯 PRIORISATION RECOMMANDÉE (TRÈS IMPORTANT)

👉 Ordre réel d’implémentation :

1. **003 (Auth)** — **livré** (module OAuth + tokens chiffrés).
2. **002 (Schema)** — **partiel** (`MicrosoftConnection` ; suite selon RFC-002).
3. **005 (Connection)** — **livré** (API connexion / révocation ; voir RFC-005).
4. **004 (Graph service)** — **livré** (`MicrosoftGraphService` : transport HTTP v1.0, `requestForConnection` + `ensureFreshAccessToken`).
5. **006 (Resources)**
6. **007 (Project link)**
7. **008 (Tasks sync)** ✅ MVP utile
8. **009 (Documents)**

---

# ⚠️ POINTS MAJEURS (ce qui peut te faire perdre du temps)

### 1. OAuth Microsoft

* gestion refresh token
* consentement admin vs user
* scopes

### 2. Planner

* API parfois instable
* dépend fortement du contexte utilisateur

### 3. Multi-tenant

* 1 client ≠ 1 tenant garanti
* ne jamais hardcoder

### 4. Sync

* éviter le bidirectionnel au début

---

# ✅ RÉSULTAT

Avec ce plan :

👉 tu peux découper proprement dans Cursor
👉 zéro aller-retour
👉 chaque RFC est indépendante
👉 tu restes aligné avec toute ton archi existante

---

Si tu veux, prochaine étape :

👉 je te fais **RFC-PROJ-INT-002 (Prisma Schema) version 10/10 prête à coder**
ou
👉 directement un **/PlanCursor exécutable pour toute la phase 1**
