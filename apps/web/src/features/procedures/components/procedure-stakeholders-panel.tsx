'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/feedback/loading-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useFullscreenPortalContainer } from '@/hooks/use-fullscreen-portal-container';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import { MemberAvatar } from '@/features/client-rbac/components/member-avatar';
import type { ClientMember } from '@/features/client-rbac/api/user-roles';
import { toast } from '@/lib/toast';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import {
  getProcedureStakeholders,
  updateProcedureStakeholders,
  type ProcedureStakeholdersDto,
} from '../api/procedures.api';
import { procedureQueryKeys } from '../lib/procedure-query-keys';

type RoleKey = 'editors' | 'reviewers' | 'validators';

const ROLE_META: {
  key: RoleKey;
  title: string;
  empty: string;
  addLabel: string;
}[] = [
  {
    key: 'editors',
    title: 'Rédacteurs',
    empty: 'Aucun rédacteur',
    addLabel: 'Ajouter un rédacteur',
  },
  {
    key: 'reviewers',
    title: 'Relecteurs',
    empty: 'Aucun relecteur',
    addLabel: 'Ajouter un relecteur',
  },
  {
    key: 'validators',
    title: 'Validateurs',
    empty: 'Aucun validateur',
    addLabel: 'Ajouter un validateur',
  },
];

function memberOptionLabel(m: ClientMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (m.email) {
    const [local, domain] = m.email.split('@');
    if (local && domain) return `${local.slice(0, 1)}***@${domain}`;
  }
  return 'Membre';
}

function memberMatchesSearch(m: ClientMember, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    m.firstName,
    m.lastName,
    m.email,
    m.jobTitle,
    m.department,
    m.humanResourceSummary?.displayName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function RoleMemberAddPopover({
  role,
  available,
  disabled,
  loading,
  onPick,
}: {
  role: (typeof ROLE_META)[number];
  available: ClientMember[];
  disabled: boolean;
  loading: boolean;
  onPick: (member: ClientMember) => void;
}) {
  const reactId = useId();
  const searchId = `pr-stake-search-${role.key}-${reactId}`;
  const listId = `pr-stake-list-${role.key}-${reactId}`;
  const searchRef = useRef<HTMLInputElement>(null);
  const portalContainer = useFullscreenPortalContainer();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => available.filter((m) => memberMatchesSearch(m, search)),
    [available, search],
  );

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (disabled && next) return;
        setOpen(next);
      }}
    >
      <PopoverPrimitive.Trigger
        type="button"
        disabled={disabled}
        aria-label={role.addLabel}
        aria-haspopup="dialog"
        className={cn(
          'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
          'text-muted-foreground transition-colors',
          'hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          'disabled:pointer-events-none disabled:opacity-40',
        )}
      >
        <Plus className="size-3.5" aria-hidden />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal container={portalContainer}>
        <PopoverPrimitive.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          className="isolate z-[200]"
        >
          <PopoverPrimitive.Popup
            initialFocus={searchRef}
            className={cn(
              'flex w-[min(16.5rem,calc(100vw-2rem))] flex-col overflow-hidden',
              'rounded-lg border border-border/60 bg-popover text-popover-foreground',
              'shadow-md ring-1 ring-foreground/10',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            )}
          >
            <div className="border-b border-border/60 p-2">
              <label htmlFor={searchId} className="sr-only">
                Rechercher un membre — {role.title}
              </label>
              <Input
                ref={searchRef}
                id={searchId}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                autoComplete="off"
                aria-controls={listId}
                className="h-8 min-h-8 text-[12.5px]"
              />
            </div>
            <ul
              id={listId}
              role="listbox"
              aria-label={role.addLabel}
              className="max-h-48 overflow-y-auto overscroll-contain p-1"
            >
              {loading ? (
                <li
                  className="px-2 py-3 text-center text-[12.5px] text-muted-foreground"
                  role="status"
                >
                  Chargement…
                </li>
              ) : available.length === 0 ? (
                <li
                  className="px-2 py-3 text-center text-[12.5px] text-muted-foreground"
                  role="status"
                >
                  Aucun membre disponible
                </li>
              ) : filtered.length === 0 ? (
                <li
                  className="px-2 py-3 text-center text-[12.5px] text-muted-foreground"
                  role="status"
                >
                  Aucun résultat
                </li>
              ) : (
                filtered.map((m) => {
                  const label = memberOptionLabel(m);
                  return (
                    <li key={m.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        className={cn(
                          'flex w-full min-h-9 items-center gap-2 rounded-md px-2 py-1.5',
                          'text-left text-[12.5px] font-semibold text-card-foreground',
                          'hover:bg-accent/50 focus-visible:bg-accent focus-visible:outline-none',
                        )}
                        onClick={() => {
                          onPick(m);
                          setOpen(false);
                        }}
                      >
                        <MemberAvatar
                          userId={m.id}
                          displayName={label}
                          hasAvatar={m.hasAvatar}
                          size="sm"
                          className="!size-6 text-[9px] border"
                        />
                        <span className="min-w-0 truncate">{label}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function ProcedureStakeholdersPanel({
  procedureId,
  canManage,
}: {
  procedureId: string;
  canManage: boolean;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: procedureQueryKeys.stakeholders(clientId, procedureId),
    queryFn: () => getProcedureStakeholders(authFetch, procedureId),
    enabled: Boolean(clientId) && Boolean(procedureId),
  });

  const membersQ = useClientMembers();

  const saveMut = useMutation({
    mutationFn: (lists: ProcedureStakeholdersDto) =>
      updateProcedureStakeholders(authFetch, procedureId, {
        editors: lists.editors.map((e) => e.userId),
        reviewers: lists.reviewers.map((r) => r.userId),
        validators: lists.validators.map((v) => v.userId),
      }),
    onSuccess: async () => {
      toast.success('Gouvernance mise à jour');
      await queryClient.invalidateQueries({
        queryKey: procedureQueryKeys.stakeholders(clientId, procedureId),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMembers = useMemo(
    () => (membersQ.data ?? []).filter((m) => m.status === 'ACTIVE'),
    [membersQ.data],
  );

  const membersById = useMemo(() => {
    const map = new Map<string, ClientMember>();
    for (const m of membersQ.data ?? []) map.set(m.id, m);
    return map;
  }, [membersQ.data]);

  if (q.isLoading) return <LoadingState rows={3} />;
  if (q.isError || !q.data) {
    return (
      <ErrorState
        message="Impossible de charger les acteurs de la procédure."
        onRetry={() => void q.refetch()}
      />
    );
  }

  const lists = q.data;

  function applyLists(next: ProcedureStakeholdersDto) {
    saveMut.mutate(next);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground">
        Gouvernance
      </p>
      {ROLE_META.map((role) => {
        const items = lists[role.key];
        const selectedIds = new Set(items.map((i) => i.userId));
        const available = activeMembers.filter((m) => !selectedIds.has(m.id));
        return (
          <div key={role.key}>
            <div className="flex min-h-7 items-center justify-between gap-1">
              <p className="text-[11.5px] font-bold text-muted-foreground">
                {role.title}
              </p>
              {canManage ? (
                <RoleMemberAddPopover
                  role={role}
                  available={available}
                  loading={membersQ.isLoading}
                  disabled={saveMut.isPending || membersQ.isLoading}
                  onPick={(m) => {
                    applyLists({
                      ...lists,
                      [role.key]: [
                        ...items,
                        { userId: m.id, label: memberOptionLabel(m) },
                      ],
                    });
                  }}
                />
              ) : null}
            </div>
            <ul className="mt-0.5 flex flex-col gap-0.5" role="list">
              {items.length === 0 ? (
                <li
                  className="py-0.5 text-[12px] text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  {role.empty}
                </li>
              ) : (
                items.map((item) => {
                  const member = membersById.get(item.userId);
                  const label = displayLabel(item.label, 'Membre');
                  return (
                    <li
                      key={`${role.key}-${item.userId}`}
                      className="flex min-h-7 items-center justify-between gap-1"
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold">
                        <MemberAvatar
                          userId={item.userId}
                          displayName={label}
                          hasAvatar={member?.hasAvatar}
                          size="sm"
                          className="!size-6 text-[9px] border"
                        />
                        <span className="truncate">{label}</span>
                      </span>
                      {canManage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0 text-muted-foreground hover:text-[var(--state-danger)]"
                          aria-label={`Retirer ${label}`}
                          disabled={saveMut.isPending}
                          onClick={() => {
                            applyLists({
                              ...lists,
                              [role.key]: items.filter(
                                (x) => x.userId !== item.userId,
                              ),
                            });
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        );
      })}
      <p className="sr-only" aria-live="polite">
        {saveMut.isPending ? 'Enregistrement de la gouvernance…' : ''}
      </p>
    </div>
  );
}
