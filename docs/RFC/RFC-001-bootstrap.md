# RFC 001 — Bootstrap du projet

Objectif :

Créer les fondations techniques de Starium Orchestra.

Scope :

- structure du repository
- backend NestJS
- frontend Next.js
- Prisma + PostgreSQL
- Docker local
- ESLint
- endpoint health

Structure cible :

/apps/api
/apps/web
/packages/types
/packages/config
/docs
/docker

Contraintes :

- TypeScript partout
- architecture API-first
- multi-client ready
- aucun module métier pour l'instant

Critères de succès :

- le projet démarre en local avec docker
- endpoint /health fonctionnel
- prisma connecté à postgres
- pipeline CI fonctionne

