# RFC-002 — Authentification utilisateur

## Statut
Implémenté

## Priorité
Critique

## User Story

En tant qu’utilisateur,  
je veux me connecter à la plateforme  
afin d’accéder à mon organisation.

---

## Objectif

Mettre en place un système d’authentification sécurisé pour le backend NestJS de Starium Orchestra, basé sur :

- login par email / mot de passe
- JWT access token
- refresh token
- logout
- hashage sécurisé des mots de passe
- hashage sécurisé des refresh tokens
- rotation des refresh tokens

Cette RFC couvre les endpoints suivants :

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

---

## Contexte

Starium Orchestra est une plateforme SaaS multi-client.

L’authentification doit permettre :

- d’identifier un utilisateur
- de sécuriser l’accès aux endpoints API
- de préparer les futures vérifications RBAC
- de servir de fondation au multi-client

Le backend est en :

- NestJS
- TypeScript
- Prisma
- PostgreSQL

---

## Périmètre

### Inclus

- module `auth` NestJS
- endpoint login
- endpoint refresh
- endpoint logout
- génération JWT
- génération refresh token
- stockage hashé des refresh tokens
- stratégie JWT
- guard JWT
- DTOs
- variables d’environnement nécessaires

### Exclu

- mot de passe oublié
- invitation utilisateur
- email de réinitialisation
- MFA
- SSO
- sélection du client actif
- rôles et permissions

---

## Endpoints attendus

### `POST /auth/login`

Permet à un utilisateur de se connecter avec son email et son mot de passe.

#### Request body

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

---

## Implémentation

- **Module** : `apps/api/src/modules/auth/` (auth.module.ts, auth.controller.ts, auth.service.ts, dto/, guards/jwt-auth.guard.ts, strategies/jwt.strategy.ts).
- **Modèles Prisma** : `User`, `RefreshToken` (voir `apps/api/prisma/schema.prisma`).
- **Variables d’environnement** : `JWT_SECRET` (obligatoire), `JWT_ACCESS_EXPIRATION` (déf. 900), `JWT_REFRESH_EXPIRATION` (déf. 604800). Voir `.env.example`.
- **Seed** : `pnpm prisma:seed` depuis `apps/api` crée ou met à jour un utilisateur de test pour les démonstrations (identifiants documentés dans le README).
