---
name: starium-documentation
description: Assure la cohérence de la documentation sous docs/ (RFC, _RFC Liste, ARCHITECTURE, API, modules, vision) avec le code et les conventions Starium Orchestra. À utiliser lors d'une demande de mise à jour doc, de synchronisation d'une RFC après implémentation, d'actualisation de l'index RFC ou d'ARCHITECTURE.md, ou pour finaliser la documentation d'une feature avant PR.
---

# Mise à jour documentation — `docs/`

## Quand appliquer

- Après implémentation d'une feature couverte par une RFC ou un plan.
- Sur demande explicite : « mets à jour la doc », « synchronise la RFC », « passe le statut
  Draft → … ».
- Avant une PR qui modifie un comportement produit documenté dans `docs/`.

## Sources de vérité (ordre)

1. **Code et tests** — la doc décrit le comportement **réel** ; jamais l'inverse.
2. `docs/ARCHITECTURE.md` — structure, multi-client, modules.
3. `docs/VISION_PRODUIT.md` — vision ; ne pas la réécrire sans demande.
4. RFC concernée dans `docs/RFC/` — statut, périmètre, API, critères d'acceptation.
5. `docs/RFC/_RFC Liste.md` — index des RFC ; à tenir aligné si statut ou titre change.
6. `docs/` (racine) — guides et documents transverses : cohérence, liens, alignement avec le code.

## Principes

- Ne pas inventer d'arborescence ni de fichiers non demandés.
- Phrases complètes et listes actionnables ; éviter le bruit.
- Multi-client / sécurité : quand la doc décrit une API ou des données, rappeler l'isolation client
  si pertinent.
- Chemins cohérents avec le repo (`apps/api/`, `apps/web/`, `packages/`).
- Jamais de secret, d'URL interne ou de donnée personnelle dans la doc.

## Workflow

1. **Identifier** les documents concernés : RFC numérotée, `_RFC Liste.md`, `_Plan de déploiement`,
   `docs/modules/*.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/FRONTEND_*`,
   `docs/design-system/*`, `docs/INVENTAIRE-COMPOSANTS.md`.
2. **Lire** l'existant pour éviter les contradictions internes.
3. **Comparer** au code / tests / diff : statut, endpoints, permissions, schéma Prisma, composants.
4. **Modifier** :
   - statut RFC (ex. Draft → Implémenté) **uniquement si** l'utilisateur le demande ou si c'est le
     but de la tâche ;
   - sections « Implémentation », « API », « Dépendances » pour refléter la réalité ;
   - `_RFC Liste.md` : lien, statut court, date si le repo le prévoit ;
   - `docs/API.md` si des routes exposées changent ;
   - `docs/INVENTAIRE-COMPOSANTS.md` si un composant frontend est ajouté ou supprimé ;
   - `docs/FRONTEND_UI-UX.md` / `docs/design-system/` si un pattern DS évolue.
5. **Ne pas** modifier des RFC hors du périmètre de la demande.

## Checklist rapide

- [ ] Une seule RFC par fichier `RFC-XXX` ; pas de doublon de sens.
- [ ] `_RFC Liste.md` à jour si la RFC change de nom ou de statut visible.
- [ ] `ARCHITECTURE.md` / `API.md` à jour si la structure ou les routes changent.
- [ ] `INVENTAIRE-COMPOSANTS.md` à jour si le socle frontend change.
- [ ] Aucune promesse sans équivalent dans le code (sinon marquer « prévu » / « hors scope »).
- [ ] Liens relatifs valides.

## Anti-patterns

- Mettre à jour la doc **sans** vérifier le code ou les tests récents.
- Documenter des secrets, URLs internes ou données sensibles.
- Refactor massif de `docs/` sans demande explicite.

## Références

- Plans de déploiement : `docs/RFC/_Plan de déploiment - Budget.md`,
  `docs/RFC/_Plan de déploiment - Projet.md`
- Manuels utilisateur : `docs/MANUEL-*.md` (à mettre à jour si le parcours utilisateur change)
