'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { resolveWorkspaceBreadcrumb } from '@/lib/navigation/build-workspace-breadcrumb';
import { useWorkspaceBreadcrumbContext } from './workspace-breadcrumb-context';

export function WorkspaceBreadcrumb() {
  const pathname = usePathname() ?? '/';
  const { override } = useWorkspaceBreadcrumbContext();
  const items = resolveWorkspaceBreadcrumb(pathname, override);

  if (!items.length) {
    return (
      <nav aria-label="Fil d’Ariane" className="starium-topbar-breadcrumb">
        <span className="starium-topbar-breadcrumb__current">Accueil</span>
      </nav>
    );
  }

  return (
    <nav aria-label="Fil d’Ariane" className="starium-topbar-breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const key = `${item.label}-${item.href ?? 'current'}-${index}`;

        return (
          <React.Fragment key={key}>
            {index > 0 ? (
              <span className="starium-topbar-breadcrumb__sep" aria-hidden>
                /
              </span>
            ) : null}
            {isLast || !item.href ? (
              <span
                className="starium-topbar-breadcrumb__current"
                title={item.label}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="starium-topbar-breadcrumb__link" title={item.label}>
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
