# RFC-ARCH-TECH-001 — Architecture technique complète Starium Orchestra

## Statut

Draft — **RFC socle (architecture de référence, non implémentation)**

## Portée

Cette RFC définit l’architecture technique de référence de Starium Orchestra.
Elle sert de **cadre structurant** pour toutes les futures RFC backend, frontend, sécurité, data et infrastructure.

---

# 1. Contexte

Starium Orchestra est un SaaS **multi-tenant / multi-client** de pilotage opérationnel et décisionnel destiné aux DSI et CODIR.

Principes structurants :

* API-first
* Backend source de vérité
* Cockpit décisionnel frontend
* Isolation stricte des données par client

### Stack

Backend :

* NestJS
* TypeScript
* Prisma ORM
* PostgreSQL

Frontend :

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Query

Infrastructure :

* Docker
* Nginx
* Redis

Stockage :

* Local ou S3-compatible (MinIO / AWS S3)

Intégrations :

* Microsoft 365 (Graph)
* LDAP / Active Directory

---

# 2. Objectifs de l’architecture

## 2.1 API-first

* Toute logique métier est exécutée côté backend.
* Le frontend consomme exclusivement l’API.

## 2.2 Backend source de vérité

Le backend gère :

* validation métier
* sécurité
* isolation tenant
* audit

## 2.3 Frontend cockpit

Le frontend :

* structure l’expérience utilisateur
* affiche des données métier
* n’implémente aucune logique critique

## 2.4 Multi-tenant strict

* Un utilisateur peut appartenir à plusieurs clients
* Le `clientId` actif est obligatoire
* Toutes les données sont isolées par client

## 2.5 Modularité

* Chaque domaine métier est un module indépendant
* Couplage minimal entre modules

---

# 3. Vue d’ensemble technique

```text
Frontend Next.js
  → API NestJS
    → Prisma
      → PostgreSQL
        → Stockage fichiers
        → Redis
        → Services externes
```

---

# 4. Monorepo

```text
starium-orchestra/
├── apps/
│   ├── api/
│   └── web/
├── packages/
├── docs/
└── docker/
```

---

# 5. Architecture Frontend

## 5.1 Organisation

```text
src/
├── app/
├── features/
├── components/
├── providers/
├── lib/
└── styles/
```

## 5.2 Providers

```text
AuthProvider
→ ActiveClientProvider
→ QueryProvider
→ AppShell
```

## 5.3 Règles

* Toutes les requêtes passent par `api-client`
* Injection automatique :

  * Authorization
  * X-Client-Id
* Query keys tenant-aware :

```ts
['module', clientId, params]
```

## 5.4 Règle UX critique

👉 Toujours afficher des valeurs métier
❌ Jamais d’ID brut

---

# 6. Architecture Backend

## 6.1 Couches

* Controllers → routes HTTP
* Services → logique métier
* DTO → validation
* Guards → sécurité
* Prisma → data

## 6.2 Modules

* auth
* clients
* users
* roles / permissions
* audit-logs
* budget-management
* financial-core
* procurement
* contracts
* projects
* microsoft
* collaborators
* teams

---

# 7. Pipeline sécurité

```text
JWT
→ ActiveClient
→ ModuleAccess
→ Permissions
→ Controller
→ Service
```

Règle : sécurité cumulative obligatoire

---

# 8. Multi-tenant

## Règles strictes

* `clientId` jamais dans le body
* transmis via header
* validé par guards

## Conséquences

* zéro fuite inter-client
* filtrage systématique DB

---

# 9. RBAC

## Niveaux

Platform :

* PLATFORM_ADMIN

Client :

* CLIENT_ADMIN
* CLIENT_USER

## Règles

* rôle ≠ permission
* permissions vérifiées par guards
* aucun accès implicite

---

# 10. Modèle de données

## Identity

```text
User
→ ClientUser
→ Client
```

## Budget

```text
Budget → Envelope → Line
```

## Finance

```text
BudgetLine → FinancialEvent
```

## Procurement

```text
Supplier → PO → Invoice
```

## Projects

```text
Project → Tasks / Risks / Documents
```

---

# 11. Flux techniques

## Login

* JWT + refresh token

## Client actif

* sélection obligatoire

## Page métier

* requête tenant-aware
* guards
* service
* DB

## Mutation métier

* validation backend
* audit log

---

# 12. Jobs asynchrones & workers (CRITIQUE)

## Principe

👉 Une requête HTTP ne doit jamais porter une tâche longue

## Architecture

```text
API
→ Queue (Redis / BullMQ)
→ Worker séparé
→ Traitement
→ Mise à jour DB
→ Audit / statut
```

## Cas d’usage

* envoi d’emails
* alertes
* imports massifs
* synchronisation Microsoft
* recalculs lourds

## Règle

* API = déclenche
* Worker = exécute

---

# 13. Redis

## Rôles

* Queue (BullMQ recommandé)
* Cache (optionnel)
* Coordination jobs

## Interdits

* Redis ne doit pas être source de vérité

---

# 14. Observabilité

## Logs

* logs applicatifs structurés
* logs erreurs
* logs jobs

## Audit

* distinct des logs techniques

## Monitoring

* performance API
* erreurs
* jobs en échec

---

# 15. Intégrations

## Microsoft 365

* OAuth backend
* tokens stockés backend
* Graph API via service

## LDAP / AD

* sync utilisateurs
* mapping interne

## Stockage fichiers

* local ou S3
* accès via API uniquement

---

# 16. Infrastructure

```text
User
→ Nginx
→ Next.js
→ NestJS
→ PostgreSQL
→ Redis
→ Storage
→ External services
```

---

# 17. Environnements

## Dev

* logs verbeux
* stockage local
* données test

## Staging

* proche prod
* tests QA

## Production

* logs limités
* monitoring actif
* sécurité renforcée

---

# 18. Sécurité

* JWT
* MFA
* RBAC
* DTO validation
* audit logs
* isolation tenant
* secrets backend uniquement

---

# 19. Règles normatives

1. Backend = source de vérité
2. Aucune logique métier critique frontend
3. Toute mutation = audit log
4. Toute route protégée par guards
5. Toute query tenant-aware
6. Aucun `clientId` en body
7. Modules indépendants
8. Tâches longues → queue + worker

---

# 20. Conclusion

Cette architecture garantit :

* **scalabilité**
* **sécurité multi-tenant**
* **cohérence métier**
* **extensibilité modulaire**

👉 Elle constitue la base technique du cockpit décisionnel Starium Orchestra.

---