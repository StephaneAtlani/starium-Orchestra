'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Inbox,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '../hooks/use-notifications';

import type { NotificationItem } from '@/services/notifications';

function severityBadge(severity: NotificationItem['alertSeverity']) {
  if (!severity) return null;
  const label =
    severity === 'CRITICAL'
      ? 'Critique'
      : severity === 'WARNING'
        ? 'Attention'
        : 'Info';
  const className =
    severity === 'CRITICAL'
      ? 'border-destructive/35 bg-destructive/10 text-destructive'
      : severity === 'WARNING'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100'
        : 'border-border bg-muted/70 text-muted-foreground';
  return (
    <Badge variant="outline" className={cn('shrink-0 font-medium', className)}>
      {label}
    </Badge>
  );
}

export function NotificationBell() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const { data, isLoading, isError, error, refetch } = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();
  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;

    const closeIfOpen = () => {
      if (el.open) el.open = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!el.open) return;
      const target = e.target as Node | null;
      if (target && el.contains(target)) return;
      closeIfOpen();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !el.open) return;
      closeIfOpen();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details ref={detailsRef} className="group/details relative">
      {/* Pas de <button> dans <summary> : le clic ne basculerait pas <details>. */}
      <summary
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'list-none starium-text hover:starium-bg-muted relative cursor-pointer [&::-webkit-details-marker]:hidden group-open/details:bg-muted group-open/details:text-foreground',
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 transition-transform duration-200 group-open/details:scale-105" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground shadow-sm ring-2 ring-background">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </summary>

      <div
        className={cn(
          'pointer-events-none absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] origin-top-right',
          'rounded-xl border border-border bg-card text-card-foreground shadow-lg ring-1 ring-black/5 dark:ring-white/10',
          'opacity-0 transition-[opacity,transform] duration-200 ease-out',
          'translate-y-1 scale-[0.98]',
          'group-open/details:pointer-events-auto group-open/details:translate-y-0 group-open/details:scale-100 group-open/details:opacity-100',
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold tracking-tight">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? 'Chargement…'
                : unread > 0
                  ? `${unread} non lue${unread > 1 ? 's' : ''}`
                  : 'À jour'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            disabled={unread === 0 || markAll.isPending}
            onClick={(e) => {
              e.preventDefault();
              void markAll.mutateAsync();
            }}
          >
            {markAll.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <CheckCheck className="size-3.5" aria-hidden />
            )}
            Tout lu
          </Button>
        </header>

        <div className="max-h-[min(24rem,70dvh)] overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex justify-between gap-2">
                    <Skeleton className="h-4 w-[58%]" />
                    <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-[72%]" />
                </div>
              ))}
            </div>
          ) : null}

          {isError ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="size-5" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Impossible de charger</p>
                <p className="text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : 'Erreur réseau ou droits insuffisants.'}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                Réessayer
              </Button>
            </div>
          ) : null}

          {!isLoading && !isError && items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Inbox className="size-6" aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground">Rien pour l’instant</p>
              <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
                Les alertes et messages apparaîtront ici lorsqu’ils seront envoyés à votre compte.
              </p>
            </div>
          ) : null}

          {!isLoading && !isError && items.length > 0 ? (
            <ul className="divide-y divide-border/80">
              {items.map((item) => {
                const isUnread = item.status === 'UNREAD';
                return (
                  <li key={item.id}>
                    <div
                      className={cn(
                        'px-4 py-3 transition-colors',
                        isUnread ? 'bg-primary/5' : 'hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isUnread ? (
                              <span
                                className="size-1.5 shrink-0 rounded-full bg-primary"
                                aria-hidden
                              />
                            ) : null}
                            <p className="truncate text-sm font-medium leading-snug">{item.title}</p>
                            {severityBadge(item.alertSeverity)}
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                            {item.message}
                          </p>
                          {item.entityLabel ? (
                            <p className="text-xs font-medium text-foreground/90">{item.entityLabel}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {item.actionUrl ? (
                          <Link
                            href={item.actionUrl}
                            className={cn(
                              buttonVariants({ variant: 'outline', size: 'sm' }),
                              'h-7 gap-1 px-2.5 text-xs font-medium',
                            )}
                          >
                            Ouvrir
                            <ChevronRight className="size-3.5 opacity-70" aria-hidden />
                          </Link>
                        ) : null}
                        {isUnread ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                            disabled={markRead.isPending}
                            onClick={(e) => {
                              e.preventDefault();
                              void markRead.mutateAsync(item.id);
                            }}
                          >
                            {markRead.isPending ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <Check className="size-3.5" aria-hidden />
                            )}
                            Marquer lu
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Lu</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </details>
  );
}
