'use client';

import { useState } from 'react';
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
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import {
  RESOURCE_AFFILIATION_LABEL,
  RESOURCE_TYPE_LABEL,
} from '@/lib/resource-labels';
import { createResource } from '@/services/resources';
import type {
  ResourceAffiliation,
  ResourceListItem,
  ResourceType,
} from '@/services/resources';

export type NewResourceFormProps = {
  /** Préfixe pour éviter les doublons d’id (page vs modale). */
  formIdPrefix: string;
  onSuccess: (created: ResourceListItem) => void;
  /** Si défini : pas de sélecteur de type, création forcée (ex. Personne depuis un autre flux). */
  forceType?: ResourceType;
  /** Classes du conteneur formulaire (ex. max-w-md). */
  className?: string;
};

export function NewResourceForm({
  formIdPrefix,
  onSuccess,
  forceType,
  className = 'max-w-md space-y-4',
}: NewResourceFormProps) {
  const authFetch = useAuthenticatedFetch();
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [type, setType] = useState<ResourceType>(forceType ?? 'HUMAN');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState<ResourceAffiliation>('INTERNAL');
  const [companyName, setCompanyName] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pid = (s: string) => `${formIdPrefix}-${s}`;
  const resolvedType = forceType ?? type;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        type: resolvedType,
      };
      if (resolvedType === 'HUMAN') {
        const fn = firstName.trim();
        if (fn) body.firstName = fn;
        if (email.trim()) body.email = email.trim();
        body.affiliation = affiliation;
        if (affiliation === 'EXTERNAL' && companyName.trim()) {
          body.companyName = companyName.trim();
        }
        if (dailyRate.trim()) body.dailyRate = Number(dailyRate);
      }
      const created = await createResource(authFetch, body);
      onSuccess(created);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {!forceType ? (
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
            <SelectTrigger>
              <SelectValue>{RESOURCE_TYPE_LABEL[type]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HUMAN">{RESOURCE_TYPE_LABEL.HUMAN}</SelectItem>
              <SelectItem value="MATERIAL">{RESOURCE_TYPE_LABEL.MATERIAL}</SelectItem>
              <SelectItem value="LICENSE">{RESOURCE_TYPE_LABEL.LICENSE}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {resolvedType === 'HUMAN' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={pid('firstName')}>Prénom</Label>
            <Input
              id={pid('firstName')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="optionnel"
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
      {resolvedType === 'HUMAN' && (
        <>
          <div className="space-y-2">
            <Label htmlFor={pid('email')}>Email</Label>
            <Input
              id={pid('email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="optionnel"
            />
          </div>
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
                placeholder="Employeur ou structure"
                maxLength={200}
                autoComplete="organization"
              />
            </div>
          )}
        </>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Création…' : 'Créer'}
      </Button>
    </form>
  );
}
