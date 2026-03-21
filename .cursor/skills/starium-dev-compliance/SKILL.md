---
name: conformite
description: Vérifie qu’un changement de code respecte les règles Starium Orchestra (multi-client, API, NestJS, Next.js, tests, audit). À utiliser après implémentation, avant commit/PR, ou quand l’utilisateur demande une revue de conformité, une checklist qualité, ou l’alignement avec ARCHITECTURE.md ou .cursorrules.
---

# Conformité développement — Starium Orchestra

## Quand appliquer

- Après une feature ou un correctif sur `apps/api` ou `apps/web`.
- Avant commit ou ouverture de PR.
- Si l’utilisateur mentionne RFC, multi-tenant, isolation client, ou « conformité » sans préciser autre chose : utiliser cette skill + toute RFC pointée explicitement.

## Sources de vérité (ordre)

1. `.cursorrules` — règles produit et techniques obligatoires du workspace.
2. `docs/ARCHITECTURE.md` — structure repo, multi-client, guards, frontend.
3. RFC ou spec dans `docs/RFC/` ou `docs/product/` — **uniquement si** la tâche y est liée ou l’utilisateur les cite.

## Workflow

1. Identifier le périmètre : fichiers touchés (backend, frontend, schéma Prisma, config).
2. Parcourir les checklists ci-dessous ; cocher mentalement ou lister les écarts.
3. Si une RFC s’applique : relire les sections « critères d’acceptation », API, permissions, données.
4. Synthétiser : **OK** / **écarts** / **risques** (fuite inter-client, auth).

---

## Backend (NestJS)

- [ ] **Client / tenant** : chaque requête métier filtre par client autorisé ; pas de `clientId` fourni par le client sans validation contre le scope utilisateur.
- [ ] **AuthZ** : guards / rôles / permissions cohérents sur les routes concernées ; pas d’endpoint sensible sans garde.
- [ ] **Controller** : mince ; DTOs avec `class-validator` sur les écritures ; pas de logique métier lourde dans le controller.
- [ ] **Service** : logique métier et validation de scope avant Prisma.
- [ ] **Prisma** : pas de SQL brut sauf exception documentée ; modèles métier avec scoping client si données métier.
- [ ] **Audit** : changements sensibles tracés (audit logs) si le domaine l’exige.
- [ ] **Tests** : unitaires sur le service ; cas d’isolement inter-clients et refus d’accès si pertinent.

## Frontend (Next.js)

- [ ] Données via fonctions API / `authenticated-fetch` (pas de duplication de règles métier dans l’UI).
- [ ] **Contexte client actif** : appels et écrans alignés avec le client sélectionné ; pas de mélange de données clients sans écran dédié autorisé.
- [ ] États chargement / erreur / vide gérés pour les flux modifiés.

## API

- [ ] REST, ressources au pluriel, formes de réponse explicites.
- [ ] Pas d’exposition de données hors scope client.

## Financier / transversal

- Si le changement touche budgets, allocations, événements financiers : réutiliser le **financial core** et les patterns existants (pas de moteur financier parallèle).

## Définition de done (rappel projet)

Compiler ; tests passent ; isolation client et permissions OK ; DTOs validés ; pas de refactor hors sujet.

---

## Sortie attendue pour l’utilisateur

Format court :

```text
## Conformité Starium Orchestra
- Périmètre : [modules/fichiers]
- Conforme : [liste ou « rien à signaler »]
- Écarts : [liste actionable]
- Risques sécurité / multi-client : [none ou détail]
```

---

## RFC ou spec additionnelle

Si l’utilisateur cite une RFC (ex. `docs/RFC/RFC-PROJ-009 — …`) :

- Lire les objectifs, modèle de données, endpoints, permissions, critères de done de cette RFC.
- Ajouter une sous-section **Conformité RFC-XXX** avec les points spécifiques non couverts par les listes génériques ci-dessus.

## Si « avec » était incomplet

Demander en une phrase : *« Conformité par rapport à quoi en priorité : une RFC précise, un module (ex. projets, budgets), ou uniquement les règles globales du repo ? »* Puis combiner cette skill avec la lecture ciblée du document.
