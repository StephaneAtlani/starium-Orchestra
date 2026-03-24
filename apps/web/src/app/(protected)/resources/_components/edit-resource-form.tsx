'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  RESOURCE_AFFILIATION_LABEL,
  RESOURCE_TYPE_LABEL,
} from '@/lib/resource-labels';
import { cn } from '@/lib/utils';
import {
  getResource,
  listResourceRoles,
  updateResource,
} from '@/services/resources';
import type { ResourceAffiliation, ResourceType } from '@/services/resources';

const ROLE_NONE = '__none__';

type EditResourceFormProps = {
  resourceId: string;
  formIdPrefix: string;
  onSaved?: () => void;
  /** Ex. modale pleine largeur : `w-full max-w-full`. */
  className?: string;
};

export function EditResourceForm({
  resourceId,
  formIdPrefix,
  onSaved,
  className,
}: EditResourceFormProps) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const pid = (s: string) => `${formIdPrefix}-${s}`;

  const { data: r, isLoading, error, refetch } = useQuery({
    queryKey: ['resource', 'detail', clientId, resourceId],
    queryFn: () => getResource(authFetch, resourceId),
    enabled: !!clientId && !!resourceId,
  });

  const identityFromMember = Boolean(r?.linkedUserId);

  const { data: rolesData } = useQuery({
    queryKey: ['resource-roles', clientId, 'for-edit'],
    queryFn: () => listResourceRoles(authFetch, { limit: 200, offset: 0 }),
    enabled: !!clientId && r?.type === 'HUMAN' && !identityFromMember,
  });

  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState<ResourceAffiliation>('INTERNAL');
  const [companyName, setCompanyName] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [roleId, setRoleId] = useState<string>(ROLE_NONE);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!r) return;
    setName(r.name);
    setFirstName(r.firstName ?? '');
    setEmail(r.email ?? '');
    setAffiliation((r.affiliation as ResourceAffiliation) ?? 'INTERNAL');
    setCompanyName(r.companyName ?? '');
    setDailyRate(r.dailyRate ?? '');
    setRoleId(r.role?.id ?? ROLE_NONE);
  }, [r]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!r) return;
    setSaving(true);
    setFormError(null);
    try {
      if (r.type === 'HUMAN') {
        if (r.linkedUserId) {
          await updateResource(authFetch, resourceId, {
            affiliation,
            companyName:
              affiliation === 'EXTERNAL' ? companyName.trim() || null : null,
            dailyRate: dailyRate.trim() ? Number(dailyRate) : null,
          });
        } else {
          await updateResource(authFetch, resourceId, {
            name: name.trim(),
            firstName: firstName.trim() || null,
            email: email.trim() || null,
            affiliation,
            companyName:
              affiliation === 'EXTERNAL' ? companyName.trim() || null : null,
            dailyRate: dailyRate.trim() ? Number(dailyRate) : null,
            roleId: roleId === ROLE_NONE ? null : roleId,
          });
        }
      } else {
        await updateResource(authFetch, resourceId, {
          name: name.trim(),
        });
      }
      await refetch();
      onSaved?.();
    } catch (err) {
      setFormError((err as Error).message ?? 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <LoadingState rows={4} />;
  }

  if (error || !r) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Ressource introuvable ou erreur de chargement.
      </p>
    );
  }

  const typeLabel = RESOURCE_TYPE_LABEL[r.type as ResourceType];
  const roleItems = rolesData?.items ?? [];

  return (
    <form onSubmit={onSubmit} className={cn('max-w-md space-y-4', className)}>
      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}
      <div className="space-y-2">
        <Label>Type</Label>
        <p className="text-sm text-muted-foreground">{typeLabel}</p>
      </div>

      {r.type === 'HUMAN' && identityFromMember ? (
        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">
            Prénom, nom et email sont ceux du{' '}
            <strong className="text-foreground">membre client</strong> (compte plateforme). Modifiez-les
            depuis la fiche membre.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Prénom</Label>
              <p className="rounded-md border border-border/80 bg-background px-3 py-2 text-sm">
                {firstName || '—'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Nom</Label>
              <p className="rounded-md border border-border/80 bg-background px-3 py-2 text-sm">
                {name}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Email</Label>
            <p className="rounded-md border border-border/80 bg-background px-3 py-2 text-sm">
              {email || '—'}
            </p>
          </div>
          <Link
            href={`/client/members?edit=${r.linkedUserId}`}
            className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Modifier le membre
          </Link>
        </div>
      ) : r.type === 'HUMAN' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={pid('firstName')}>Prénom</Label>
            <Input
              id={pid('firstName')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={pid('name')}>Nom</Label>
            <Input
              id={pid('name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
              autoComplete="family-name"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={pid('name')}>Nom</Label>
          <Input
            id={pid('name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={1}
          />
        </div>
      )}

      {r.type === 'HUMAN' && !identityFromMember && (
        <>
          <div className="space-y-2">
            <Label htmlFor={pid('email')}>Email</Label>
            <Input
              id={pid('email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </>
      )}

      {r.type === 'HUMAN' && (
        <>
          {!identityFromMember ? (
            <div className="space-y-2">
              <Label>Rôle métier</Label>
              <Select value={roleId} onValueChange={(v) => setRoleId(v ?? ROLE_NONE)}>
                <SelectTrigger id={pid('roleId')}>
                  <SelectValue>
                    {roleId === ROLE_NONE
                      ? '— Aucun —'
                      : (roleItems.find((x) => x.id === roleId)?.name ?? '—')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLE_NONE}>— Aucun —</SelectItem>
                  {roleItems.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[8rem]">
              <Label htmlFor={pid('rate')} className="text-xs text-muted-foreground">
                TJ (€)
              </Label>
              <Input
                id={pid('rate')}
                type="number"
                step="0.01"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-36">
              <Label className="text-xs text-muted-foreground">Portée</Label>
              <Select
                value={affiliation}
                onValueChange={(v) => {
                  const next = v as ResourceAffiliation;
                  setAffiliation(next);
                  if (next === 'INTERNAL') setCompanyName('');
                }}
              >
                <SelectTrigger id={pid('affiliation')} className="w-full">
                  <SelectValue>{RESOURCE_AFFILIATION_LABEL[affiliation]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">Interne</SelectItem>
                  <SelectItem value="EXTERNAL">Externe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {affiliation === 'EXTERNAL' && (
            <div className="space-y-2">
              <Label htmlFor={pid('companyName')}>Société</Label>
              <Input
                id={pid('companyName')}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={200}
                autoComplete="organization"
              />
            </div>
          )}
        </>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </form>
  );
}
