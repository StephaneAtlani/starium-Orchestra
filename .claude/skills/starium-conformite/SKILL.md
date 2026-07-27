---
name: starium-conformite
description: Vérifie qu'un changement de code respecte les règles Starium Orchestra — isolation multi-client, RBAC, API, NestJS, Next.js, tests, audit, et les 5 standards by design (RGPD, RGAA, Design System, Sécurité, mobile). À utiliser après une implémentation, avant un commit ou une PR, ou quand l'utilisateur demande une revue de conformité, une checklist qualité, une vérification d'isolation client, ou l'alignement avec ARCHITECTURE.md / une RFC.
---

# Conformité développement — Starium Orchestra

## Quand appliquer

- Après une feature ou un correctif sur `apps/api` ou `apps/web`.
- Avant commit ou ouverture de PR.
- Si l'utilisateur mentionne RFC, multi-tenant, isolation client, ou « conformité » sans autre
  précision : appliquer cette skill + toute RFC explicitement citée.

## Sources de vérité (ordre)

1. `CLAUDE.md` — règles opérationnelles obligatoires du repo
2. `docs/ARCHITECTURE.md` — structure, multi-client, guards, frontend
3. `.cursor/rules/by-design-standards.mdc` — détail des 5 standards by design
4. RFC / spec dans `docs/RFC/` ou `docs/modules/` — **uniquement si** la tâche y est liée ou citée

## Workflow

1. **Périmètre** : lister les fichiers touchés (`git diff --stat`), classer backend / frontend /
   Prisma / config.
2. Parcourir les checklists ci-dessous ; noter les écarts avec `fichier:ligne`.
3. Si une RFC s'applique : relire ses critères d'acceptation, API, permissions, modèle de données.
4. Lancer les vérifications outillées disponibles.
5. Synthétiser : **OK** / **écarts actionnables** / **risques** (fuite inter-client, authz).

```bash
pnpm typecheck
pnpm --filter @starium-orchestra/api test    # ou --filter @starium-orchestra/web test
pnpm audit:modals                            # si une modale est touchée
pnpm lint
```

---

## Backend (NestJS)

- [ ] **Isolation client** : chaque requête métier filtre sur les clients autorisés ; aucun
      `clientId` issu du payload sans validation contre le scope utilisateur.
- [ ] **AuthZ** : guards / rôles / permissions cohérents sur toutes les routes touchées ; aucun
      endpoint sensible sans garde ; permission jamais affaiblie « pour que ça marche ».
- [ ] **Controller** : mince, HTTP uniquement, DTO `class-validator` sur tous les écrits, forme de
      réponse explicite (pas de sur-exposition de champs).
- [ ] **Service** : logique métier + validation du scope **avant** tout accès Prisma.
- [ ] **Prisma** : pas de SQL brut sauf exception isolée et documentée ; scoping client sur les
      modèles métier ; index sur les FK client-scopées et les filtres fréquents.
- [ ] **Audit** : action sensible → audit log (qui, quoi, quand, entité, client, avant/après).
- [ ] **Tests** : unitaires service + cas d'isolation inter-clients + refus d'accès + échecs de
      validation.
- [ ] **Perf** : pagination prévue, relations non chargées inutilement, traitements lourds en job.

## Frontend (Next.js)

- [ ] Données via les fonctions API / `authenticated-fetch` de la feature ; **aucune règle métier
      dupliquée dans l'UI**.
- [ ] `clientId` présent dans les **query keys** TanStack Query ; aucun mélange de données clients.
- [ ] États **loading / error / empty** gérés via `LoadingState`, `ErrorState` / `Alert`,
      `EmptyState`.
- [ ] L'UI masque/désactive selon les permissions, mais ne remplace jamais l'authz backend.
- [ ] Design System : voir skill `starium-design-system` (tokens, composants, pas de cadre dans
      cadre, aucune valeur en dur).
- [ ] Modales : `StariumModal` uniquement (skill `starium-modales`), `pnpm audit:modals` passe.

## API

- [ ] REST, ressources au pluriel, CRUD prévisible, formes de réponse explicites.
- [ ] Filtrage client sur chaque endpoint métier ; aucune donnée hors scope renvoyée.
- [ ] Champs de libellé exposés (`name`, `title`, `code`, `label`) quand une relation est affichée.
- [ ] Idempotence / retry sûr sur les actions financières ou contractuelles critiques.

## Les 5 standards « by design »

- [ ] **RGPD** — DCP minimisées et identifiées, finalité documentée, rétention + effacement /
      anonymisation prévus, export possible, **aucune DCP en clair dans les logs**, scope client.
- [ ] **RGAA** — clavier complet, `focus-visible`, `<label>` sur chaque champ, erreurs
      `aria-invalid` + `aria-describedby`, contrastes AA, info jamais portée par la couleur seule,
      `aria-live` sur le dynamique, `prefers-reduced-motion`.
- [ ] **Design System** — composants et tokens existants réutilisés, aucune valeur en dur, états
      loading/empty/error, **libellé métier jamais un ID**.
- [ ] **Sécurité** — authz + isolation client, DTO validés, secrets en env, uploads validés
      (type/taille/nom), audit log si sensible, CORS/rate-limiting sur endpoints sensibles.
- [ ] **Mobile** — responsive dès 320px, cibles ≥ 44×44px, tableaux exploitables sur mobile,
      pas de dépendance au hover.

## Financier / transversal

Si le changement touche budgets, allocations, engagements ou événements financiers : réutiliser le
**noyau financier partagé** et les patterns existants — pas de moteur financier parallèle.

---

## Sortie attendue

```text
## Conformité Starium Orchestra
- Périmètre : [modules / fichiers]
- Conforme : [liste ou « rien à signaler »]
- Écarts : [liste actionable, avec fichier:ligne]
- Risques sécurité / multi-client : [none ou détail]
- Vérifications lancées : [typecheck / tests / audit:modals — résultat réel]
```

Rapporter le résultat réel des commandes lancées ; si une vérification n'a pas été exécutée, le dire.

## RFC ou spec additionnelle

Si l'utilisateur cite une RFC (ex. `docs/RFC/RFC-PROJ-009 — …`) : lire ses objectifs, modèle de
données, endpoints, permissions et critères de done, puis ajouter une sous-section
**Conformité RFC-XXX** avec les points non couverts par les listes génériques.

## Si le périmètre n'est pas précisé

Demander en une phrase : *« Conformité par rapport à quoi en priorité : une RFC précise, un module
(ex. projets, budgets), ou uniquement les règles globales du repo ? »* Puis combiner cette skill avec
la lecture ciblée du document.
