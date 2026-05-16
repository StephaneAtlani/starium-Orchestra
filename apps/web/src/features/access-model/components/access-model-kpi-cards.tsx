'use client';

import type { ReactNode } from 'react';
import { Building2, Share2, ShieldAlert, UserX } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import type { AccessModelHealth, AccessModelIssueCategory } from '../api/access-model.api';

export function AccessModelKpiCards({
  health,
  activeCategory,
  onCategoryChange,
}: {
  health: AccessModelHealth;
  activeCategory: AccessModelIssueCategory;
  onCategoryChange: (c: AccessModelIssueCategory) => void;
}) {
  const { kpis } = health;
  const cards: {
    category: AccessModelIssueCategory;
    title: string;
    value: number;
    subtitle: string;
    icon: ReactNode;
  }[] = [
    {
      category: 'missing_owner',
      title: 'Sans Direction',
      value: kpis.resourcesMissingOwner.total,
      subtitle: 'Ressources sans unité propriétaire effective',
      icon: <Building2 />,
    },
    {
      category: 'missing_human',
      title: 'Sans ressource HUMAN',
      value: kpis.membersMissingHumanWithScopedPerms.total,
      subtitle: 'Membres avec droits scopés sans fiche personne',
      icon: <UserX />,
    },
    {
      category: 'atypical_acl',
      title: 'ACL atypiques',
      value: kpis.atypicalAclShares.total,
      subtitle: 'Partages WRITE/ADMIN hors sous-arbre propriétaire',
      icon: <Share2 />,
    },
    {
      category: 'policy_review',
      title: 'Politiques à revoir',
      value: kpis.policyReviewHints.total,
      subtitle: 'RESTRICTIVE/SHARING sans ACL explicite',
      icon: <ShieldAlert />,
    },
  ];

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <button
          key={c.category}
          type="button"
          onClick={() => onCategoryChange(c.category)}
          className={`text-left transition-opacity ${
            activeCategory === c.category ? 'ring-2 ring-primary rounded-lg' : ''
          }`}
        >
          <KpiCard
            title={c.title}
            value={String(c.value)}
            subtitle={c.subtitle}
            icon={c.icon}
            variant="dense"
          />
        </button>
      ))}
    </div>
  );
}
