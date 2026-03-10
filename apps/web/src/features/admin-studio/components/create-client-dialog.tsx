'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Créer un client</Button>} />
      <DialogContent showCloseButton className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Créer un client</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
          <DialogFooter showCloseButton={false}>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
