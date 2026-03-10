"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface SidebarItemProps {
  label: string;
  href: string;
}

export function SidebarItem({ label, href }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href ||
    (href !== '/' && pathname?.startsWith(href) && !pathname?.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className="flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-hover)] hover:text-white"
      style={
        isActive
          ? {
              background: 'var(--color-hover)',
              color: 'var(--color-primary)',
            }
          : {
              color: 'rgba(255,255,255,0.8)',
            }
      }
    >
      <span className="truncate">{label}</span>
    </Link>
  );
}

