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
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
} from '../constants/project-enum-labels';
import {
  formatProjectBudget,
  formatProjectDateLong,
  projectListProgressPercent,
} from '../lib/projects-list-display';
import { projectSheet } from '../constants/project-routes';
import type { ProjectDetail } from '../types/project.types';
import { PROJECT_TYPE_LABEL } from '../constants/project-enum-labels';

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
  const subtitle =
    PROJECT_TYPE_LABEL[project.type as keyof typeof PROJECT_TYPE_LABEL] ?? project.type;
  const progress = projectListProgressPercent(project);
  const budgetLabel = formatProjectBudget(project.targetBudgetAmount) ?? '—';
  const statusLabel =
    PROJECT_STATUS_LABEL[project.status as keyof typeof PROJECT_STATUS_LABEL] ??
    project.status;
  const priorityLabel =
    PROJECT_PRIORITY_LABEL[project.priority as keyof typeof PROJECT_PRIORITY_LABEL] ??
    project.priority;
  const ownerLabel = project.ownerDisplayName?.trim() || '—';

  return (
    <section
      className="starium-proj-head relative z-10 overflow-visible"
      aria-labelledby="project-synthesis-banner-title"
    >
      <div className="starium-proj-head__top">
        <div className="starium-proj-head__folder" aria-hidden>
          <Folder className="size-[26px]" strokeWidth={1.75} />
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
          <p className="starium-proj-head__sub">{subtitle}</p>
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
