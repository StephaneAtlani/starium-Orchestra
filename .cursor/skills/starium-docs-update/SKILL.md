---
name: documentation
description: Assure la cohérence de la documentation sous docs/ (RFC, _RFC Liste, ARCHITECTURE, vision) avec le code et les conventions Starium Orchestra. À utiliser lors d’une demande de mise à jour doc, de synchronisation RFC après implémentation, d’actualisation de l’index RFC ou d’architecture, ou pour finaliser la doc d’une feature.
---

# Mise à jour documentation — `docs/`

## Quand appliquer

- Après implémentation d’une feature couverte par une RFC ou un plan.
- Sur demande explicite : « mets à jour la doc », « synchronise la RFC », « passe le statut Draft → … ».
- Avant une PR qui touche le comportement produit documenté dans `docs/`.

## Sources de vérité (ordre)

1. **Code et tests** — la doc décrit le comportement réel ; pas l’inverse.
2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — structure, multi-client, modules.
3. **[docs/VISION_PRODUIT.md](docs/VISION_PRODUIT.md)** — vision ; ne pas la réécrire sans demande.
4. **RFC concernée** dans [docs/RFC/](docs/RFC/) — statut, périmètre, API, critères d’acceptation.
5. **[docs/RFC/_RFC Liste.md](docs/RFC/_RFC Liste.md)** — index des RFC ; à tenir aligné si statut ou titre change.

## Principes (workspace)

- Ne pas inventer d’arborescence ou de fichiers non demandés (voir `.cursorrules` — documentation).
- Préférer des **phrases complètes** et des listes actionnables ; éviter le bruit.
- **Multi-client / sécurité** : si la doc décrit des APIs ou des données, rappeler l’isolation client quand c’est pertinent.
- Les chemins de fichiers dans la doc : cohérents avec le repo (`apps/api/`, `apps/web/`).

## Workflow

1. **Identifier** : quel document(s) — RFC numérotée, `_RFC Liste`, `_Plan de déploiement`, `modules/*.md`, `API.md`, etc.
2. **Lire** ce qui existe déjà (éviter les contradictions internes).
3. **Comparer** au code / tests / PR pour les écarts (statut, endpoints, permissions, schéma).
4. **Modifier** :
   - statut RFC (ex. Draft → Implémenté) **uniquement si** l’utilisateur le demande ou si c’est le but de la tâche ;
   - sections « Implémentation », « API », « Dépendances » pour refléter la réalité ;
   - `_RFC Liste.md` : lien, statut court, date si le repo le prévoit.
5. **Ne pas** modifier des RFCs hors périmètre de la demande.

## Checklist rapide

- [ ] Une seule RFC par fichier nommé `RFC-XXX` ; pas de doublon de sens.
- [ ] `_RFC Liste.md` à jour si la RFC change de nom ou de statut visible.
- [ ] `ARCHITECTURE.md` ou `API.md` si la structure ou les routes exposées changent.
- [ ] Aucune promesse dans la doc sans équivalent dans le code (ou marquer explicitement « prévu » / « hors scope »).

## Anti-patterns

- Mettre à jour la doc **sans** vérifier le code ou les tests récents.
- Documenter des secrets, des URLs internes ou des données sensibles.
- Refactor massif de `docs/` sans demande explicite.

## Références optionnelles

- Plans de déploiement : [docs/RFC/_Plan de déploiment - Budget.md](docs/RFC/_Plan%20de%20déploiment%20-%20Budget.md), [docs/RFC/_Plan de déploiment - Projet.md](docs/RFC/_Plan%20de%20déploiment%20-%20Projet.md)
