'use client';

import type { PostMortemIndicateursScores } from '../lib/project-post-mortem-payload';
import { cn } from '@/lib/utils';
import {
  BadgeCheck,
  Clock,
  MessageCircle,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

const DIMENSIONS: {
  key: keyof PostMortemIndicateursScores;
  label: string;
  hint: string;
  Icon: typeof Wallet;
}[] = [
  {
    key: 'budget',
    label: 'Budget',
    hint: 'Respect de l’enveloppe, suivi et arbitrages financiers',
    Icon: Wallet,
  },
  {
    key: 'delais',
    label: 'Délais',
    hint: 'Planning, jalons et tenue des échéances',
    Icon: Clock,
  },
  {
    key: 'qualite',
    label: 'Qualité',
    hint: 'Livrables, conformité et niveau de satisfaction des attentes',
    Icon: BadgeCheck,
  },
  {
    key: 'communication',
    label: 'Communication',
    hint: 'Coordination, transparence et parties prenantes',
    Icon: MessageCircle,
  },
  {
    key: 'pilotageRisques',
    label: 'Risques',
    hint: 'Identification, traitement et suivi des risques',
    Icon: ShieldAlert,
  },
];

function barToneClass(score: number | null): string {
  if (score === null) return 'bg-muted-foreground/25';
  if (score < 40) return 'bg-rose-500/90 dark:bg-rose-400/85';
  if (score < 70) return 'bg-amber-500/90 dark:bg-amber-400/85';
  return 'bg-emerald-600/90 dark:bg-emerald-500/85';
}

function MiniBarsChart({ scores }: { scores: PostMortemIndicateursScores }) {
  return (
    <div
      className="rounded-lg border border-border/50 bg-background/60 p-3 shadow-sm"
      role="img"
      aria-label="Vue synthétique des cinq indicateurs"
    >
      <p className="mb-2 text-[0.65rem] font-medium tracking-wide text-muted-foreground">
        Vue synthétique
      </p>
      <div className="flex h-28 items-end justify-stretch gap-1.5 sm:gap-2">
        {DIMENSIONS.map(({ key, label }) => {
          const s = scores[key];
          return (
            <div key={key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="relative h-[5.5rem] w-full overflow-hidden rounded-md bg-muted/50">
                <div
                  className={cn(
                    'absolute bottom-0 left-1/2 w-[72%] max-w-[2.75rem] -translate-x-1/2 rounded-t-sm transition-all',
                    barToneClass(s),
                  )}
                  style={{
                    height: s === null ? '4px' : `${s}%`,
                  }}
                  title={s === null ? `${label} : non évalué` : `${label} : ${s} %`}
                />
              </div>
              <span className="line-clamp-2 text-center text-[0.6rem] leading-tight text-muted-foreground sm:text-[0.65rem]">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  indicateurs: PostMortemIndicateursScores;
  editable: boolean;
  onChange: (next: PostMortemIndicateursScores) => void;
};

export function PostMortemIndicatorsBlock({ indicateurs, editable, onChange }: Props) {
  const patch = (key: keyof PostMortemIndicateursScores, value: number | null) => {
    onChange({ ...indicateurs, [key]: value });
  };

  return (
    <div className="mt-1 grid gap-4 border-t border-border/50 pt-4">
      <div className="rounded-xl border border-border/60 bg-muted/15 p-4 sm:p-5">
        <p className="text-sm font-medium text-foreground">
          Indicateurs de perception{' '}
          <span className="font-normal text-muted-foreground">(0–100 %)</span>
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Après la narrative, synthétisez la perception sur chaque dimension (collecte des faits,
          analyse des écarts, capitalisation). 0 = très insatisfaisant, 100 = objectif atteint ou
          dépassé.{' '}
          <a
            href="https://www.manager-go.com/gestion-de-projet/dossiers-methodes/comment-organiser-un-rex"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Méthode RETEX / REX
          </a>
          .
        </p>

        <div className="mt-4">
          <MiniBarsChart scores={indicateurs} />
        </div>

        <div className="mt-4 grid gap-3 border-t border-border/40 pt-4">
        {DIMENSIONS.map(({ key, label, hint, Icon }) => {
          const score = indicateurs[key];
          const display = score === null ? null : score;
          return (
            <div key={key} className="grid gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{label}</p>
                    <p className="text-[0.65rem] text-muted-foreground">{hint}</p>
                  </div>
                </div>
                <span className="shrink-0 tabular-nums text-xs font-semibold text-foreground">
                  {display === null ? '—' : `${display} %`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className={cn('h-full rounded-full transition-all', barToneClass(score))}
                  style={{ width: score === null ? '0%' : `${score}%` }}
                />
              </div>
              {editable ? (
                <div className="flex flex-wrap items-center gap-2">
                  {score === null ? (
                    <button
                      type="button"
                      className="rounded-md border border-border/80 bg-background px-2.5 py-1 text-[0.7rem] font-medium text-foreground hover:bg-muted/50"
                      onClick={() => patch(key, 50)}
                    >
                      Noter (0–100 %)
                    </button>
                  ) : (
                    <>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={score}
                        onChange={(e) => patch(key, Number(e.target.value))}
                        className="h-2 w-full min-w-[12rem] flex-1 cursor-pointer accent-primary"
                        aria-label={`${label} — score de 0 à 100`}
                      />
                      <button
                        type="button"
                        className="shrink-0 text-[0.65rem] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        onClick={() => patch(key, null)}
                      >
                        Effacer
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
