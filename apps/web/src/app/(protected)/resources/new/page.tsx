'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
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
import type { ResourceAffiliation, ResourceType } from '@/services/resources';

export default function NewResourcePage() {
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [type, setType] = useState<ResourceType>('HUMAN');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState<ResourceAffiliation>('INTERNAL');
  const [companyName, setCompanyName] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        type,
      };
      if (type === 'HUMAN') {
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
      router.push(`/resources/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader title="Nouvelle ressource" description="Création dans le client actif." />
        <form onSubmit={onSubmit} className="max-w-md space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
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
          {type === 'HUMAN' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="optionnel"
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
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
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={1}
              />
            </div>
          )}
          {type === 'HUMAN' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="optionnel"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[8rem]">
                  <Label htmlFor="rate" className="text-xs text-muted-foreground">
                    TJ (€)
                  </Label>
                  <Input
                    id="rate"
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
                    <SelectTrigger id="affiliation" className="w-full">
                      <SelectValue>
                        {RESOURCE_AFFILIATION_LABEL[affiliation]}
                      </SelectValue>
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
                  <Label htmlFor="companyName">Société</Label>
                  <Input
                    id="companyName"
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
      </PageContainer>
    </RequireActiveClient>
  );
}
