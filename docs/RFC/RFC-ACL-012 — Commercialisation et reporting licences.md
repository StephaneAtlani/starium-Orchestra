# RFC-ACL-012 — Commercialisation et reporting licences

## Statut

✅ Implémentée (V1 — backend + frontend)

## 1. Analyse de l’existant

Le modèle licences/abonnements (RFC-ACL-001/002/009) produit des données commerciales critiques (consommation, modes non facturables, essais, support). Avant cette RFC, aucun reporting unifié n’était exposé : les cockpits RFC-ACL-010 ciblent l’opérationnel (par client), pas la trajectoire commerciale plateforme.

## 2. Hypothèses validées

- Indicateurs construits sur les données consolidées des RFC-ACL-001/002/009.
- Reporting plateforme **multi-client**, **réservé aux rôles plateforme** (`PlatformAdminGuard`).
- Exports CSV **et** JSON nécessaires pour finance / revenue ops.
- Pas de table d’agrégats persistée en V1 : trajectoire mensuelle calculée à la volée à partir des dates `licenseStartsAt/licenseEndsAt` et `subscription.startsAt/endsAt`.

## 3. Fichiers livrés

Backend :

- [apps/api/src/modules/license-reporting/license-reporting.module.ts](../../apps/api/src/modules/license-reporting/license-reporting.module.ts)
- [apps/api/src/modules/license-reporting/license-reporting.controller.ts](../../apps/api/src/modules/license-reporting/license-reporting.controller.ts)
- [apps/api/src/modules/license-reporting/license-reporting.service.ts](../../apps/api/src/modules/license-reporting/license-reporting.service.ts)
- [apps/api/src/modules/license-reporting/license-reporting.types.ts](../../apps/api/src/modules/license-reporting/license-reporting.types.ts)
- [apps/api/src/modules/license-reporting/license-reporting.csv.ts](../../apps/api/src/modules/license-reporting/license-reporting.csv.ts)
- [apps/api/src/modules/license-reporting/dto/license-reporting-query.dto.ts](../../apps/api/src/modules/license-reporting/dto/license-reporting-query.dto.ts)
- Tests : `license-reporting.service.spec.ts`, `license-reporting.controller.spec.ts`
- Wiring : `LicenseReportingModule` enregistré dans [apps/api/src/app.module.ts](../../apps/api/src/app.module.ts)

Frontend :

- [apps/web/src/features/license-reporting/api/license-reporting.ts](../../apps/web/src/features/license-reporting/api/license-reporting.ts)
- [apps/web/src/features/license-reporting/query-keys.ts](../../apps/web/src/features/license-reporting/query-keys.ts)
- [apps/web/src/features/license-reporting/hooks/use-license-reporting.ts](../../apps/web/src/features/license-reporting/hooks/use-license-reporting.ts)
- [apps/web/src/features/license-reporting/components/license-reporting-page.tsx](../../apps/web/src/features/license-reporting/components/license-reporting-page.tsx)
- [apps/web/src/features/license-reporting/components/license-reporting-kpi-cards.tsx](../../apps/web/src/features/license-reporting/components/license-reporting-kpi-cards.tsx)
- [apps/web/src/features/license-reporting/components/license-reporting-clients-table.tsx](../../apps/web/src/features/license-reporting/components/license-reporting-clients-table.tsx)
- [apps/web/src/features/license-reporting/components/license-reporting-monthly-table.tsx](../../apps/web/src/features/license-reporting/components/license-reporting-monthly-table.tsx)
- [apps/web/src/features/license-reporting/components/license-reporting-filters.tsx](../../apps/web/src/features/license-reporting/components/license-reporting-filters.tsx)
- [apps/web/src/features/license-reporting/components/export-buttons.tsx](../../apps/web/src/features/license-reporting/components/export-buttons.tsx)
- [apps/web/src/features/license-reporting/lib/labels.ts](../../apps/web/src/features/license-reporting/lib/labels.ts)
- Route : [apps/web/src/app/(protected)/admin/license-reporting/page.tsx](../../apps/web/src/app/(protected)/admin/license-reporting/page.tsx)
- Sidebar : entrée `Reporting licences` dans [apps/web/src/config/navigation.ts](../../apps/web/src/config/navigation.ts) (section Platform, `platformOnly: true`).

Documentation :

- [docs/API.md](../API.md) §5.06 (License Reporting).

## 4. Endpoints livrés

Tous sous `JwtAuthGuard` + `PlatformAdminGuard`.

- `GET /api/platform/license-reporting/overview` — snapshot global plateforme.
- `GET /api/platform/license-reporting/clients` — ligne par client (`clientName`, `clientSlug`).
- `GET /api/platform/license-reporting/monthly?from=YYYY-MM&to=YYYY-MM` — série mensuelle (12 mois par défaut, max 24).
- `GET /api/platform/license-reporting/clients.csv` — export CSV (RFC 4180, BOM UTF-8, `Content-Disposition: attachment`).
- `GET /api/platform/license-reporting/monthly.csv` — idem.

Filtres communs : `clientId`, `licenseBillingMode`, `subscriptionStatus`. `clientId` inexistant → `400` stable (anti-fuite).

## 5. Modifications Prisma

Aucune. La V1 calcule à la volée à partir de `ClientUser` et `ClientSubscription`. Une option future `LicenseUsageDailySnapshot` est documentée si la volumétrie l’impose (>100k membres ou >5s par requête).

## 6. Dictionnaire KPI canonique (V1)

Centralisé côté API dans `license-reporting.types.ts` et réutilisé tel quel par l’UI :

- **Licences** : `readOnly`, `clientBillable`, `externalBillable`, `nonBillable`, `platformInternal`, `platformInternalActive`, `platformInternalExpired`, `evaluationActive`, `evaluationExpired`.
- **Abonnements** : `draft`, `active`, `suspended`, `canceled`, `expired`, `expiredInGrace`.
- **Sièges** : `seats.readWriteBillableUsed` / `seats.readWriteBillableLimit`.

Sémantique alignée avec `LicenseService.validateWriteAccess` :

- Une licence est **expirée** si `licenseEndsAt < now`.
- Un abonnement est `expiredInGrace` si `status = EXPIRED` et `graceEndsAt ≥ now`.

## 7. Sémantique de la trajectoire mensuelle

Pour chaque mois calendaire `M` (UTC), une ligne `ClientUser` ou `ClientSubscription` est comptée présente si :

- `start = licenseStartsAt ?? createdAt ≤ fin(M)`, et
- `end = licenseEndsAt` est `null` **ou** `end ≥ début(M)`.

Le bucket `*Active` vs `*Expired` est résolu à `fin(M)`.

## 8. Tests livrés

Backend (`license-reporting.service.spec.ts` / `license-reporting.controller.spec.ts`) :

- agrégats par mode et statut cohérents avec données sources ;
- sièges READ_WRITE billables = limite somme abonnements `ACTIVE` ;
- filtre `licenseBillingMode` propagé dans `WHERE` Prisma ;
- série mensuelle : 12 mois par défaut, fenêtre `> 24 mois` rejetée, `from > to` rejeté ;
- présence par mois : licence active uniquement pendant `[start, end]` ;
- guards `JwtAuthGuard + PlatformAdminGuard` posés sur le contrôleur ;
- export CSV retourne un `StreamableFile`.

Frontend (`license-reporting.spec.ts`) :

- query string filtres correctement encodée ;
- omission des filtres vides ;
- fenêtre temporelle propagée pour `/monthly` ;
- URL CSV inclut les filtres.

## 9. Récapitulatif

- Couche reporting commerciale plateforme livrée (snapshot, par client, trajectoire mensuelle, exports).
- Aucun changement de schéma ; aucune mutation côté API ; aucune nouvelle permission métier (PlatformAdminGuard suffisant).
- Toutes les tables et listes affichent `clientName` (jamais d’UUID en libellé principal — règle Starium).
- Sidebar `Platform` enrichie d’une entrée `Reporting licences`.

## 10. Points de vigilance traités

- **Dictionnaire KPI canonique** : centralisé en types côté API, réutilisé identiquement côté UI ; libellés métier dans `lib/labels.ts`.
- **Sémantique actif/expiré/grâce** : alignée avec `LicenseService.validateWriteAccess`.
- **Performance** : fenêtre temporelle plafonnée à 24 mois, agrégats single-pass in-memory, pas de N+1.
- **Anti-fuite** : `clientId` validé contre `Client.findUnique` avant tout calcul ; message stable en cas d’absence.
- **Inputs valeur, pas ID** : libellés métier (`clientName`, `subscriptionStatus`, `licenseBillingMode`) systématiquement traduits en français côté UI.

## 11. Suite envisageable

- Table `LicenseUsageDailySnapshot` + cron BullMQ si dataset > 100k membres ou >5s par requête (non requis en V1).
- Graphique courbes plutôt que tableau pour la trajectoire mensuelle (UI).
- Cohort analysis (acquisition / churn) sur la base des audits ACL-008.
