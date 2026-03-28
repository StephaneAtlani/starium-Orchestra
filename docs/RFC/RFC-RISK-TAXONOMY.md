# RFC — Taxonomie risques (RiskDomain / RiskType)

## 1. Analyse de l’existant

- `ProjectRisk` : `category` (texte libre) et `impactCategory` (enum) en phase transitoire ; classification cible = `riskTypeId` → `RiskType` → `RiskDomain`.
- Migration SQL `20260331150000_risk_taxonomy_domains_types` : tables + backfill depuis `impactCategory` + couple obligatoire `GENERAL` / `UNCLASSIFIED`.
- Bootstrap idempotent : `src/modules/risk-taxonomy/risk-taxonomy-defaults.ts` (aligné migration).

## 2. API

| Méthode | Route | Permission |
|--------|-------|------------|
| GET | `/api/risk-taxonomy/catalog` | `projects.read` (module `projects`) |
| GET | `/api/risk-taxonomy/admin/domains` | `risks.taxonomy.manage` + `CLIENT_ADMIN` |
| POST/PATCH | `/api/risk-taxonomy/admin/domains` … | idem |

Module `risks` + permission `risks.taxonomy.manage` créés au seed ; rôle global « Client admin — taxonomie risques » assigné aux `CLIENT_ADMIN`.

## 3. ProjectRisk

- Create/update : `riskTypeId` requis (ou à la mise à jour si changement) ; validation `RiskTaxonomyService.assertUsableRiskTypeForWrite` (client, type + domaine actifs).
- Réponses liste/détail : `include: { riskType: { include: { domain: true } } }`.

## 4. Points de vigilance

- Pas de suppression physique si références ; codes immuables si risques liés (service).
- `category` / `impactCategory` : non pilotants pour les nouveaux comportements ; sortie à trancher ultérieurement.
