'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolioGanttQuery } from '../../hooks/use-portfolio-gantt-query';
import { useCommitteeCodirDeckQuery } from '../hooks/use-committee-codir-deck-query';
import { useCodirPresentation } from '../hooks/use-codir-presentation';
import {
  buildPresentationSlides,
  type CodirPageSettings,
} from '../hooks/use-codir-page-settings';
import {
  codirPortfolioGanttQueryParams,
  filterProjectsForPresentation,
  resolvePresentationGanttSections,
} from '../lib/codir-presentation-filters';
import {
  computePresentationDeckKpis,
  computeStatusBreakdown,
  sortDeckProjects,
} from '../lib/codir-deck-metrics';
import { CodirSlideCover } from './slides/codir-slide-cover';
import { CodirSlideGantt } from './slides/codir-slide-gantt';
import { CodirSlidePortfolio } from './slides/codir-slide-portfolio';
import { CodirSlideProject } from './slides/codir-slide-project';

type CodirPresentationOverlayProps = {
  open: boolean;
  initialSlide?: number;
  settings: CodirPageSettings;
  onClose: () => void;
};

export function CodirPresentationOverlay({
  open,
  initialSlide = 0,
  settings,
  onClose: onCloseProp,
}: CodirPresentationOverlayProps) {
  const deckQ = useCommitteeCodirDeckQuery({ enabled: open });
  const ganttParams = useMemo(() => codirPortfolioGanttQueryParams(settings), [settings]);
  const ganttQ = usePortfolioGanttQuery(ganttParams, {
    enabled: open && settings.includeGanttSlide,
  });
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const presentationProjects = useMemo(() => {
    const sorted = sortDeckProjects(deckQ.data ?? []);
    return filterProjectsForPresentation(sorted, settings);
  }, [deckQ.data, settings]);

  const ganttSections = useMemo(
    () => resolvePresentationGanttSections(ganttQ.data?.items ?? [], settings),
    [ganttQ.data?.items, settings],
  );

  const slides = useMemo(
    () => buildPresentationSlides(presentationProjects.length, settings, ganttSections),
    [presentationProjects.length, settings, ganttSections],
  );
  const totalSlides = slides.length;

  const presentation = useCodirPresentation({
    totalSlides,
    initialSlide,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('starium-present-overlay-open');
    return () => document.body.classList.remove('starium-present-overlay-open');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClose = () => onCloseProp();
    document.addEventListener('codir-presentation-close', onClose);
    return () => document.removeEventListener('codir-presentation-close', onClose);
  }, [open, onCloseProp]);

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
  }, [open, presentation.slideIndex]);

  const kpis = useMemo(
    () => computePresentationDeckKpis(presentationProjects),
    [presentationProjects],
  );
  const statusBreakdown = useMemo(
    () => computeStatusBreakdown(presentationProjects),
    [presentationProjects],
  );

  if (!open || typeof document === 'undefined') return null;

  const handleClose = () => {
    onCloseProp();
  };

  return createPortal(
    <div
      ref={overlayRef}
      className={cn(
        'starium-present-overlay',
        settings.presentationTheme === 'light' && 'starium-present-overlay--light',
      )}
      data-presentation-theme={settings.presentationTheme}
      role="dialog"
      aria-modal="true"
      aria-label="Mode présentation CODIR"
    >
      <div className="starium-present-brand">
        <span className="starium-present-brand-mark" aria-hidden>
          <Star className="size-4" fill="currentColor" />
        </span>
        <span className="starium-present-brand-name">Starium · CODIR</span>
      </div>

      <button
        ref={closeBtnRef}
        type="button"
        className="starium-present-close"
        onClick={handleClose}
        aria-label="Fermer le mode présentation"
      >
        <X className="size-5" aria-hidden />
      </button>

      <div className="starium-present-stage">
        {slides.map((slide, slideIndex) => (
          <SlidePane
            key={
              slide.kind === 'project'
                ? `project-${slide.projectIndex}`
                : slide.kind === 'gantt'
                  ? `gantt-${slide.sectionKey}`
                  : `${slide.kind}-${slideIndex}`
            }
            active={presentation.slideIndex === slideIndex}
          >
            {slide.kind === 'cover' ? (
              <CodirSlideCover
                kpis={kpis}
                projectCount={presentationProjects.length}
              />
            ) : null}
            {slide.kind === 'portfolio' ? (
              <CodirSlidePortfolio
                kpis={kpis}
                statusBreakdown={statusBreakdown}
                scoped
                projectCount={presentationProjects.length}
              />
            ) : null}
            {slide.kind === 'gantt' ? (
              <CodirSlideGantt
                items={ganttQ.data?.items ?? []}
                settings={settings}
                sectionKey={slide.sectionKey}
                sectionLabel={slide.sectionLabel}
                sectionIndex={slide.sectionIndex}
                sectionTotal={slide.sectionTotal}
                isLoading={ganttQ.isLoading}
              />
            ) : null}
            {slide.kind === 'project' ? (
              <CodirSlideProject
                project={presentationProjects[slide.projectIndex]}
                projectIndex={slide.projectIndex}
                projectTotal={presentationProjects.length}
              />
            ) : null}
          </SlidePane>
        ))}
      </div>

      <footer className="starium-present-nav">
        <button
          type="button"
          className="starium-present-nav-btn"
          disabled={!presentation.canGoPrev}
          onClick={presentation.goPrev}
          aria-label="Diapositive précédente"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>

        <div className="starium-present-progress" role="tablist" aria-label="Progression du diaporama">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={presentation.slideIndex === i}
              aria-label={`Diapositive ${i + 1}`}
              className={cn(
                'starium-present-dot',
                presentation.slideIndex === i && 'starium-present-dot--active',
                i < presentation.slideIndex && 'starium-present-dot--done',
              )}
              onClick={() => presentation.goToSlide(i)}
            />
          ))}
        </div>

        <span className="starium-present-count" aria-live="polite" aria-atomic="true">
          {presentation.slideIndex + 1} / {Math.max(1, totalSlides)}
        </span>

        <button
          type="button"
          className="starium-present-nav-btn"
          disabled={!presentation.canGoNext}
          onClick={presentation.goNext}
          aria-label="Diapositive suivante"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </footer>
    </div>,
    document.body,
  );
}

function SlidePane({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      className={cn('starium-present-slide', active && 'starium-present-slide--active')}
      hidden={!active}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}
