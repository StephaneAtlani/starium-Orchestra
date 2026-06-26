'use client';

import React from 'react';
import Image from 'next/image';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { AccountMenuDropdown } from './account-menu-dropdown';

interface MobileWorkspaceHeaderBarProps {
  mobileOpen: boolean;
  onToggleMenu: () => void;
  accessToken: string | null;
  activeClient: { id: string; name: string } | null;
  multiClient: boolean;
  user: {
    platformRole?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    hasAvatar?: boolean;
  } | null;
  avatarPreview: string | null;
  avatarInitials: string;
  onLogout: () => void;
}

export function MobileWorkspaceHeaderBar({
  mobileOpen,
  onToggleMenu,
  accessToken,
  activeClient,
  multiClient,
  user,
  avatarPreview,
  avatarInitials,
  onLogout,
}: MobileWorkspaceHeaderBarProps) {
  return (
    <div className="starium-header-mobile md:hidden">
      <div className="starium-header-mobile__inner flex h-14 min-h-14 items-center justify-between gap-2 px-4">
        <button
          type="button"
          className="starium-header-mobile__brand flex min-h-11 min-w-0 shrink items-center gap-2.5 rounded-lg pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--starium-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--starium-sidebar-bg)]"
          aria-label={mobileOpen ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation'}
          aria-expanded={mobileOpen}
          aria-controls="starium-mobile-nav-menu"
          onClick={onToggleMenu}
        >
          <span className="starium-header-mobile__brand-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.65rem]">
            <Image
              src="/brand/icon-starium-white.png"
              alt=""
              width={28}
              height={28}
              priority
              className="h-7 w-7 object-contain"
              aria-hidden
            />
          </span>
          <span className="truncate text-base font-bold tracking-tight text-white">
            Starium
          </span>
        </button>

        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          {accessToken && activeClient ? (
            <NotificationBell tone="inverse" />
          ) : null}

          {user ? (
            <AccountMenuDropdown
              avatarPreview={avatarPreview}
              avatarInitials={avatarInitials}
              onLogout={onLogout}
              variant="mobile"
              accessToken={accessToken}
              activeClient={activeClient}
              multiClient={multiClient}
              triggerClassName="min-h-11 min-w-11 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--starium-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--starium-sidebar-bg)]"
              menuClassName="starium-header-mobile__account-menu"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
