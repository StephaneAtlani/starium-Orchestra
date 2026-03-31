'use client';

import {
  POST_MORTEM_INDICATEUR_MAX,
  type PostMortemIndicateursScores,
} from '../lib/project-post-mortem-payload';
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
  short: string;
  hint: string;
  Icon: typeof Wallet;
}[] = [
  {
    key: 'budget',
    label: 'Budget',
    short: 'Budget',
    hint: 'Respect de l’enveloppe, suivi et arbitrages financiers',
    Icon: Wallet,
  },
  {
    key: 'delais',
    label: 'Délais',
    short: 'Délais',
    hint: 'Planning, jalons et tenue des échéances',
    Icon: Clock,
  },
  {
    key: 'qualite',
    label: 'Qualité',
    short: 'Qualité',
    hint: 'Livrables, conformité et niveau de satisfaction des attentes',
    Icon: BadgeCheck,
  },
  {
    key: 'communication',
    label: 'Communication',
    short: 'Com.',
    hint: 'Coordination, transparence et parties prenantes',
    Icon: MessageCircle,
  },
  {
    key: 'pilotageRisques',
    label: 'Risques',
    short: 'Risques',
    hint: 'Identification, traitement et suivi des risques',
    Icon: ShieldAlert,
  },
];

const N = 5;
const RADAR = { cx: 100, cy: 100, R: 72 } as const;

/** Échelle 0–5 : 0–1 insuffisant, 2–3 moyen, 4–5 satisfaisant. */
function scoreStrokeClass(score: number | null): string {
  if (score === null) return 'stroke-muted-foreground/35';
  if (score < 2) return 'stroke-rose-500 dark:stroke-rose-400';
  if (score < 4) return 'stroke-amber-500 dark:stroke-amber-400';
  return 'stroke-emerald-600 dark:stroke-emerald-400';
}

function scoreFillClass(score: number | null): string {
  if (score === null) return 'fill-muted-foreground/10';
  if (score < 2) return 'fill-rose-500/25 dark:fill-rose-400/20';
  if (score < 4) return 'fill-amber-500/20 dark:fill-amber-400/15';
  return 'fill-emerald-600/20 dark:fill-emerald-400/15';
}

/** Sommet i : en haut puis sens horaire (0 = Budget, …). */
function vertex(angleIndex: number, radius: number): { x: number; y: number } {
  const θ = -Math.PI / 2 + (angleIndex * 2 * Math.PI) / N;
  return {
    x: RADAR.cx + radius * Math.cos(θ),
    y: RADAR.cy + radius * Math.sin(θ),
  };
}

function pentagonPath(radius: number): string {
  const pts = Array.from({ length: N }, (_, i) => vertex(i, radius));
  return `M ${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;
}

function dataPolygonPath(scores: PostMortemIndicateursScores): string {
  const pts = DIMENSIONS.map((d, i) => {
    const s = scores[d.key];
    const t = s === null ? 0 : s / POST_MORTEM_INDICATEUR_MAX;
    return vertex(i, t * RADAR.R);
  });
  return `M ${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;
}

function PostMortemRadarChart({ scores }: { scores: PostMortemIndicateursScores }) {
  const dataPath = dataPolygonPath(scores);
  const filled = DIMENSIONS.map((d) => scores[d.key]).filter((x): x is number => x !== null);
  const hasAny = filled.length > 0;
  const avgRounded =
    filled.length > 0 ? Math.round(filled.reduce((a, b) => a + b, 0) / filled.length) : null;
  const avgLabel =
    filled.length === 0 ? 'Non évalué' : `Moy. ${avgRounded}/${POST_MORTEM_INDICATEUR_MAX}`;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-background/90 to-muted/30 p-4 shadow-sm"
      role="img"
      aria-label="Profil radar des cinq indicateurs de perception"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          Profil radar
        </p>
        <span className="tabular-nums text-[0.7rem] text-muted-foreground">{avgLabel}</span>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center sm:gap-6">
        <svg
          viewBox="0 0 200 200"
          className="h-52 w-full max-w-[min(100%,14rem)] shrink-0 sm:h-56"
          aria-hidden
        >
          {/* Grille : 3 pentagones */}
          {[1, 2, 3].map((k) => (
            <path
              key={k}
              d={pentagonPath((RADAR.R * k) / 3)}
              fill="none"
              className="stroke-border/60"
              strokeWidth={k === 3 ? 1.25 : 0.75}
            />
          ))}
          {/* Axes */}
          {Array.from({ length: N }, (_, i) => {
            const outer = vertex(i, RADAR.R);
            return (
              <line
                key={i}
                x1={RADAR.cx}
                y1={RADAR.cy}
                x2={outer.x}
                y2={outer.y}
                className="stroke-border/50"
                strokeWidth={0.75}
              />
            );
          })}
          {/* Données */}
          <path
            d={dataPath}
            className={cn(
              'transition-all duration-300',
              hasAny && avgRounded !== null
                ? cn(scoreFillClass(avgRounded), scoreStrokeClass(avgRounded), 'stroke-[1.75]')
                : 'fill-muted/15 stroke-muted-foreground/35 stroke-[1.5]',
            )}
          />
          {/* Points sur les sommets */}
          {DIMENSIONS.map((d, i) => {
            const s = scores[d.key];
            const t = s === null ? 0 : s / POST_MORTEM_INDICATEUR_MAX;
            const p = vertex(i, t * RADAR.R);
            return (
              <circle
                key={d.key}
                cx={p.x}
                cy={p.y}
                r={s === null ? 2.25 : 3.25}
                className={cn(
                  s === null
                    ? 'fill-muted-foreground/35'
                    : cn('fill-background', scoreStrokeClass(s), 'stroke-[2]'),
                )}
              />
            );
          })}
          {/* Labels courts autour du radar */}
          {DIMENSIONS.map((d, i) => {
            const p = vertex(i, RADAR.R + 14);
            return (
              <text
                key={`t-${d.key}`}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 9 }}
              >
                {d.short}
              </text>
            );
          })}
        </svg>
        <ul className="grid w-full min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-1.5 text-[0.65rem] text-muted-foreground sm:max-w-[14rem]">
          {DIMENSIONS.map((d) => {
            const s = scores[d.key];
            return (
              <li key={d.key} className="flex items-center justify-between gap-1 border-b border-border/30 pb-1 last:border-0 sm:border-0 sm:pb-0">
                <span className="truncate text-foreground/90">{d.label}</span>
                <span className="shrink-0 tabular-nums font-medium text-foreground">
                  {s === null ? '—' : `${s}/${POST_MORTEM_INDICATEUR_MAX}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Anneau de score compact (SVG). */
function ScoreRing({ score, className }: { score: number | null; className?: string }) {
  const size = 40;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset =
    score === null ? c : c * (1 - score / POST_MORTEM_INDICATEUR_MAX);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0 -rotate-90', className)}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-muted/50"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className={score === null ? 'stroke-muted-foreground/30' : scoreStrokeClass(score)}
      />
    </svg>
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
          <span className="font-normal text-muted-foreground">
            (échelle {0}–{POST_MORTEM_INDICATEUR_MAX})
          </span>
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Après la narrative, attribuez une note sur chaque dimension (collecte des faits, analyse des
          écarts, capitalisation). 0 = très insatisfaisant, {POST_MORTEM_INDICATEUR_MAX} = tout à fait
          satisfaisant.{' '}
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
          <PostMortemRadarChart scores={indicateurs} />
        </div>

        <div className="mt-5 grid gap-4 border-t border-border/40 pt-5 sm:grid-cols-2">
          {DIMENSIONS.map(({ key, label, hint, Icon }) => {
            const score = indicateurs[key];
            const display = score === null ? null : score;
            return (
              <div
                key={key}
                className="flex gap-3 rounded-lg border border-border/50 bg-background/50 p-3 shadow-xs"
              >
                <ScoreRing score={score} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{label}</p>
                        <p className="text-[0.65rem] leading-snug text-muted-foreground">{hint}</p>
                      </div>
                    </div>
                    <span className="shrink-0 tabular-nums text-sm font-semibold text-foreground">
                      {display === null ? '—' : `${display}/${POST_MORTEM_INDICATEUR_MAX}`}
                    </span>
                  </div>
                  {editable ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <div
                        className="flex flex-wrap gap-1"
                        role="group"
                        aria-label={`Note pour ${label}, de 0 à ${POST_MORTEM_INDICATEUR_MAX}`}
                      >
                        {Array.from({ length: POST_MORTEM_INDICATEUR_MAX + 1 }, (_, n) => n).map(
                          (n) => (
                            <button
                              key={n}
                              type="button"
                              className={cn(
                                'min-w-[2.25rem] rounded-md border px-2 py-1.5 text-center text-xs font-semibold tabular-nums transition-colors',
                                score === n
                                  ? 'border-primary bg-primary/15 text-primary'
                                  : 'border-border/80 bg-background text-foreground hover:bg-muted/60',
                              )}
                              onClick={() => patch(key, n)}
                            >
                              {n}
                            </button>
                          ),
                        )}
                      </div>
                      {score !== null ? (
                        <button
                          type="button"
                          className="text-[0.65rem] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={() => patch(key, null)}
                        >
                          Effacer
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
