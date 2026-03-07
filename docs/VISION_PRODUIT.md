# Starium Orchestra — Vision Produit

## Contexte

Starium Orchestra est une plateforme SaaS de pilotage destinée aux fonctions support des entreprises.

Le produit est conçu en priorité pour les DSI à temps partagé (fractional CIO) qui doivent gérer plusieurs organisations clientes depuis un seul outil.

La plateforme permet de centraliser :

- le pilotage financier IT
- les projets
- les fournisseurs
- les contrats
- les licences
- les équipes
- les actifs IT
- la documentation

L’objectif est d'offrir une vision claire et consolidée du système d'information et de ses coûts.

---

# Utilisateurs cibles

### 1. DSI à temps partagé
Utilise la plateforme pour piloter plusieurs clients.

Fonctions principales :

- gérer plusieurs organisations
- suivre budgets IT
- piloter projets
- suivre fournisseurs et contrats
- maintenir le référentiel IT

### 2. DSI interne
Utilise la plateforme pour piloter son SI.

### 3. Chef de projet IT
Suit les projets, les tâches et les ressources.

### 4. Direction
Consulte les dashboards et indicateurs.

---

# Problème résolu

Aujourd’hui les DSI utilisent souvent :

- Excel
- SharePoint
- Notion
- des outils dispersés

Cela entraîne :

- manque de visibilité
- mauvaise maîtrise des coûts
- perte d'information
- difficulté de pilotage

Starium Orchestra vise à fournir un **cockpit unique de gouvernance IT**.

---

# Positionnement produit

Starium Orchestra est une plateforme de **gouvernance opérationnelle**.

Ce n'est pas :

- un outil ITSM
- un outil de ticketing
- un outil DevOps

C'est un outil de **pilotage stratégique et opérationnel**.

---

# Principes d'architecture

La plateforme respecte les principes suivants :

### API-first

Toute la logique métier est exposée via API.

Le frontend consomme l’API.

### Multi-client

Un utilisateur peut appartenir à plusieurs organisations.

Chaque donnée est isolée par client.

### Multi-tenant

Une seule instance de l'application sert plusieurs organisations.

### Sécurité

Toutes les requêtes sont contrôlées :

- authentification
- permissions
- isolation client

### Architecture modulaire

Chaque domaine métier est isolé dans un module.
Mais certains module peuvent etre en commun

---

# Modules principaux

## Core plateforme

- authentification
- gestion utilisateurs
- gestion clients
- rôles et permissions
- audit logs
- notifications
- documents
- admin studio

## Core financier

- budgets
- lignes budgétaires
- allocations financières
- axes analytiques

## Gouvernance IT

- fournisseurs
- contrats
- licences
- commandes

## Pilotage projets

- projets
- tâches
- risques

## Gestion des équipes

- collaborateurs
- compétences
- affectations

## Référentiel IT

- applications
- bases de données
- domaines
- certificats
- téléphonie

---

# Fonctionnalités futures

- Orchestra Finance (DAF)
- Orchestra HR (DRH)
- Intelligence artificielle d'analyse
- Connecteurs API externes

---

# Contraintes techniques

Stack technique :

Backend :
- NestJS
- TypeScript
- Prisma
- PostgreSQL

Frontend :
- Next.js
- TypeScript
- Tailwind
- shadcn/ui

Infrastructure :

- Docker
- Redis
- Nginx

---

# Objectifs produit

Créer une plateforme capable de :

- piloter plusieurs organisations
- consolider les données IT
- structurer la gouvernance
- fournir des dashboards clairs

---

# Vision long terme

Starium Orchestra doit devenir :

> le système d’exploitation de pilotage des fonctions support.

Modules futurs :

- IT
- Finance
- HR
- Procurement
- Governance

# Règles produit importantes

Les règles suivantes doivent toujours être respectées dans l’implémentation :

1. Toute donnée métier appartient à un client (`clientId`).

2. Un utilisateur peut appartenir à plusieurs clients.

3. Une requête API doit toujours vérifier le scope client.

4. Un admin client ne peut voir que les données de son client.

5. Les platform admins peuvent créer et gérer les clients.

6. Toute logique métier critique doit être implémentée dans le backend.

7. Le frontend ne doit jamais implémenter de règles métier critiques.

8. Les modules doivent être indépendants et réutilisables.

9. Le core financier doit être partagé par plusieurs modules.

10. Les données doivent être auditables (audit logs).