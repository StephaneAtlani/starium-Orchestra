'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  codirPresentationGanttUsesTagGrouping,
  countPresentationGanttSlides,
  type PresentationGanttSectionRef,
} from '../lib/codir-presentation-filters';

export type CodirPresentationTheme = 'dark' | 'light';

export type CodirPageSettings = {
  showSynthesisSection: boolean;
  showReportingSection: boolean;
  includeCoverSlide: boolean;
  includePortfolioSlide: boolean;
  includeGanttSlide: boolean;
  presentationTheme: CodirPresentationTheme;
  /** Statuts projet inclus dans le diaporama (libellés métier en UI). */
  presentationIncludedStatuses: string[];
  /** Étiquettes projet — filtre « au moins une » ; vide = toutes. */
  presentationIncludedTagIds: string[];
};

const STORAGE_KEY = 'committee-codir-page-settings';

export const DEFAULT_CODIR_PAGE_SETTINGS: CodirPageSettings = {
  showSynthesisSection: true,
  showReportingSection: true,
  includeCoverSlide: true,
  includePortfolioSlide: true,
  includeGanttSlide: false,
  presentationTheme: 'dark',
  presentationIncludedStatuses: [
    'DRAFT',
    'PLANNED',
    'IN_PROGRESS',
    'ON_HOLD',
    'COMPLETED',
  ],
  presentationIncludedTagIds: [],
};

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function parsePresentationStatuses(value: unknown): string[] {
  const parsed = parseStringArray(value);
  return parsed.length > 0 ? parsed : DEFAULT_CODIR_PAGE_SETTINGS.presentationIncludedStatuses;
}

function parsePresentationTheme(value: unknown): CodirPresentationTheme {
  return value === 'light' ? 'light' : 'dark';
}

function parseSettings(raw: string | null): CodirPageSettings {
  if (!raw) return DEFAULT_CODIR_PAGE_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<CodirPageSettings>;
    return {
      showSynthesisSection: parsed.showSynthesisSection ?? true,
      showReportingSection: parsed.showReportingSection ?? true,
      includeCoverSlide: parsed.includeCoverSlide ?? true,
      includePortfolioSlide: parsed.includePortfolioSlide ?? true,
      includeGanttSlide: parsed.includeGanttSlide ?? false,
      presentationTheme: parsePresentationTheme(parsed.presentationTheme),
      presentationIncludedStatuses: parsePresentationStatuses(parsed.presentationIncludedStatuses),
      presentationIncludedTagIds: parseStringArray(parsed.presentationIncludedTagIds),
    };
  } catch {
    return DEFAULT_CODIR_PAGE_SETTINGS;
  }
}

export type CodirPresentationSlide =
  | { kind: 'cover' }
  | { kind: 'portfolio' }
  | {
      kind: 'gantt';
      sectionKey: string;
      sectionLabel: string;
      sectionIndex: number;
      sectionTotal: number;
    }
  | { kind: 'project'; projectIndex: number };

export function buildPresentationSlides(
  projectCount: number,
  settings: CodirPageSettings,
  ganttSections: PresentationGanttSectionRef[] = [],
): CodirPresentationSlide[] {
  const slides: CodirPresentationSlide[] = [];
  if (settings.includeCoverSlide) slides.push({ kind: 'cover' });
  if (settings.includePortfolioSlide) slides.push({ kind: 'portfolio' });

  if (settings.includeGanttSlide) {
    const sections =
      ganttSections != null
        ? ganttSections
        : codirPresentationGanttUsesTagGrouping(settings)
          ? settings.presentationIncludedTagIds.map((tagId) => ({
              key: `tag:${tagId}`,
              label: 'Étiquette',
            }))
          : [{ key: 'gantt:all', label: 'Portefeuille' }];

    sections.forEach((section, sectionIndex) => {
      slides.push({
        kind: 'gantt',
        sectionKey: section.key,
        sectionLabel: section.label,
        sectionIndex,
        sectionTotal: sections.length,
      });
    });
  }

  for (let i = 0; i < projectCount; i += 1) {
    slides.push({ kind: 'project', projectIndex: i });
  }
  return slides;
}

export function projectPresentationSlideIndex(
  deckIndex: number,
  settings: CodirPageSettings,
  ganttSlideCount?: number,
): number {
  let offset = 0;
  if (settings.includeCoverSlide) offset += 1;
  if (settings.includePortfolioSlide) offset += 1;
  if (settings.includeGanttSlide) {
    offset += ganttSlideCount ?? countPresentationGanttSlides(settings);
  }
  return offset + deckIndex;
}

export type { PresentationGanttSectionRef };

export function useCodirPageSettings() {
  const [settings, setSettings] = useState<CodirPageSettings>(DEFAULT_CODIR_PAGE_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(parseSettings(localStorage.getItem(STORAGE_KEY)));
    setHydrated(true);
  }, []);

  const updateSettings = useCallback((patch: Partial<CodirPageSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const saveSettings = useCallback((next: CodirPageSettings) => {
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_CODIR_PAGE_SETTINGS);
  }, [saveSettings]);

  return {
    settings,
    hydrated,
    updateSettings,
    saveSettings,
    resetSettings,
  };
}
