'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/teams/structure/teams', label: 'Équipes organisationnelles' },
  { href: '/teams/structure/manager-scopes', label: 'Périmètres managers' },
] as const;

export function StructureSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Structure">
      {links.map((l) => {
        const isActive =
          l.href === '/teams/structure/teams'
            ? pathname === '/teams/structure/teams' ||
              pathname.startsWith('/teams/structure/teams/')
            : pathname.startsWith(l.href);

        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/15 text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
