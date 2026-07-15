'use client';

import { useCallback, useEffect, useState } from 'react';

export type UseCodirPresentationOptions = {
  totalSlides: number;
  initialSlide?: number;
  enabled?: boolean;
};

export function useCodirPresentation({
  totalSlides,
  initialSlide = 0,
  enabled = false,
}: UseCodirPresentationOptions) {
  const [slideIndex, setSlideIndex] = useState(initialSlide);

  const maxIndex = Math.max(0, totalSlides - 1);
  const clampedSlide = Math.min(Math.max(0, slideIndex), maxIndex);

  useEffect(() => {
    if (enabled) {
      setSlideIndex(Math.min(Math.max(0, initialSlide), maxIndex));
    }
  }, [enabled, initialSlide, maxIndex]);

  useEffect(() => {
    setSlideIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setSlideIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setSlideIndex((i) => Math.min(maxIndex, i + 1));
  }, [maxIndex]);

  const goToSlide = useCallback(
    (index: number) => {
      setSlideIndex(Math.min(Math.max(0, index), maxIndex));
    },
    [maxIndex],
  );

  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('codir-presentation-close'));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, goPrev, goNext]);

  useEffect(() => {
    if (!enabled) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [enabled]);

  return {
    slideIndex: clampedSlide,
    goPrev,
    goNext,
    goToSlide,
    canGoPrev: clampedSlide > 0,
    canGoNext: clampedSlide < maxIndex,
  };
}
