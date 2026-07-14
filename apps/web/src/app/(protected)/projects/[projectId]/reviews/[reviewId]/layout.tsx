'use client';

import { useEffect } from 'react';

const MAIN_SELECTOR = 'main.starium-workspace-sheet';
const INNER_SELECTOR = '.starium-workspace-inner';

/** Conduite de réunion : pas de scroll sur le workspace, scroll interne aux panneaux. */
export default function ProjectReviewConductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const main = document.querySelector<HTMLElement>(MAIN_SELECTOR);
    const inner = main?.querySelector<HTMLElement>(INNER_SELECTOR);
    if (!main) return;

    const previousMainOverflow = main.style.overflow;
    const previousMainClassName = main.className;
    main.style.overflow = 'hidden';
    main.classList.add('flex', 'min-h-0', 'flex-col');

    const previousInnerClassName = inner?.className ?? '';
    if (inner) {
      inner.classList.remove('min-h-full', 'py-6', 'sm:py-8', 'max-md:pt-5', 'md:pt-6');
      inner.classList.add(
        'flex',
        'h-full',
        '!min-h-0',
        'flex-1',
        'flex-col',
        'overflow-hidden',
        '!py-0',
        '!pt-0',
      );
    }

    return () => {
      main.style.overflow = previousMainOverflow;
      main.className = previousMainClassName;
      if (inner) {
        inner.className = previousInnerClassName;
      }
    };
  }, []);

  return children;
}
