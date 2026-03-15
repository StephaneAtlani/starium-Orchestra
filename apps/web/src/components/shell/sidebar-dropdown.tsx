'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useRef, useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavigationItem } from '../../config/navigation';

interface SidebarDropdownProps {
  label: string;
  icon?: LucideIcon;
  children: NavigationItem[];
}

export function SidebarDropdown({ label, icon: Icon, children }: SidebarDropdownProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const hasActiveChild = children.some(
    (c) => c.href && (pathname === c.href || (pathname?.startsWith(c.href) && c.href !== '/')),
  );

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'group flex w-full flex-col items-center gap-1 rounded-lg px-2.5 py-2 text-[0.72rem] font-medium transition-colors',
          'text-sidebar-foreground/80 hover:bg-sidebar-accent',
          (open || hasActiveChild) && 'bg-sidebar-accent text-sidebar-primary',
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {Icon && (
          <Icon className="h-4 w-4 shrink-0 text-sidebar-foreground" />
        )}
        <span className="truncate text-[0.7rem] leading-tight text-sidebar-foreground/80">
          {label}
        </span>
        <ChevronRight
          className={cn(
            'h-3 w-3 shrink-0 text-sidebar-foreground/60 transition-transform',
            open && 'rotate-90',
          )}
        />
      </button>
      {open && (
        <div
          ref={panelRef}
          className="absolute left-full top-0 z-50 ml-1 min-w-[10rem] rounded-md border border-sidebar-border bg-sidebar py-1 shadow-lg"
          role="menu"
        >
          {children.map((child) => {
            if (!child.href) return null;
            const isActive =
              pathname === child.href ||
              (pathname?.startsWith(child.href + '/') &&
                !children.some(
                  (c) => c !== child && c.href && pathname?.startsWith(c.href),
                ));
            return (
              <Link
                key={child.href}
                href={child.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  'block px-3 py-2 text-sm text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  isActive && 'bg-sidebar-accent font-medium text-sidebar-primary',
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
