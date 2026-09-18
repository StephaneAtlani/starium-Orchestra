# Plan — `comp-v2-owner-obligatoire`

**RFC** : RFC-COMP-003 (COMP.V2.reste) · **Feature** : Owner obligatoire au lancement de revue  
**Commit cible** : `feat(compliance): require campaign owner when opening a review`

## Objectif métier

Empêcher le démarrage d’une revue de conformité (`openImmediately`) sans responsable nommé, côté API et UI — aligné BACKLOG `COMP.V2.reste`.

## Décisions figées

1. **Owner requis seulement si `openImmediately === true`** (lancement / ouverture immédiate). Création `DRAFT` sans ouverture reste optionnelle.
2. Score pondéré mock (`part=0.5`) **hors scope** (option produit ; garder `C/A`).
3. Pas de migration Prisma (`ownerUserId` existe déjà, nullable OK pour DRAFT).

## Analyse existant

- DTO `CreateComplianceCampaignDto.ownerUserId` `@IsOptional`
- Service `createCampaign` : assert assignee si fourni, sinon `null`
- UI `compliance-start-review-modal.tsx` : préremplit `members[0]`, `canSubmit` n’exige pas l’owner

## Fichiers

| Action | Fichier |
|---|---|
| Modifier | `apps/api/src/modules/compliance/compliance.service.ts` — refuse `openImmediately` sans `ownerUserId` (+ assert membre client) |
| Modifier | `apps/api/src/modules/compliance/compliance.service.spec.ts` — cas refus + happy path |
| Modifier | `apps/web/src/features/compliance/components/compliance-start-review-modal.tsx` — `*` label, `canSubmit` + owner, message si 0 membre |
| Optionnel | DTO : pas de `@ValidateIf` obligatoire si la règle métier est dans le service (vérité API) — garder DTO optional pour DRAFT |

## Critères d’acceptation

1. `POST …/campaigns` avec `openImmediately: true` et sans `ownerUserId` → `400` message clair FR.
2. `openImmediately: true` + `ownerUserId` hors client → refus existant (`assertAssigneeOnClient`).
3. `openImmediately: false` / DRAFT sans owner → OK.
4. Modale « Lancer une revue » : CTA désactivé sans owner ; label avec `*` ; libellés membres (pas d’ID).
5. Tests unitaires service verts ; `audit:ui-ids` OK.

## Hors scope

- Score pondéré · preuves · écarts · owner sur statut exigence · migration schéma

## By design

- **RGPD** : owner = `User` déjà membre client ; pas de nouveau DCP ; pas de log email en clair
- **RGAA** : `Label` + `aria-required` ; erreur/état désactivé explicite
- **DS** : `StariumModal` existant ; tokens ; pas de hex
- **Sécurité** : validation service + scope client ; `compliance.update` inchangé
- **Mobile** : `min-h-11` déjà sur contrôles

## Verdict review (auto)

GO — 1 feature, API-first, isolation client via `assertAssigneeOnClient`, pas de migration.
