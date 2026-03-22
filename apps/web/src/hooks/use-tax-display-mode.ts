'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthenticatedFetch } from './use-authenticated-fetch';
import { useActiveClient } from './use-active-client';
import type { TaxDisplayMode } from '@/lib/format-tax-aware-amount';

type TaxSettingsResponse = {
  taxDisplayMode: TaxDisplayMode;
  taxInputMode: 'HT' | 'TTC';
  defaultTaxRate: number | null;
};

export function useTaxDisplayMode() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const storageKey = useMemo(() => {
    return clientId ? `starium.taxDisplayMode.${clientId}` : null;
  }, [clientId]);

  const [mode, setMode] = useState<TaxDisplayMode>('HT');
  const [initialized, setInitialized] = useState(false);
  const [taxInputMode, setTaxInputMode] = useState<'HT' | 'TTC'>('HT');
  const [defaultTaxRate, setDefaultTaxRate] = useState<number | null>(null);

  useEffect(() => {
    if (!clientId) {
      setMode('HT');
      setInitialized(true);
      setTaxInputMode('HT');
      setDefaultTaxRate(null);
      return;
    }

    if (typeof window === 'undefined' || !storageKey) return;

    let cancelled = false;
    (async () => {
      try {
        setInitialized(false);
        const res = await authFetch('/api/clients/active/tax-settings');
        if (!res.ok) return;
        const json = (await res.json()) as TaxSettingsResponse;
        if (cancelled) return;
        setTaxInputMode(json.taxInputMode);
        setDefaultTaxRate(json.defaultTaxRate);

        const stored = window.localStorage.getItem(storageKey);
        if (stored === 'HT' || stored === 'TTC') setMode(stored);
        else if (json.taxDisplayMode === 'HT' || json.taxDisplayMode === 'TTC') {
          setMode(json.taxDisplayMode);
        }
      } catch {
        // fallback silencieux
        if (!cancelled) setMode('HT');
      } finally {
        if (!cancelled) setInitialized(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authFetch, clientId, storageKey]);

  const setTaxDisplayMode = (next: TaxDisplayMode) => {
    setMode(next);
    if (typeof window !== 'undefined' && storageKey) {
      window.localStorage.setItem(storageKey, next);
    }
  };

  return {
    taxDisplayMode: mode,
    setTaxDisplayMode,
    isLoading: !initialized,
    taxInputMode,
    defaultTaxRate,
  };
}

