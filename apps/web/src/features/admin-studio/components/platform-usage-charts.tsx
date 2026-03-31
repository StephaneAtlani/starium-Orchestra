'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlatformUsageDailyPoint } from '../types/admin-studio.types';

const COLOR_AUDIT = 'hsl(221.2 83.2% 53.3%)';
const COLOR_SECURITY = 'hsl(142 71% 45%)';
const COLOR_USERS = 'hsl(262 83% 58%)';

function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

function buildLinePath(
  values: number[],
  maxVal: number,
  n: number,
  left: number,
  top: number,
  innerW: number,
  innerH: number,
): string {
  if (n === 0) return '';
  const bottom = top + innerH;
  const safeMax = Math.max(maxVal, 1);
  const toX = (i: number) =>
    left + (n <= 1 ? innerW / 2 : (i / Math.max(n - 1, 1)) * innerW);
  const toY = (v: number) => bottom - (v / safeMax) * innerH;
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`)
    .join(' ');
}

function UsageLineChart({ daily }: { daily: PlatformUsageDailyPoint[] }) {
  const { maxVal, pathAudit, pathSecurity, gridYs, innerW, innerH, left, bottom } =
    useMemo(() => {
      const n = daily.length;
      const padL = 10;
      const padR = 6;
      const padT = 8;
      const padB = 14;
      const innerW = 100 - padL - padR;
      const innerH = 100 - padT - padB;
      const bottom = padT + innerH;
      const left = padL;
      const maxVal = Math.max(
        1,
        ...daily.flatMap((d) => [d.auditLogs, d.securityLogs]),
      );
      const audits = daily.map((d) => d.auditLogs);
      const secs = daily.map((d) => d.securityLogs);
      const pathAudit = buildLinePath(audits, maxVal, n, padL, padT, innerW, innerH);
      const pathSecurity = buildLinePath(secs, maxVal, n, padL, padT, innerW, innerH);
      const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => bottom - t * innerH);
      return {
        maxVal,
        pathAudit,
        pathSecurity,
        gridYs,
        innerW,
        innerH,
        left,
        bottom,
      };
    }, [daily]);

  const tickLabels = useMemo(() => {
    if (daily.length === 0) return [];
    const idx: number[] = [];
    const n = daily.length;
    idx.push(0);
    if (n > 1) idx.push(Math.floor(n / 2));
    if (n > 2) idx.push(n - 1);
    return [...new Set(idx)].sort((a, b) => a - b);
  }, [daily]);

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full overflow-visible"
      preserveAspectRatio="none"
      role="img"
      aria-label="Courbes audit et sécurité sur 30 jours"
    >
      {gridYs.map((y, i) => (
        <line
          key={i}
          x1={left}
          y1={y}
          x2={left + innerW}
          y2={y}
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <text x={left} y={6} fontSize="3" fill="currentColor" className="opacity-60">
        max {maxVal}
      </text>
      {tickLabels.map((i) => {
        const x = left + (daily.length <= 1 ? innerW / 2 : (i / Math.max(daily.length - 1, 1)) * innerW);
        return (
          <text
            key={i}
            x={x}
            y={98}
            fontSize="2.4"
            textAnchor="middle"
            fill="currentColor"
            className="opacity-70"
          >
            {daily[i] ? formatDayLabel(daily[i].date) : ''}
          </text>
        );
      })}
      <path
        d={pathAudit}
        fill="none"
        stroke={COLOR_AUDIT}
        strokeWidth={0.9}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={pathSecurity}
        fill="none"
        stroke={COLOR_SECURITY}
        strokeWidth={0.9}
        vectorEffect="non-scaling-stroke"
      />
      {daily.map((d, i) => {
        const x =
          left +
          (daily.length <= 1 ? innerW / 2 : (i / Math.max(daily.length - 1, 1)) * innerW);
        const ya = bottom - (d.auditLogs / Math.max(maxVal, 1)) * innerH;
        const ys = bottom - (d.securityLogs / Math.max(maxVal, 1)) * innerH;
        const title = `${d.date} — Audit: ${d.auditLogs}, Sécurité: ${d.securityLogs}`;
        return (
          <g key={d.date}>
            <circle cx={x} cy={ya} r={0.9} fill={COLOR_AUDIT}>
              <title>{title}</title>
            </circle>
            <circle cx={x} cy={ys} r={0.9} fill={COLOR_SECURITY}>
              <title>{title}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

function NewUsersBarChart({ daily }: { daily: PlatformUsageDailyPoint[] }) {
  const maxUsers = Math.max(1, ...daily.map((d) => d.newUsers));
  return (
    <div
      className="flex h-52 items-end gap-px sm:gap-0.5"
      role="img"
      aria-label="Barres nouveaux utilisateurs par jour"
    >
      {daily.map((d) => {
        const hPct = (d.newUsers / maxUsers) * 100;
        const h = d.newUsers === 0 ? 0 : Math.max(6, hPct);
        return (
          <div
            key={d.date}
            className="group flex min-w-0 flex-1 flex-col items-center justify-end"
          >
            <div
              className="w-full min-h-0 rounded-t-sm transition-colors hover:opacity-90"
              style={{
                height: `${h}%`,
                backgroundColor: d.newUsers === 0 ? 'transparent' : COLOR_USERS,
                minHeight: d.newUsers === 0 ? 0 : undefined,
              }}
              title={`${d.date} — ${d.newUsers} nouveau(x)`}
            />
          </div>
        );
      })}
    </div>
  );
}

export function PlatformUsageCharts({ daily }: { daily: PlatformUsageDailyPoint[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Activité audit & sécurité (30 jours)</CardTitle>
          <CardDescription>
            Nombre d’entrées créées par jour (fuseau UTC, agrégation base). Survolez les points
            pour le détail.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground w-full pt-2">
          <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: COLOR_AUDIT }} />
              Audit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: COLOR_SECURITY }} />
              Sécurité
            </span>
          </div>
          <div className="h-[min(320px,50vh)] w-full min-h-[200px]">
            <UsageLineChart daily={daily} />
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Nouveaux comptes utilisateurs (30 jours)</CardTitle>
          <CardDescription>
            Utilisateurs dont la date de création tombe ce jour-là (UTC). Hauteur relative au max
            de la période.
          </CardDescription>
        </CardHeader>
        <CardContent className="w-full pt-2">
          <NewUsersBarChart daily={daily} />
          <div className="text-muted-foreground mt-2 flex justify-between text-[10px] sm:text-xs">
            <span>{daily[0] ? formatDayLabel(daily[0].date) : ''}</span>
            <span>
              {daily[daily.length - 1] ? formatDayLabel(daily[daily.length - 1].date) : ''}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
