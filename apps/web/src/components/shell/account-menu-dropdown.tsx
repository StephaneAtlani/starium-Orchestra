'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { UserCircle, ChevronDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { ClientSwitcher } from '../ClientSwitcher';

interface AccountMenuDropdownProps {
  /** URL blob photo (GET /me/avatar) ou null. */
  avatarPreview: string | null;
  /** Libellé métier pour initiales (nom, sinon email). */
  displayName: string;
  /** Seed couleur palette (id utilisateur). */
  avatarSeed?: string;
  onLogout: () => void;
  /** Classes sur le panneau déroulant */
  menuClassName?: string;
  /** Classes sur le summary (trigger avatar) */
  triggerClassName?: string;
  showChevron?: boolean;
  /** Variante visuelle du trigger (topbar desktop vs mobile) */
  variant?: 'default' | 'topbar' | 'mobile';
  accessToken?: string | null;
  activeClient?: { id: string; name: string } | null;
  multiClient?: boolean;
}

export function AccountMenuDropdown({
  avatarPreview,
  displayName,
  avatarSeed,
  onLogout,
  menuClassName,
  triggerClassName,
  showChevron = false,
  variant = 'default',
  accessToken,
  activeClient,
  multiClient = false,
}: AccountMenuDropdownProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const showClientSection = Boolean(accessToken && (multiClient || activeClient));

  useEffect(() => {
    const el = menuRef.current;
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

  const avatarSize = variant === 'topbar' ? 'md' : 'sm';

  return (
    <details ref={menuRef} className="group/details relative shrink-0">
      <summary
        className={cn(
          'list-none flex cursor-pointer items-center justify-center [&::-webkit-details-marker]:hidden',
          variant === 'topbar' && 'gap-0.5',
          triggerClassName,
        )}
        aria-label="Mon compte, organisation et déconnexion"
      >
        <UserInitialsAvatar
          displayName={displayName}
          seed={avatarSeed ?? displayName}
          imageUrl={avatarPreview}
          size={avatarSize}
          title={displayName}
          className={cn(
            'shadow-sm ring-1 ring-border/40',
            variant === 'topbar' &&
              'size-10 border-[1.5px] border-[color:var(--starium-primary)]',
          )}
        />
        {showChevron ? (
          <span className="starium-topbar-chevron" aria-hidden>
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </summary>
      <div
        className={cn(
          'starium-dropdown-panel absolute right-0 z-50 mt-2 min-w-[11rem] rounded-xl py-1 text-sm shadow-lg md:min-w-[200px] md:rounded-lg',
          showClientSection && 'md:min-w-[240px]',
          'pointer-events-none opacity-0 translate-y-1 scale-[0.98] transition-all duration-150 ease-out',
          'group-open/details:pointer-events-auto group-open/details:translate-y-0 group-open/details:scale-100 group-open/details:opacity-100',
          menuClassName,
        )}
      >
        {showClientSection ? (
          <div className="starium-account-menu__client">
            <p className="starium-account-menu__client-label" id="account-menu-client-label">
              Organisation
            </p>
            {multiClient && accessToken ? (
              <ClientSwitcher
                accessToken={accessToken}
                className="starium-account-menu__client-select"
              />
            ) : activeClient ? (
              <p className="starium-account-menu__client-name" title={activeClient.name}>
                <Building2 className="mr-1.5 inline h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                {activeClient.name}
              </p>
            ) : null}
          </div>
        ) : null}
        <Link
          href="/account"
          onClick={() => {
            const d = menuRef.current;
            if (d) d.open = false;
          }}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm starium-text hover:bg-accent md:py-2"
        >
          <UserCircle className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          Compte
        </Link>
        <button
          type="button"
          className="flex w-full items-center px-3 py-2.5 text-left text-sm starium-text hover:bg-accent md:py-2"
          onClick={() => {
            const d = menuRef.current;
            if (d) d.open = false;
            onLogout();
          }}
        >
          Déconnexion
        </button>
      </div>
    </details>
  );
}
