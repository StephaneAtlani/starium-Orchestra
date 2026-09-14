'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Plus,
  Search,
  Settings2,
  Wallet,
} from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PermissionGate } from '@/components/PermissionGate';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import {
  fetchProjectRequestSummary,
  listProjectRequests,
  type ProjectRequestDto,
} from '../api/project-requests.api';
import {
  CIRCUIT_STATUSES,
  DONE_STATUSES,
} from '../constants/project-request-labels';
import {
  circuitBadge,
  formatBudgetKEuro,
  formatProjectRequestDate,
  personInitials,
  statusBadgeClass,
  statusLabel,
  typeLabel,
  PROJECT_REQUEST_TYPE_META,
} from '../lib/project-request-display';
import { ProjectRequestCircuitConfigDialog } from './project-request-circuit-config-dialog';
import '../styles/demandes.css';

type SegmentFilter = 'all' | 'circuit' | 'done';

function matchesSegment(row: ProjectRequestDto, segment: SegmentFilter): boolean {
  if (segment === 'all') return true;
  if (segment === 'circuit') return CIRCUIT_STATUSES.has(row.status);
  return DONE_STATUSES.has(row.status);
}

function matchesSearch(row: ProjectRequestDto, q: string): boolean {
  if (!q) return true;
  const hay = [
    row.referenceCode,
    row.title,
    row.requestingDirection,
    row.requesterSummary?.displayName,
    typeLabel(row.type),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function RequestRowCells({ row }: { row: ProjectRequestDto }) {
  const typeMeta = row.type ? PROJECT_REQUEST_TYPE_META[row.type] : undefined;
  const circuit = circuitBadge(row);
  const requester = displayLabel(
    row.requesterSummary?.displayName,
    'Demandeur inconnu',
  );
  const seanceShort = row.meetingLabel
    ?.replace(/^[A-Z]+ ?[A-Za-zÀ-ÿ]* — /, '')
    .trim();

  return (
    <>
      <td>
        <span className="dem-ref">
          {displayLabel(row.referenceCode, 'Sans référence')}
        </span>
      </td>
      <td>
        <div className="dem-title">{displayLabel(row.title, 'Sans titre')}</div>
        <div className="dem-sub">
          {displayLabel(row.requestingDirection, 'Direction non renseignée')} ·
          déposée le {formatProjectRequestDate(row.createdAt)}
        </div>
      </td>
      <td>
        <span
          className={cn(
            'dem-route',
            typeMeta?.iconBg ?? 'bg-muted',
            typeMeta?.iconFg ?? 'text-foreground',
          )}
        >
          {typeLabel(row.type)}
        </span>
      </td>
      <td>
        <span className="dem-av">
          <span className="dem-av-bubble" aria-hidden>
            {personInitials(requester)}
          </span>
          <span className="dem-av-n">{requester}</span>
        </span>
      </td>
      <td className="right">
        <span className="dem-num">{formatBudgetKEuro(row.estimatedBudget)}</span>
      </td>
      <td>
        <span
          className={cn(
            'dem-route',
            circuit.needsCycle
              ? 'bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]'
              : 'bg-[color:var(--neutral-100)] text-[color:var(--neutral-600)]',
          )}
        >
          {circuit.needsCycle ? (
            <Clock3 aria-hidden />
          ) : (
            <CheckCircle2 aria-hidden />
          )}
          {circuit.label}
        </span>
        {row.meetingLabel && row.status === 'IN_CYCLE' && seanceShort ? (
          <div className="dem-sub" style={{ marginTop: 4 }}>
            {seanceShort}
          </div>
        ) : null}
      </td>
      <td>
        <span className={cn('starium-ds-badge', statusBadgeClass(row.status))}>
          {statusLabel(row.status)}
        </span>
        {row.convertedProjectSummary ? (
          <div className="dem-sub" style={{ marginTop: 4 }}>
            {displayLabel(row.convertedProjectSummary.name, 'Projet créé')}
          </div>
        ) : null}
      </td>
      <td className="dem-chev">
        <ChevronRight aria-hidden />
      </td>
    </>
  );
}

export function ProjectRequestsListPage() {
  const router = useRouter();
  const [configOpen, setConfigOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<SegmentFilter>('all');
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const {
    has,
    isModuleVisible,
    isLoading: permsLoading,
    isSuccess: permsSuccess,
  } = usePermissions();
  const canReadProjectRequests =
    permsSuccess &&
    has('project_requests.read') &&
    isModuleVisible('project_requests');
  const listEnabled = !!clientId && canReadProjectRequests;

  const listQuery = useQuery({
    queryKey: ['project-requests', clientId],
    queryFn: () => listProjectRequests(authFetch, { limit: 100 }),
    enabled: listEnabled,
  });

  const summaryQuery = useQuery({
    queryKey: ['project-requests-summary', clientId],
    queryFn: () => fetchProjectRequestSummary(authFetch),
    enabled: listEnabled,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (listQuery.data?.items ?? []).filter(
      (row) => matchesSegment(row, segment) && matchesSearch(row, q),
    );
  }, [listQuery.data?.items, search, segment]);

  const summary = summaryQuery.data;
  const refusedOrPostponed = (listQuery.data?.items ?? []).filter(
    (r) => r.status === 'REJECTED' || r.status === 'POSTPONED',
  ).length;

  const stepChain = useMemo(() => {
    if (!summary) return [];
    const steps = ['Soumission'];
    if (summary.requireN1Validation) steps.push('Validation N+1');
    if (summary.requirePmoInstruction) steps.push('Instruction');
    steps.push(
      summary.copilThresholdAmount > 0 ? 'Arbitrage COPIL' : 'Validation PMO',
    );
    steps.push('Création du projet');
    return steps;
  }, [summary]);

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Demandes de projet"
          description="Point d'entrée unique des besoins métiers. Chaque demande suit le circuit défini dans la configuration, passe en cycle de pilotage lorsque les seuils l'exigent, et devient un projet du portefeuille une fois validée."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <PermissionGate permission="project_requests.settings.manage">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-9"
                  onClick={() => setConfigOpen(true)}
                >
                  <Settings2 className="mr-2 size-4" aria-hidden />
                  Configuration du circuit
                </Button>
              </PermissionGate>
              <PermissionGate permission="project_requests.create">
                <Link
                  href="/projects/requests/new"
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'min-h-11 sm:min-h-9',
                  )}
                >
                  <Plus className="mr-2 size-4" aria-hidden />
                  Nouvelle demande
                </Link>
              </PermissionGate>
            </div>
          }
        />

        <ProjectRequestCircuitConfigDialog
          open={configOpen}
          onOpenChange={setConfigOpen}
        />

        <div className="dem-root">
          {permsLoading || (!clientId && !permsSuccess) ? (
            <LoadingState rows={6} />
          ) : permsSuccess && !canReadProjectRequests ? (
            <Alert variant="destructive">
              <AlertTitle>Accès refusé</AlertTitle>
              <AlertDescription>
                Le module Demandes de projet n’est pas accessible avec votre profil
                pour ce client.
              </AlertDescription>
            </Alert>
          ) : listQuery.isLoading || summaryQuery.isLoading ? (
            <LoadingState rows={8} />
          ) : listQuery.error ? (
            <ErrorState
              message="Impossible de charger les demandes."
              onRetry={() => void listQuery.refetch()}
            />
          ) : (
            <>
              <section className="dem-kpis" aria-label="Indicateurs">
                <div className="dem-kpi">
                  <div
                    className="dem-kpi-ico bg-[color:var(--state-info-bg)] text-[color:var(--state-info)]"
                    aria-hidden
                  >
                    <FileText />
                  </div>
                  <div>
                    <div className="dem-kpi-label">À instruire</div>
                    <div className="dem-kpi-num">{summary?.toInstruct ?? 0}</div>
                    <div className="dem-kpi-sub text-[color:var(--state-info)]">
                      En attente du PMO ou du N+1
                    </div>
                  </div>
                </div>
                <div className="dem-kpi">
                  <div
                    className="dem-kpi-ico bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]"
                    aria-hidden
                  >
                    <Clock3 />
                  </div>
                  <div>
                    <div className="dem-kpi-label">En cycle de pilotage</div>
                    <div className="dem-kpi-num">{summary?.inCycle ?? 0}</div>
                    <div className="dem-kpi-sub text-[color:var(--brand-gold-700)]">
                      Inscrites à un comité
                    </div>
                  </div>
                </div>
                <div className="dem-kpi">
                  <div
                    className="dem-kpi-ico bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]"
                    aria-hidden
                  >
                    <CheckCircle2 />
                  </div>
                  <div>
                    <div className="dem-kpi-label">Validées à convertir</div>
                    <div className="dem-kpi-num">{summary?.toConvert ?? 0}</div>
                    <div className="dem-kpi-sub text-[color:var(--state-success)]">
                      Prêtes à devenir un projet
                    </div>
                  </div>
                </div>
                <div className="dem-kpi">
                  <div
                    className="dem-kpi-ico bg-[color:var(--purple-bg)] text-[color:var(--purple)]"
                    aria-hidden
                  >
                    <Wallet />
                  </div>
                  <div>
                    <div className="dem-kpi-label">Enveloppe en circuit</div>
                    <div className="dem-kpi-num dem-kpi-num--sm">
                      {formatBudgetKEuro(summary?.envelopeInCircuit ?? 0)}
                    </div>
                    <div className="dem-kpi-sub text-[color:var(--purple)]">
                      {refusedOrPostponed} demande
                      {refusedOrPostponed > 1 ? 's' : ''} refusée
                      {refusedOrPostponed > 1 ? 's' : ''} ou ajournée
                      {refusedOrPostponed > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </section>

              <section className="dem-card" aria-label="Liste des demandes">
                <div className="dem-bar">
                  <div className="dem-search">
                    <Search aria-hidden />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher une demande, une direction…"
                      aria-label="Rechercher une demande"
                    />
                  </div>
                  <div
                    className="dem-seg"
                    role="tablist"
                    aria-label="Filtrer par segment"
                  >
                    {(
                      [
                        ['all', 'Toutes'],
                        ['circuit', 'En circuit'],
                        ['done', 'Terminées'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={segment === key}
                        className={cn(
                          'dem-seg-btn',
                          segment === key && 'is-active',
                        )}
                        onClick={() => setSegment(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="dem-seuil">
                    Seuil de passage en cycle :{' '}
                    <b>{formatBudgetKEuro(summary?.copilThresholdAmount ?? 0)}</b>
                  </p>
                </div>

                {filtered.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      title="Aucune demande"
                      description="Aucune demande ne correspond à ce filtre."
                    />
                  </div>
                ) : (
                  <>
                    <ul className="dem-mobile-list" aria-label="Demandes">
                      {filtered.map((row) => {
                        const typeMeta = row.type
                          ? PROJECT_REQUEST_TYPE_META[row.type]
                          : undefined;
                        return (
                          <li key={row.id}>
                            <button
                              type="button"
                              className="dem-mobile-item"
                              onClick={() =>
                                router.push(`/projects/requests/${row.id}`)
                              }
                            >
                              <span className="dem-ref">
                                {displayLabel(row.referenceCode, 'Sans référence')}
                              </span>
                              <div className="dem-title mt-1">
                                {displayLabel(row.title, 'Sans titre')}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span
                                  className={cn(
                                    'starium-ds-badge',
                                    statusBadgeClass(row.status),
                                  )}
                                >
                                  {statusLabel(row.status)}
                                </span>
                                <span
                                  className={cn(
                                    'dem-route',
                                    typeMeta?.iconBg,
                                    typeMeta?.iconFg,
                                  )}
                                >
                                  {typeLabel(row.type)}
                                </span>
                                <span className="dem-num">
                                  {formatBudgetKEuro(row.estimatedBudget)}
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="dem-table-wrap dem-table-wrap--desktop">
                      <table className="dem-table">
                        <thead>
                          <tr>
                            <th>Réf.</th>
                            <th>Demande</th>
                            <th>Type</th>
                            <th>Demandeur</th>
                            <th className="right">Budget estimé</th>
                            <th>Circuit</th>
                            <th>Statut</th>
                            <th>
                              <span className="sr-only">Ouvrir</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((row) => (
                            <tr
                              key={row.id}
                              tabIndex={0}
                              onClick={() =>
                                router.push(`/projects/requests/${row.id}`)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  router.push(`/projects/requests/${row.id}`);
                                }
                              }}
                            >
                              <RequestRowCells row={row} />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>

              {summary ? (
                <section className="dem-rules" aria-label="Règles du circuit">
                  <div className="dem-rule">
                    <div className="dem-rule-k">Passage en cycle de pilotage</div>
                    <div className="dem-rule-v">
                      À partir de {formatBudgetKEuro(summary.copilThresholdAmount)}
                    </div>
                    <div className="dem-rule-m">
                      En dessous du seuil, la demande est validée par le PMO sans
                      arbitrage en comité. Au-delà de{' '}
                      {formatBudgetKEuro(summary.codirThresholdAmount)}, l’arbitrage
                      remonte au CODIR.
                    </div>
                  </div>
                  <div className="dem-rule">
                    <div className="dem-rule-k">Étapes actives</div>
                    <div className="dem-rule-v">{stepChain.length} étapes</div>
                    <div className="dem-rule-m">{stepChain.join(' → ')}</div>
                  </div>
                  <div className="dem-rule">
                    <div className="dem-rule-k">Exemptions</div>
                    <div className="dem-rule-v">
                      {summary.exemptRequestTypes.length
                        ? summary.exemptRequestTypes
                            .map((t) => typeLabel(t))
                            .join(', ')
                        : 'Aucune'}
                    </div>
                    <div className="dem-rule-m">
                      Ces types de demandes sont validés hors cycle quel que soit
                      leur montant — typiquement les obligations réglementaires à
                      échéance contrainte.
                    </div>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </PageContainer>
    </RequireActiveClient>
  );
}
