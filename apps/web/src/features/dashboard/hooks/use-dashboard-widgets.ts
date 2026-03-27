'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useActiveClient } from '@/hooks/use-active-client';
import { loadDashboardWidgets, saveDashboardWidgets } from '../lib/dashboard-widgets-storage';
import {
  defaultDashboardWidgetsConfig,
  type DashboardBudgetKpiKey,
  type DashboardBudgetWidgetScope,
  type DashboardProjectKpiKey,
  type DashboardSupplierKpiKey,
  type DashboardWidgetsConfig,
} from '../types/dashboard-widgets.types';

export function useDashboardWidgets() {
  const { user } = useAuth();
  const { activeClient } = useActiveClient();
  const userId = user?.id ?? '';
  const clientId = activeClient?.id ?? '';

  const [config, setConfig] = useState<DashboardWidgetsConfig>(
    defaultDashboardWidgetsConfig,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!userId || !clientId) {
      setConfig(defaultDashboardWidgetsConfig());
      setHydrated(false);
      return;
    }
    setConfig(loadDashboardWidgets(userId, clientId));
    setHydrated(true);
  }, [userId, clientId]);

  const persist = useCallback(
    (updater: (prev: DashboardWidgetsConfig) => DashboardWidgetsConfig) => {
      setConfig((prev) => {
        const next = updater(prev);
        if (userId && clientId) saveDashboardWidgets(userId, clientId, next);
        return next;
      });
    },
    [userId, clientId],
  );

  const setBudgetKpisVisible = useCallback(
    (visible: boolean) => {
      persist((prev) => ({
        ...prev,
        budgetKpis: { ...prev.budgetKpis, visible },
      }));
    },
    [persist],
  );

  const setBudgetKpisOrder = useCallback(
    (kpis: DashboardBudgetKpiKey[]) => {
      const uniq = [...new Set(kpis)];
      if (uniq.length === 0) return;
      persist((prev) => ({
        ...prev,
        budgetKpis: { ...prev.budgetKpis, kpis: uniq },
      }));
    },
    [persist],
  );

  const toggleBudgetKpi = useCallback(
    (key: DashboardBudgetKpiKey, checked: boolean) => {
      persist((prev) => {
        const current = prev.budgetKpis.kpis;
        let next: DashboardBudgetKpiKey[];
        if (checked) {
          if (current.includes(key)) return prev;
          next = [...current, key];
        } else {
          if (current.length <= 1) return prev;
          next = current.filter((k) => k !== key);
        }
        return {
          ...prev,
          budgetKpis: { ...prev.budgetKpis, kpis: next },
        };
      });
    },
    [persist],
  );

  const resetBudgetKpisDefaults = useCallback(() => {
    const base = defaultDashboardWidgetsConfig();
    persist((prev) => ({
      ...prev,
      budgetKpis: {
        ...base.budgetKpis,
        visible: prev.budgetKpis.visible,
        scope: prev.budgetKpis.scope,
      },
    }));
  }, [persist]);

  const setBudgetScope = useCallback(
    (scope: DashboardBudgetWidgetScope | undefined) => {
      persist((prev) => ({
        ...prev,
        budgetKpis: {
          ...prev.budgetKpis,
          scope:
            scope && (scope.budgetId || scope.exerciseId) ? scope : undefined,
        },
      }));
    },
    [persist],
  );

  const resetBudgetScope = useCallback(() => {
    persist((prev) => ({
      ...prev,
      budgetKpis: { ...prev.budgetKpis, scope: undefined },
    }));
  }, [persist]);

  const setProjectKpisVisible = useCallback(
    (visible: boolean) => {
      persist((prev) => ({
        ...prev,
        projectKpis: { ...prev.projectKpis, visible },
      }));
    },
    [persist],
  );

  const toggleProjectKpi = useCallback(
    (key: DashboardProjectKpiKey, checked: boolean) => {
      persist((prev) => {
        const current = prev.projectKpis.kpis;
        let next: DashboardProjectKpiKey[];
        if (checked) {
          if (current.includes(key)) return prev;
          next = [...current, key];
        } else {
          if (current.length <= 1) return prev;
          next = current.filter((k) => k !== key);
        }
        return {
          ...prev,
          projectKpis: { ...prev.projectKpis, kpis: next },
        };
      });
    },
    [persist],
  );

  const resetProjectKpisDefaults = useCallback(() => {
    const base = defaultDashboardWidgetsConfig();
    persist((prev) => ({
      ...prev,
      projectKpis: {
        ...base.projectKpis,
        visible: prev.projectKpis.visible,
      },
    }));
  }, [persist]);

  const setSupplierKpisVisible = useCallback(
    (visible: boolean) => {
      persist((prev) => ({
        ...prev,
        supplierKpis: { ...prev.supplierKpis, visible },
      }));
    },
    [persist],
  );

  const toggleSupplierKpi = useCallback(
    (key: DashboardSupplierKpiKey, checked: boolean) => {
      persist((prev) => {
        const current = prev.supplierKpis.kpis;
        let next: DashboardSupplierKpiKey[];
        if (checked) {
          if (current.includes(key)) return prev;
          next = [...current, key];
        } else {
          if (current.length <= 1) return prev;
          next = current.filter((k) => k !== key);
        }
        return {
          ...prev,
          supplierKpis: { ...prev.supplierKpis, kpis: next },
        };
      });
    },
    [persist],
  );

  const resetSupplierKpisDefaults = useCallback(() => {
    const base = defaultDashboardWidgetsConfig();
    persist((prev) => ({
      ...prev,
      supplierKpis: {
        ...base.supplierKpis,
        visible: prev.supplierKpis.visible,
      },
    }));
  }, [persist]);

  return {
    config,
    hydrated,
    setBudgetKpisVisible,
    setBudgetKpisOrder,
    toggleBudgetKpi,
    resetBudgetKpisDefaults,
    setBudgetScope,
    resetBudgetScope,
    setProjectKpisVisible,
    toggleProjectKpi,
    resetProjectKpisDefaults,
    setSupplierKpisVisible,
    toggleSupplierKpi,
    resetSupplierKpisDefaults,
  };
}
