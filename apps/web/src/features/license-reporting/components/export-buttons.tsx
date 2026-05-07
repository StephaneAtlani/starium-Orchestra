'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  downloadClientsCsv,
  downloadJson,
  downloadMonthlyCsv,
  type LicenseReportingFilters,
  type LicenseReportingMonthlyFilters,
} from '../api/license-reporting';

interface ClientsExportProps {
  filters: LicenseReportingFilters;
  jsonPayload: unknown;
}

export function ClientsExportButtons({ filters, jsonPayload }: ClientsExportProps) {
  const authFetch = useAuthenticatedFetch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCsv = async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadClientsCsv(authFetch, filters);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onJson = () => {
    downloadJson('license-reporting-clients.json', jsonPayload);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onCsv} disabled={busy}>
        <Download className="mr-1 size-4" />
        Exporter CSV
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onJson} disabled={busy}>
        <Download className="mr-1 size-4" />
        Exporter JSON
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

interface MonthlyExportProps {
  filters: LicenseReportingMonthlyFilters;
  jsonPayload: unknown;
}

export function MonthlyExportButtons({ filters, jsonPayload }: MonthlyExportProps) {
  const authFetch = useAuthenticatedFetch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCsv = async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadMonthlyCsv(authFetch, filters);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onJson = () => {
    downloadJson('license-reporting-monthly.json', jsonPayload);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onCsv} disabled={busy}>
        <Download className="mr-1 size-4" />
        Exporter CSV
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onJson} disabled={busy}>
        <Download className="mr-1 size-4" />
        Exporter JSON
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
