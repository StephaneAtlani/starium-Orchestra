'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { UserCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountMenuDropdownProps {
  avatarPreview: string | null;
  avatarInitials: string;
  onLogout: () => void;
  /** Classes sur le panneau déroulant */
  menuClassName?: string;
  /** Classes sur le summary (trigger avatar) */
  triggerClassName?: string;
  showChevron?: boolean;
}

export function AccountMenuDropdown({
  avatarPreview,
  avatarInitials,
  onLogout,
  menuClassName,
  triggerClassName,
  showChevron = false,
}: AccountMenuDropdownProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);

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

  return (
    <details ref={menuRef} className="group/details relative shrink-0">
      <summary
        className={cn(
          'list-none flex cursor-pointer items-center justify-center [&::-webkit-details-marker]:hidden',
          triggerClassName,
        )}
        aria-label="Mon compte et déconnexion"
      >
        <span className="starium-avatar flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold md:h-8 md:w-8 md:font-medium">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL objet blob
            <img
              src={avatarPreview}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            avatarInitials
          )}
        </span>
        {showChevron ? (
          <ChevronDown className="h-4 w-4 starium-text" aria-hidden />
        ) : null}
      </summary>
      <div
        className={cn(
          'starium-dropdown-panel absolute right-0 z-50 mt-2 min-w-[11rem] rounded-xl py-1 text-sm shadow-lg md:min-w-[180px] md:rounded-lg',
          'pointer-events-none opacity-0 translate-y-1 scale-[0.98] transition-all duration-150 ease-out',
          'group-open/details:pointer-events-auto group-open/details:translate-y-0 group-open/details:scale-100 group-open/details:opacity-100',
          menuClassName,
        )}
      >
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
