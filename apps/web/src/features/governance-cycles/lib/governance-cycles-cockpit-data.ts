import type { GovernanceCycleGlobalSummaryDto } from '../types/governance-cycle.types';
import type {
  GovernanceCycleCadence,
  GovernanceCycleResponseDto,
} from '../types/governance-cycle.types';
import type { GovernanceCycleInstanceResponseDto } from '../types/governance-cycle-instance.types';

export type GovernanceCycleEnrichedInstance = {
  instance: GovernanceCycleInstanceResponseDto;
  cycleId: string;
  cycleName: string;
  cycleCode: string | null;
  cycleCadence: GovernanceCycleCadence;
  sponsorLabel: string | null;
};

const UPCOMING_STATUSES = new Set(['DRAFT', 'PLANNED', 'OPEN']);
const PAST_STATUSES = new Set(['CLOSED', 'CANCELLED', 'ARCHIVED']);

export function isActiveGovernanceCycle(cycle: GovernanceCycleResponseDto): boolean {
  return cycle.status !== 'CLOSED' && cycle.status !== 'ARCHIVED';
}

export function getCycleShortLabel(cycle: {
  name: string;
  code?: string | null;
}): string {
  const code = cycle.code?.trim();
  if (code) return code.toUpperCase();
  const words = cycle.name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Cycle';
  if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export function getEnrichedCycleShortLabel(row: GovernanceCycleEnrichedInstance): string {
  return getCycleShortLabel({ name: row.cycleName, code: row.cycleCode });
}

export function getInstanceScheduledAt(
  instance: GovernanceCycleInstanceResponseDto,
): Date | null {
  const raw = instance.scheduledDecisionAt ?? instance.periodStartDate ?? instance.createdAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildEnrichedInstances(
  cycles: GovernanceCycleResponseDto[],
  instancesByCycleId: Map<string, GovernanceCycleInstanceResponseDto[]>,
): GovernanceCycleEnrichedInstance[] {
  const rows: GovernanceCycleEnrichedInstance[] = [];
  for (const cycle of cycles) {
    const instances = instancesByCycleId.get(cycle.id) ?? [];
    for (const instance of instances) {
      rows.push({
        instance,
        cycleId: cycle.id,
        cycleName: cycle.name,
        cycleCode: cycle.code,
        cycleCadence: cycle.cadence,
        sponsorLabel: cycle.sponsorLabel,
      });
    }
  }
  return rows;
}

export function sortInstancesByScheduledAt(
  rows: GovernanceCycleEnrichedInstance[],
  direction: 'asc' | 'desc' = 'asc',
): GovernanceCycleEnrichedInstance[] {
  return [...rows].sort((a, b) => {
    const da = getInstanceScheduledAt(a.instance)?.getTime() ?? 0;
    const db = getInstanceScheduledAt(b.instance)?.getTime() ?? 0;
    return direction === 'asc' ? da - db : db - da;
  });
}

export function partitionInstancesByHorizon(rows: GovernanceCycleEnrichedInstance[]): {
  upcoming: GovernanceCycleEnrichedInstance[];
  past: GovernanceCycleEnrichedInstance[];
} {
  const now = Date.now();
  const upcoming: GovernanceCycleEnrichedInstance[] = [];
  const past: GovernanceCycleEnrichedInstance[] = [];

  for (const row of rows) {
    const status = row.instance.status;
    const scheduled = getInstanceScheduledAt(row.instance);
    const isPastStatus = PAST_STATUSES.has(status);
    const isUpcomingStatus = UPCOMING_STATUSES.has(status);
    const isPastDate = scheduled != null && scheduled.getTime() < now;

    if (isPastStatus || (isUpcomingStatus && isPastDate && status !== 'OPEN')) {
      past.push(row);
    } else if (isUpcomingStatus) {
      upcoming.push(row);
    } else {
      past.push(row);
    }
  }

  return {
    upcoming: sortInstancesByScheduledAt(upcoming, 'asc'),
    past: sortInstancesByScheduledAt(past, 'desc'),
  };
}

export function findNextInstance(
  rows: GovernanceCycleEnrichedInstance[],
): GovernanceCycleEnrichedInstance | null {
  const { upcoming } = partitionInstancesByHorizon(rows);
  return upcoming[0] ?? null;
}

export function sumPendingDecisions(
  summaries: Array<GovernanceCycleGlobalSummaryDto | undefined>,
): { total: number; arbitrationsRequired: number } {
  let total = 0;
  let arbitrationsRequired = 0;
  for (const summary of summaries) {
    if (!summary) continue;
    total += summary.toArbitrateCount;
    if (summary.toArbitrateCount > 0) arbitrationsRequired += 1;
  }
  return { total, arbitrationsRequired };
}

/** Taux de décisions finalisées sur les séances clôturées récentes (proxy présence / tenue). */
export function computeInstanceCompletionRate(
  rows: GovernanceCycleEnrichedInstance[],
  sampleSize = 12,
): number | null {
  const closed = rows
    .filter((r) => r.instance.status === 'CLOSED')
    .sort((a, b) => {
      const da = new Date(a.instance.closedAt ?? a.instance.updatedAt).getTime();
      const db = new Date(b.instance.closedAt ?? b.instance.updatedAt).getTime();
      return db - da;
    })
    .slice(0, sampleSize);

  if (closed.length === 0) return null;

  let scored = 0;
  for (const row of closed) {
    const { agendaCount, decidedCount } = row.instance;
    if (agendaCount <= 0) continue;
    scored += decidedCount / agendaCount;
  }

  const withAgenda = closed.filter((r) => r.instance.agendaCount > 0);
  if (withAgenda.length === 0) return null;

  return Math.round((scored / withAgenda.length) * 100);
}

export function formatGovernanceRelativeDaysFr(target: Date, from = new Date()): string {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffMs = end.getTime() - start.getTime();
  const days = Math.round(diffMs / 86_400_000);

  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  if (days === -1) return 'hier';
  if (days > 1) return `dans ${days} j`;
  return `il y a ${Math.abs(days)} j`;
}

export function formatInstanceDayMonth(date: Date): { day: string; month: string } {
  const day = new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(date);
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
    .format(date)
    .replace(/\.$/, '')
    .toUpperCase();
  return { day, month };
}

export function formatInstanceTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getInstanceDisplayTitle(row: GovernanceCycleEnrichedInstance): string {
  const label = row.instance.label?.trim();
  if (label) return label;
  const period = row.instance.periodLabel?.trim();
  if (period) return `${row.cycleName} — ${period}`;
  return row.cycleName;
}

export function getInstanceLocationLabel(row: GovernanceCycleEnrichedInstance): string | null {
  const location = row.instance.locationLabel?.trim();
  if (location) return location;
  const url = row.instance.meetingUrl?.trim();
  if (url) {
    try {
      const host = new URL(url).hostname;
      if (host.includes('teams')) return 'Teams';
      if (host.includes('zoom')) return 'Zoom';
      if (host.includes('meet.google')) return 'Google Meet';
      return host;
    } catch {
      return 'Visio';
    }
  }
  return null;
}

export function getInstanceReadinessLabel(row: GovernanceCycleEnrichedInstance): {
  tone: 'success' | 'warning' | 'danger' | 'muted';
  label: string;
} {
  const { agendaCount, decidedCount, status } = row.instance;
  if (status === 'CLOSED' || status === 'CANCELLED' || status === 'ARCHIVED') {
    return { tone: 'muted', label: 'Séance terminée' };
  }
  if (agendaCount > 0 && decidedCount >= agendaCount) {
    return { tone: 'success', label: 'Ordre du jour prêt' };
  }
  if (agendaCount > 0) {
    return { tone: 'warning', label: 'Ordre du jour en cours' };
  }
  return { tone: 'warning', label: 'Ordre du jour à constituer' };
}
