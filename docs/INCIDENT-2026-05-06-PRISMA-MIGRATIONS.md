# Incident prod — 2026-05-06 — Prisma migrations (`P3009` / `P1001` / `P3018`)

## Contexte

Au démarrage, `api` exécutait `prisma migrate deploy` et entrait en boucle de redémarrage.
Les erreurs observées se sont enchaînées dans cet ordre:

- `P3009`: migration marquée `failed` dans la base cible.
- `P1001`: base non joignable depuis le conteneur `api`.
- `P3012`: tentative de rollback d'une migration qui n'était plus en état `failed`.
- `P3018` avec code PostgreSQL `42P01`: table `"StrategicDirectionStrategy"` absente au moment du `ALTER TABLE`.

## Symptômes constatés

- `api` redémarrait en boucle (`restart: unless-stopped`).
- `prisma migrate deploy` se relançait à chaque boot.
- Résolution DNS/réseau incohérente entre stacks Docker (`code-*` vs `starium-orchestra-*`).
- Conflits de connectivité selon la valeur de `DATABASE_URL` (`postgres` vs `localhost` vs IP hôte).

## Causes racines

1. La migration `20260505221000_strategic_direction_strategy_v1_fields` était enregistrée en échec dans `_prisma_migrations`.
2. La connectivité DB depuis `api` était instable selon le contexte réseau Docker.
3. Dans la DB cible utilisée pendant le recovery, la table `"StrategicDirectionStrategy"` n'existait pas au moment de l'application de la migration.
4. Le service `api` restait configuré avec `DATABASE_URL=...@postgres:5432/...`, alors que le runbook de recovery utilisait temporairement `172.17.0.1:5432`.

## Actions réalisées

### 1) Rendre la migration idempotente dans le repo

Fichier modifié:

- `apps/api/prisma/migrations/20260505221000_strategic_direction_strategy_v1_fields/migration.sql`

Changement:

- `ADD COLUMN ...` -> `ADD COLUMN IF NOT EXISTS ...` pour toutes les colonnes ajoutées.

Objectif:

- Éviter un nouvel échec si la migration a été partiellement appliquée.

### 2) Recovery Prisma dans la base cible

Commande utilisée:

```bash
npx prisma migrate resolve --schema=prisma/schema.prisma --rolled-back 20260505221000_strategic_direction_strategy_v1_fields
```

Puis:

```bash
npx prisma migrate deploy --schema=prisma/schema.prisma
```

Quand `P3012` est apparu, la logique appliquée a été:

- Ne plus relancer `resolve --rolled-back`.
- Exécuter uniquement `migrate deploy`.

### 3) Stabilisation connectivité DB pendant le recovery

URL temporaire utilisée pour le run one-shot:

- `postgresql://starium:starium@172.17.0.1:5432/starium?schema=public`

But:

- Court-circuiter l'incertitude DNS/réseau inter-stacks pendant l'incident.

### 4) Réexécution complète des migrations en succès

Résultat final confirmé:

- `20260505221000_strategic_direction_strategy_v1_fields` appliquée.
- `20260506220000_strategy_axis_objective_links` appliquée.
- `20260506230000_strategic_direction_strategy_archive` appliquée.
- Prisma: `All migrations have been successfully applied.`

## État final

- Le blocage Prisma sur la base cible est levé.
- Les migrations en attente liées à `StrategicDirectionStrategy` sont appliquées.
- Le point restant côté exploitation est de figer une configuration réseau Docker cohérente et unique pour `DATABASE_URL`.

## Commandes de vérification utiles

```sql
SELECT migration_name, started_at, finished_at, rolled_back_at, logs
FROM "_prisma_migrations"
WHERE migration_name = '20260505221000_strategic_direction_strategy_v1_fields';
```

```bash
npx prisma migrate status --schema=prisma/schema.prisma
```

## Prévention (actions recommandées)

1. Exécuter `prisma migrate deploy` en job one-shot de release (pas au boot applicatif) pour éviter les boucles de restart.
2. Uniformiser une seule topologie réseau Docker pour `api` et `postgres`.
3. Éviter de dépendre de `localhost` dans un conteneur.
4. Garder les migrations SQL idempotentes quand le contexte le permet (`IF NOT EXISTS` sur `ALTER TABLE ADD COLUMN`).
5. Ajouter un runbook d'incident Prisma dans les procédures d'exploitation.

