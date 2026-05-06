# FRONTEND_VISION.md

Vision Frontend — Starium Orchestra

---

# 1. Objectif du frontend

Le frontend de **Starium Orchestra** constitue l’interface principale permettant aux utilisateurs de piloter les fonctions support de leur organisation, en particulier le système d'information.

Il agit comme un **cockpit de gouvernance opérationnelle** permettant de :

* visualiser l’état du système d'information
* suivre les projets et budgets
* identifier les risques et les alertes
* gérer les contrats et fournisseurs
* prioriser les actions à mener

Le frontend est un **client de l’API backend**, qui reste la source unique de vérité pour toutes les données et règles métier.

---

# 2. Positionnement produit

Starium Orchestra n’est pas un outil opérationnel classique comme :

* un outil de ticketing
* un outil ITSM
* un outil DevOps

Le produit se positionne comme :

> **un cockpit de pilotage du système d'information et des fonctions support.**

Le frontend doit donc permettre une **lecture rapide de la situation** et faciliter la prise de décision.

---

# 3. Principes de conception

Le frontend repose sur plusieurs principes fondamentaux.

### Clarté

Les informations importantes doivent être visibles immédiatement.

### Rapidité

Les actions principales doivent être accessibles en un minimum de clics.

### Cohérence

Tous les modules doivent suivre les mêmes conventions d’interface.

### Modularité

Le produit doit pouvoir évoluer facilement avec de nouveaux modules.

---

# 4. Architecture de l’interface

L’interface repose sur un **layout applicatif stable**.

```
┌───────────────┬────────────────────────────────────┐
│ Sidebar       │ Header Workspace                   │
│ Navigation    │ contexte / client / actions       │
├───────────────┼────────────────────────────────────┤
│               │                                    │
│               │            Workspace               │
│               │                                    │
│               │                                    │
└───────────────┴────────────────────────────────────┘
```

Cette structure sépare clairement :

| Zone      | Fonction              |
| --------- | --------------------- |
| Sidebar   | navigation principale |
| Header    | contexte de travail   |
| Workspace | contenu métier        |

---

# 5. Navigation principale

La sidebar contient la navigation structurante de la plateforme.

Exemple :

```
Dashboard

Pilotage
Vision stratégique (déroulant : Vision Entreprise, Stratégie)
Budgets
Projets
Contrats
Licences

Référentiel
Applications
Bases de données
Domaines

Organisation
Équipes
Compétences

Administration
Admin Studio
Audit
```

Cette navigation reste **stable quel que soit le client actif**.

---

# 6. Contexte de travail

Le header permet de visualiser le contexte courant.

Exemple :

```
Client actif : Cristal Habitat
Recherche
Notifications
Utilisateur
```

Le client actif détermine :

* les données affichées
* les actions disponibles
* le scope des opérations.

---

# 7. Fonctionnement multi-client

Starium Orchestra est une plateforme **multi-client et multi-tenant**.

Un utilisateur peut appartenir à plusieurs organisations.

Le frontend doit donc permettre :

* de voir les organisations accessibles
* de sélectionner un client actif
* de basculer rapidement entre organisations

Chaque requête API est exécutée dans le contexte du **client actif**.

---

# 8. Vue globale multi-clients

En plus du mode organisation, Starium Orchestra propose une **vue globale multi-clients**.

Cette vue permet de consulter des informations consolidées provenant de plusieurs organisations.

Elle est particulièrement utile pour :

* les **DSI à temps partagé**
* les **consultants**
* les **groupes multi-filiales**
* les **directions supervisant plusieurs entités**

---

# 9. Objectif de la vue globale

La vue globale doit permettre de répondre rapidement à des questions comme :

* quelles organisations ont des problèmes critiques
* quels projets sont en retard
* quels contrats arrivent à échéance
* quelles actions doivent être réalisées

Elle permet une **supervision transverse des organisations**.

---

# 10. Vue globale des actions

La vue globale centralise les **tâches à réaliser sur l’ensemble des organisations**.

Exemple :

```
Client        Action                          Priorité
---------------------------------------------------------
Client A      Valider budget IT               Haute
Client B      Revue contrat fournisseur       Moyenne
Client C      Audit licences Microsoft        Haute
Client A      Planification projet ERP        Moyenne
```

Fonctionnalités :

* filtrage par client
* filtrage par priorité
* filtrage par module
* accès direct à l’écran concerné

---

# 11. Vue globale des alertes

Les alertes regroupent les situations nécessitant une attention immédiate.

Exemple :

```
Client        Alerte
------------------------------------------
Client A      Budget cloud dépassé
Client B      Contrat fournisseur expirant
Client C      Projet critique en retard
Client A      Certificat SSL expirant
```

Les alertes doivent être :

* visibles immédiatement
* classées par criticité
* reliées à l’objet métier.

---

# 12. Vue globale des échéances

Les échéances permettent d’anticiper les événements importants.

Exemple :

```
Client        Échéance
------------------------------------------
Client B      Renouvellement contrat AWS
Client A      Revue budgétaire trimestrielle
Client C      Fin projet migration
```

---

# 13. Navigation depuis la vue globale

Chaque élément de la vue globale doit permettre d’ouvrir directement l’objet concerné.

Exemple :

```
Client A > Projets > Migration ERP
```

Le système bascule alors automatiquement dans le **contexte de ce client**.

---

# 14. Dashboard global

Le dashboard global constitue le **cockpit multi-organisations**.

Exemples de widgets :

* Budget IT total
* Projets critiques
* Alertes actives
* Contrats à échéance
* Risques SI
* Licences globales

Chaque widget peut être **décomposé par client**.

---

# 15. Séparation des contextes

Deux modes doivent être clairement distingués.

| Mode         | Utilisation               |
| ------------ | ------------------------- |
| Client actif | opérations métier         |
| Vue globale  | supervision multi-clients |

La vue globale est principalement destinée à :

* la supervision
* l’analyse
* la priorisation des actions.

---

# 16. Design et identité visuelle

Le frontend respecte l’identité visuelle Starium.

Palette principale :

| Couleur         | Usage      |
| --------------- | ---------- |
| Noir (#1B1B1B)  | navigation |
| Blanc (#FFFFFF) | contenu    |
| Or (#DB9801)    | actions    |

Le design privilégie :

* des interfaces claires
* une hiérarchie visuelle forte
* des informations facilement lisibles.

---

# 17. Architecture technique

Le frontend repose sur les technologies suivantes.

### Framework

Next.js

### Langage

TypeScript

### UI

Tailwind CSS
shadcn/ui

### State management

React Query / TanStack Query

### API

Communication avec l’API NestJS via HTTP.

---

# 18. Rôle du frontend

Le frontend est responsable de :

* l’expérience utilisateur
* la navigation
* la visualisation des données
* les interactions utilisateur

Le backend reste responsable de :

* la logique métier
* la sécurité
* la gestion des permissions
* l’intégrité des données.

---

# 19. Vision long terme

À terme, Starium Orchestra doit permettre à un dirigeant ou un DSI de disposer d’un **cockpit complet de pilotage du système d'information**.

L’utilisateur doit pouvoir :

* comprendre la situation globale
* identifier les priorités
* anticiper les risques
* agir rapidement.

Starium Orchestra devient ainsi :

> **le centre de pilotage des fonctions support et du système d'information.**

