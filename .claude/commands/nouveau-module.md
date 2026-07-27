---
description: Crée un module backend NestJS complet aux conventions Starium (DTO, scoping client, permissions, tests)
argument-hint: <nom-du-module> [description métier]
---

Crée le module : **$ARGUMENTS**

Avant d'écrire du code, lis `docs/ARCHITECTURE.md` (§1, §6, §7) et un module existant proche dans
`apps/api/src/modules/` pour t'aligner sur les conventions réelles.

Définis d'abord, puis implémente :

1. **Objectif métier** et périmètre
2. **Entités** et modèle(s) Prisma — **scoping client obligatoire** sur les données métier, index sur
   les FK client-scopées
3. **DTO** `create-<name>.dto.ts` / `update-<name>.dto.ts` avec `class-validator`
4. **Endpoints REST** — ressources au pluriel, filtrage client systématique
5. **Permissions** — RBAC client-aware, guards
6. **Règles de scoping client** — `clientId` dérivé/validé depuis le scope authentifié
7. **Workflows** et besoins de **configurabilité admin** si pertinents
8. **Tests** — service unitaire, isolation inter-clients, refus d'accès, échecs de validation

Structure attendue :

```
apps/api/src/modules/<module>/
  <module>.module.ts
  <module>.controller.ts   # HTTP uniquement, DTO en entrée, réponse explicite
  <module>.service.ts      # logique métier + validation du scope avant Prisma
  dto/
  guards/                  # si spécifique au module
  tests/
```

Audit log sur toute action sensible. Termine par la checklist de la skill `starium-conformite` et
propose la mise à jour doc (`docs/API.md`, RFC) via `starium-documentation`.
