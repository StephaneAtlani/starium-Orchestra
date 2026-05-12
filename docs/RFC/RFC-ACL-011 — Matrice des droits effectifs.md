# RFC-ACL-011 — Matrice des droits effectifs

## Statut

✅ Implémentée (V1)

## 1. Analyse de l’existant

Quand un accès est refusé, l’admin ne sait pas rapidement quelle couche bloque (`licence`, `module`, `visibilité`, `RBAC`, `ACL`). Il faut une vue diagnostic explicite.

## 2. Hypothèses éventuelles

- Le backend expose un endpoint diagnostic consolidé.
- La matrice est disponible aux profils autorisés seulement (admin/supervision).
- Le diagnostic n’outrepasse jamais les règles de confidentialité.

## 3. Liste des fichiers créés / modifiés

### Backend

- `apps/api/src/modules/access-diagnostics/access-diagnostics.module.ts`
- `apps/api/src/modules/access-diagnostics/access-diagnostics.service.ts`
- `apps/api/src/modules/access-diagnostics/access-diagnostics.controller.ts`
- `apps/api/src/modules/access-diagnostics/platform-access-diagnostics.controller.ts`
- `apps/api/src/modules/access-diagnostics/resource-diagnostics.registry.ts`
- `apps/api/src/modules/access-diagnostics/access-diagnostics.types.ts`
- `apps/api/src/modules/access-diagnostics/access-diagnostics-self.controller.ts` *(RFC-ACL-014 — self-service)*
- `apps/api/src/modules/access-diagnostics/dto/my-effective-rights-query.dto.ts`
- `apps/api/src/app.module.ts` (import `AccessDiagnosticsModule`)

### Frontend

- `apps/web/src/features/access-diagnostics/api/access-diagnostics.ts`
- `apps/web/src/features/access-diagnostics/hooks/use-effective-rights-diagnostic.ts`
- `apps/web/src/features/access-diagnostics/components/effective-rights-matrix.tsx`
- `apps/web/src/features/access-diagnostics/components/access-diagnostics-page.tsx`
- `apps/web/src/app/(protected)/client/administration/access-diagnostics/page.tsx`
- `apps/web/src/app/(protected)/admin/clients/[clientId]/access-diagnostics/page.tsx`
- `apps/web/src/features/access-cockpit/lib/shortcuts.ts`
- `apps/web/src/config/navigation.ts`
- `apps/web/src/app/(protected)/client/administration/page.tsx`

### Tests

- `apps/api/src/modules/access-diagnostics/access-diagnostics.service.spec.ts`
- `apps/api/src/modules/access-diagnostics/access-diagnostics.controller.spec.ts`
- `apps/api/src/modules/access-diagnostics/platform-access-diagnostics.controller.spec.ts`
- `apps/web/src/features/access-diagnostics/api/access-diagnostics.spec.ts`
- `apps/web/src/features/access-diagnostics/components/effective-rights-matrix.spec.ts`

## 4. Implémentation complète

- Mapping canonique `resourceType` V1 (whitelist stricte): `PROJECT`, `BUDGET`, `CONTRACT`, `SUPPLIER`, `STRATEGIC_OBJECTIVE`.
- Contrôles consolidés:
  - `licenseCheck`
  - `subscriptionCheck`
  - `moduleActivationCheck`
  - `moduleVisibilityCheck`
  - `rbacCheck`
  - `aclCheck`
- Contrat check stable:
  - `{ status: "pass" | "fail" | "not_applicable", reasonCode, message, details? }`
- Décision consolidée:
  - `finalDecision` + `denialReasons[]` ordonnée + `computedAt`.
- Endpoints:
  - Client actif (admin diagnostic) : `GET /api/access-diagnostics/effective-rights?...`
  - Plateforme : `GET /api/platform/clients/:clientId/access-diagnostics/effective-rights?...`
  - **Membre client (self-service, RFC-ACL-014)** : `GET /api/access-diagnostics/effective-rights/me?intent=READ|WRITE|ADMIN&resourceType=...&resourceId=...` — pas de `userId` en query ; réponse métier `ALLOWED` / `DENIED` / `UNSAFE_CONTEXT` + `controls[]` canoniques ; voir `docs/API.md` §5.051.
- Anti-fuite:
  - user/ressource hors client => refus générique stable `DIAGNOSTIC_SCOPE_MISMATCH` sans détail sensible.
- UI:
  - page dédiée `/client/administration/access-diagnostics`
  - route plateforme `/admin/clients/[clientId]/access-diagnostics`
  - jamais d’ID brut comme libellé principal ; sélecteurs métier priorisés.

## 5. Modifications Prisma si nécessaire

- Aucune structure obligatoire.
- Optionnel : persistance de snapshots diagnostic si besoin support avancé.

## 6. Tests

- `resourceType` non supporté => `reasonCode=RESOURCE_TYPE_UNSUPPORTED`.
- `userId` hors client => aucune fuite (refus générique stable).
- `resourceId` hors client => aucune fuite (refus générique stable).
- mapping `operation read|write|admin` vers RBAC + ACL.
- endpoint plateforme: `userId`/`resourceId` doivent appartenir au `clientId` de route.
- endpoint client: aucun `clientId` libre accepté.
- UI: aucun ID brut affiché comme libellé principal.

## 7. Récapitulatif final

Cette RFC introduit un diagnostic déterministe des droits effectifs, exploitable en support et en administration pour expliquer précisément les refus d’accès sans fuite inter-client.

## 8. Points de vigilance

- Garder des messages de refus stables et traduisibles.
- Éviter d’exposer des détails sensibles à des profils non autorisés.
- Bien versionner le contrat de diagnostic (consommé par UI et support).
