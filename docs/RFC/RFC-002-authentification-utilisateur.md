# RFC-002 — Authentification utilisateur

## Statut
À faire

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
