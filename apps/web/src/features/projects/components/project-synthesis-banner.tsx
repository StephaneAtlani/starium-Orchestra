'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Calendar,
  DollarSign,
  Flag,
  Folder,
  Pencil,
  Share2,
  Tag,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import {
  type ProjectKindBadgeKey,
  projectKindBadgeClass,
} from '@/lib/ui/badge-registry';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import {
  PROJECT_KIND_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
} from '../constants/project-enum-labels';
import {
  formatProjectBudget,
  formatProjectDateLong,
  projectListProgressPercent,
  projectPortfolioCategoryIcon,
  projectPortfolioCategoryIconPresentation,
  projectPortfolioCategoryLabel,
} from '../lib/projects-list-display';
import { projectTagBadgeStyle } from '../lib/project-tag-badge-style';
import { projectSheet } from '../constants/project-routes';
import type { ProjectDetail } from '../types/project.types';

function statusPillClass(status: string): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'starium-status-pill--success';
    case 'ON_HOLD':
      return 'starium-status-pill--warning';
    case 'COMPLETED':
      return 'starium-status-pill--info';
    case 'CANCELLED':
    case 'ARCHIVED':
      return 'starium-status-pill--muted';
    default:
      return 'starium-status-pill--info';
  }
}

function priorityValueClass(priority: string): string {
  if (priority === 'HIGH' || priority === 'CRITICAL') {
    return 'starium-proj-head__meta-value--danger';
  }
  return '';
}

function MetaItem({
  icon,
  iconTone,
  label,
  value,
  valueClassName,
}: {
  icon: ReactNode;
  iconTone: 'gold' | 'green' | 'blue' | 'red';
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="starium-proj-head__meta-item">
      <div
        className={cn(
          'starium-proj-head__meta-ico',
          iconTone === 'gold' && 'starium-proj-head__meta-ico--gold',
          iconTone === 'green' && 'starium-proj-head__meta-ico--green',
          iconTone === 'blue' && 'starium-proj-head__meta-ico--blue',
          iconTone === 'red' && 'starium-proj-head__meta-ico--red',
        )}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="starium-proj-head__meta-label">{label}</p>
        <p className={cn('starium-proj-head__meta-value truncate', valueClassName)}>{value}</p>
      </div>
    </div>
  );
}

export interface ProjectSynthesisBannerProps {
  project: ProjectDetail;
  moreActions?: ReactNode;
  shareAction?: ReactNode;
}

export function ProjectSynthesisBanner({
  project,
  moreActions,
  shareAction,
}: ProjectSynthesisBannerProps) {
  const { merged: badgeMerged } = useClientUiBadgeConfig();
  const typeLabel =
    PROJECT_TYPE_LABEL[project.type as keyof typeof PROJECT_TYPE_LABEL] ?? project.type;
  const kindLabel =
    badgeMerged.projectKind[project.kind as ProjectKindBadgeKey]?.label ??
    PROJECT_KIND_LABEL[project.kind] ??
    project.kind;
  const categoryLabel = projectPortfolioCategoryLabel(project);
  const CategoryIcon = projectPortfolioCategoryIcon(project);
  const categoryIconPresentation = projectPortfolioCategoryIconPresentation(project);
  const tags = project.tags ?? [];
  const progress = projectListProgressPercent(project);
  const budgetLabel = formatProjectBudget(project.targetBudgetAmount) ?? '—';
  const statusLabel =
    PROJECT_STATUS_LABEL[project.status as keyof typeof PROJECT_STATUS_LABEL] ??
    project.status;
  const priorityLabel =
    PROJECT_PRIORITY_LABEL[project.priority as keyof typeof PROJECT_PRIORITY_LABEL] ??
    project.priority;
  const ownerLabel = project.ownerDisplayName?.trim() || '—';
  const showContextRow = Boolean(categoryLabel) || tags.length > 0;

  return (
    <section
      className="starium-proj-head relative z-10 overflow-visible"
      aria-labelledby="project-synthesis-banner-title"
    >
      <div className="starium-proj-head__top">
        <div
          className="starium-proj-head__folder"
          style={categoryLabel ? categoryIconPresentation.style : undefined}
          aria-hidden
        >
          {categoryLabel ? (
            <CategoryIcon className="size-[26px]" strokeWidth={1.75} />
          ) : (
            <Folder className="size-[26px]" strokeWidth={1.75} />
          )}
        </div>

        <div className="starium-proj-head__titlewrap">
          <div className="starium-proj-head__titlerow">
            <h1 id="project-synthesis-banner-title" className="starium-proj-head__title">
              {project.name}
            </h1>
            <span className={cn('starium-status-pill', statusPillClass(project.status))}>
              {statusLabel}
            </span>
          </div>
          <p className="starium-proj-head__sub">
            <span>{typeLabel}</span>
            <span className="starium-proj-head__sub-sep" aria-hidden>
              ·
            </span>
            <RegistryBadge
              className={cn(
                'rounded-full px-2 py-px text-[11px] font-semibold',
                projectKindBadgeClass(badgeMerged, project.kind),
              )}
            >
              {kindLabel}
            </RegistryBadge>
            {project.code?.trim() ? (
              <>
                <span className="starium-proj-head__sub-sep" aria-hidden>
                  ·
                </span>
                <span className="font-mono text-[12px] font-semibold tabular-nums text-muted-foreground">
                  {project.code}
                </span>
              </>
            ) : null}
          </p>
          {showContextRow ? (
            <div className="starium-proj-head__context">
              {categoryLabel ? (
                <span className="starium-proj-head__category-chip">
                  <CategoryIcon className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="truncate">{categoryLabel}</span>
                </span>
              ) : null}
              {tags.length > 0 ? (
                <ul
                  className="starium-proj-head__tags"
                  aria-label="Étiquettes du projet"
                >
                  {tags.map((tag) => (
                    <li key={tag.id}>
                      <RegistryBadge
                        className="text-[0.7rem] font-semibold"
                        style={projectTagBadgeStyle(tag.color)}
                      >
                        <Tag className="mr-1 size-3 opacity-80" aria-hidden />
                        {tag.name}
                      </RegistryBadge>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="starium-proj-head__actions">
          {shareAction ?? (
            <button type="button" className="starium-btn starium-btn-secondary" disabled>
              <Share2 aria-hidden />
              Partager
            </button>
          )}
          <Link href={projectSheet(project.id)} className="starium-btn starium-btn-modifier">
            <Pencil aria-hidden />
            Modifier
          </Link>
          {moreActions}
        </div>
      </div>

      <div className="starium-proj-head__progress">
        <div className="starium-proj-head__progress-top">
          <span className="starium-proj-head__progress-label">Avancement global</span>
          <span className="starium-proj-head__progress-val">{Math.round(progress)}%</span>
        </div>
        <div
          className="starium-proj-head__bigbar"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avancement global du projet"
        >
          <div
            className="starium-proj-head__bigbar-fill"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      <div className="starium-proj-head__meta-strip">
        <MetaItem
          icon={<UserRound strokeWidth={1.75} />}
          iconTone="gold"
          label="Chef de projet"
          value={ownerLabel}
        />
        <MetaItem
          icon={<DollarSign strokeWidth={1.75} />}
          iconTone="green"
          label="Budget"
          value={budgetLabel}
        />
        <MetaItem
          icon={<Calendar strokeWidth={1.75} />}
          iconTone="blue"
          label="Échéance"
          value={formatProjectDateLong(project.targetEndDate)}
        />
        <MetaItem
          icon={<Flag strokeWidth={1.75} />}
          iconTone="red"
          label="Priorité"
          value={priorityLabel}
          valueClassName={priorityValueClass(project.priority)}
        />
      </div>
    </section>
  );
}
