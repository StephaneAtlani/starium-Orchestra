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
        'group flex flex-row items-center gap-2 rounded-md rounded-r-md px-2.5 py-2 text-xs font-medium transition-colors starium-sidebar-item',
        isActive && 'starium-sidebar-item-active',
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-90 text-inherit" />}
      <span className="truncate">{label}</span>
    </Link>
  );
}

