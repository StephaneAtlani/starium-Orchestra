'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Settings2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useStrategicDirectionStrategyPortfolioQuery,
  useStrategicVisionOptionsQuery,
} from '../hooks/use-strategic-direction-strategy-queries';
import { getStrategicDirectionStrategyStatusLabel } from '../lib/strategic-direction-strategy-labels';
import { StrategicDirectionStrategyConsolidationPage } from './strategic-direction-strategy-consolidation-page';
import '../styles/strategie.css';

const TONE_STYLE: Record<string, { c: string; bg: string }> = {
  info: { c: 'var(--state-info)', bg: 'var(--state-info-bg)' },
  gold: { c: 'var(--brand-gold-700)', bg: 'var(--brand-gold-050)' },
  purple: { c: 'var(--purple)', bg: 'var(--purple-bg)' },
  teal: { c: 'var(--teal)', bg: 'var(--teal-bg)' },
  success: { c: 'var(--state-success)', bg: 'var(--state-success-bg)' },
  danger: { c: 'var(--state-danger)', bg: 'var(--state-danger-bg)' },
};

function toneOf(t: string | null | undefined) {
  return TONE_STYLE[t ?? 'info'] ?? TONE_STYLE.info;
}

function formatEurCents(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return '—';
  const n = cents / 100;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} M€`;
  return `${Math.round(n / 1000)} k€`;
}

function formatReviewDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const months = [
    'janv',
    'févr',
    'mars',
    'avr',
    'mai',
    'juin',
    'juil',
    'août',
    'sept',
    'oct',
    'nov',
    'déc',
  ];
  return `${d.getDate()} ${months[d.getMonth()]}. ${d.getFullYear()}`;
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div className="stg-ring" aria-label={`Alignement ${score} %`}>
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden>
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke="var(--neutral-200)"
          strokeWidth="6"
        />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
          transform="rotate(-90 26 26)"
        />
      </svg>
      <div className="stg-ring-v" style={{ color }}>
        {score}
      </div>
    </div>
  );
}

export function StrategicDirectionStrategyPortfolioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get('view') === 'consolide' ? 'consolide' : 'directions';
  const { has } = usePermissions();
  const canCreate = has('strategic_direction_strategy.create');
  const canManageDirections =
    has('strategic_vision.update') ||
    has('strategic_vision.manage_directions');

  const [search, setSearch] = useState('');
  const visionsQuery = useStrategicVisionOptionsQuery();
  const defaultVisionId = useMemo(() => {
    const list = visionsQuery.data ?? [];
    const active = list.find((v) => v.isActive);
    return active?.id ?? list[0]?.id ?? null;
  }, [visionsQuery.data]);

  const portfolioQuery = useStrategicDirectionStrategyPortfolioQuery({
    alignedVisionId: defaultVisionId,
    search,
  });

  const canCreateAnySchema = useMemo(() => {
    if (canCreate) return true;
    return (portfolioQuery.data ?? []).some((c) => Boolean(c.canCreateStrategy));
  }, [canCreate, portfolioQuery.data]);

  const setView = (next: 'directions' | 'consolide') => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'consolide') params.set('view', 'consolide');
    else params.delete('view');
    const q = params.toString();
    router.replace(q ? `?${q}` : '/strategic-direction-strategy');
  };

  return (
    <PageContainer>
      <div className="stg-root">
      <PageHeader
        title="Stratégie"
        description="Chaque direction porte sa propre stratégie sous forme de schéma directeur."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/strategic-direction-strategy/options"
              className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}
            >
              <Settings2 className="size-4" aria-hidden />
              Options
            </Link>
            {canManageDirections || canCreate ? (
              <Button
                type="button"
                className="min-h-11"
                onClick={() =>
                  router.push('/strategic-vision?tab=directions')
                }
              >
                <Plus className="size-4" aria-hidden />
                Ajouter une direction
              </Button>
            ) : null}
          </div>
        }
      />

      <div
        className="bud-subtabs"
        id="ds-subtabs"
        role="tablist"
        aria-label="Vues stratégie"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === 'directions'}
          className={cn('bud-subtab', view === 'directions' && 'active')}
          onClick={() => setView('directions')}
        >
          Directions
          <span className="stg-tabn">{portfolioQuery.data?.length ?? 0}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'consolide'}
          className={cn('bud-subtab', view === 'consolide' && 'active')}
          onClick={() => setView('consolide')}
        >
          Consolidé groupe
        </button>
      </div>

      {view === 'consolide' ? (
        <StrategicDirectionStrategyConsolidationPage alignedVisionId={defaultVisionId} />
      ) : (
        <>
          <div className="stg-bar">
            <div className="stg-search">
              <Search aria-hidden />
              <label className="sr-only" htmlFor="stg-portfolio-search">
                Rechercher une direction
              </label>
              <input
                id="stg-portfolio-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une direction…"
              />
            </div>
            <div className="fspacer" />
            <span className="stg-meta text-[12.5px] font-semibold text-muted-foreground">
              Chaque direction porte sa propre stratégie sous forme de schéma directeur.
            </span>
          </div>

          {portfolioQuery.isLoading ? <LoadingState /> : null}
          {portfolioQuery.isError ? (
            <ErrorState
              message="Impossible de charger le portefeuille"
              onRetry={() => void portfolioQuery.refetch()}
            />
          ) : null}
          {portfolioQuery.isSuccess && (portfolioQuery.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="Aucune direction stratégique"
              description={
                canManageDirections
                  ? 'Créez une direction dans Vision stratégique, puis rédigez son schéma directeur.'
                  : canCreateAnySchema
                    ? 'Aucune direction active pour ce client. Contactez un administrateur si vous êtes sponsor d’une direction.'
                    : 'Aucune direction visible. Vous n’avez pas les droits pour créer un schéma hors sponsorship.'
              }
            />
          ) : null}

          {portfolioQuery.isSuccess && (portfolioQuery.data?.length ?? 0) > 0 ? (
            <div className="stg-grid">
              {portfolioQuery.data!.map((card) => {
                const T = toneOf(card.accentTone);
                const statusLabel = card.needsStrategy
                  ? 'À créer'
                  : getStrategicDirectionStrategyStatusLabel(card.status ?? 'DRAFT');
                const versionBit = card.versionLabel ? ` · ${card.versionLabel}` : '';
                const canOpen = Boolean(card.strategyId);
                const canCreateThis =
                  Boolean(card.needsStrategy) &&
                  (canCreate || Boolean(card.canCreateStrategy));
                const interactive = canOpen || canCreateThis;
                return (
                  <button
                    key={card.directionId}
                    type="button"
                    className={cn(
                      'card stg-card text-left',
                      !interactive && 'cursor-default opacity-90',
                    )}
                    disabled={!interactive}
                    aria-label={
                      canOpen
                        ? `Ouvrir le schéma ${displayLabel(card.name, 'Direction')}`
                        : canCreateThis
                          ? `Créer le schéma ${displayLabel(card.name, 'Direction')}`
                          : `Schéma non disponible pour ${displayLabel(card.name, 'Direction')}`
                    }
                    onClick={() => {
                      if (card.strategyId) {
                        router.push(`/strategic-direction-strategy/${card.strategyId}`);
                        return;
                      }
                      if (canCreateThis) {
                        router.push(
                          `/strategic-direction-strategy/new?directionId=${encodeURIComponent(card.directionId)}`,
                        );
                      }
                    }}
                  >
                    <div className="stg-card-head">
                      <div
                        className="stg-sigle"
                        style={{ background: T.bg, color: T.c }}
                      >
                        {displayLabel(card.code, 'Direction')}
                      </div>
                      <div className="stg-card-id">
                        <div className="stg-card-name">
                          {displayLabel(card.name, 'Direction')}
                        </div>
                        <div className="stg-card-sub">
                          {firstDisplayLabel(
                            [card.sponsorLabel, card.parentLabel],
                            'Sponsor non renseigné',
                          )}
                        </div>
                      </div>
                      {card.score != null ? (
                        <ScoreRing score={card.score} color={T.c} />
                      ) : null}
                    </div>
                    <p className="stg-card-scope">
                      {displayLabel(card.description ?? card.context, 'Périmètre à préciser')}
                    </p>
                    <div className="stg-mgrid">
                      <div className="stg-mcell">
                        <div className="l">Horizon</div>
                        <div className="v">
                          {displayLabel(card.horizonLabel, '—')}
                        </div>
                      </div>
                      <div className="stg-mcell">
                        <div className="l">Chantiers</div>
                        <div className="v">
                          {card.initiativesCount}{' '}
                          <span className="text-[11.5px] font-semibold text-muted-foreground">
                            dont {card.initiativesDone} livré
                            {card.initiativesDone > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="stg-mcell">
                        <div className="l">Effectif</div>
                        <div className="v">
                          {card.fteCount != null ? `${card.fteCount} ETP` : '—'}
                        </div>
                      </div>
                      <div className="stg-mcell">
                        <div className="l">Budget</div>
                        <div className="v">{formatEurCents(card.operatingBudgetCents)}</div>
                      </div>
                    </div>
                    <div className="stg-card-foot">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {statusLabel}
                          {versionBit}
                        </Badge>
                        {card.isSponsor ? (
                          <Badge variant="outline">Sponsor</Badge>
                        ) : null}
                        {canCreateThis ? (
                          <Badge variant="outline">Créer le schéma</Badge>
                        ) : null}
                      </div>
                      <span className="stg-meta">
                        Revue {formatReviewDate(card.lastReviewAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
              {(canManageDirections || canCreate) && (
                <button
                  type="button"
                  className="stg-add"
                  onClick={() => router.push('/strategic-vision?tab=directions')}
                >
                  <Plus aria-hidden />
                  Ajouter une direction
                </button>
              )}
            </div>
          ) : null}
        </>
      )}
      </div>
    </PageContainer>
  );
}
