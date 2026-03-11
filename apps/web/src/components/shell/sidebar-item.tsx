"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItemProps {
  label: string;
  href: string;
  icon?: LucideIcon;
}

export function SidebarItem({ label, href, icon: Icon }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href ||
    (href !== '/' && pathname?.startsWith(href) && !pathname?.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col items-center gap-1 rounded-lg px-2.5 py-2 text-[0.72rem] font-medium transition-colors',
        'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        isActive && 'bg-sidebar-accent text-sidebar-primary',
      )}
    >
      {Icon && (
        <Icon className="h-4 w-4 shrink-0 opacity-80 group-hover:opacity-100" />
      )}
      <span className="truncate text-[0.7rem] leading-tight text-sidebar-foreground/80">
        {label}
      </span>
    </Link>
  );
}

