'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { useActiveClient } from '@/hooks/use-active-client';
import { useSidebarNav } from './sidebar-nav-context';
import { NavigationMenuBody } from './navigation-menu-body';
import {
  SidebarDropdownContext,
  useSidebarDropdownPanel,
} from './sidebar-dropdown';
import { NavMenuLinkContext } from './nav-menu-link-context';

export function MobileNavMenu() {
  const pathname = usePathname();
  const { mobileOpen, closeMobile } = useSidebarNav();
  const { activeClient } = useActiveClient();
  const { contextValue } = useSidebarDropdownPanel();

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  return (
    <StariumModal
      open={mobileOpen}
      onOpenChange={(open) => {
        if (!open) closeMobile();
      }}
      title="Navigation principale"
      headless
      showCloseButton={false}
      contentClassName="starium-mobile-nav-dialog md:hidden"
      id="starium-mobile-nav-menu"
      overlayClassName="md:hidden"
      bodyClassName="p-0"
    >
        <div className="starium-mobile-nav-menu flex h-full min-h-0 flex-col">
          <SidebarDropdownContext.Provider value={contextValue}>
            <NavMenuLinkContext.Provider value={{ onLinkClick: closeMobile }}>
              <header className="starium-mobile-nav-menu__header flex h-14 min-h-14 shrink-0 items-center gap-3 border-b px-4">
                <Image
                  src="/brand/icon-starium.png"
                  alt="Starium"
                  width={28}
                  height={28}
                  priority
                  className="h-7 w-7 shrink-0 object-contain"
                />
                <div className="min-w-0 flex flex-1 flex-col leading-snug">
                  <span
                    className="truncate text-sm font-semibold tracking-tight text-foreground"
                    title={activeClient?.name?.trim() || undefined}
                  >
                    {activeClient?.name?.trim() || 'Starium Orchestra'}
                  </span>
                  <span className="text-[11px] leading-tight text-muted-foreground">
                    Cockpit
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  aria-label="Fermer le menu"
                  onClick={closeMobile}
                >
                  <X className="size-6" strokeWidth={2.25} />
                </Button>
              </header>
              <NavigationMenuBody className="pb-[max(1rem,env(safe-area-inset-bottom))]" />
            </NavMenuLinkContext.Provider>
          </SidebarDropdownContext.Provider>
        </div>
    </StariumModal>
  );
}
