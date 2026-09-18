## Problème

Le DSI ou le responsable de procédures maintient des procédures internes qui deviennent, à chaque publication, la référence officielle à diffuser. Aujourd’hui les publications sont seulement enchaînées (1, 2, 3…), sans distinguer une évolution mineure d’une rupture majeure. L’auteur ne peut pas qualifier l’importance ni laisser un motif clair pour les majeures ; les lecteurs et la gouvernance ne disposent pas d’un signal fiable pour savoir s’il faut relire. Le besoin se pose maintenant parce que le parcours procédure attend déjà des libellés du type `vX.Y`, alors que le produit numérote encore de façon linéaire.

## Solution

À la publication, le publieur choisit Mineure (par défaut) ou Majeure, voit l’aperçu du prochain libellé `vX.Y`, et doit saisir un commentaire si la publication est majeure. Un seul geste Publier crée la version officielle diffusable. Le brouillon d’édition n’est pas une version numérotée. L’historique liste uniquement les versions publiées, avec indication de la courante et des majeures. Une ancienne version publiée peut être restaurée dans le brouillon sans créer ni publier de nouvelle version.

## Utilisateur cible

Duo principal : un rédacteur qui édite le brouillon (contenu, métadonnées) et un publieur (souvent DSI / responsable procédure) qui qualifie mineure/majeure et publie. En secondaire : lecteurs opérationnels ou CODIR qui consultent la version courante et l’historique `vX.Y` pour savoir s’il s’agit d’une évolution ou d’une rupture.

## User Stories

1. US-1 — En tant que publieur, je veux publier la première version d’une procédure en `v1.0` sans choisir mineure/majeure, afin d’obtenir immédiatement une référence officielle.
2. US-2 — En tant que publieur, je veux publier une évolution en version mineure par défaut et voir l’aperçu du prochain `vX.Y`, afin de diffuser un correctif ou un ajustement sans signaler une rupture.
3. US-3 — En tant que publieur, je veux publier en version majeure avec un commentaire obligatoire et voir l’aperçu `v{N+1}.0`, afin de signaler clairement une rupture aux lecteurs et à la gouvernance.
4. US-4 — En tant que publieur, je veux être empêché de publier une majeure sans commentaire, avec un message d’erreur explicite, afin de ne pas diffuser une rupture sans motif.
5. US-5 — En tant que rédacteur, je veux éditer un brouillon sans libellé `vX.Y`, afin de ne pas confondre le travail en cours avec une version officielle.
6. US-6 — En tant que lecteur ou publieur, je veux consulter l’historique des seules versions publiées (`vX.Y`, date, auteur lisible, commentaire, courante, majeure), afin de retracer les publications officielles.
7. US-7 — En tant que rédacteur, je veux restaurer une version publiée dans le brouillon après confirmation, afin de repartir d’un contenu antérieur sans altérer l’historique ni publier automatiquement.
8. US-8 — En tant que rédacteur, je veux voir un état vide ou d’erreur clair si l’historique ou la restauration échoue, afin de savoir quoi faire ensuite.
9. US-9 — En tant que publieur, je veux utiliser le même droit de publication pour mineure et majeure, afin de ne pas bloquer une majeure derrière un droit supplémentaire.
10. US-10 — En tant que lecteur, je veux voir la version publiée courante affichée en `vX.Y` sur la fiche, afin d’identifier immédiatement la référence en vigueur.

## Critères de succès

1. Une première publication affiche `v1.0` comme version publiée courante.
2. Une publication mineure suivante affiche le `vX.Y` attendu (ex. `v1.1` après `v1.0`).
3. Une tentative de publication majeure sans commentaire est refusée avec un message d’erreur explicite.
4. Une publication majeure avec commentaire produit le `v{N+1}.0` attendu et une entrée d’historique correspondante (commentaire visible, indication majeure).
5. Le brouillon n’affiche pas de libellé `vX.Y`.
6. Une restauration met à jour le brouillon, laisse l’historique inchangé et ne crée pas de nouveau `vX.Y`.

## Hors périmètre

1. Numérotation à trois niveaux (patch).
2. Libellé `vX.Y` pré-alloué ou affiché sur le brouillon.
3. Droit de publication distinct pour les majeures.
4. Accusé de lecture / relecture obligatoire après une majeure.
5. Canal de diffusion industrialisé différencié (mail, Teams, abonnés) selon mineure/majeure.
6. Diff visuel ligne à ligne entre versions.
7. Branches ou forks de procédures.
8. Conservation/mapping des anciennes numérotations linéaires en environnement réel (réinitialisation démo uniquement).
9. Première publication autre que `v1.0`.

## Décisions d’implémentation

1. Libellé des versions publiées : `v{major}.{minor}`.
2. Dialogue de publication : choix Mineure (défaut) / Majeure en segmented control, avec aperçu du prochain libellé.
3. Première publication : toujours `v1.0`, choix mineure/majeure masqué.
4. Commentaire de version obligatoire pour une majeure ; optionnel sinon ; refus explicite si manquant.
5. Un seul geste Publier crée la version officielle diffusable.
6. Le brouillon n’affiche pas de `vX.Y`.
7. Historique : versions publiées uniquement ; badge Courante ; indication Majeure lorsque le publieur l’a choisi.
8. Restore : confirmation obligatoire ; recharge le brouillon ; n’ajoute rien à l’historique.
9. Même droit de publication pour mineure et majeure.
10. Données de démonstration des procédures réinitialisées pour le nouveau schéma de versions.
11. Message d’erreur explicite si publication majeure sans commentaire.

## Notes complémentaires

Dépend du cycle de relecture / validateurs déjà prévu sur le module procédures. Le cadrage versioning existant doit être amendé en conséquence. Suites possibles : diffusion industrialisée, ack sur majeure, diff entre versions. Risque UX : confusion « brouillon ≠ version » — à lever par l’absence de `vX.Y` sur le brouillon et un wording clair à la publication. Les exports Word/PDF devront afficher `vX.Y` ; cette dépendance export n’est pas livrée dans ce lot si le canal n’est pas prêt, mais reste notée pour ne pas publier des documents sans libellé de version.
