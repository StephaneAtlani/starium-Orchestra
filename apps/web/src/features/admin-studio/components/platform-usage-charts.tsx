'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Maximize2 } from 'lucide-react';
import type { PlatformUsageDailyPoint } from '../types/admin-studio.types';

const COLOR_AUDIT = 'hsl(221.2 83.2% 53.3%)';
const COLOR_SECURITY = 'hsl(142 71% 45%)';
const COLOR_LOGIN = 'hsl(25 95% 48%)';
const COLOR_REFRESH = 'hsl(271 83% 56%)';
const COLOR_USERS_DISTINCT = 'hsl(199 89% 48%)';
const COLOR_CLIENTS_DISTINCT = 'hsl(330 72% 50%)';

function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

type Pt = { x: number; y: number };

/** Courbe lisse type Catmull-Rom → cubiques (points en coordonnées viewBox 0–100). */
function smoothLinePath(points: Pt[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Bande entre deux courbes (même abscisses) — pour aires empilées (bas → cumul). */
function smoothBandPath(lower: Pt[], upper: Pt[]): string {
  if (lower.length === 0 || upper.length === 0 || lower.length !== upper.length) return '';
  const n = lower.length;
  let d = smoothLinePath(lower);
  d += ` L ${upper[n - 1].x} ${upper[n - 1].y}`;
  for (let i = n - 2; i >= 0; i--) {
    d += ` L ${upper[i].x} ${upper[i].y}`;
  }
  d += ' Z';
  return d;
}

type DualKey =
  | 'auditLogs'
  | 'securityLogs'
  | 'authLogins'
  | 'authRefreshes'
  | 'authDistinctUsers'
  | 'authDistinctClients';

function DualAreaSparkSvg({
  daily,
  key1,
  key2,
  color1,
  color2,
  ariaLabel,
  label1,
  label2,
  variant,
  chartSize = 'card',
}: {
  daily: PlatformUsageDailyPoint[];
  key1: DualKey;
  key2: DualKey;
  color1: string;
  color2: string;
  ariaLabel: string;
  label1: string;
  label2: string;
  /** stacked = empilé (volume cumulé) ; overlap = deux aires superposées (transparence) */
  variant: 'stacked' | 'overlap';
  /** `fullscreen` : zone de tracé agrandie (ex. modale plein écran) */
  chartSize?: 'card' | 'fullscreen';
}) {
  const uid = useId().replace(/:/g, '');
  const [pointTip, setPointTip] = useState<{
    text: string;
    clientX: number;
    clientY: number;
  } | null>(null);

  const layout = useMemo(() => {
    const n = daily.length;
    const padL = 10;
    const padR = 6;
    const padT = 8;
    const padB = 14;
    const innerW = 100 - padL - padR;
    const innerH = 100 - padT - padB;
    const bottom = padT + innerH;
    const left = padL;
    const vals1 = daily.map((d) => d[key1]);
    const vals2 = daily.map((d) => d[key2]);

    let maxVal: number;
    let pts1: Pt[];
    let pts2: Pt[];

    if (variant === 'stacked') {
      const stacked = vals1.map((a, i) => a + vals2[i]);
      maxVal = Math.max(1, ...stacked);
      const toX = (i: number) =>
        left + (n <= 1 ? innerW / 2 : (i / Math.max(n - 1, 1)) * innerW);
      const toY = (v: number) => bottom - (v / maxVal) * innerH;
      pts1 = vals1.map((v, i) => ({ x: toX(i), y: toY(v) }));
      pts2 = stacked.map((v, i) => ({ x: toX(i), y: toY(v) }));
    } else {
      maxVal = Math.max(1, ...vals1, ...vals2);
      const toX = (i: number) =>
        left + (n <= 1 ? innerW / 2 : (i / Math.max(n - 1, 1)) * innerW);
      const toY = (v: number) => bottom - (v / maxVal) * innerH;
      pts1 = vals1.map((v, i) => ({ x: toX(i), y: toY(v) }));
      pts2 = vals2.map((v, i) => ({ x: toX(i), y: toY(v) }));
    }

    const pathLine1 = smoothLinePath(pts1);
    const pathLine2 = smoothLinePath(pts2);

    const xFirst = n > 0 ? pts1[0].x : left;
    const xLast = n > 0 ? pts1[n - 1].x : left + innerW;

    const areaUnder1 =
      pathLine1 &&
      `${pathLine1} L ${xLast} ${bottom} L ${xFirst} ${bottom} Z`;
    const areaUnder2 =
      pathLine2 &&
      `${pathLine2} L ${xLast} ${bottom} L ${xFirst} ${bottom} Z`;

    const fillArea1 = areaUnder1;
    const fillArea2 =
      variant === 'stacked'
        ? pts1.length > 0 && pts2.length > 0
          ? smoothBandPath(pts1, pts2)
          : ''
        : areaUnder2;

    const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => bottom - t * innerH);

    return {
      maxVal,
      pathLine1,
      pathLine2,
      fillArea1,
      fillArea2,
      gridYs,
      innerW,
      innerH,
      left,
      bottom,
      pts1,
      pts2,
    };
  }, [daily, key1, key2, variant]);

  const {
    maxVal,
    pathLine1,
    pathLine2,
    fillArea1,
    fillArea2,
    gridYs,
    innerW,
    innerH,
    left,
    bottom,
    pts1,
    pts2,
  } = layout;

  const tickLabels = useMemo(() => {
    if (daily.length === 0) return [];
    const idx: number[] = [];
    const n = daily.length;
    idx.push(0);
    if (n > 1) idx.push(Math.floor(n / 2));
    if (n > 2) idx.push(n - 1);
    return [...new Set(idx)].sort((a, b) => a - b);
  }, [daily]);

  const g1 = `url(#${uid}-fill1)`;
  const g2 = `url(#${uid}-fill2)`;

  return (
    <div
      className={cn(
        'bg-muted/15 w-full overflow-hidden rounded-xl border border-border/50',
        'shadow-inner',
      )}
    >
      {typeof document !== 'undefined' &&
        pointTip &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[200] max-w-[min(90vw,20rem)] rounded-md border border-border/60 bg-foreground px-3 py-1.5 text-xs text-background shadow-md"
            style={{
              left: pointTip.clientX,
              top: pointTip.clientY,
              transform: 'translate(-50%, calc(-100% - 10px))',
            }}
          >
            {pointTip.text}
          </div>,
          document.body,
        )}
      <div
        className={cn(
          'w-full',
          chartSize === 'card' &&
            'aspect-[16/11] min-h-[200px] max-h-[min(340px,50vh)]',
          chartSize === 'fullscreen' &&
            'aspect-[16/10] min-h-[min(70vh,720px)] max-h-[min(88vh,900px)]',
        )}
      >
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full animate-in fade-in duration-500 fill-mode-both"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <linearGradient id={`${uid}-fill1`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color1} stopOpacity={0.55} />
              <stop offset="100%" stopColor={color1} stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id={`${uid}-fill2`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color2} stopOpacity={variant === 'stacked' ? 0.5 : 0.42} />
              <stop offset="100%" stopColor={color2} stopOpacity={0.03} />
            </linearGradient>
            <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={0.35} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {gridYs.map((y, i) => (
            <line
              key={i}
              x1={left}
              y1={y}
              x2={left + innerW}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
              className="text-foreground"
            />
          ))}

          <text x={left} y={6} fontSize="3" fill="currentColor" className="opacity-55">
            max {maxVal}
          </text>

          {tickLabels.map((i) => {
            const x =
              left +
              (daily.length <= 1 ? innerW / 2 : (i / Math.max(daily.length - 1, 1)) * innerW);
            return (
              <text
                key={i}
                x={x}
                y={98}
                fontSize="2.4"
                textAnchor="middle"
                fill="currentColor"
                className="opacity-65"
              >
                {daily[i] ? formatDayLabel(daily[i].date) : ''}
              </text>
            );
          })}

          {variant === 'overlap' && (
            <>
              {fillArea2 && (
                <path d={fillArea2} fill={g2} className="transition-opacity duration-300" />
              )}
              {fillArea1 && (
                <path d={fillArea1} fill={g1} className="transition-opacity duration-300" />
              )}
            </>
          )}
          {variant === 'stacked' && (
            <>
              {fillArea1 && (
                <path d={fillArea1} fill={g1} className="transition-opacity duration-300" />
              )}
              {fillArea2 && (
                <path d={fillArea2} fill={g2} className="transition-opacity duration-300" />
              )}
            </>
          )}

          {pathLine1 && (
            <path
              d={pathLine1}
              fill="none"
              stroke={color1}
              strokeWidth={1.35}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              filter={`url(#${uid}-glow)`}
            />
          )}
          {pathLine2 && (
            <path
              d={pathLine2}
              fill="none"
              stroke={color2}
              strokeWidth={1.35}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              filter={`url(#${uid}-glow)`}
            />
          )}

          {daily.map((d, i) => {
            const title =
              variant === 'stacked'
                ? `${d.date} — ${label1}: ${d[key1]}, ${label2}: ${d[key2]} (empilé: ${d[key1] + d[key2]})`
                : `${d.date} — ${label1}: ${d[key1]}, ${label2}: ${d[key2]}`;
            const p1 = pts1[i];
            const p2 = pts2[i];
            if (!p1 || !p2) return null;
            const midY = (p1.y + p2.y) / 2;
            return (
              <g key={d.date}>
                <circle
                  cx={p1.x}
                  cy={midY}
                  r={6.5}
                  fill="transparent"
                  className="cursor-crosshair"
                  pointerEvents="all"
                  onMouseEnter={(e) => {
                    setPointTip({ text: title, clientX: e.clientX, clientY: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    setPointTip((prev) =>
                      prev ? { ...prev, clientX: e.clientX, clientY: e.clientY } : null,
                    );
                  }}
                  onMouseLeave={() => setPointTip(null)}
                />
                <circle
                  cx={p1.x}
                  cy={p1.y}
                  r={1.25}
                  fill={color1}
                  className="pointer-events-none opacity-90"
                />
                <circle
                  cx={p2.x}
                  cy={p2.y}
                  r={1.25}
                  fill={color2}
                  className="pointer-events-none opacity-90"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

type SparkChartProps = {
  daily: PlatformUsageDailyPoint[];
  key1: DualKey;
  key2: DualKey;
  color1: string;
  color2: string;
  ariaLabel: string;
  label1: string;
  label2: string;
  variant: 'stacked' | 'overlap';
};

function UsageChartBlock({
  dialogTitle,
  dialogDescription,
  legend,
  ...chartProps
}: {
  dialogTitle: string;
  dialogDescription?: string;
  legend: ReactNode;
} & SparkChartProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-muted-foreground flex min-w-0 flex-1 flex-wrap items-center gap-4 text-xs">
          {legend}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label={`Plein écran — ${dialogTitle}`}
          onClick={() => setOpen(true)}
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>
      <DualAreaSparkSvg {...chartProps} chartSize="card" />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex max-h-[min(92vh,960px)] w-[min(100vw-1rem,1200px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
          showCloseButton
        >
          <DialogHeader className="border-border/60 shrink-0 border-b px-4 pt-4 pb-3 sm:px-6">
            <DialogTitle className="text-base">{dialogTitle}</DialogTitle>
            {dialogDescription ? (
              <DialogDescription>{dialogDescription}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="text-muted-foreground flex flex-wrap items-center gap-4 border-border/40 border-b px-4 py-3 text-xs sm:px-6">
            {legend}
          </div>
          <div className="bg-muted/10 min-h-0 flex-1 overflow-auto p-4 sm:p-6">
            <DualAreaSparkSvg {...chartProps} chartSize="fullscreen" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PlatformUsageCharts({ daily }: { daily: PlatformUsageDailyPoint[] }) {
  const legendAudit = (
    <>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full shadow-sm" style={{ backgroundColor: COLOR_AUDIT }} />
        Audit
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full shadow-sm" style={{ backgroundColor: COLOR_SECURITY }} />
        Sécurité (tous événements)
      </span>
    </>
  );
  const legendAuth = (
    <>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full shadow-sm" style={{ backgroundColor: COLOR_LOGIN }} />
        Connexions
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full shadow-sm" style={{ backgroundColor: COLOR_REFRESH }} />
        Refresh token
      </span>
    </>
  );
  const legendDistinct = (
    <>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-2 rounded-full shadow-sm"
          style={{ backgroundColor: COLOR_USERS_DISTINCT }}
        />
        Utilisateurs uniques
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-2 rounded-full shadow-sm"
          style={{ backgroundColor: COLOR_CLIENTS_DISTINCT }}
        />
        Organisations concernées
      </span>
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
      <Card className="min-w-0 lg:flex lg:flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activité audit & sécurité (30 jours)</CardTitle>
          <CardDescription>
            Volume cumulé par jour (UTC) — aires empilées. Survol des points pour le détail.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground mt-auto w-full flex-1 pt-0">
          <UsageChartBlock
            dialogTitle="Activité audit & sécurité (30 jours)"
            dialogDescription="Volume cumulé par jour (UTC) — aires empilées. Survol des points pour le détail."
            legend={legendAudit}
            daily={daily}
            key1="auditLogs"
            key2="securityLogs"
            color1={COLOR_AUDIT}
            color2={COLOR_SECURITY}
            ariaLabel="Aires empilées audit et sécurité sur 30 jours"
            label1="Audit"
            label2="Sécurité"
            variant="stacked"
          />
        </CardContent>
      </Card>

      <Card className="min-w-0 lg:flex lg:flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Connexions & usage session (30 jours)</CardTitle>
          <CardDescription>
            Connexions réussies et appels <code className="text-[11px]">/auth/refresh</code> — deux
            séries comparées (échelle commune).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground mt-auto w-full flex-1 pt-0">
          <UsageChartBlock
            dialogTitle="Connexions & usage session (30 jours)"
            dialogDescription={
              'Connexions réussies et appels /auth/refresh — deux séries comparées (échelle commune).'
            }
            legend={legendAuth}
            daily={daily}
            key1="authLogins"
            key2="authRefreshes"
            color1={COLOR_LOGIN}
            color2={COLOR_REFRESH}
            ariaLabel="Aires superposées connexions et rafraîchissements sur 30 jours"
            label1="Connexions"
            label2="Refresh"
            variant="overlap"
          />
        </CardContent>
      </Card>

      <Card className="min-w-0 lg:col-span-2 lg:flex lg:flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Connexions — unicité (30 jours)</CardTitle>
          <CardDescription>
            Par jour (UTC) : nombre d’utilisateurs distincts ayant au moins une connexion réussie, et
            nombre d’organisations (clients) dont au moins un membre actif a été identifié sur ces
            connexions. Les comptes sans rattachement client (ex. admin plateforme) ne comptent pas
            dans « organisations ».
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground mt-auto w-full flex-1 pt-0">
          <UsageChartBlock
            dialogTitle="Connexions — unicité (30 jours)"
            dialogDescription="Utilisateurs distincts vs organisations distinctes (membres actifs) par jour de connexion réussie."
            legend={legendDistinct}
            daily={daily}
            key1="authDistinctUsers"
            key2="authDistinctClients"
            color1={COLOR_USERS_DISTINCT}
            color2={COLOR_CLIENTS_DISTINCT}
            ariaLabel="Utilisateurs distincts et organisations concernées par jour"
            label1="Utilisateurs"
            label2="Organisations"
            variant="overlap"
          />
        </CardContent>
      </Card>
    </div>
  );
}
