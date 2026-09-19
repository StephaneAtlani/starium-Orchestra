## Problème

> RFC : [RFC-PROC-008](./RFC/RFC-PROC-008%20—%20Modèles%20de%20procédures%20(outline%20client).md) · Plan : [`docs/PLAN.md`](./PLAN.md)

Les auteurs de procédures repartent souvent d’un document quasi vide et reconstruisent à la main la même structure de titres (H1, H2, H3). Les procédures d’un même client divergent alors en forme, et le temps passé à recréer le squelette n’apporte pas de valeur. En parallèle, l’administration du client ne dispose pas de modèles réutilisables pour imposer une charte de structure commune. Le besoin se pose maintenant que le cycle de rédaction / relecture / validation existe : il manque le point d’entrée standardisé à la création.

## Solution

Le client dispose d’un catalogue de modèles de procédures. L’administrateur crée et fait vivre ces modèles (brouillon, actif, archivé) : nom, catégorie optionnelle, outline ordonné de titres H1 / H2 / H3. Un modèle ne peut être activé que s’il a un nom et au moins un H1.
À la création d’une procédure, le rédacteur peut partir d’un modèle actif — avec aperçu de l’outline — ou d’un document vide. Le choix d’un modèle préremplit la structure (chaque titre suivi d’une zone de texte vide) et, le cas échéant, la catégorie, toujours modifiable. Une fois créée, la procédure est autonome ; la trace du modèle d’origine reste visible (nom conservé à la création, nom à jour si le modèle existe encore).

## Utilisateur cible

Duo égal : l’administrateur client qui constitue et active le catalogue de modèles ; le rédacteur (souvent DSI ou responsable de procédures) qui crée une nouvelle procédure et choisit éventuellement un modèle. Secondaire : tout utilisateur autorisé à créer des procédures qui bénéficie des modèles déjà activés sans les gérer.

## User Stories

1. US-1 — En tant qu’administrateur, je veux créer un modèle avec un nom et un outline de titres, afin de préparer une structure réutilisable.
2. US-2 — En tant qu’administrateur, je veux associer une catégorie optionnelle à un modèle, afin de classer les modèles par famille métier.
3. US-3 — En tant qu’administrateur, je veux enregistrer un modèle en brouillon sans l’exposer à la création, afin de le peaufiner hors usage.
4. US-4 — En tant qu’administrateur, je veux activer un modèle (nom + au moins un H1), afin de le proposer aux rédacteurs.
5. US-5 — En tant qu’administrateur, je veux être bloqué à l’activation si le nom ou le H1 manque, avec un message clair, afin de corriger avant diffusion.
6. US-6 — En tant qu’administrateur, je veux être alerté (sans blocage) si l’imbrication des titres saute un niveau, afin d’améliorer le sommaire.
7. US-7 — En tant qu’administrateur, je veux modifier un modèle déjà actif, afin que seules les prochaines créations en bénéficient.
8. US-8 — En tant qu’administrateur, je veux archiver un modèle, afin de le retirer du choix à la création tout en conservant l’historique.
9. US-9 — En tant qu’administrateur, je veux supprimer définitivement un modèle jamais utilisé par une procédure, afin de nettoyer le catalogue.
10. US-10 — En tant qu’administrateur, je veux qu’une suppression soit refusée au profit d’une archivage forcé si des procédures référencent le modèle, afin de ne pas casser la traçabilité.
11. US-11 — En tant qu’administrateur, je veux gérer les modèles depuis une page dédiée du module procédures, afin de les administrer hors du simple panneau de paramètres.
12. US-12 — En tant qu’utilisateur sans droit de gestion des modèles, je ne veux pas accéder à cette page, afin de respecter la gouvernance.
13. US-13 — En tant que rédacteur, je veux créer une procédure sans modèle (document vide), afin de traiter les cas ad hoc.
14. US-14 — En tant que rédacteur, je veux choisir un modèle actif à la création avec aperçu de l’outline, afin de partir d’une structure connue.
15. US-15 — En tant que rédacteur, je veux que la catégorie du modèle préremplisse celle de la procédure (modifiable), afin d’aller plus vite.
16. US-16 — En tant que rédacteur, je veux ouvrir la procédure créée avec les titres du modèle et une zone de texte vide sous chacun, afin de rédiger immédiatement.
17. US-17 — En tant que lecteur de la fiche, je veux voir « Créée depuis… » avec le nom du modèle, afin de connaître l’origine de la structure.
18. US-18 — En tant qu’utilisateur, je veux des états vide et erreur clairs sur la liste des modèles, l’édition d’outline et le picker de création, afin de savoir quoi faire.

## Critères de succès

1. Créer / éditer / activer / archiver un modèle depuis la page modèles ; un modèle actif apparaît dans le picker de création.
2. Activation refusée sans nom ou sans au moins un H1, avec message explicite.
3. Création avec modèle → procédure dont le contenu contient les titres du modèle, chacun suivi d’une zone de texte vide.
4. Création sans modèle → document vide (comportement actuel conservé).
5. Choix d’un modèle avec catégorie → catégorie préremplie dans le dialog (modifiable).
6. Sur la procédure : mention « Créée depuis… » avec le nom du modèle (nom figé à la création ; nom à jour préféré si le modèle existe encore).
7. Sans droit de gestion des modèles : pas d’accès à la gestion ; avec droit de création de procédures : choix possible d’un modèle actif à la création.
8. Suppression possible seulement si aucune procédure ne référence le modèle ; sinon archivage imposé.

## Hors périmètre

1. Logo client et surcharge logo par modèle.
2. Modèles riches (texte, listes, encarts, médias au-delà de l’outline de titres).
3. Catalogue de modèles plateforme / système.
4. « Enregistrer comme modèle » depuis une procédure existante.
5. Lien vivant / synchronisation du modèle vers les procédures déjà créées.
6. Versioning des modèles (v1, v2…).
7. Code métier sur les modèles.
8. Commentaires, diff, export PDF/DOCX liés au modèle.

## Décisions d’implémentation

1. Page dédiée de catalogue des modèles (liste + édition), pas uniquement un panneau de paramètres.
2. États modèle : Brouillon · Actif · Archivé ; seuls les Actifs apparaissent au picker.
3. Outline V1 : titres ordonnés H1 / H2 / H3 avec libellé ; pas de corps de texte dans le modèle.
4. Activation : nom obligatoire + au moins un H1.
5. Imbrication : avertissement si un niveau saute ; sauvegarde autorisée.
6. Édition d’un Actif en place ; impact limité aux créations futures.
7. À la matérialisation : pour chaque titre du modèle, un bloc titre + une zone de texte vide.
8. Template optionnel à la création ; aperçu outline dans le dialog au select.
9. Catégorie optionnelle sur le modèle ; préremplit la catégorie procédure si présente.
10. Traçabilité : identifiant du modèle + nom figé à la création ; affichage live du nom si le modèle est encore disponible, sinon le nom figé.
11. Suppression définitive si zéro procédure liée ; sinon archivage forcé.
12. Identifiant utilisateur du modèle = nom (pas de code métier).
13. Droits : gestion des modèles réservée à l’admin (permission dédiée) ; usage au picker pour tout créateur de procédures autorisé.
14. États vide / erreur explicites sur liste modèles, outline et dialog de création.

## Notes complémentaires

Le cycle de gouvernance des procédures (rédacteurs, relecteurs, validateurs) est une dépendance déjà cadrée à part : ce PRD ne le rejoue pas. Les modèles riches et le logo (client + surcharge modèle) sont reportés en V1.x / stories dédiées.
