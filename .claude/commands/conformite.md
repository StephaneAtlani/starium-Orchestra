---
description: Revue de conformité Starium du diff courant (multi-client, sécurité, DS, RGAA, mobile)
argument-hint: [périmètre ou RFC — optionnel]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(pnpm typecheck:*), Bash(pnpm lint:*), Bash(pnpm audit:modals:*), Bash(pnpm --filter*), Read, Grep, Glob
---

Périmètre demandé : **$ARGUMENTS** (si vide, prendre le diff non commité + les commits non poussés).

État du dépôt :

- Statut : !`git status --short`
- Fichiers modifiés : !`git diff --stat HEAD`

Applique la skill `starium-conformite` sur ce périmètre :

1. Classe les fichiers touchés (backend / frontend / Prisma / config / docs).
2. Déroule les checklists : isolation multi-client, AuthZ, controller/service/DTO, Prisma, audit,
   tests, frontend, API, les 5 standards by design, noyau financier.
3. Lance les vérifications pertinentes (`pnpm typecheck`, tests du workspace touché,
   `pnpm audit:modals` si une modale est concernée) et rapporte le **résultat réel**.
4. Rends la synthèse au format imposé : Périmètre / Conforme / Écarts (avec `fichier:ligne`) /
   Risques sécurité–multi-client / Vérifications lancées.
