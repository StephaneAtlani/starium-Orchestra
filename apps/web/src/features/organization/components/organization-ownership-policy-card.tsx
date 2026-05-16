'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { toast } from '@/lib/toast';
import {
  fetchOwnershipPolicy,
  patchOwnershipPolicy,
  type OrgOwnershipPolicyMode,
} from '../api/organization-ownership.api';

const MODE_LABELS: Record<OrgOwnershipPolicyMode, string> = {
  ADVISORY: 'Conseil (avertissements uniquement)',
  REQUIRED_ON_CREATE: 'Obligatoire à la création',
  REQUIRED_ON_ACTIVATE: 'Obligatoire à l’activation',
};

export function OrganizationOwnershipPolicyCard() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  const policyQuery = useQuery({
    queryKey: ['organization', 'ownership-policy'],
    queryFn: () => fetchOwnershipPolicy(authFetch),
  });

  const patchMutation = useMutation({
    mutationFn: (mode: OrgOwnershipPolicyMode) => patchOwnershipPolicy(authFetch, mode),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organization', 'ownership-policy'] });
      toast.success('Politique ownership mise à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const policy = policyQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Obligation Direction propriétaire</CardTitle>
        <CardDescription>
          Durcissement progressif après backfill ownership (RFC-ORG-004).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select
            value={policy?.mode ?? 'ADVISORY'}
            disabled={policyQuery.isLoading || patchMutation.isPending}
            onValueChange={(v) => patchMutation.mutate(v as OrgOwnershipPolicyMode)}
          >
            <SelectTrigger>
              <SelectValue>
                {policy ? MODE_LABELS[policy.mode] : 'Chargement…'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MODE_LABELS) as OrgOwnershipPolicyMode[]).map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {MODE_LABELS[mode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {policy && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Application effective :</span>
            <Badge variant={policy.enforcementEnabled ? 'default' : 'secondary'}>
              {policy.enforcementEnabled ? 'Activée' : 'Désactivée'}
            </Badge>
            <span className="text-xs">
              (flag ops <code className="text-xs">{policy.flagKey}</code>)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
