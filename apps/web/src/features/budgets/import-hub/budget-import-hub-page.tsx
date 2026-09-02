'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FileSpreadsheet } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { budgetImportsTab, budgetList } from '../constants/budget-routes';
import { ImportProfilesTab } from './import-profiles-tab';
import { ImportHistoryTab } from './import-history-tab';
import { ImportCsvHelpTab } from './import-csv-help-tab';

type HubTab = 'profiles' | 'history' | 'help';

const TABS: { id: HubTab; label: string }[] = [
  { id: 'profiles', label: 'Profils' },
  { id: 'history', label: 'Historique' },
  { id: 'help', label: 'Aide CSV' },
];

function parseTab(raw: string | null): HubTab {
  if (raw === 'history' || raw === 'help' || raw === 'profiles') return raw;
  return 'profiles';
}

export function BudgetImportHubPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = useMemo(() => parseTab(searchParams.get('tab')), [searchParams]);

  const setTab = useCallback(
    (next: HubTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', next);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Imports budget"
          description="Profils de mapping, historique des exécutions et modèle CSV. Pour importer des lignes, ouvrez un budget puis « Importer », ou lancez un profil depuis l’onglet Profils."
          actions={
            <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center">
              <Link
                href={budgetImportsTab('help')}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 min-h-11 sm:min-h-9')}
              >
                <FileSpreadsheet className="size-4" aria-hidden />
                Modèle CSV
              </Link>
              <Link
                href={budgetList()}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-11 sm:min-h-9')}
              >
                Choisir un budget
              </Link>
            </div>
          }
        />

        <div
          className="starium-tab-group mb-6 self-start"
          role="tablist"
          aria-label="Sections imports budget"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={cn(
                'starium-tab-btn min-h-11 px-4 text-sm sm:min-h-9',
                tab === t.id && 'starium-tab-btn--active',
              )}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label}>
          {tab === 'profiles' ? <ImportProfilesTab /> : null}
          {tab === 'history' ? <ImportHistoryTab /> : null}
          {tab === 'help' ? <ImportCsvHelpTab /> : null}
        </div>
      </PageContainer>
    </RequireActiveClient>
  );
}
