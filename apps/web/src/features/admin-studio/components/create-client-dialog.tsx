'use client';

import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateClientMutation } from '../hooks/use-clients-query';

export function CreateClientDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync, isPending } = useCreateClientMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const finalSlug =
        slug ||
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      await mutateAsync({ name, slug: finalSlug });
      setName('');
      setSlug('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Créer un client</Button>
      <StariumModal
        open={open}
        onOpenChange={setOpen}
        title="Créer un client"
        icon={Building2}
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              form="create-client-form"
              className="min-h-11 sm:min-h-9"
              disabled={isPending}
            >
              {isPending ? 'Création…' : 'Créer'}
            </Button>
          </>
        }
      >
        <form id="create-client-form" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="client-name">Nom du client</Label>
              <Input
                id="client-name"
                placeholder="Nom du client"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-slug">Slug (optionnel)</Label>
              <Input
                id="client-slug"
                placeholder="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        </form>
      </StariumModal>
    </>
  );
}
