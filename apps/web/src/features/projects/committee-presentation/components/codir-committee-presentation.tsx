'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { usePortfolioSummaryQuery } from '../../hooks/use-portfolio-summary-query';
import { ProjectsPortfolioKpi } from '../../components/projects-portfolio-kpi';
import {
  PortfolioDeckTable,
  ProjectCommitteeDetailTables,
} from './committee-presentation-tables';
import { projectDetail, projectsList } from '../../constants/project-routes';
import type { ProjectListItem } from '../../types/project.types';
import { useCommitteeCodirDeckQuery } from '../hooks/use-committee-codir-deck-query';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
} from 'lucide-react';

function sortDeckItems(items: ProjectListItem[]): ProjectListItem[] {
  const healthOrder: Record<ProjectListItem['computedHealth'], number> = {
    RED: 0,
    ORANGE: 1,
    GREEN: 2,
  };
  const critOrder: Record<string, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };
  return [...items].sort((a, b) => {
    const ha = healthOrder[a.computedHealth] ?? 9;
    const hb = healthOrder[b.computedHealth] ?? 9;
    if (ha !== hb) return ha - hb;
    const ca = critOrder[a.criticality] ?? 9;
    const cb = critOrder[b.criticality] ?? 9;
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name, 'fr');
  });
}

async function requestFullscreen(el: HTMLElement) {
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
  } catch {
    /* navigateur / politique */
  }
}

async function exitFullscreenSafe() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  } catch {
    /* ignore */
  }
}

export function CodirCommitteePresentation() {
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('projects.read');
  const listEnabled = permsSuccess && canRead;

  const summaryQ = usePortfolioSummaryQuery({ enabled: listEnabled });
  const deckQ = useCommitteeCodirDeckQuery({ enabled: listEnabled });

  const sortedProjects = useMemo(
    () => sortDeckItems(deckQ.data ?? []),
    [deckQ.data],
  );

  const totalSlides = 1 + sortedProjects.length;
  const [slideIndex, setSlideIndex] = useState(0);
  const [navOpen, setNavOpen] = useState(true);
  /** Rail étroit (~56px) : numéros + infobulles, pour libérer la largeur utile. */
  const [navCompact, setNavCompact] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  const clampedSlide = Math.min(Math.max(0, slideIndex), Math.max(0, totalSlides - 1));

  useEffect(() => {
    const onChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const goPrev = useCallback(() => {
    setSlideIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setSlideIndex((i) => Math.min(totalSlides - 1, i + 1));
  }, [totalSlides]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'Escape') {
        void exitFullscreenSafe();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, goPrev, goNext]);

  useEffect(() => {
    setSlideIndex((i) => Math.min(i, Math.max(0, totalSlides - 1)));
  }, [totalSlides]);

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await requestFullscreen(el);
    } else {
      await exitFullscreenSafe();
    }
  };

  const currentProject = clampedSlide >= 1 ? sortedProjects[clampedSlide - 1] : null;

  if (!permsSuccess) {
    return <p className="text-sm text-muted-foreground">Chargement des permissions…</p>;
  }

  if (!canRead) {
    return (
      <p className="text-sm text-destructive">
        Permission <code className="rounded bg-muted px-1">projects.read</code> requise.
      </p>
    );
  }

  return (
    <div
      ref={shellRef}
      className={cn(
        'flex min-h-[calc(100dvh-8rem)] flex-col rounded-xl border border-border/80 bg-background shadow-sm',
        fullscreen && 'fixed inset-0 z-[100] m-0 min-h-dvh rounded-none border-0',
      )}
    >
      {/* Barre d’outils présentation */}
      <header
        className={cn(
          'flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2 sm:px-4',
          fullscreen && 'bg-background/95 backdrop-blur-sm',
        )}
      >
        <Button
          type="button"
          variant={navOpen ? 'secondary' : 'outline'}
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setNavOpen((o) => !o);
            if (!navOpen) setNavCompact(false);
          }}
          aria-pressed={navOpen}
          aria-label={navOpen ? 'Masquer le menu de navigation' : 'Afficher le menu de navigation'}
        >
          {navOpen ? (
            <PanelLeftClose className="size-4" aria-hidden />
          ) : (
            <PanelLeftOpen className="size-4" aria-hidden />
          )}
          Navigation
        </Button>

        {navOpen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 px-2 sm:px-2.5"
            onClick={() => setNavCompact((c) => !c)}
            aria-pressed={navCompact}
            aria-label={
              navCompact
                ? 'Élargir la colonne de navigation'
                : 'Réduire la colonne de navigation (rail compact)'
            }
            title={navCompact ? 'Élargir la navigation' : 'Réduire la navigation'}
          >
            {navCompact ? (
              <ChevronsRight className="size-4" aria-hidden />
            ) : (
              <ChevronsLeft className="size-4" aria-hidden />
            )}
            <span className="hidden sm:inline">{navCompact ? 'Élargir' : 'Réduire'}</span>
          </Button>
        ) : null}

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

        <Button
          type="button"
          variant="default"
          size="sm"
          className="gap-1.5"
          onClick={() => void toggleFullscreen()}
          aria-label={fullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
        >
          {fullscreen ? (
            <Minimize2 className="size-4" aria-hidden />
          ) : (
            <Maximize2 className="size-4" aria-hidden />
          )}
          {fullscreen ? 'Quitter plein écran' : 'Plein écran'}
        </Button>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <Presentation className="size-3.5 shrink-0 opacity-70" aria-hidden />
          <span>
            {clampedSlide + 1} / {Math.max(1, totalSlides)}
          </span>
        </div>

        <Button type="button" variant="outline" size="sm" asChild className="hidden sm:inline-flex">
          <Link href={projectsList()}>Portefeuille</Link>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Menu navigation (diaporama) */}
        <aside
          className={cn(
            'shrink-0 overflow-y-auto border-r border-border/60 bg-muted/20 transition-[width,opacity] duration-200',
            navOpen && !navCompact && 'w-[min(100%,280px)] opacity-100',
            navOpen && navCompact && 'w-[52px] opacity-100 sm:w-14',
            !navOpen && 'w-0 overflow-hidden border-0 opacity-0',
          )}
          aria-hidden={!navOpen}
        >
          {navOpen && (
            <nav
              className={cn('space-y-1', navCompact ? 'p-1.5' : 'p-3')}
              aria-label="Ordre de passage"
            >
              <button
                type="button"
                onClick={() => setSlideIndex(0)}
                title="Synthèse portefeuille"
                aria-label="Diapositive 1 : Synthèse portefeuille"
                className={cn(
                  'flex w-full rounded-lg font-medium transition-colors',
                  navCompact
                    ? 'items-center justify-center px-0 py-2 text-xs tabular-nums sm:text-sm'
                    : 'px-3 py-2 text-left text-sm',
                  clampedSlide === 0
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted/80',
                )}
              >
                {navCompact ? '1' : 'Synthèse portefeuille'}
              </button>
              {deckQ.isLoading && (
                <p
                  className={cn(
                    'text-muted-foreground',
                    navCompact
                      ? 'flex justify-center px-0 py-1 text-[0.65rem] leading-tight'
                      : 'px-3 py-2 text-xs',
                  )}
                  title="Chargement des projets"
                >
                  {navCompact ? '…' : 'Chargement des projets…'}
                </p>
              )}
              {deckQ.isError && (
                <p
                  className={cn(
                    'text-destructive',
                    navCompact ? 'px-0 py-1 text-center text-[0.65rem]' : 'px-3 py-2 text-xs',
                  )}
                  title="Impossible de charger le deck"
                >
                  {navCompact ? '!' : 'Impossible de charger le deck.'}
                </p>
              )}
              {sortedProjects.map((p, idx) => {
                const active = clampedSlide === idx + 1;
                const slideNum = idx + 2;
                const labelFull = `${p.name} (${p.code})`;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSlideIndex(idx + 1)}
                    title={labelFull}
                    aria-label={`Diapositive ${slideNum} : ${p.name}, code ${p.code}`}
                    className={cn(
                      'flex w-full rounded-lg transition-colors',
                      navCompact
                        ? 'items-center justify-center px-0 py-2 text-xs tabular-nums sm:text-sm'
                        : 'flex-col gap-0.5 px-3 py-2 text-left text-sm',
                      active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/80',
                    )}
                  >
                    {navCompact ? (
                      <span className="tabular-nums">{slideNum}</span>
                    ) : (
                      <>
                        <span className="truncate font-medium">{p.name}</span>
                        <span
                          className={cn(
                            'truncate text-xs',
                            active ? 'text-primary-foreground/85' : 'text-muted-foreground',
                          )}
                        >
                          {p.code}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </aside>

        {/* Zone slide */}
        <div className="relative flex min-w-0 flex-1 flex-col bg-gradient-to-b from-background to-muted/15">
          <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-8">
            {clampedSlide === 0 ? (
              <div className="flex w-full min-w-0 max-w-none flex-col gap-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Comité de direction — synthèse portefeuille
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Vue live — utilisez le menu à gauche ou les flèches en plein écran pour parcourir
                    les fiches projet.
                  </p>
                </div>
                <ProjectsPortfolioKpi summary={summaryQ.data} isLoading={summaryQ.isLoading} />
                <PortfolioDeckTable
                  projectsInDeckOrder={sortedProjects}
                  activeSlideIndex={clampedSlide}
                  onGoToSlide={setSlideIndex}
                />
              </div>
            ) : currentProject ? (
              <ProjectCommitteeSlide project={currentProject} />
            ) : (
              <p className="text-sm text-muted-foreground">Aucun projet à afficher.</p>
            )}
          </div>

          {/* Contrôles type diaporama */}
          <div className="sticky bottom-0 flex shrink-0 justify-center border-t border-border/50 bg-background/90 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-2 py-1 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                disabled={clampedSlide <= 0}
                onClick={goPrev}
                aria-label="Diapositive précédente"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <span className="min-w-[4.5rem] text-center text-xs font-medium text-muted-foreground tabular-nums">
                {clampedSlide + 1} / {Math.max(1, totalSlides)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                disabled={clampedSlide >= totalSlides - 1}
                onClick={goNext}
                aria-label="Diapositive suivante"
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCommitteeSlide({ project }: { project: ProjectListItem }) {
  return (
    <div className="flex w-full min-w-0 max-w-none flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/70 bg-card/60 px-4 py-4 shadow-sm sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fiche projet — CODIR
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h2>
          <p className="mt-2 inline-flex items-center rounded-full border border-border/80 bg-muted/30 px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
            {project.code}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0 gap-1.5">
          <Link href={projectDetail(project.id)}>
            <Presentation className="size-4" aria-hidden />
            Fiche détaillée
          </Link>
        </Button>
      </div>
      <ProjectCommitteeDetailTables project={project} />
    </div>
  );
}
