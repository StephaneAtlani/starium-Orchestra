import {
  formatTaxAwareAmount,
  type TaxDisplayMode,
} from '@/lib/format-tax-aware-amount';
import { formatNumberFr, getCurrencySymbol } from '@/lib/currency-format';

/** TTC affiché : valeur API si présente, sinon HT × (1 + TVA % / 100). */
export function resolveTtcDisplay(
  ht: number,
  ttcFromApi: number | null | undefined,
  defaultTaxRatePercent: number | null,
): number | null {
  if (ttcFromApi != null) return ttcFromApi;
  if (defaultTaxRatePercent == null) return null;
  return ht * (1 + defaultTaxRatePercent / 100);
}

export function formatDashboardAmount(params: {
  ht: number;
  ttcFromApi?: number | null;
  currency: string;
  mode: TaxDisplayMode;
  defaultTaxRate: number | null;
}): string {
  const { ht, ttcFromApi, currency, mode, defaultTaxRate } = params;
  const ttc = resolveTtcDisplay(ht, ttcFromApi, defaultTaxRate);
  return formatTaxAwareAmount({
    htValue: ht,
    ttcValue: ttc,
    currency,
    mode,
    isApproximation: ttcFromApi == null && mode === 'TTC',
  });
}

/** Affichage structuré pour cartes KPI (nombre / devise / HT·TTC séparés). */
export type KpiAmountParts = {
  amount: string;
  currency: string;
  taxTag: 'HT' | 'TTC';
  approx: boolean;
};

function formatFrInt(n: number): string {
  return formatNumberFr(n);
}

export function formatKpiAmountParts(params: {
  ht: number;
  ttcFromApi?: number | null;
  currency: string;
  mode: TaxDisplayMode;
  defaultTaxRate: number | null;
}): KpiAmountParts {
  const { ht, ttcFromApi, currency, mode, defaultTaxRate } = params;
  const ttc = resolveTtcDisplay(ht, ttcFromApi, defaultTaxRate);
  const isApproximation = ttcFromApi == null && mode === 'TTC';

  const sym = getCurrencySymbol(currency);

  if (mode === 'HT') {
    return { amount: formatFrInt(ht), currency: sym, taxTag: 'HT', approx: false };
  }
  if (ttc != null) {
    return {
      amount: formatFrInt(ttc),
      currency: sym,
      taxTag: 'TTC',
      approx: isApproximation,
    };
  }
  return { amount: formatFrInt(ht), currency: sym, taxTag: 'HT', approx: false };
}

/** Écart forecast − budget révisé : différence des TTC API si les deux agrégats sont connus. */
export function formatForecastGapAmount(
  kpis: {
    totalBudget: number;
    forecast: number;
    totalBudgetTtc?: number | null;
    forecastTtc?: number | null;
  },
  currency: string,
  mode: TaxDisplayMode,
  defaultTaxRate: number | null,
): string {
  const ecartHt = kpis.forecast - kpis.totalBudget;
  const ecartTtcFromApi =
    kpis.forecastTtc != null && kpis.totalBudgetTtc != null
      ? kpis.forecastTtc - kpis.totalBudgetTtc
      : undefined;
  return formatDashboardAmount({
    ht: ecartHt,
    ttcFromApi: ecartTtcFromApi,
    currency,
    mode,
    defaultTaxRate,
  });
}

export function formatForecastGapParts(
  kpis: {
    totalBudget: number;
    forecast: number;
    totalBudgetTtc?: number | null;
    forecastTtc?: number | null;
  },
  currency: string,
  mode: TaxDisplayMode,
  defaultTaxRate: number | null,
): KpiAmountParts {
  const ecartHt = kpis.forecast - kpis.totalBudget;
  const ecartTtcFromApi =
    kpis.forecastTtc != null && kpis.totalBudgetTtc != null
      ? kpis.forecastTtc - kpis.totalBudgetTtc
      : undefined;
  return formatKpiAmountParts({
    ht: ecartHt,
    ttcFromApi: ecartTtcFromApi,
    currency,
    mode,
    defaultTaxRate,
  });
}
