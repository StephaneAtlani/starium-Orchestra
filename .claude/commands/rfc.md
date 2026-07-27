---
description: Rédige ou implémente une RFC Starium selon la méthode obligatoire en 9 points
argument-hint: [numéro de RFC ou description de la feature]
---

Applique la skill `starium-rfc` pour : **$ARGUMENTS**

Déroule la méthode complète :

1. Analyse de l'existant (code, Prisma, endpoints, composants, RFC liées)
2. Hypothèses
3. Fichiers à créer / modifier
4. Implémentation complète
5. Modifications Prisma si nécessaire
6. Tests (dont isolation inter-clients)
7. Récapitulatif final
8. Points de vigilance
9. Conformité by design : RGPD · RGAA · Design System · Sécurité · Interface mobile

Si un numéro de RFC est fourni, commence par lire le fichier correspondant dans `docs/RFC/` ainsi que
`docs/RFC/_RFC Liste.md`. Pour toute UI, applique la skill `starium-design-system`.
