'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Inbox,
  Loader2,
  Trash2,
} from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useClearAllNotificationsMutation,
  useClearNotificationMutation,
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

export function NotificationBell({ tone = 'default' }: { tone?: 'default' | 'inverse' }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const { data, isLoading, isError, error, refetch } = useNotificationsQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAll = useMarkAllNotificationsReadMutation();
  const clearAll = useClearAllNotificationsMutation();
  const clearOne = useClearNotificationMutation();
  const unread = data?.unread ?? 0;
  const total = data?.total ?? 0;
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
      // Ne pas fermer si le clic est dans une modale portailée
      if (
        target instanceof Element &&
        target.closest('[data-slot="dialog-content"], [data-slot="dialog-overlay"]')
      ) {
        return;
      }
      closeIfOpen();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !el.open) return;
      if (clearConfirmOpen) return;
      closeIfOpen();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [clearConfirmOpen]);

  async function handleMarkAll() {
    const result = await markAll.mutateAsync();
    setStatusMessage(
      result.updated > 0
        ? `${result.updated} notification${result.updated > 1 ? 's' : ''} marquée${result.updated > 1 ? 's' : ''} comme lue${result.updated > 1 ? 's' : ''}`
        : 'Aucune notification non lue',
    );
  }

  async function handleClearAll() {
    const result = await clearAll.mutateAsync();
    setClearConfirmOpen(false);
    setStatusMessage(
      result.deleted > 0
        ? `${result.deleted} notification${result.deleted > 1 ? 's' : ''} supprimée${result.deleted > 1 ? 's' : ''}`
        : 'Aucune notification à supprimer',
    );
  }

  async function handleOpenLink(item: NotificationItem) {
    if (item.status === 'UNREAD') {
      try {
        await markRead.mutateAsync(item.id);
      } catch {
        // navigation quand même
      }
    }
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <>
      <details ref={detailsRef} className="group/details relative">
        {/* Pas de <button> dans <summary> : le clic ne basculerait pas <details>. */}
        <summary
          className={cn(
            buttonVariants({ variant: 'ghost', size: tone === 'inverse' ? 'icon' : 'icon-sm' }),
            'list-none relative cursor-pointer [&::-webkit-details-marker]:hidden',
            tone === 'inverse'
              ? 'starium-notification-bell--inverse group-open/details:bg-white/20 group-open/details:text-white'
              : 'starium-text hover:starium-bg-muted group-open/details:bg-muted group-open/details:text-foreground',
          )}
          aria-label={
            unread > 0
              ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`
              : 'Notifications'
          }
        >
          <Bell className="h-4 w-4 transition-transform duration-200 group-open/details:scale-105" />
          {unread > 0 ? (
            <span
              className={cn(
                'absolute flex items-center justify-center rounded-full font-bold tabular-nums shadow-sm',
                tone === 'inverse'
                  ? '-right-0.5 -top-0.5 h-2.5 w-2.5 bg-[var(--starium-primary)] ring-2 ring-[var(--starium-sidebar-bg)]'
                  : '-right-0.5 -top-0.5 h-4 min-w-4 bg-primary px-1 text-[10px] text-primary-foreground ring-2 ring-background',
              )}
              aria-hidden={tone === 'inverse'}
            >
              {tone === 'inverse' ? null : unread > 99 ? '99+' : unread}
            </span>
          ) : null}
          {unread > 0 && tone === 'inverse' ? (
            <span className="sr-only">
              {unread} non lue{unread > 1 ? 's' : ''}
            </span>
          ) : null}
        </summary>

        <div
          className={cn(
            'pointer-events-none absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] origin-top-right',
            'max-md:fixed max-md:inset-x-4 max-md:top-[calc(3.5rem+env(safe-area-inset-top,0px))] max-md:mt-0 max-md:w-auto max-md:max-w-none',
            'rounded-xl border border-border bg-card text-card-foreground shadow-lg ring-1 ring-black/5 dark:ring-white/10',
            'opacity-0 transition-[opacity,transform] duration-200 ease-out',
            'translate-y-1 scale-[0.98]',
            'group-open/details:pointer-events-auto group-open/details:translate-y-0 group-open/details:scale-100 group-open/details:opacity-100',
          )}
        >
          <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold tracking-tight">Notifications</p>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {isLoading
                  ? 'Chargement…'
                  : unread > 0
                    ? `${unread} non lue${unread > 1 ? 's' : ''}`
                    : total > 0
                      ? 'À jour'
                      : 'Aucune notification'}
              </p>
              <p className="sr-only" aria-live="polite">
                {statusMessage}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground sm:min-h-8"
                disabled={unread === 0 || markAll.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  void handleMarkAll();
                }}
              >
                {markAll.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <CheckCheck className="size-3.5" aria-hidden />
                )}
                Tout lu
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive sm:min-h-8"
                disabled={total === 0 || clearAll.isPending}
                aria-label="Effacer toutes les notifications"
                onClick={(e) => {
                  e.preventDefault();
                  setClearConfirmOpen(true);
                }}
              >
                <Trash2 className="size-3.5" aria-hidden />
                Effacer
              </Button>
            </div>
          </header>

          <div className="max-h-[min(24rem,70dvh)] overflow-y-auto overscroll-contain max-md:max-h-[min(28rem,calc(100dvh-5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))]">
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
                                'min-h-11 gap-1 px-2.5 text-xs font-medium sm:min-h-7',
                              )}
                              onClick={() => {
                                void handleOpenLink(item);
                              }}
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
                              className="min-h-11 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground sm:min-h-7"
                              disabled={markRead.isPending}
                              onClick={(e) => {
                                e.preventDefault();
                                void markRead.mutateAsync(item.id).then(() => {
                                  setStatusMessage('Notification marquée comme lue');
                                });
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-11 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive sm:min-h-7"
                            disabled={clearOne.isPending}
                            aria-label={`Supprimer la notification ${item.title}`}
                            onClick={(e) => {
                              e.preventDefault();
                              void clearOne.mutateAsync(item.id).then(() => {
                                setStatusMessage('Notification supprimée');
                              });
                            }}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            Supprimer
                          </Button>
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

      <StariumModal
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="Effacer toutes les notifications"
        description="Suppression définitive de toutes vos notifications pour ce client. Les alertes métier et les e-mails déjà envoyés ne sont pas affectés."
        icon={Trash2}
        accent="rose"
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => setClearConfirmOpen(false)}
              disabled={clearAll.isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11 sm:min-h-9"
              onClick={() => void handleClearAll()}
              disabled={clearAll.isPending}
            >
              {clearAll.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Suppression…
                </>
              ) : (
                'Effacer tout'
              )}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Cette action est irréversible. Vous pourrez recevoir de nouvelles notifications si de
          nouvelles alertes apparaissent.
        </p>
      </StariumModal>
    </>
  );
}
