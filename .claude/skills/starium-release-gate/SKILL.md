---
name: starium-release-gate
description: Gate de release préprod/prod Starium Orchestra — checklist go/no-go avant déploiement (lint, typecheck, build, tests, audits, env, Prisma, Docker, smoke). À utiliser quand l'utilisateur parle de passage en production, préprod, release, deploy, go-live, vérifications avant prod, ou demande un rapport go/no-go.
---

# Release gate — préprod / prod

Procédure **exécutable** avant tout déploiement sur un environnement non-dev. Sources de vérité :

1. `docs/runbooks/passage-en-production.md` — ordre deploy, rollback, post-deploy
2. `docs/INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md` — recovery migrations
3. `.env.example` + `docker-compose.yml` — variables obligatoires
4. Cette skill — **ordre des checks** + format du rapport go/no-go

Différencier **cible** dès le début : `préprod` | `prod`. Prod = seuil plus strict (tests complets, SMTP strict, backup obligatoire, pas de flags debug).

---

## Workflow agent (obligatoire)

1. Demander la cible si absente : `préprod` ou `prod`.
2. Noter SHA (`git rev-parse --short HEAD`), branche, écart remote (`ahead`/`behind`).
3. Exécuter les phases **A → E** ci-dessous ; ne pas sauter une phase bloquante.
4. Produire le **rapport go/no-go** (template final). Ne jamais dire « prêt » si un blocker reste ouvert.
5. Si cible = `prod` et org/ACL dans la release : rappeler `docs/runbooks/migration-org-scope-access.md` (hors gate infra).

**Règle** : lancer les commandes, rapporter les résultats **réels**. Si une commande n’a pas tourné → `NON EXÉCUTÉ` (pas un OK implicite).

---

## Phase A — Git & hygiène (bloquant)

```bash
git status -sb
git rev-parse HEAD
git log -5 --oneline
git diff --stat origin/main...HEAD   # ou branche de release
```

| Check | Préprod | Prod |
|-------|---------|------|
| Working tree clean | Recommandé | **Obligatoire** |
| Branche = `main` ou tag release | OK develop/release | **`main` ou tag** |
| Push remote à jour | Recommandé | **Obligatoire** si deploy depuis registry/CI distant |
| Secrets dans le diff (`.env`, clés) | Bloquant | Bloquant |
| CI verte sur le SHA | Recommandé | **Obligatoire** |

Bloquants immédiats : fichiers secrets trackés, working tree sale en prod, branche non validée.

---

## Phase B — Qualité code (bloquant)

À la racine, Node **20** (images Docker) / pnpm **9** :

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm predeploy:api
pnpm audit:modals
pnpm audit:ui-ids
pnpm test                    # prod : obligatoire ; préprod : fortement recommandé
```

| Check | Préprod | Prod |
|-------|---------|------|
| `lint` / `typecheck` / `build` | Bloquant | Bloquant |
| `predeploy:api` | Bloquant | Bloquant |
| `audit:modals` / `audit:ui-ids` | Bloquant | Bloquant |
| `pnpm test` | Recommandé | **Bloquant** |
| `pnpm audit --audit-level high` | Recommandé | Bloquant si high/critical non overridés (voir `docs/security/pnpm-audit-remediation.md`) |

```bash
pnpm why next -r --filter @starium-orchestra/web
# Attendu : next >= 15.5.16
pnpm audit --audit-level high
```

---

## Phase C — Config & secrets (bloquant prod)

Vérifier **sur l’environnement cible** (PaaS / `.env` serveur), **sans coller de secrets** dans le chat :

| Variable | Préprod | Prod |
|----------|---------|------|
| `DATABASE_URL` | Oui | Oui |
| `JWT_SECRET` (fort, ≠ exemple ; **préprod = prod**) | Oui | Oui |
| `MFA_ENCRYPTION_KEY` (64 hex) | Oui | **Oui fail-fast** |
| `NODE_ENV=production` | Oui | Oui |
| `SMTP_HOST/PORT/FROM` (+ USER/PASS) | Oui | **Oui fail-fast** |
| `REDIS_HOST` / `REDIS_PORT` | Si worker | Si worker |
| `EMAIL_DELIVERIES_INLINE` | Non / vide | **Non / vide** (worker) |
| `NEXT_PUBLIC_API_URL` | URL préprod | URL publique HTTPS |
| `INTERNAL_API_URL` | Réseau interne | Réseau interne |
| `APP_PUBLIC_URL` / `WEB_ORIGIN` | URL front | **HTTPS** (liens e-mails) |
| `CORS_ORIGINS` | Front préprod | Front prod |
| `MICROSOFT_OAUTH_VERBOSE_ERRORS` | false | **false / absent** |
| `NEXT_PUBLIC_MICROSOFT_VERBOSE_ERRORS` | false | **false** |
| `STARIUM_SKIP_EMAIL_IDENTITY_RESEND_COOLDOWN` | Toléré | **Absent** |
| `ALLOW_PROD_SEED` | Non | **Non** sauf procédure |

```bash
# Optionnel si SMTP cible accessible depuis la machine agent
pnpm --filter @starium-orchestra/api verify:smtp -- --strict   # prod
```

Rappel : `NEXT_PUBLIC_*` et `INTERNAL_API_URL` sont **figés au docker build** web → rebuild si URL change.

---

## Phase D — Données & images (bloquant)

Avant migrate / bascule trafic :

1. **Backup Postgres** (snapshot ou `pg_dump`) — **obligatoire en prod**, fortement recommandé préprod.
2. Noter `prisma migrate status` **avant**.
3. Job one-shot `prisma migrate deploy` (pas uniquement au boot API) — voir runbook + incident 2026-05-06.
4. **Interdit** : `prisma db seed` en prod sauf procédure documentée + `ALLOW_PROD_SEED`.
5. Images : même tag API **et** worker ; web rebuild si front/env build changés.

```bash
# Après migrate (cible)
pnpm --filter @starium-orchestra/api exec prisma migrate status
# Attendu : Database schema is up to date
```

**Worker** : `WorkerModule` est un contexte Nest **distinct** — un `@Global()` d’`AppModule` n’est pas visible du worker. Vérifier que les imports du worker couvrent les deps (cf. `docs/ARCHITECTURE.md`). Le typecheck ne couvre pas un oubli d’import worker → smoke démarrage `api-worker` obligatoire.

Ordre runtime : Postgres + Redis healthy → migrate → API → worker → Web.

---

## Phase E — Post-deploy smoke (bloquant)

| Contrôle | Succès |
|----------|--------|
| `GET /api/health` (ou `/health` selon prefix) | HTTP 2xx |
| Web URL publique | Login OK, assets `/_next/static/*` |
| Logs `api-worker` | Pas d’erreur Redis/SMTP au boot ; `[EMAIL worker]` OK |
| E-mail test (invitation / reset) | Livraison ou log `[SMTP]` OK |
| Client switch + lecture métier | Pas de 403 inattendu |
| Isolation inter-client (échantillon) | Accès autre client refusé |
| Mutation légère autorisée | 2xx |

Si release org/ACL : ne pas activer tous les flags d’un coup — runbook migration org, un module à la fois.

---

## Rollback (rappeler si no-go ou incident)

1. Repointer images API / worker / web vers le tag précédent.
2. Si migrations irréversibles appliquées → restaurer snapshot DB (§ backup), **pas** downgrade schéma à l’aveugle.
3. Échec migrate partiel → `docs/INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md`.

---

## Sortie attendue (copier tel quel)

```text
## Release gate — [préprod|prod]
- SHA / branche : …
- Cible : …
- Verdict : GO | GO AVEC RÉSERVES | NO-GO

### Phase A — Git
- [ ] … → OK | KO | N/A — détail

### Phase B — Qualité
- lint / typecheck / build / predeploy:api / audits / test / audit deps / next≥15.5.16
- Résultats réels des commandes

### Phase C — Config
- Variables critiques présentes (sans valeurs) ; flags debug off en prod

### Phase D — Données & images
- Backup : fait / non
- migrate status : …
- Tags images API=worker ; web rebuild si besoin

### Phase E — Smoke
- health / login / worker / SMTP / isolation client

### Blockers
- …

### Réserves / suivi
- …

### Traçabilité
- Opérateur, fenêtre, ticket/changelog à renseigner
```

---

## Différences préprod vs prod (résumé)

| Sujet | Préprod | Prod |
|-------|---------|------|
| Working tree / push | Souple | Strict |
| `pnpm test` | Recommandé | Bloquant |
| Backup DB | Fortement reco | Bloquant |
| SMTP `--strict` | Reco | Bloquant |
| Flags debug / skip cooldown | Tolérés si documentés | Interdits |
| Seed | Possible si env jetable | Interdit sauf procédure |
| Fenêtre / com | Optionnelle | Si migration destructive ou droits visibles |

---

## Références

- `docs/runbooks/passage-en-production.md`
- `docs/runbooks/migration-org-scope-access.md`
- `docs/security/pnpm-audit-remediation.md`
- `docs/INCIDENT-2026-05-06-PRISMA-MIGRATIONS.md`
- `.github/workflows/ci.yml`
- Skill `starium-conformite` — revue code feature (complémentaire, pas un substitut de cette gate)
