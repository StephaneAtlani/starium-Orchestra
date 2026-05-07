'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CockpitMember } from '../api/licenses-cockpit';
import {
  formatLicenseBadge,
  getBillingModeShortLabel,
  getLicenseDisplayLabel,
  getLicenseExpirationStatus,
  isModeWithExpiration,
} from '../lib/license-status';

function memberLabel(m: CockpitMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return name || m.email;
}

export interface CockpitQuickAction {
  /** Libellé affiché — métier, jamais un identifiant. */
  label: string;
  /** Variante visuelle ; les boutons sont désactivés si `disabled`. */
  variant?: 'default' | 'outline' | 'destructive';
  /** Décide si la quick-action est applicable au membre courant. */
  isAvailable: (member: CockpitMember) => boolean;
  /** Callback action. */
  onRun: (member: CockpitMember) => void;
}

interface Props {
  members: CockpitMember[];
  /** Liste partagée d'actions selon contexte (client / plateforme). */
  quickActions?: CockpitQuickAction[];
  /** Désactive globalement les actions (état pending mutation, par ex.). */
  actionsBusy?: boolean;
  /** Si false, masque entièrement la colonne actions (UI sans capacité). */
  showActions?: boolean;
}

function expirationBadgeProps(member: CockpitMember): {
  variant: 'destructive' | 'outline';
  className?: string;
  label: string;
} | null {
  if (!isModeWithExpiration(member.licenseBillingMode)) return null;
  const s = getLicenseExpirationStatus(
    member.licenseEndsAt,
    member.licenseBillingMode,
  );
  if (s.kind === 'expired') {
    return { variant: 'destructive', label: s.humanLabel };
  }
  if (s.kind === 'soon') {
    return {
      variant: 'outline',
      className:
        'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300',
      label: s.humanLabel,
    };
  }
  if (s.kind === 'active') {
    return { variant: 'outline', label: s.humanLabel };
  }
  return null;
}

export function LicenseCockpitTable({
  members,
  quickActions = [],
  actionsBusy = false,
  showActions = true,
}: Props) {
  if (members.length === 0) {
    return (
      <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
        Aucun membre ne correspond aux filtres.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Utilisateur</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Licence</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Expiration</TableHead>
          {showActions && (
            <TableHead className="text-right">Actions</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((m) => {
          const exp = expirationBadgeProps(m);
          return (
            <TableRow key={m.id}>
              <TableCell className="font-medium">{memberLabel(m)}</TableCell>
              <TableCell className="text-muted-foreground">{m.email}</TableCell>
              <TableCell>
                {getLicenseDisplayLabel(m.licenseType, m.licenseBillingMode)}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {m.licenseType === 'READ_ONLY'
                    ? 'Lecture seule'
                    : getBillingModeShortLabel(m.licenseBillingMode)}
                </Badge>
              </TableCell>
              <TableCell>
                {exp ? (
                  <Badge variant={exp.variant} className={exp.className}>
                    {exp.label}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    {quickActions.map((qa) =>
                      qa.isAvailable(m) ? (
                        <Button
                          key={qa.label}
                          size="sm"
                          variant={qa.variant ?? 'outline'}
                          disabled={actionsBusy}
                          onClick={() => qa.onRun(m)}
                          aria-label={`${qa.label} pour ${memberLabel(m)}`}
                          title={formatLicenseBadge(m)}
                        >
                          {qa.label}
                        </Button>
                      ) : null,
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
