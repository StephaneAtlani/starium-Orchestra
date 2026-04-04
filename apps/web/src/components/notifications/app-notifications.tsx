'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { registerToastSetter, requestCloseAnimated } from './bridge';
import type { ToastRecord } from './types';

function variantStyles(v: ToastRecord['variant']) {
  switch (v) {
    case 'success':
      return 'border-l-emerald-600 bg-emerald-50/95 text-emerald-950';
    case 'error':
      return 'border-l-rose-600 bg-rose-50/95 text-rose-950';
    case 'warning':
      return 'border-l-amber-500 bg-amber-50/95 text-amber-950';
    default:
      return 'border-l-primary bg-card text-card-foreground';
  }
}

function ToastCard({ t }: { t: ToastRecord }) {
  return (
    <div
      role="status"
      data-variant={t.variant}
      className={cn(
        'starium-notification pointer-events-auto flex w-full max-w-sm gap-3 rounded-xl border border-border/80 py-3 pl-3 pr-2 shadow-lg ring-1 ring-black/5',
        'border-l-[3px]',
        variantStyles(t.variant),
        t.leaving ? 'starium-notification--leave' : 'starium-notification--enter',
      )}
    >
      <div className="min-w-0 flex-1 pl-0.5">
        <p className="text-sm font-semibold leading-snug">{t.title}</p>
        {t.description ? (
          <p className="mt-1 text-xs leading-relaxed opacity-90">{t.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        className="shrink-0 rounded-md p-1 text-current/60 transition hover:bg-black/5 hover:text-current"
        aria-label="Fermer la notification"
        onClick={() => requestCloseAnimated(t.id)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/**
 * Conteneur des toasts + liaison vers `toast()` (`@/lib/toast`).
 * Monté une fois dans `(protected)/layout.tsx`.
 */
export function AppNotifications() {
  const [items, setItems] = useState<ToastRecord[]>([]);

  useEffect(() => {
    registerToastSetter(setItems);
    return () => registerToastSetter(null);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[300] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {items.map((t) => (
        <ToastCard key={t.id} t={t} />
      ))}
    </div>
  );
}
