/**
 * @deprecated RFC-BUD-040 — wrapper de transition vers budget-landing.api.ts
 */
export type { AuthFetch } from './budget-landing.api';

export {
  getBudgetLanding as getBudgetForecast,
  getEnvelopeLanding as getEnvelopeForecast,
  listEnvelopeLandingLines as listEnvelopeForecastLines,
} from './budget-landing.api';

export {
  compareBudget,
  compareSnapshots,
  compareVersions,
} from './budget-comparison.api';
