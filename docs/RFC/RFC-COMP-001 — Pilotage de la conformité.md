# RFC-COMP-001 — Pilotage de la conformité dans Starium

Version : 1.0 — 17 septembre 2026

| Métadonnée | Valeur |
| --- | --- |
| **Statut** | 📝 Draft — proposition fonctionnelle (cible produit) |
| **Livraison V1** | **[RFC-COMP-001-A](./RFC-COMP-001-A%20—%20Évaluation%20opérationnelle%20(V1).md)** — évaluation opérationnelle sur MVP existant |
| **Livraison V2** | **[RFC-COMP-002](./RFC-COMP-002%20—%20Campagnes%20et%20dossier%20d'audit.md)** — campagnes, contributions, instantanés |
| **Fidélité mock** | **[RFC-COMP-003](./RFC-COMP-003%20—%20CDC%20Conformité%20(fidélité%20mock).md)** — export `ui_kits/app/exports/conformite/` |
| **Écarts MVP** | **[RFC-COMP-001-ecarts-mvp](./RFC-COMP-001-ecarts-mvp.md)** |
| **Backlog** | `COMP.UX.*` + `COMP.V2` dans [`docs/BACKLOG.md`](../BACKLOG.md) |
| **Dépendances** | [RFC-ADM-002](./RFC-ADM-002%20—%20Catalogue%20référentiels%20conformité%20(plateforme).md) (catalogue) · [RFC-PROJ-018](./RFC-PROJ-018%20—%20ProjectRisk%20EBIOS%20RM%20minimal.md) (lien risque) |

> **Décision produit (2026-09-17)** : ce document reste la **cible métier complète**. L’implémentation immédiate suit **COMP-001-A** (étendre le MVP), pas un rewrite campagnes. Les §§ campagnes / contributions / instantanés / import évaluations sont **reportés à COMP-002**.

Statut historique du brouillon : proposition fonctionnelle et technique pour développement.

Identifiant : **RFC-COMP-001** (enregistré dans `_RFC Liste.md`).

## 1. Objectif et instruction à Cursor

Développer ou faire évoluer le module Conformité de Starium pour permettre à une organisation de gérer ses référentiels, évaluer leur application, maintenir ses preuves, traiter les écarts et préparer les décisions nécessaires.

Commencer par analyser le dépôt, ses instructions, ses RFC et les fonctionnalités existantes. Puis établir un plan technique local au dépôt et implémenter le périmètre V1 ci-dessous par lots cohérents. Ne pas s'arrêter à la rédaction du plan. Respecter les éventuels processus d'approbation du dépôt et ne pas déployer en production dans le cadre de cette demande.

Les noms de modèles, permissions et routes de cette RFC décrivent des contrats fonctionnels. Les adapter aux conventions réellement présentes. Ne pas supposer un framework, un ORM, des tables, des routes ou des modules qui n'ont pas été constatés dans le code.

Réutiliser les mécanismes existants d'organisation, d'identité, de droits, de fichiers, d'actions, de projets, de risques, de budgets, de réunions, de notifications et d'historique. Étendre l'existant plutôt que créer des modules concurrents. Conserver les identifiants techniques historiques du produit lorsque leur renommage n'est pas nécessaire.

Toute règle de cette RFC est une règle produit, sauf mention explicite contraire. Le module ne certifie pas une organisation et ses indicateurs ne constituent pas une notation officielle ISO ou HAS.

## 2. Problème à résoudre

Le suivi des exigences, preuves et actions est souvent réparti entre tableaux, documents et échanges. Le responsable manque de visibilité sur les contributions, la direction ne voit pas toujours les décisions attendues et l'audit exige de reconstituer les justifications.

Starium doit permettre de répondre à six questions :

1. Quels attendus concernent ce périmètre ?
2. Qu'est-ce qui est évalué, sur quelle base et par qui ?
3. Quelles preuves sont suffisantes, manquantes ou à réexaminer ?
4. Quels écarts doivent être corrigés et qui en est responsable ?
5. Quels moyens et décisions sont nécessaires ?
6. Quelle était la situation à une date donnée ?

Parcours cible : référentiel → campagne sur un périmètre → évaluation des attendus → validation → écarts → actions et arbitrages → vérification d'efficacité → revue suivante.

## 3. Analyse préalable obligatoire du dépôt

Documenter les résultats avec les chemins réellement trouvés, dans la RFC du dépôt ou une note technique associée.

| Élément à examiner | Décision attendue |
|---|---|
| Module conformité, audits ou référentiels existant | Étendre les modèles et écrans compatibles, identifier la reprise des données |
| Organisations et périmètres | Identifier la frontière d'isolation et les sites/services réutilisables |
| Permissions et activation des modules | Réutiliser les contrôles backend et conventions de visibilité |
| Documents et stockage | Réutiliser fichiers privés, versions et téléchargement autorisé |
| Actions et projets | Définir les liens et les éventuelles extensions minimales |
| Risques, budgets, réunions et décisions | Vérifier ce qui est réellement exploitable pour les intégrations |
| Notifications, tâches planifiées et exports | Réutiliser les services existants |
| Tests et migrations | Identifier les commandes et procédures de validation |

Un module absent ne doit pas être simulé par un bouton sans effet. Les dépendances et comportements de repli de la section 11 s'appliquent. Toute divergence substantielle doit être décrite avec son impact, sans supprimer silencieusement un besoin de la RFC.

## 4. Périmètre de livraison

### 4.1 Inclus en V1

- Référentiels privés à l'organisation, créés manuellement ou importés, avec versions publiées immuables
- Chapitres, critères, attendus évaluables et recommandations séparées
- Campagnes attachées à une version et à un périmètre explicite
- Responsables, contributeurs, échéances et demandes de compléments
- Applicabilité justifiée, évaluations, validation et réexamen
- Preuves sous forme de fichiers privés, liens et observations documentées
- Réutilisation d'une même version de preuve avec appréciation distincte par attendu
- Écarts, actions, vérification d'efficacité et liens de pilotage
- Tableaux de bord opérationnel et direction
- Import CSV avec prévisualisation et export de dossier d'audit daté
- Historique, contrôle des accès et prévention des modifications concurrentes
- Rappels internes et journal d'envoi

Plusieurs référentiels et campagnes peuvent coexister. Une campagne V1 utilise une seule version de référentiel et un seul périmètre déclaré. Le périmètre peut contenir plusieurs sites si une évaluation commune est pertinente. Pour évaluer indépendamment chaque site, créer une campagne par site. Ne pas propager automatiquement la conformité du siège vers les sites.

### 4.2 Hors V1

- IA d'évaluation ou génération automatique de conclusions
- Collecte technique automatique, connecteurs SharePoint/EDR/cloud et vérification automatique des URL
- Notation officielle propre à chaque certification et garantie de conformité
- Catalogue ISO/HAS exhaustif ou reproduction de contenus non fournis avec droits adaptés
- Correspondances automatiques entre normes et migration automatique entre leurs versions
- Moteur universel de workflows ou de règles normatives
- Consolidation hiérarchique complexe des groupes et héritage des résultats entre sites
- Portail public de confiance, nouveaux mécanismes d'invitation externe ou gestion de prestataires complète
- Exports PDF sophistiqués si aucun service adapté n'existe déjà

## 5. Modèle métier et invariants

Les objets ci-dessous sont logiques. Une table existante peut porter plusieurs de ces capacités si les invariants restent respectés.

| Objet | Contenu minimal |
|---|---|
| Référentiel | Organisation propriétaire, code, titre, domaine, description, origine |
| Version de référentiel | Libellé de version, source, date d'effet indicative, statut brouillon/publié/retiré, provenance et droits déclarés |
| Chapitre | Version, code, titre, ordre, parent éventuel |
| Critère | Version, chapitre, code, titre, description, nature, criticité interne et politique de non-applicabilité |
| Attendu | Critère, code, résultat observable attendu, caractère requis ou indicatif, méthode d'évaluation et exemples de preuves |
| Recommandation | Critère ou attendu, conseil pratique, auteur/source. Aucun effet direct sur le score |
| Périmètre | Organisation, nom, activités, sites/services sélectionnés et exclusions descriptives |
| Campagne | Organisation, version publiée, photographie du périmètre, pilote, dates, statut et paramètres de revue |
| Évaluation de critère | Campagne, critère, responsable, applicabilité et ses décisions, état de préparation |
| Révision d'évaluation | Résultats des attendus, constats, références de preuves, résultat agrégé, auteur, validateur et dates |
| Preuve et version | Organisation, type, titre, source, description, période couverte, fichier/lien/observation, auteur, confidentialité et version |
| Lien preuve-attendu | Révision évaluée, version de preuve, portée, appréciation et commentaire |
| Écart | Campagne, critère/attendu d'origine, constat, criticité, responsable, échéance, statut et vérification d'efficacité |
| Contribution | Objet cible, destinataire, consigne, échéance, statut, réponse et date de traitement |
| Liens de pilotage | Références contrôlées vers actions, projets, risques, budgets et décisions existants |
| Instantané d'audit | Campagne, date de coupure, données figées, manifeste des preuves et auteur |
| Événement d'historique | Organisation, objet, action, acteur, horodatage et changement utile |

Invariants :

1. Toutes les données client appartiennent à une organisation et sont filtrées côté serveur.
2. Un code de critère est unique dans sa version. Un code d'attendu est unique dans son critère.
3. Une campagne contient au plus une évaluation de chaque critère de sa version.
4. Une version publiée ne peut plus être modifiée. Une correction produit une nouvelle version.
5. Une campagne ouverte conserve sa version et son périmètre figés. Un changement de périmètre nécessite une nouvelle campagne, éventuellement préparée par duplication.
6. Un critère évaluable possède au moins un attendu requis. Un contenu purement indicatif reste consultable hors indicateurs.
7. Les preuves sont liées par version, jamais par une référence implicite à la dernière version.
8. Une révision validée et un instantané sont immuables. Une nouvelle évaluation crée une nouvelle révision.
9. Les documents, relations et objets liés doivent appartenir à l'organisation et être accessibles au demandeur.
10. L'archivage n'efface pas les justifications historiques. Aucune suppression en cascade de preuves référencées.

Si le dépôt possède un catalogue global, le réutiliser en lecture selon ses règles. Un client ne doit jamais modifier les modèles partagés ni voir les évaluations d'un autre client.

## 6. Référentiels, critères et attendus

La nature d'un critère distingue au minimum exigence, mesure de maîtrise et recommandation. Le texte normatif ou fourni par le client, l'interprétation pratique Starium et les exemples doivent apparaître dans des champs ou zones distincts.

Un critère de nature recommandation est purement indicatif, sans attendu requis ni résultat de conformité. Le contrôle de publication empêche toute configuration contradictoire.

Pour chaque attendu, proposer une méthode parmi document, entretien, observation, test et autre. Plusieurs méthodes peuvent être associées. Une preuve n'est pas obligatoirement un fichier : une observation tracée peut être recevable selon l'attendu.

La criticité interne utilise faible, modérée, élevée et critique. Une éventuelle catégorie officielle importée reste un champ séparé. Ne pas déduire automatiquement une catégorie officielle depuis la criticité Starium.

La politique de non-applicabilité d'un critère est `INTERDITE` ou `JUSTIFICATION_REQUISE`. Valeur par défaut : `INTERDITE`, modifiable dans le brouillon par un gestionnaire de référentiel. À la publication, afficher un récapitulatif des règles. Ne pas coder de règles ISO/HAS supposées d'après le seul nom du référentiel.

Un contenu officiel non disponible ne bloque pas le développement du moteur. Fournir un référentiel de démonstration fictif, clairement identifié comme tel, sans texte normatif reproduit.

## 7. Cycle des campagnes et évaluations

### 7.1 Campagne

États : `BROUILLON`, `OUVERTE`, `CLOTUREE`, `ARCHIVEE`.

- En brouillon : choisir la version publiée, le périmètre, le pilote et les dates. Les affectations peuvent être préparées.
- À l'ouverture : figer version et périmètre, créer les évaluations sans doublon dans une transaction.
- En cours : affecter, contribuer, évaluer, valider, demander des compléments et créer des instantanés.
- À la clôture : produire un instantané et interdire les modifications des évaluations. Une campagne incomplète peut être clôturée si les éléments manquants et le motif sont explicitement conservés.
- L'archivage conserve la consultation autorisée. Une campagne clôturée n'est pas rouverte en V1 : créer une campagne suivante.
- Les actions correctives restent pilotables après clôture. Leur état actuel doit être distingué de l'état figé dans l'instantané.

Une duplication copie les affectations et propose les éléments antérieurs comme références. Elle ne copie pas une validation comme nouvelle validation. Les résultats sont à réévaluer et les non-applicabilités à reconfirmer.

### 7.2 Applicabilité

Séparer la décision effective de la demande en cours.

Décision effective : `A_DETERMINER`, `APPLICABLE`, `NON_APPLICABLE`.

Une demande de non-applicabilité contient justification, auteur, date et échéance de revue. Elle ne change pas la décision effective avant validation. Une demande refusée conserve la décision antérieure et le motif du refus.

- Si la politique interdit la non-applicabilité, rejeter la demande côté serveur.
- Une approbation exige la permission de validation et la justification.
- Aucun critère ne disparaît des indicateurs sur la seule base d'une demande en attente.
- Un retour à applicable déclenche une nouvelle révision à évaluer, sans supprimer les décisions antérieures.
- Un recours à un prestataire, une action planifiée ou une acceptation de risque ne produit jamais automatiquement une non-applicabilité.
- La V1 applique l'applicabilité au niveau du critère. Ne pas masquer un attendu requis isolé. Si un référentiel nécessite une granularité différente, le signaler comme limitation à traiter avant d'annoncer ce référentiel supporté.

### 7.3 Résultat des attendus

Résultats internes : `NON_EVALUE`, `CONFORME`, `PARTIEL`, `NON_CONFORME`.

Chaque attendu possède un constat. Pour un résultat différent de non évalué, conserver une explication. Pour conforme ou partiel, exiger au moins un élément justificatif examiné, qui peut être une observation structurée. Pour non conforme, une absence de preuve peut être documentée comme constat.

Pour conforme, au moins un lien doit être apprécié pertinent et le constat doit justifier la couverture complète par les éléments présentés. Pour partiel, au moins un lien doit être pertinent ou partiel. Des liens tous insuffisants ou à examiner ne satisfont pas cette condition.

Appréciations des liens de preuve : `A_EXAMINER`, `PERTINENTE`, `PARTIELLE`, `INSUFFISANTE`. Une appréciation pertinente n'impose pas le résultat conforme : l'évaluateur apprécie la couverture globale.

Résultat calculé d'un critère sur ses seuls attendus requis :

1. Au moins un non conforme : non conforme.
2. Sinon, au moins un non évalué : non évalué, avec la progression des attendus affichée.
3. Sinon, au moins un partiel : partiel.
4. Sinon, tous conformes : conforme.

Cette règle est une convention interne V1, pas une notation normative. Elle est centralisée, testée et identique dans l'interface, les API et les exports. Une non-applicabilité validée remplace l'affichage du résultat actif par « Non applicable » sans effacer l'historique.

### 7.4 Préparation et validation

États d'une révision : `BROUILLON`, `SOUMISE`, `A_COMPLETER`, `VALIDEE`.

- Un évaluateur prépare et soumet. La soumission exige un responsable, un constat et tous les attendus requis évalués.
- Pour tout critère partiel ou non conforme, exiger un écart lié avant validation. Plusieurs attendus peuvent partager un écart explicitement rattaché.
- Un validateur approuve ou demande des compléments avec motif.
- Seule une révision validée représente une conclusion validée. Les résultats déclarés restent distingués visuellement.
- Soumettre ou valider un résultat exige une applicabilité effective applicable. Une non-applicabilité suit son propre circuit et une applicabilité indéterminée doit d'abord être tranchée.
- Modifier une révision soumise nécessite de la retirer en brouillon. Une modification de contenu ne doit jamais conserver sa soumission ou validation.
- Le validateur peut être l'évaluateur en V1 s'il possède les deux permissions. Enregistrer les deux fonctions. Ne pas imposer artificiellement deux personnes aux petites équipes.

Une nouvelle révision indique « Réévaluation en cours » et laisse consulter la dernière conclusion validée avec sa date. Les tableaux de bord distinguent cette conclusion historique de la révision active non validée.

### 7.5 Réexamen et fraîcheur

La prochaine revue est obligatoire lors d'une validation ou approbation de non-applicabilité. La campagne propose une fréquence interne par défaut de 12 mois, modifiable. Ce choix n'est pas présenté comme une exigence du référentiel.

Une échéance dépassée ajoute un indicateur « À réexaminer ». Elle n'altère pas silencieusement le résultat historique. Une nouvelle version de preuve déclenche un signal de réexamen pour les évaluations concernées, sans remplacer leurs versions liées.

## 8. Gestion des preuves

Pour toute preuve : titre, type, description, source, auteur et date de collecte. Ajouter la période couverte lorsqu'elle est pertinente. L'étendue exacte est précisée dans chaque lien avec un attendu.

Types V1 :

- Fichier déposé via le stockage privé existant
- Lien HTTPS externe avec titre, source, date et référence de version déclarée
- Observation, entretien ou test saisi sous forme de compte rendu structuré

Le serveur ne télécharge pas une URL externe et ne tente pas de l'analyser en V1. Le lien est identifié comme preuve externe dont le contenu n'est pas figé par Starium.

Réutiliser une preuve existante sans duplication du fichier. Le sélecteur ne retourne que les preuves autorisées. Un utilisateur doit disposer du droit d'accès à la preuve et de modification de l'évaluation pour créer le lien.

Accéder à une campagne n'accorde pas automatiquement l'accès à toutes ses preuves. Pour un élément restreint, afficher un marqueur neutre sans titre sensible. Une vue réservée au validateur doit permettre l'examen des éléments nécessaires avant validation.

Appliquer aux fichiers les limites, validations de type, protections et contrôles du dépôt. Ne pas exposer d'URL publique permanente. Les téléchargements et exports vérifient les droits courants.

## 9. Contributions, écarts et efficacité

### 9.1 Contributions

Une contribution comporte destinataire, consigne, cible et échéance. États : à faire, en cours, bloquée, soumise, acceptée ou à compléter. Le contributeur fournit sa réponse et ses éléments, sans pouvoir valider le critère par ce seul rôle.

La réaffectation conserve l'historique. Un compte désactivé ne supprime pas ses contributions. Le pilote est alerté des demandes sans responsable actif.

### 9.2 Écarts

États : `OUVERT`, `EN_TRAITEMENT`, `A_VERIFIER`, `CLOTURE`, `ANNULE`.

Chaque écart possède un constat, une criticité, un responsable et une échéance. Prévoir la cause identifiée et les conséquences métier, sans imposer une méthode d'analyse spécifique.

- Créer ou rattacher une ou plusieurs actions existantes.
- La réalisation des actions permet de demander une vérification, sans fermer l'écart automatiquement.
- La clôture exige une vérification positive, son auteur, sa date, son commentaire et au moins un élément justificatif.
- Une vérification négative ramène l'écart en traitement et conserve la tentative.
- Fermer un écart ne transforme pas automatiquement son critère en conforme : une nouvelle évaluation est nécessaire.
- Pour une erreur ou un doublon, permettre une annulation motivée par un gestionnaire, séparée d'une clôture pour efficacité et exclue du taux de correction.

Réutiliser le modèle d'actions du dépôt. S'il n'existe pas, implémenter une action corrective minimale dans le module avec titre, responsable, échéance, état et liens. Ne pas construire un gestionnaire de projets parallèle. Documenter le choix et le point d'intégration futur.

## 10. Expérience utilisateur

Ajouter les écrans à la navigation existante et respecter le design system.

| Vue | Contenu indispensable |
|---|---|
| Vue d'ensemble | Campagnes, évaluations incomplètes, revues dues, écarts importants et décisions attendues |
| Mes contributions | Demandes assignées, consigne, échéance, blocage et réponse |
| Référentiels | Liste, édition des brouillons, publication, versions et import |
| Campagne | Périmètre, version, responsables, dates, état et progression |
| Grille des critères | Chapitre, code, applicabilité effective, résultat, validation, fraîcheur, responsable et échéance |
| Fiche critère | Attendus, recommandations, preuves, constats, écarts et historique |
| Écarts et actions | Filtres par criticité, responsable, échéance, état et campagne |
| Vue direction | Conséquences métier, blocages, projets associés et arbitrages |
| Dossiers d'audit | Instantanés datés, export, périmètre couvert et éléments non inclus |

Filtres combinables et pagination serveur pour les listes. Conserver les filtres dans l'URL si c'est la convention du dépôt. Prévoir états vides, chargement, erreurs et conflits d'édition. Les champs obligatoires doivent être indiqués avant soumission. Les statuts ne reposent pas uniquement sur des couleurs.

La fiche critère doit permettre à un contributeur de comprendre son travail sans naviguer dans tout le référentiel. Les recommandations restent visuellement séparées des attendus évalués.

## 11. Intégration au pilotage Starium

Liens multiples autorisés vers les objets existants, avec validation serveur du type, de l'organisation et des droits. Un utilisateur disposant du droit de liaison ne peut pas créer ou modifier une cible sans ses permissions propres.

| Module constaté dans le dépôt | Comportement V1 |
|---|---|
| Actions | Créer ou rattacher une action depuis un écart et montrer son état réel |
| Projets | Rattacher un projet existant. Créer via le flux existant si disponible et autorisé |
| Risques | Relier un risque existant et afficher les informations autorisées |
| Budgets | Rattacher les lignes ou objets financiers existants sans les recopier |
| Réunions / décisions | Ajouter au flux d'arbitrage existant ou rattacher une décision accessible |

Si risques, budgets ou réunions n'existent pas ou ne sont pas activés : masquer l'intégration correspondante, conserver un blocage métier textuel et un besoin d'arbitrage interne avec responsable, échéance et état « à préparer / à décider / décidé ». Ce besoin est une extension de l'écart, pas un second module de réunions. Il ne prétend pas qu'une décision externe a été enregistrée.

Si projets n'existe pas, les actions correctives permettent d'achever le parcours V1. Documenter la dépendance manquante, sans créer un faux projet.

Budget : aucun montant ne doit être additionné au niveau des critères. Dédupliquer les objets financiers par leur identifiant. Ne pas additionner simultanément le total d'un projet et ses lignes de budget. En cas de devises ou bases incompatibles, afficher des totaux séparés ou renoncer au total consolidé. Réutiliser les règles financières du produit.

L'autorisation d'accéder à un objet conformité ne doit pas divulguer le titre, le montant ou le contenu d'une cible de pilotage restreinte.

## 12. Indicateurs V1

Calculer les indicateurs sur les seuls critères évaluables visibles de la campagne et indiquer tout filtrage partiel.

Notations :

- `N` : nombre total de critères évaluables du périmètre figé
- `NA` : critères dont la décision effective est non applicable et approuvée
- `U` : critères dont l'applicabilité effective reste à déterminer
- `A = N - NA - U` : critères effectivement applicables
- `E` : critères applicables dont tous les attendus requis sont évalués dans la révision active
- `V` : critères applicables dont la révision active est validée
- `C` : critères applicables dont la révision active est validée conforme

Afficher :

1. Couverture d'évaluation : `E / A`
2. Couverture de validation : `V / A`
3. Part des critères applicables validés conformes : `C / A`
4. Répartition des résultats actifs, des validations, des non-applicables et des indéterminés
5. Nombre de revues dépassées, écarts critiques ouverts, actions en retard et arbitrages attendus

Afficher les effectifs et le dénominateur à côté de chaque pourcentage. Si `A = 0`, afficher « Non calculable », jamais 100 %. Les critères applicables non évalués restent au dénominateur. Les demandes de non-applicabilité en attente ne changent pas `NA`.

La fraîcheur reste distincte de la conclusion. Afficher combien de conclusions validées nécessitent une revue, notamment au sein de `C`. Ne pas présenter `C / A` comme un taux officiel de certification ou une garantie de préparation à l'audit.

Ne pas calculer une moyenne simple entre campagnes. V1 : présenter les campagnes séparément et consolider seulement des compteurs d'objets dédupliqués, en signalant les périmètres ou versions non comparables.

## 13. Permissions et sécurité

Mapper ces capacités aux conventions existantes : lecture, gestion des référentiels, gestion des campagnes, contribution, évaluation, validation, gestion des écarts, export et gestion des accès.

| Profil fonctionnel | Accès par défaut |
|---|---|
| Administrateur d'organisation | Configuration et attribution des capacités selon le système existant |
| Pilote conformité | Gestion des campagnes et affectations, évaluation, validation, écarts et export sur ses périmètres |
| Évaluateur | Lecture autorisée et préparation/soumission des évaluations affectées |
| Contributeur | Réponse aux demandes assignées et consultation du contexte minimal autorisé |
| Validateur | Examen, approbation ou retour des éléments autorisés |
| Direction | Synthèse autorisée, accès aux détails selon droits propres |
| Auditeur lecteur | Consultation des campagnes ou instantanés accordés, export seulement si accordé |

Tous les contrôles s'appliquent aux API, listes, compteurs, recherches, fichiers et exports. Déduire l'organisation de la session et vérifier chaque relation, pas seulement le parent de la requête.

Réutiliser les comptes invités et dates d'expiration si le produit les possède. Sinon, le rôle auditeur repose en V1 sur un compte existant à accès limité. Aucun lien public anonyme.

Protéger les opérations métier contre les mises à jour directes d'états. Utiliser les contrôles de concurrence existants, ou un numéro de révision attendu. En cas de conflit, retourner une erreur explicite sans écraser le travail concurrent.

Les historiques ne doivent contenir ni liens temporaires de téléchargement ni contenu brut de documents sensibles. Conserver l'identité historique d'un auteur désactivé, selon les mécanismes du dépôt.

## 14. Imports, exports et rappels

### 14.1 Imports CSV

Deux parcours séparés : référentiel vers un brouillon et évaluations vers une campagne ouverte.

Référentiel : chapitre, code critère, titre critère, nature, criticité, politique de non-applicabilité, code attendu, texte attendu, requis, méthode, exemples, recommandation et source. Une ligne par attendu. Les colonnes facultatives ont des valeurs par défaut documentées. Fournir un modèle téléchargeable et un exemple fictif.

Évaluations : code critère, code attendu, résultat déclaré, constat, responsable identifié par un identifiant stable ou email exact, échéance et référence facultative de preuve autorisée. Une demande de non-applicabilité importée reste à valider.

Avant écriture : aperçu, association des colonnes, validation de chaque ligne, doublons, codes inconnus et droits. Refuser toute ligne ambiguë. V1 : import atomique après correction de toutes les erreurs, sans succès partiel silencieux.

Ne jamais importer une validation sur la seule base d'une colonne CSV. Conserver une date historique déclarée séparée des horodatages système. Ne pas remplacer automatiquement les versions de preuves.

La confirmation porte sur le contenu exact prévisualisé, avec empreinte et version attendue du brouillon/campagne. Une clé d'idempotence empêche le double traitement d'une même confirmation. Détecter les lignes déjà présentes lors d'un nouvel import. Ne jamais écraser une révision validée : préparer une nouvelle révision.

Réutiliser les limites existantes ou fixer un plafond documenté de 5 Mo et 10 000 lignes pour V1. Échapper les cellules à risque de formule dans les exports destinés aux tableurs.

### 14.2 Instantanés et exports

Créer un instantané en cours ou à la clôture, dans une lecture cohérente des données. Conserver version de référentiel, périmètre, résultats, justifications, validations, états d'écarts, actions et décisions au moment de la coupure.

Le dossier ZIP contient : synthèse HTML lisible, tableaux CSV, données JSON structurées et manifeste des preuves avec références de versions. Inclure les fichiers privés autorisés et disponibles. Les liens externes restent des références clairement signalées comme non figées. Les observations sont figées dans les données exportées.

Afficher les éléments exclus ou indisponibles sans divulguer de métadonnées sensibles. Pour un utilisateur à vue partielle, indiquer « Export partiel selon vos droits ». Un compte lecture seule n'obtient pas implicitement la permission d'export.

Stocker les exports en privé avec une durée limitée configurable. Revérifier l'accès lors du téléchargement et révoquer l'accès après retrait des permissions. Pour un export asynchrone, contrôler les droits à la génération et à la récupération. Ne pas considérer le statut historique d'auditeur comme une autorisation permanente.

### 14.3 Rappels

Réutiliser le système de notifications interne. Rappeler à J-7, à l'échéance puis une fois par semaine après échéance pour contributions, actions et revues, selon les préférences utilisateur existantes. Regrouper les rappels par destinataire et désactiver les relances des objets terminés ou archivés.

Dédupliquer par objet, échéance, destinataire et occurrence de rappel. Respecter le fuseau de l'organisation, sinon celui configuré dans l'application. Exécuter les traitements via le planificateur existant, jamais à la simple ouverture d'une page. Si aucun planificateur n'existe, fournir une commande idempotente et sa configuration d'exploitation documentée. Les mails ne sont utilisés que si l'infrastructure et les préférences existantes le prévoient.

## 15. Contrats techniques à couvrir

Adapter les routes à l'architecture existante. Les opérations suivantes doivent être exposées avec validation serveur et erreurs métier compréhensibles :

- Créer/modifier/publier/retirer une version de référentiel
- Prévisualiser et confirmer un import
- Créer, ouvrir, clôturer et archiver une campagne
- Affecter les responsables et gérer les contributions
- Demander, approuver ou refuser une non-applicabilité
- Créer une révision, évaluer, soumettre, demander des compléments et valider
- Créer/versionner une preuve et gérer ses liens
- Créer/traiter/vérifier/clôturer un écart et gérer les relations de pilotage
- Lire les indicateurs et l'historique
- Créer un instantané, demander un export et le télécharger

Prévoir pagination, filtres autorisés et index alignés avec organisation, campagne, état, responsable et échéance. Les opérations complexes de publication, ouverture, validation, import et instantané doivent être atomiques ou utiliser le mécanisme transactionnel fiable du dépôt.

Ne pas construire un CRUD générique permettant de contourner ces transitions. Les événements d'historique et notifications sont déclenchés après succès de la mutation et ne doivent pas être doublés lors d'une répétition.

## 16. Migration et déploiement technique

- Réutiliser le mécanisme d'activation de modules existant. À défaut, ajouter une activation par organisation, désactivée initialement.
- Procéder par migrations additives. Ne supprimer aucune donnée de conformité existante dans cette RFC.
- Si des évaluations historiques existent, définir la table de correspondance des statuts et conserver leur provenance. Une validation sans auteur/date vérifiable reste une déclaration historique à revoir.
- Ajouter les contraintes après contrôle et reprise des données, avec rapport des exceptions.
- Fournir les commandes de migration, éventuelle reprise et vérification ainsi qu'une procédure de retour à l'ancienne version de l'application. La désactivation du module ne doit pas effacer les données.
- Aucun jeu de démonstration n'est injecté dans les organisations de production par défaut.
- Le dépôt doit contenir une documentation d'utilisation et d'exploitation : activation, rôles, imports, rappels, export, limites et sauvegarde des fichiers associés.

## 17. Critères de recette obligatoires

| ID | Scénario | Résultat attendu |
|---|---|---|
| AC-01 | Publier puis tenter de modifier une version | Mutation refusée, nouvelle version nécessaire |
| AC-02 | Ouvrir deux fois une campagne avec la même requête | Aucun doublon d'évaluation |
| AC-03 | Modifier le périmètre d'une campagne ouverte | Refus explicite et proposition d'une nouvelle campagne |
| AC-04 | Déposer une preuve sans évaluer | Aucun critère ne devient conforme |
| AC-05 | Réutiliser la même preuve sur deux attendus | Un fichier, deux appréciations indépendantes |
| AC-06 | Demander une non-applicabilité | Indicateurs inchangés avant approbation |
| AC-07 | Approuver une non-applicabilité interdite ou sans motif | Refus côté serveur |
| AC-08 | Valider un conforme sans justificatif examiné | Refus avec identification de l'attendu incomplet |
| AC-09 | Valider un résultat partiel sans écart | Refus explicite |
| AC-10 | Modifier une évaluation validée | Nouvelle révision, historique intact, validation non transférée |
| AC-11 | Remplacer une preuve par une nouvelle version | Ancienne référence conservée et signal de réexamen |
| AC-12 | Dépasser une date de revue | Signal visible, aucune réécriture du résultat historique |
| AC-13 | Terminer toutes les actions d'un écart | Écart non clôturé sans vérification d'efficacité |
| AC-14 | Fermer un écart après vérification positive | Critère non promu automatiquement en conforme |
| AC-15 | Accéder à un identifiant d'une autre organisation | Aucun accès ni divulgation, y compris fichiers et compteurs |
| AC-16 | Contributeur tentant de valider | Refus côté serveur |
| AC-17 | Lier une preuve ou un budget inaccessible | Refus sans divulgation des métadonnées |
| AC-18 | Deux éditions concurrentes | La seconde ne remplace pas silencieusement la première |
| AC-19 | Import avec code inconnu, doublon ou utilisateur ambigu | Prévisualisation en erreur et aucune écriture |
| AC-20 | Répéter la confirmation d'un import | Aucun traitement en double |
| AC-21 | Tous les critères non applicables ou indéterminés | Pourcentage non calculable, effectifs visibles |
| AC-22 | Cas N=10, NA=2, U=1, E=4, V=3, C=2 | A=7, couverture 4/7, validation 3/7, conformes validés 2/7 |
| AC-23 | Même projet lié à plusieurs écarts | Budget non compté plusieurs fois |
| AC-24 | Clôturer une campagne incomplète | Instantané mentionnant explicitement les manques |
| AC-25 | Changer une action après instantané | État historique exporté inchangé, état courant distinct |
| AC-26 | Révoquer les droits avant téléchargement d'un export | Téléchargement refusé |
| AC-27 | Réexécuter le traitement de rappels | Pas de notification en double |
| AC-28 | Dupliquer une campagne | Aucune validation ou exclusion reconduite sans revue |
| AC-29 | Module budget absent | Parcours d'écart fonctionnel, aucun faux budget ni bouton inactif |
| AC-30 | Critère avec attendus requis conformes et recommandation non réalisée | Recommandation sans effet sur le résultat |

## 18. Tests attendus

- Tests unitaires des règles d'agrégation, indicateurs, transitions et dates de revue
- Tests d'intégration des permissions, frontières entre organisations, fichiers et relations croisées
- Tests transactionnels ou d'intégration pour import, validation, concurrence et idempotence
- Tests des exports : cohérence à la date de coupure, droits, liens externes et protection des cellules CSV
- Tests des notifications : fuseau, répétition, réaffectation et arrêt après clôture
- Un parcours de bout en bout : import fictif → campagne → contribution → évaluation partielle → écart → action → efficacité → réévaluation → instantané
- Un parcours de refus : compte contributeur ou autre organisation tentant les mêmes opérations protégées

Utiliser les outils déjà présents. Ne pas annoncer un test exécuté si seules les commandes ou les fichiers de test ont été préparés. Documenter les limitations réelles de l'environnement et les tests restant à exécuter.

## 19. Lots d'implémentation

| Lot | Livrable | Condition de fin |
|---|---|---|
| C0 | Inventaire du dépôt, réutilisations, adaptations et migrations prévues | Décisions techniques fondées sur le code réel |
| C1 | Référentiels, attendus, versions et imports | Publication immuable et import vérifié |
| C2 | Campagnes, rôles, applicabilité, évaluations et preuves | Parcours de validation et isolation testés |
| C3 | Contributions, écarts, efficacité et intégrations | Parcours de correction et arbitrage opérationnel |
| C4 | Indicateurs, historique, instantanés, exports et rappels | Cohérence des données et accès vérifiés |
| C5 | Reprise éventuelle, documentation et recette | Critères AC couverts, commandes et limites communiquées |

Ne pas livrer uniquement les écrans ni un backend sans parcours utilisable. Chaque lot doit conserver le fonctionnement des modules existants. Une capacité hors V1 ne doit pas retarder le parcours principal.

## 20. Livrables demandés à Cursor

1. RFC enregistrée selon les conventions du dépôt et note d'écarts éventuels
2. Inventaire de l'existant et plan d'implémentation suivi
3. Migrations, contraintes, services métier et contrôles d'accès
4. Écrans intégrés au design system et navigation existante
5. Modèles CSV, référentiel fictif et parcours de démonstration
6. Tests exécutables et bilan des vérifications réellement réalisées
7. Documentation fonctionnelle, commandes d'exploitation et procédure de migration
8. Récapitulatif final : changements, intégrations, critères de recette couverts, limites et éventuels blocages

La fonctionnalité est terminée lorsque le parcours V1 est utilisable de bout en bout, que les critères de recette sont couverts et qu'aucune validation, preuve ou information d'une autre organisation ne peut être exposée par contournement des écrans.
