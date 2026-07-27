---
description: Synchronise docs/ (RFC, index, ARCHITECTURE, API, inventaire) avec le code réel
argument-hint: [RFC, module ou document — optionnel]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Read, Edit, Write, Grep, Glob
---

Cible : **$ARGUMENTS** (si vide, déduire du diff courant).

Diff : !`git diff --stat HEAD`

Applique la skill `starium-documentation` :

1. Identifie les documents concernés (`docs/RFC/RFC-XXX…`, `docs/RFC/_RFC Liste.md`,
   `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/modules/*.md`, `docs/INVENTAIRE-COMPOSANTS.md`,
   `docs/FRONTEND_*`, `docs/design-system/*`, `docs/MANUEL-*`).
2. Lis l'existant, compare au **code et aux tests** (la doc décrit le comportement réel).
3. Mets à jour uniquement ce qui est dans le périmètre — ne change un statut de RFC que si c'est
   explicitement demandé ou le but de la tâche.
4. Liste à la fin : documents modifiés, écarts constatés, points laissés en suspens.
