# RFC-ACL-010 — UX cockpit licences et droits

## Statut

📝 Draft

## 1. Analyse de l’existant

La lisibilité du modèle droits/licences est un facteur d’adoption critique. Sans cockpit clair, les admins comprennent mal les statuts, quotas et blocages d’accès.

## 2. Hypothèses éventuelles

- Les données cockpit proviennent des endpoints RFC-ACL-001/002/007.
- Le cockpit est orienté décision admin, pas édition low-level.
- Les libellés métier sont obligatoires sur tout composant visuel.

## 3. Liste des fichiers à créer / modifier

- `apps/web/src/features/licenses-cockpit/*`
- `apps/web/src/features/access-cockpit/*`
- `apps/web/src/components/shell/sidebar.tsx`
- `apps/web/src/config/navigation.ts`

## 4. Implémentation complète

- Construire vues cockpit :
  - synthèse quotas (consommé/disponible) ;
  - licences par statut ;
  - alertes d’expiration ;
  - distribution des modes de facturation.
- Ajouter filtres combinés (client, statut, mode, expiration).
- Afficher badges métier explicites :
  - `READ_ONLY illimité`
  - `READ_WRITE facturable`
  - `Évaluation expire le ...`
- Ajouter quick-actions contextualisées (ex: convertir évaluation).

## 5. Modifications Prisma si nécessaire

- Aucune (RFC UX).
- Possibles vues matérialisées ultérieures si volumétrie.

## 6. Tests

- rendu correct des compteurs depuis API.
- filtres combinés stables.
- aucun label ID brut affiché.
- actions visibles uniquement selon permission.

## 7. Récapitulatif final

Cette RFC rend les droits et licences intelligibles pour les admins via un cockpit opérationnel orienté pilotage et action.

## 8. Points de vigilance

- Ne pas surcharger l’écran : prioriser KPIs actionnables.
- Conserver la cohérence de vocabulaire entre backend et frontend.
- Vérifier accessibilité des statuts (couleur + texte).
