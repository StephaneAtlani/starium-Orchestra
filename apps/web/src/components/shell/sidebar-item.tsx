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
    (href !== '/' && pathname != null && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-row items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-11 starium-sidebar-item',
        'md:min-h-0 md:gap-2 md:px-2.5 md:py-2 md:text-xs',
        isActive && 'starium-sidebar-item-active',
      )}
    >
      {Icon && (
        <Icon className="h-4 w-4 shrink-0 opacity-90 text-inherit md:h-3.5 md:w-3.5" />
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}

