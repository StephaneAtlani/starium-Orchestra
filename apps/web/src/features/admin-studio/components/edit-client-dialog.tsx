'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminClientSummary } from '../types/admin-studio.types';
import { useUpdateClientMutation } from '../hooks/use-clients-query';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function EditClientDialog({ client }: { client: AdminClientSummary }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(client.name);
  const [slug, setSlug] = useState(client.slug);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useUpdateClientMutation();

  const defaultSlug = useMemo(() => slugify(name), [name]);

  useEffect(() => {
    if (!open) return;
    // reset quand on ouvre, pour refléter l’état actuel du client
    setName(client.name);
    setSlug(client.slug);
    setError(null);
  }, [open, client.id, client.name, client.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const finalSlug = slug || defaultSlug;
      await mutateAsync({
        clientId: client.id,
        payload: { name, slug: finalSlug },
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Modifier
          </Button>
        }
      />
      <DialogContent showCloseButton className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
            <DialogDescription>
              Met à jour le nom et le slug utilisés dans l’interface et les URLs.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor={`edit-client-name-${client.id}`}>Nom</Label>
              <Input
                id={`edit-client-name-${client.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`edit-client-slug-${client.id}`}>Slug</Label>
              <Input
                id={`edit-client-slug-${client.id}`}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={defaultSlug}
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour utiliser automatiquement :{' '}
                <span className="font-medium">{defaultSlug || '—'}</span>
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

