/**
 * RFC-STRAT-011 — l’ancien monolithe liste+édition (~2k lignes) est remplacé par :
 * - `strategic-direction-strategy-portfolio-page.tsx` (S1 + onglet consolidé)
 * - `strategic-direction-schema-page.tsx` (S2 fiche schéma)
 * - `strategic-direction-strategy-consolidation-page.tsx` (S3)
 *
 * Réexport de compatibilité pour imports legacy éventuels.
 */
export { StrategicDirectionStrategyPortfolioPage as StrategicDirectionStrategyPage } from './strategic-direction-strategy-portfolio-page';
