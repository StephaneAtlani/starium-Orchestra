---
name: starium-rfc
description: Méthode obligatoire de rédaction et d'implémentation d'une RFC Starium Orchestra (analyse de l'existant, hypothèses, fichiers, implémentation, Prisma, tests, récapitulatif, points de vigilance, conformité by design). À utiliser dès que l'utilisateur demande de développer, rédiger, implémenter ou réviser une RFC, une spec de module, ou une feature de taille moyenne à grande.
---

# RFC Starium Orchestra — méthode

Toute RFC vit dans `docs/RFC/` et est indexée dans `docs/RFC/_RFC Liste.md`.
La documentation de référence est dans `docs/` ; pour l'UX/UI, la base est
`docs/FRONTEND_UI-UX.md` + `docs/design-system/`. Pour un pont entre modules :
`docs/LIAISONS-MODULES.md`.

## Plan de réponse imposé

1. **Analyse de l'existant** — code, modèles Prisma, endpoints, composants, RFC liées déjà en place.
2. **Hypothèses éventuelles** — explicites, à valider par l'utilisateur si structurantes.
3. **Liste des fichiers à créer / modifier** — chemins réels du repo.
4. **Implémentation complète** — backend puis frontend, un changement borné à la fois.
5. **Modifications Prisma si nécessaire** — modèle, migration, index, scoping client.
6. **Tests** — unitaires service, isolation inter-clients, refus d'accès, validations, UI critique.
7. **Récapitulatif final** — ce qui a été fait, ce qui reste, commandes de vérification lancées.
8. **Points de vigilance** — risques, dettes, effets de bord.
9. **Conformité by design** — sections obligatoires (ci-dessous).

## 9. Conformité by design — sections obligatoires dans la RFC

- **RGPD** : DCP concernées, finalité (et base légale si pertinent), minimisation, rétention,
  effacement / anonymisation, export, logs (aucune DCP en clair), scope client.
- **RGAA** : navigation clavier, sémantique HTML, labels, contrastes, `aria-live`, stratégie mobile
  des composants interactifs.
- **Design System** : composants et tokens réutilisés, états loading / empty / error, libellés
  métier affichés (**jamais d'ID brut en UI**), norme modales si applicable.
- **Sécurité** : authz + isolation client, DTO validés, audit log si sensible, pas de
  sur-exposition API.
- **Interface mobile** : breakpoints, cibles tactiles ≥ 44px, comportement des tableaux et modales
  sur petit écran.

## Règles permanentes

- Respecter l'architecture existante, le multi-tenant et le **client actif**.
- Aucune fuite inter-client, jamais.
- La logique métier reste **backend** ; l'UI consomme l'API.
- Code propre, modulaire, maintenable ; ne pas inventer de structure non demandée.
- Ne pas refactorer des zones hors périmètre.

## Attendus d'un nouveau module

Définir : objectif métier · entités · DTO · endpoints · permissions · règles de scoping client ·
workflows · besoins de configurabilité admin · tests.

Checklist minimale : modèle(s) Prisma · DTO · service · controller · module · tests · exemples
d'API · scoping client enforced · permissions enforced.

## À la fin

- Mettre à jour `docs/RFC/_RFC Liste.md` (lien, statut) si le statut ou le titre change.
- Mettre à jour `docs/API.md` / `docs/ARCHITECTURE.md` si les routes ou la structure changent
  (skill `starium-documentation`).
- Nouveau pont inter-modules : `docs/LIAISONS-MODULES.md` + canvas `docs/liaisons/`.
- Passer la checklist de la skill `starium-conformite`.
