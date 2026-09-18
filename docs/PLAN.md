# Plan : Versioning majeur / mineur des procédures

> PRD source : `docs/PRD.md`

## Décisions architecturales

Décisions durables qui s'appliquent à toutes les phases :

- **Routes** :
  - Publish inchangé au niveau ressource procédure (transition / publish existant), enrichi du corps `bumpType` (`MINOR` | `MAJOR`) + `changeSummary`.
  - `GET /api/procedures/:id/versions` — liste des versions **publiées** uniquement.
  - `GET /api/procedures/:id/versions/:versionId` — détail d'une version publiée (scope client).
  - `POST /api/procedures/:id/versions/:versionId/restore-to-draft` — copie vers le brouillon technique.
- **Schema** :
  - `ProcedureVersion` : remplacer `versionNumber` par `versionMajor` + `versionMinor` (nullable sur le draft technique) + `bumpType` (`MINOR` | `MAJOR`, renseigné à la publish).
  - Contrainte d'unicité sur les versions publiées `(procedureId, versionMajor, versionMinor)`.
  - Draft technique : `lifecycle = DRAFT`, pas de n° métier ; un seul draft courant via `currentDraftVersionId`.
- **Modèles clés** : `Procedure`, `ProcedureVersion`, `ProcedureVersionLifecycle` (`DRAFT` | `PUBLISHED`), enum `ProcedureVersionBumpType` (`MINOR` | `MAJOR`).
- **Règles de bump** : 1ʳᵉ publish → `1.0` / `MAJOR` implicite ou bump masqué ; mineure → `minor + 1` ; majeure → `major + 1`, `minor = 0` ; commentaire obligatoire si `MAJOR` (sauf 1ʳᵉ si traité comme cas forcé `1.0`).
- **Autorisation** : `procedures.publish` pour toute publish (mineure comme majeure) ; `procedures.update` pour restore ; `procedures.read` pour historique ; isolation client sur toutes les routes.
- **Affichage** : libellé `v{major}.{minor}` uniquement sur les publiées ; jamais d'identifiant technique comme libellé.
- **Données** : reset / reseed démo procédures (pas de mapping des anciens entiers).
- **Doc** : amendement de RFC-PROC-003 aligné sur ce plan.

---

## Phase 1 : Fondation `vX.Y` + première publish

**User stories** : US-1, US-5, US-9, US-10

### Ce qu'on livre

Le schéma et le contrat API exposent `vX.Y` pour la version publiée courante. La première publication d'une procédure produit `v1.0`. Le brouillon d'édition n'affiche aucun libellé de version. La fiche et le catalogue montrent la version publiée courante en `vX.Y` (libellé métier). Le droit de publication reste unique. Les données démo procédures sont réinitialisées. RFC-PROC-003 est amendée pour ce contrat.

### Critères d'acceptation

- [ ] Première publish → version publiée courante affichée `v1.0`
- [ ] Brouillon sans libellé `vX.Y` (éditeur / méta)
- [ ] Liste / fiche : `vX.Y` pour la publiée courante, pas d'UUID comme libellé
- [ ] Même permission pour publier (pas de droit « majeure » distinct)
- [ ] Seed démo cohérent avec `major.minor`
- [ ] RFC-PROC-003 amendée (plus d'entier monotone comme modèle cible)

## Bloquée par

- Aucune — démarrable immédiatement

---

## Phase 2 : Publish mineure / majeure

**User stories** : US-2, US-3, US-4

### Ce qu'on livre

À la publish (après une version déjà publiée), le publieur choisit Mineure (défaut) ou Majeure, voit l'aperçu du prochain `vX.Y`, et doit saisir un commentaire si Majeure. L'API refuse une majeure sans commentaire avec un message explicite. Une mineure incrémente le minor ; une majeure passe à `{N+1}.0` et enregistre le `bumpType`.

### Critères d'acceptation

- [ ] Publish mineure (défaut) → prochain `vX.{minor+1}` (ex. `v1.1` après `v1.0`)
- [ ] Publish majeure avec commentaire → `v{N+1}.0` + commentaire conservé
- [ ] Publish majeure sans commentaire → refus + message d'erreur explicite
- [ ] UI : segmented Mineure / Majeure + aperçu du libellé avant validation
- [ ] 1ʳᵉ publish : choix mineure/majeure masqué (comportement phase 1 conservé)

## Bloquée par

- Phase 1

---

## Phase 3 : Historique des versions publiées

**User stories** : US-6, US-8 (historique)

### Ce qu'on livre

Consultation de l'historique des seules versions publiées : libellé `vX.Y`, date, auteur en libellé métier, commentaire, badge Courante, indication Majeure selon le `bumpType`. États vide et erreur explicites. Lecture détail d'une version publiée sans mutation.

### Critères d'acceptation

- [ ] Liste historique = publiées uniquement (pas le draft technique)
- [ ] Chaque entrée : `vX.Y`, date, auteur lisible, commentaire, Courante, Majeure si choisi
- [ ] Empty state si aucune publication
- [ ] Error state + reprise possible si chargement échoue
- [ ] Isolation client : pas d'accès à une version d'un autre client

## Bloquée par

- Phase 1 (parallélisable avec la phase 2 une fois la phase 1 terminée)

---

## Phase 4 : Restore vers brouillon

**User stories** : US-7, US-8 (restore)

### Ce qu'on livre

Depuis une version publiée de l'historique, action Restaurer dans le brouillon avec confirmation. Le contenu/titre du draft technique est remplacé ; aucune version publiée n'est modifiée ; aucun nouveau `vX.Y` n'est créé. La prochaine publish requiert à nouveau le choix mineure/majeure (phase 2).

### Critères d'acceptation

- [ ] Confirmation obligatoire avant restore
- [ ] Brouillon mis à jour avec le contenu de la version choisie
- [ ] Historique des publiées inchangé (pas de nouvelle entrée)
- [ ] Pas de publication automatique
- [ ] Error state clair si restore échoue (droits, procédure archivée, version introuvable)

## Bloquée par

- Phase 3
