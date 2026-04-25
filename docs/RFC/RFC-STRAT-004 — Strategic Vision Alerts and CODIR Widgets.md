# RFC-STRAT-004 — Strategic Vision Alerts and CODIR Widgets

## 1) Contexte

Le cockpit CODIR doit refléter les signaux stratégiques critiques, pas seulement les métriques opérationnelles.  
Le module Strategic Vision doit donc exposer alertes et widgets de pilotage pour détecter tôt les dérives.

## 2) Objectif

Remonter les dérives stratégiques dans le cockpit global CODIR via des widgets backend-driven, cohérents avec Strategic Vision et sans duplication de logique.

## 3) Alertes MVP

- Objectif en retard.
- Objectif `OFF_TRACK`.
- Projet actif non aligné.

Chaque alerte doit être filtrée par `clientId` actif et reposer sur les mêmes règles métier que le moteur KPI.

## 4) Widgets CODIR proposés

- `Strategic Alignment`
- `Objectives at Risk`
- `Unaligned Projects`
- `Strategic Drift`

Intentions :
- `Strategic Alignment` : taux d'alignement global.
- `Objectives at Risk` : volume d'objectifs à risque / hors trajectoire.
- `Unaligned Projects` : projets actifs sans lien stratégique.
- `Strategic Drift` : indicateur synthétique de dérive (MVP basé sur signaux existants, extension V2 prévue).

## 5) Règles d'architecture

- Les widgets consomment des endpoints backend dédiés.
- Aucun calcul widget côté frontend.
- Aucune duplication des données métier dans les widgets.
- Les widgets réutilisent les sources de vérité Strategic Vision / KPI.

## 6) Contrats API (cible)

MVP minimal attendu :
- réutilisation de `GET /api/strategic-vision/kpis` pour les indicateurs agrégés ;
- endpoint(s) complémentaire(s) d'alertes client-scopées (naming final à valider en implémentation RFC API détaillée).

## 7) Préparation future

- Budget non aligné.
- Risque non couvert.
- Arbitrage CODIR assisté (priorisation et scénarios de correction).

## 8) Critères d'acceptation

- Les alertes MVP sont définies et reliées à des règles backend explicites.
- Les 4 widgets CODIR sont cadrés fonctionnellement.
- Les widgets ne contiennent aucune logique de calcul critique côté frontend.
- Le scoping `clientId` est imposé sur toutes les données consommées.
- Les données présentées ne dupliquent pas les données métier sources.
- Le design est prêt pour extension V2 (budget/risques/arbitrage) sans rupture contractuelle.
