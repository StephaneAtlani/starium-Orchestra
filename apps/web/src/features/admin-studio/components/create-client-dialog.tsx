'use client';

import React, { useState } from 'react';
import { useCreateClientMutation } from '../hooks/use-clients-query';

export function CreateClientDialog() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nom du client"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
          required
        />
        <input
          type="text"
          placeholder="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-56 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Création…' : 'Créer'}
        </button>
      </div>
      {error && <div className="text-sm text-red-400">{error}</div>}
    </form>
  );
}

