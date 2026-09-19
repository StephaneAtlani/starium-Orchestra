# Plan : Modèles de procédures (outline V1)

> PRD source : `docs/PRD.md`  
> RFC : [RFC-PROC-008](./RFC/RFC-PROC-008%20—%20Modèles%20de%20procédures%20(outline%20client).md)  
> Remplace le plan « Gouvernance procédures » (PRD antérieur).

## Décisions architecturales

Décisions durables qui s'appliquent à toutes les phases :

- **Routes API** : `/api/procedure-templates` (liste, détail, create, update, transition de statut, delete) ; `POST /api/procedures` accepte `templateId` optionnel ; réponses procédure exposent la source modèle (id + noms).
- **Routes UI** : `/procedures/templates` (liste + édition) ; dialog de création procédure enrichi.
- **Schema** : `ProcedureTemplate` scopé client — `name`, `categoryId?`, `status` (`DRAFT` | `ACTIVE` | `ARCHIVED`), `outlineJson` ; sur `Procedure` — `sourceTemplateId?`, `sourceTemplateName?`.
- **Outline** : liste ordonnée `{ level: 1|2|3, title }`.
- **Authz** : `procedures.templates.manage` pour le catalogue ; picker réservé aux porteurs de `procedures.create`.
- **Matérialisation** : copie figée — chaque titre → bloc titre + zone de texte vide ; pas de sync ultérieure.
- **Affichage** : libellés métier uniquement (nom modèle, catégorie, titres).

---

## Phase 1 : Catalogue modèles + outline + droits

**User stories** : US-1, US-2, US-3, US-6, US-11, US-12, US-18

### Ce qu'on livre

Page dédiée des modèles : créer / éditer un modèle en brouillon (nom, catégorie optionnelle, outline H1/H2/H3). Avertissement si l’imbrication saute un niveau, sans bloquer la sauvegarde. Accès refusé sans droit de gestion. États vide et erreur sur liste et édition.

### Critères d'acceptation

- [x] Page modèles accessible avec le droit manage ; refus explicite sinon
- [x] Création / édition brouillon : nom, catégorie optionnelle, outline ordonné
- [x] Warning imbrication visible ; sauvegarde possible malgré le warning
- [x] Empty / error states sur liste et formulaire

## Bloquée par

- Aucune — démarrable immédiatement

---

## Phase 2 : Activation / archive / édition actif

**User stories** : US-4, US-5, US-7, US-8

### Ce qu'on livre

Passage brouillon → actif (nom + ≥1 H1, sinon refus + message). Archivage retire le modèle du futur picker. Un actif reste éditable en place ; seules les créations ultérieures voient les changements.

### Critères d'acceptation

- [x] Activation OK si nom + au moins un H1
- [x] Activation refusée sinon, message explicite
- [x] Archivage : modèle plus proposé à la création (une fois le picker livré)
- [x] Édition d’un actif enregistrée ; procédures déjà créées inchangées

## Bloquée par

- Phase 1

---

## Phase 3 : Création procédure depuis modèle

**User stories** : US-13, US-14, US-15, US-16

### Ce qu'on livre

Au dialog de création : document vide toujours possible ; choix optionnel d’un modèle **actif** avec aperçu outline. Catégorie du modèle préremplie si présente (modifiable). Contenu initial = titres du modèle, chacun suivi d’une zone de texte vide. Snapshot d’origine enregistré à la création.

### Critères d'acceptation

- [x] Création sans modèle → document vide inchangé
- [x] Picker : uniquement les actifs + aperçu outline
- [x] Catégorie préremplie si le modèle en a une, modifiable
- [x] Procédure ouverte avec titres + zones vides sous chaque titre
- [x] `sourceTemplateId` + `sourceTemplateName` renseignés quand un modèle est choisi

## Bloquée par

- Phase 2

---

## Phase 4 : Traçabilité + suppression / archive forcée

**User stories** : US-9, US-10, US-17

### Ce qu'on livre

Sur la fiche : « Créée depuis… » (nom live si modèle encore là, sinon nom figé). Suppression définitive si aucune procédure ne référence le modèle ; sinon archivage forcé à la place.

### Critères d'acceptation

- [x] Mention d’origine visible avec libellé métier
- [x] Hard delete si zéro référence
- [x] Si références : pas de hard delete → archivage imposé + message clair

## Bloquée par

- Phase 3
