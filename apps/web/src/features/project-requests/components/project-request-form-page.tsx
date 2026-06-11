'use client';

import { useRouter } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { CreateProjectRequestDialog } from './create-project-request-dialog';

/** Route legacy `/projects/requests/new` — ouvre la modale puis renvoie vers la liste à la fermeture. */
export function ProjectRequestFormPage() {
  const router = useRouter();

  return (
    <RequireActiveClient>
      <CreateProjectRequestDialog
        open
        navigateToDetailOnSuccess
        onOpenChange={(open) => {
          if (!open) router.replace('/projects/requests');
        }}
      />
    </RequireActiveClient>
  );
}
