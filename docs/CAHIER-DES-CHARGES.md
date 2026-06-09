# Cahier des charges fonctionnel — Starium Orchestra

**Document de référence produit** — description des fonctionnalités par module, sans vocabulaire technique.

---

## 1. Objet et positionnement

**Starium Orchestra** est une plateforme de pilotage destinée aux fonctions support, en priorité aux directions des systèmes d'information (DSI internes ou à temps partagé gérant plusieurs organisations).

**Problème adressé** : aujourd'hui, le pilotage IT est souvent éclaté (tableurs, outils dispersés), ce qui crée une perte de visibilité sur les coûts, les projets, les fournisseurs et les risques.

**Promesse produit** : un **cockpit unique de gouvernance** permettant de consolider, structurer et décider — pas un outil de ticketing, pas un outil d'exploitation technique.

**Utilisateurs cibles** :

- DSI à temps partagé (plusieurs organisations)
- DSI interne
- Chefs de projet IT
- Direction / CODIR (lecture, arbitrage, reporting)

---

## 2. Principes transverses (tous modules)

| Principe | Fonctionnalité attendue |
|----------|-------------------------|
| Multi-organisation | Un utilisateur peut appartenir à plusieurs organisations ; il choisit celle sur laquelle il travaille ; toutes les données affichées et modifiées concernent uniquement cette organisation |
| Droits d'accès | Chaque action (consulter, créer, modifier, valider, arbitrer…) dépend du profil de l'utilisateur ; les menus et boutons s'adaptent |
| Modules activables | Chaque organisation peut activer ou non certains domaines fonctionnels |
| Traçabilité | Les actions sensibles (changements de droits, validations, arbitrages…) sont historisées pour savoir qui a fait quoi et quand |
| Libellés métier | Partout dans l'interface, l'utilisateur voit des noms, titres, codes lisibles — jamais des identifiants internes |
| Alertes et notifications | Signalement des situations critiques ; notifications in-app pour informer les personnes concernées |
| Recherche transversale | Une loupe unique pour retrouver rapidement projets, budgets, articles d'aide, etc. |
| Documents | Possibilité de joindre et consulter des pièces (contrats, commandes, preuves de conformité, documents projet…) |

---

## 3. Accès et session

### 3.1 Connexion

- Connexion par identifiant et mot de passe
- Connexion via compte Microsoft (entreprise)
- Authentification renforcée (code sur téléphone, e-mail ou code de secours)
- Option « faire confiance à cet appareil » pour limiter les demandes répétées
- Gestion du profil utilisateur (compte personnel)

### 3.2 Choix de l'organisation active

- Sélection de l'organisation de travail quand l'utilisateur en a plusieurs
- Affichage permanent de l'organisation active dans l'interface
- Blocage des écrans métier si aucune organisation n'est rattachée

### 3.3 Tableau de bord d'accueil

- Vue synthétique : indicateurs clés, alertes, raccourcis vers les domaines prioritaires
- *(État actuel : partiellement livré)*

---

## 4. Administration plateforme

*Réservé aux administrateurs globaux de la solution.*

### 4.1 Gestion des organisations clientes

- Créer, consulter et modifier les organisations
- Paramétrer les informations de base de chaque organisation
- Onboarding d'une nouvelle organisation (création → rattachement utilisateurs → vérification)

### 4.2 Gestion des utilisateurs

- Rechercher et consulter les utilisateurs
- Rattacher un utilisateur à une ou plusieurs organisations
- Réinitialiser l'authentification renforcée d'un utilisateur

### 4.3 Rôles système

- Définir des profils d'accès globaux (lecture plateforme, administration, etc.)
- Attribuer des droits fins par profil

### 4.4 Journal d'audit global

- Consulter l'historique des actions sur la plateforme
- Filtrer par période, acteur, type d'action
- Investiguer un incident (qui a modifié un rôle, un utilisateur, un paramètre)

### 4.5 Paramètres globaux

- Personnalisation visuelle (badges, couleurs)
- Paramètres de connexion Microsoft
- Paramètres de stockage des documents achats
- Paramètres de téléversement de fichiers
- Types d'occasions pour les instantanés budgétaires

### 4.6 Licences et abonnements (vue plateforme)

- Cockpit des abonnements par organisation
- Reporting commercial (vue consolidée, export)
- Gestion des dates de validité et périodes de grâce

### 4.7 Assistant d'aide (Cursor Starium)

- Administration des questions/réponses préconfigurées
- Base d'articles d'aide consultables par les utilisateurs
- *(Pas d'intelligence artificielle générative : réponses administrées)*

---

## 5. Administration organisation (client)

*Réservé aux administrateurs de chaque organisation.*

### 5.1 Hub d'administration

- Point d'entrée unique vers tous les paramètres de l'organisation

### 5.2 Membres

- Lister les personnes rattachées à l'organisation
- Ajouter ou retirer des membres
- Attribuer des rôles métier à chaque membre

### 5.3 Rôles et permissions

- Créer des profils métier (ex. : chef de projet, lecteur budget, acheteur)
- Cocher les droits par domaine (projets, budgets, achats, etc.)
- Assigner les profils aux membres

### 5.4 Organisation interne

- Définir l'arborescence des directions / services / unités
- Regrouper des unités
- Rattacher les collaborateurs aux unités
- Indiquer la **direction propriétaire** des ressources (projets, budgets, contrats…)

### 5.5 Intégration Microsoft 365

- Configurer la connexion Microsoft de l'organisation
- Permettre la synchronisation avec l'écosystème Microsoft (équipes, planning, documents)

### 5.6 Synchronisation des équipes

- Importer ou synchroniser les collaborateurs depuis l'annuaire d'entreprise

### 5.7 Taxonomie des risques

- Structurer les domaines et types de risques utilisés dans le registre

### 5.8 Badges et vocabulaire visuel

- Personnaliser les libellés et couleurs des statuts affichés dans l'organisation

### 5.9 Workflow des demandes projet

- Définir qui peut valider une demande
- Choisir la destination après approbation (backlog, création directe de projet, etc.)

### 5.10 Cockpits d'accès et de licences

- Visualiser l'état des droits effectifs
- Diagnostiquer les problèmes d'accès
- Consulter le modèle d'accès (checklist de déploiement, anomalies)
- Gérer les sièges et abonnements de l'organisation

---

## 6. Budgets et pilotage financier

### 6.1 Exercices budgétaires

- Créer et gérer les exercices (années ou périodes de référence)
- Associer un ou plusieurs budgets à un exercice

### 6.2 Budgets

- Créer, consulter, modifier un budget
- Paramétrer le budget (workflow, règles de validation)
- Liste et recherche des budgets

### 6.3 Cockpit budget

- Indicateurs clés : prévu, engagé, consommé, écart
- Filtres par périmètre (enveloppe, centre de coûts, nature…)
- Commentaires et annotations sur les lignes
- Accès rapide aux sous-vues (reporting, instantanés, import)

### 6.4 Enveloppes et lignes budgétaires

- Structurer le budget en enveloppes thématiques
- Créer des lignes avec montants prévisionnels
- Modifier, archiver des lignes
- Vue explorateur : navigation budget → enveloppe → ligne
- Fiche détaillée d'une ligne (allocations, historique, événements financiers)

### 6.5 Lien avec les achats

- Voir les commandes et factures rattachées à une ligne
- Suivre l'impact financier des engagements sur le prévisionnel

### 6.6 Import de données budgétaires

- Importer des montants depuis un fichier
- Assistant de correspondance des colonnes
- Prévisualisation avant validation
- Rapport d'anomalies

### 6.7 Instantanés (snapshots)

- Figer l'état du budget à une date donnée (comité, arbitrage, clôture)
- Nommer l'occasion (budget initial, révision T2, etc.)
- Comparer un instantané figé à l'état courant
- Lecture seule des instantanés passés

### 6.8 Reporting et comparaison

- Tableaux d'écarts prévu / réalisé
- Comparaisons entre versions ou instantanés
- Prévisions et atterrissage (forecast)
- Vues adaptées à la présentation en comité

### 6.9 Réallocations

- Transférer des montants entre lignes
- Historiser les mouvements
- *(Écran dédié : en cours de livraison)*

### 6.10 Versions budgétaires

- Gérer plusieurs versions d'un même budget (scénarios budgétaires)
- *(Écran dédié : en cours de livraison)*

### 6.11 Workflow budgétaire

- Paramétrer les étapes de validation
- Historiser les décisions budgétaires

### 6.12 Lien projets ↔ budget

- Rattacher un projet à une ou plusieurs lignes budgétaires
- Suivre la consommation projet sur le budget

---

## 7. Achats, fournisseurs et facturation

### 7.1 Tableau de bord achats

- Vue macro : fournisseurs actifs, commandes en cours, factures en attente

### 7.2 Fournisseurs

- Créer, consulter, modifier un fournisseur
- Catégoriser les fournisseurs
- Ajouter logo et informations clés
- Fiche fournisseur consolidée

### 7.3 Contacts fournisseurs

- Gérer les interlocuteurs par fournisseur
- Désigner un contact principal

### 7.4 Commandes d'achat

- Créer une commande liée à un fournisseur
- Saisir référence, libellé, montants
- Joindre des pièces (bon de commande, devis)
- Suivre le statut de la commande
- Lier à une ligne budgétaire

### 7.5 Factures

- Enregistrer une facture (fournisseur, commande associée)
- Numéro, date, montant, statut
- Joindre les justificatifs
- Contrôles de cohérence avec commandes et budget

### 7.6 Documents achats

- Stockage et consultation des pièces liées aux achats

---

## 8. Contrats

### 8.1 Registre des contrats

- Lister, rechercher, filtrer les contrats
- Créer un contrat (fournisseur, type, dates, statut)
- Fiche contrat détaillée

### 8.2 Types de contrats

- Définir les catégories métier (maintenance, licence, prestation…)
- Activer / désactiver des types

### 8.3 Suivi contractuel

- Dates de début et fin
- Alertes d'échéance et de renouvellement
- Documents contractuels joints
- Lien avec fournisseur et lignes budgétaires

### 8.4 Licences logicielles

- Référencer les licences
- Lier une licence à un contrat
- Suivre les quantités, dates, renouvellements

---

## 9. Projets

### 9.1 Portefeuille projets

- Liste de tous les projets de l'organisation
- Filtres : statut, priorité, criticité, catégorie, étiquettes, responsable, dates
- Tri et recherche
- Vue Gantt portefeuille (planning consolidé)

### 9.2 Création et fiche projet

- Créer un projet (nom, type, statut, priorité, criticité, dates)
- Désigner un responsable (utilisateur ou identité libre)
- Catégories et étiquettes
- Indicateurs de santé du projet
- Fiche décisionnelle (synthèse pour le pilotage)

### 9.3 Planning

- Tâches avec dates de début et fin
- Jalons
- Vue Gantt interactive
- Regroupement par lots / streams
- Buckets de planification (colonnes de travail)

### 9.4 Activités et suivi

- Journal d'activités du projet
- Points de suivi (COPIL, COPRO, revues, retour d'expérience)

### 9.5 Présentation comité CODIR

- Mode présentation avec widgets configurables par projet
- Indicateurs d'exécution, gouvernance, propriété
- Planning, jalons, décisions, actions, alertes
- Réorganisation des widgets par glisser-déposer

### 9.6 Options projet

- Paramètres spécifiques au projet (intégration planning externe, etc.)

### 9.7 Documents projet

- Joindre et consulter des documents
- Synchronisation optionnelle vers Teams

### 9.8 Lien Microsoft 365

- Connecter un projet à un espace Microsoft (Planner, Teams)
- Synchroniser les tâches et documents

---

## 10. Demandes projet (amont portefeuille)

*Couche en amont du portefeuille : une demande n'est pas encore un projet.*

### 10.1 Soumission

- Tout collaborateur habilité peut déposer une demande (besoin, opportunité, intention)
- Description, budget estimé, demandeur

### 10.2 Workflow de validation

- Soumettre pour validation
- Valider, refuser ou demander des compléments
- Routage configurable après approbation (backlog, création de projet brouillon, etc.)

### 10.3 Suivi

- Liste des demandes par statut
- Historique des décisions
- Conversion en projet si validée

---

## 11. Scénarios projet

*Pour les projets à forte incertitude ou arbitrage en comité.*

### 11.1 Variantes

- Créer plusieurs scénarios pour un même projet (ex. : prudent, accéléré)
- Paramétrer chaque variante (charge, délai, budget, risques)

### 11.2 Cockpit de comparaison

- Comparer la baseline et les scénarios côte à côte
- Lire les écarts sur charge, délai, budget, risque
- Retenir le scénario gagnant

### 11.3 Capacité et ressources

- Évaluer la faisabilité en capacité
- Planifier les ressources par scénario

---

## 12. Cycles de pilotage et arbitrage CODIR

*Couche transverse pour prioriser et décider en comité.*

### 12.1 Cycles

- Créer un cycle de pilotage (ex. : CODIR T2, arbitrage trimestriel)
- Définir la cadence, les dates, le sponsor, l'objectif

### 12.2 Candidatures

- Proposer un projet (ou autre objet) pour intégrer le cycle
- Depuis la fiche projet ou le cycle

### 12.3 Matrice d'arbitrage

- Lister les sujets du cycle
- Noter valeur, alignement, budget, capacité, risque
- Score de priorité calculé automatiquement
- Décision par sujet : accepté, différé, refusé

### 12.4 Séances de comité

- Préparer l'ordre du jour (sujets candidats)
- Ouvrir une séance
- Enregistrer les décisions
- Clôturer la séance avec propagation des décisions (statut projet, arbitrage budget…)

### 12.5 Synthèse

- Indicateurs du cycle (nombre de sujets, acceptés, différés)
- Lien avec l'historique du projet

---

## 13. Risques et plans d'action

### 13.1 Registre des risques

- Vue globale de tous les risques de l'organisation
- Vue par projet
- Filtres par statut, criticité, propriétaire

### 13.2 Fiche risque

- Titre, description, probabilité, impact
- Propriétaire, statut
- Taxonomie (domaine, type) configurable
- Méthode d'analyse simplifiée (EBIOS RM minimal)

### 13.3 Plans d'action

- Créer un plan d'action lié à un risque ou un projet
- Décomposer en tâches avec responsable et échéance
- Suivre l'avancement
- Boucle : risque détecté → plan d'action → risque réduit

### 13.4 Lien conformité

- Relier un risque à une exigence de conformité non satisfaite

---

## 14. Vision stratégique

*Couche d'alignement entre le cap de l'entreprise et l'exécution.*

### 14.1 Vision

- Définir la vision stratégique de l'organisation (horizon, ambition, contexte)

### 14.2 Axes stratégiques

- Structurer les priorités en axes
- Hiérarchie vision → axes → objectifs

### 14.3 Objectifs stratégiques

- Créer des objectifs mesurables avec échéance et statut
- Relier des projets (et à terme budgets, risques) aux objectifs

### 14.4 Indicateurs d'alignement

- Taux de projets alignés sur la stratégie
- Nombre de projets non alignés
- Objectifs à risque, hors trajectoire, en retard

### 14.5 Alertes de désalignement

- Signalement automatique des écarts stratégiques
- Widgets pour le CODIR

### 14.6 Cockpit stratégique

- Vue consolidée vision + axes + objectifs + KPI + alertes

---

## 15. Stratégie par direction

*Découpage de la lecture stratégique par direction métier.*

### 15.1 Référentiel des directions

- Définir les directions (SI, RH, Finance, Cybersécurité, Data…)

### 15.2 Stratégie par direction

- Rédiger la stratégie de chaque direction, ancrée sur la vision globale
- Workflow de soumission et validation CODIR
- Historique des versions (brouillon, soumis, validé, archivé)

---

## 16. Ressources, équipes et temps

### 16.1 Référentiel ressources

- Créer et maintenir le catalogue des ressources (humaines et autres)
- Rôles des ressources

### 16.2 Collaborateurs

- Fiche collaborateur (identité, rattachement, attributs)
- Lien avec l'annuaire synchronisé

### 16.3 Compétences

- Catalogue de compétences
- Associer des compétences aux collaborateurs

### 16.4 Équipes de travail

- Créer des équipes
- Affecter des membres
- Désigner un responsable d'équipe
- Arborescence des équipes
- Archiver / restaurer

### 16.5 Périmètres managers

- Définir ce qu'un manager peut voir (équipes, collaborateurs)
- Prévisualiser le périmètre avant validation

### 16.6 Types d'activité

- Taxonomie des types de temps (projet, support, formation…)

### 16.7 Feuilles de temps

- Saisie mensuelle du temps par collaborateur (jour, projet, activité)
- Brouillon → soumission → validation manager
- Déverrouillage pour correction
- Clôture mensuelle

---

## 17. Conformité

### 17.1 Tableau de bord conformité

- Vue d'ensemble : conforme, non conforme, non évalué
- Priorisation des écarts critiques

### 17.2 Référentiels (frameworks)

- Activer des cadres de référence (ISO, SOC, interne…)

### 17.3 Exigences

- Liste des exigences par référentiel
- Évaluation du statut (conforme, non conforme, non évalué, partiel)
- Commentaires d'analyse
- Preuves documentaires jointes
- Lien vers risques et plans d'action correctifs

### 17.4 Reporting conformité

- Préparation de présentation comité (écarts majeurs, preuves, plan de correction)

---

## 18. Droits d'accès granulaires

*Au-delà des rôles globaux : contrôle fin par ressource.*

### 18.1 Accès par ressource

- Définir qui peut voir ou modifier un projet, budget, contrat, etc.
- Politique par défaut ou partage ciblé

### 18.2 Diagnostic d'accès

- Comprendre pourquoi un utilisateur a ou n'a pas accès à une ressource
- Matrice des droits effectifs (administrateur)
- Auto-diagnostic pour l'utilisateur (« pourquoi je ne vois pas ceci ? »)

### 18.3 Modèle d'accès

- Checklist de déploiement des bonnes pratiques d'accès
- Détection des anomalies (ressources sans propriétaire, ACL incohérentes)
- Export pour audit

---

## 19. Alertes et notifications

### 19.1 Alertes

- Liste des alertes actives (critiques, avertissements)
- Résoudre ou ignorer une alerte
- Alertes métier (stratégie, budget, contrat…) distinctes des alertes système

### 19.2 Notifications in-app

- Cloche de notifications
- Marquer comme lu
- Lien vers l'objet concerné

### 19.3 E-mails

- Envoi asynchrone d'e-mails pour les événements importants (validation, échéance…)

---

## 20. Recherche globale

- Champ de recherche unique dans l'en-tête
- Résultats groupés par domaine (projets, budgets, articles d'aide…)
- Navigation directe vers l'objet trouvé
- Extension progressive à tous les domaines (fournisseurs, contrats, collaborateurs…)

---

## 21. Référentiel IT *(prévu / partiel)*

Domaines identifiés dans la vision produit, à compléter :

| Domaine | Fonctionnalités attendues |
|---------|---------------------------|
| Applications | Inventaire des applications du SI, propriétaire, criticité, dépendances |
| Bases de données | Référentiel des bases, hébergement, propriétaire |
| Noms de domaine | Suivi des domaines, dates d'expiration |
| Certificats | Suivi des certificats, alertes d'expiration |
| Téléphonie | Numéros, affectations, fournisseurs |

---

## 22. Modules futurs (hors périmètre actuel)

| Module | Objectif |
|--------|----------|
| Orchestra Finance | Pilotage financier élargi (DAF) |
| Orchestra RH | Gestion RH et effectifs |
| Orchestra Procurement | Achats étendus |
| Orchestra Governance | Gouvernance corporate |
| Intelligence artificielle | Analyse et recommandations (au-delà de l'assistant configuré) |
| Connecteurs externes | Échanges avec d'autres outils |

---

## 23. Hors périmètre explicite

Starium Orchestra **n'est pas** :

- un outil de gestion d'incidents / ticketing
- un outil ITSM (ServiceNow-like)
- un outil DevOps / CI-CD
- un ERP complet
- un outil de messagerie ou de collaboration (il s'intègre avec Microsoft 365)

---

## 24. Critères de succès produit

1. Un DSI à temps partagé pilote **plusieurs organisations** depuis un seul outil
2. Vision consolidée : budgets + projets + fournisseurs + contrats + risques + stratégie
3. Préparation et tenue des **comités** (CODIR, COPIL) sans reconstituer les données dans PowerPoint
4. Traçabilité des **décisions** et des **arbitrages**
5. Chaque organisation ne voit **que ses données**
6. Les droits sont **configurables** sans intervention technique

---

## Références

- [VISION_PRODUIT.md](./VISION_PRODUIT.md)
- [MANUEL-UTILISATEUR.md](./MANUEL-UTILISATEUR.md)
- Manuels modulaires `MANUEL-00` à `MANUEL-70`
- [ARCHITECTURE.md](./ARCHITECTURE.md) (vue fonctionnelle)
