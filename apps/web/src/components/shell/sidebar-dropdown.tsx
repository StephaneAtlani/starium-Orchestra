'use client';

import React, { useRef, useState, useCallback, useContext, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPEN_DELAY_MS = 50;
const CLOSE_DELAY_MS = 150;
const MOBILE_NAV_MQ = '(max-width: 767px)';

export type SidebarDropdownPanelState = {
  content: React.ReactNode;
  position: { top: number; left: number };
  onPanelEnter: () => void;
  onPanelLeave: () => void;
};

export const SidebarDropdownContext = React.createContext<{
  setPanel: (state: SidebarDropdownPanelState | null) => void;
  /** Libellé du dernier dropdown qui a posé le panneau — évite qu’un mouseLeave tardif efface le menu du suivant. */
  panelOwnerLabelRef: React.MutableRefObject<string | null>;
} | null>(null);

function useSidebarDropdownContext() {
  const ctx = useContext(SidebarDropdownContext);
  if (!ctx) throw new Error('SidebarDropdown must be used inside Sidebar');
  return ctx;
}

function useIsMobileNav() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isMobile;
}

const sidebarNavTriggerClass =
  'group flex w-full flex-row items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-11 starium-sidebar-item md:min-h-0 md:gap-2 md:px-2.5 md:py-2 md:text-xs';

interface SidebarDropdownProps {
  label: string;
  icon?: LucideIcon;
  /** Met en évidence le trigger comme la route courante correspond à un sous-lien */
  triggerActive?: boolean;
  children: React.ReactNode;
}

export function SidebarDropdown({ label, icon: Icon, triggerActive, children }: SidebarDropdownProps) {
  const { setPanel, panelOwnerLabelRef } = useSidebarDropdownContext();
  const isMobile = useIsMobileNav();
  const [open, setOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (openT.current) {
      clearTimeout(openT.current);
      openT.current = null;
    }
    if (closeT.current) {
      clearTimeout(closeT.current);
      closeT.current = null;
    }
  }, []);

  const keepOpen = useCallback(() => {
    clear();
    setOpen(true);
  }, [clear]);

  const scheduleClose = useCallback(() => {
    clear();
    closeT.current = setTimeout(() => {
      setOpen(false);
      if (panelOwnerLabelRef.current === label) {
        setPanel(null);
        panelOwnerLabelRef.current = null;
      }
    }, CLOSE_DELAY_MS);
  }, [clear, label, panelOwnerLabelRef, setPanel]);

  const openDropdown = useCallback(() => {
    if (isMobile) return;
    clear();
    openT.current = setTimeout(() => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setOpen(true);
      panelOwnerLabelRef.current = label;
      setPanel({
        content: children,
        position: { top: r.top, left: r.right + 6 },
        onPanelEnter: keepOpen,
        onPanelLeave: scheduleClose,
      });
    }, OPEN_DELAY_MS);
  }, [children, clear, isMobile, keepOpen, label, panelOwnerLabelRef, scheduleClose, setPanel]);

  const closeDropdown = useCallback(() => {
    if (isMobile) return;
    scheduleClose();
  }, [isMobile, scheduleClose]);

  const handleTriggerClick = () => {
    if (!isMobile) return;
    setMobileExpanded((prev) => !prev);
    setOpen(false);
    setPanel(null);
    panelOwnerLabelRef.current = null;
  };

  useEffect(() => {
    if (!isMobile) {
      setMobileExpanded(false);
    }
  }, [isMobile]);

  const isActive = open || triggerActive || mobileExpanded;

  return (
    <div
      className="relative"
      onMouseEnter={openDropdown}
      onMouseLeave={closeDropdown}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(sidebarNavTriggerClass, isActive && 'starium-sidebar-item-active')}
        aria-expanded={isMobile ? mobileExpanded : open}
        aria-haspopup="true"
        onClick={handleTriggerClick}
      >
        {Icon && (
          <Icon className="h-4 w-4 shrink-0 opacity-90 text-inherit md:h-3.5 md:w-3.5" />
        )}
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronRight
          className={cn(
            'h-4 w-4 shrink-0 starium-sidebar-chevron transition-transform md:h-3 md:w-3',
            isActive && 'rotate-90',
          )}
          aria-hidden
        />
      </button>
      {isMobile && mobileExpanded ? (
        <div
          className="starium-sidebar-inline-submenu mt-1 ml-3 space-y-0.5 border-l border-white/15 pl-3 [&_a]:flex [&_a]:min-h-11 [&_a]:items-center [&_a]:rounded-md [&_a]:px-3 [&_a]:text-sm"
          role="group"
          aria-label={label}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarDropdownLayer({ panel }: { panel: SidebarDropdownPanelState | null }) {
  if (!panel) return null;
  return (
    <div
      role="menu"
      className="starium-dropdown-panel starium-dropdown-panel--sidebar hidden min-w-[10rem] rounded-md py-0.5 shadow-lg md:block"
      style={{
        position: 'fixed',
        top: panel.position.top,
        left: panel.position.left,
        zIndex: 99999,
      }}
      onMouseEnter={panel.onPanelEnter}
      onMouseLeave={panel.onPanelLeave}
    >
      {panel.content}
    </div>
  );
}

export function useSidebarDropdownPanel() {
  const [panel, setPanel] = useState<SidebarDropdownPanelState | null>(null);
  const panelOwnerLabelRef = useRef<string | null>(null);
  const value = React.useMemo(
    () => ({ setPanel, panelOwnerLabelRef }),
    [],
  );
  return { panel, setPanel, contextValue: value };
}
