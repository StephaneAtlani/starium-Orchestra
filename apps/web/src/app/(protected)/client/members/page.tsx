import { Suspense } from 'react';
import { MembersList } from '@/features/client-rbac/components/members-list';

export default function ClientMembersPage() {
  return (
    <Suspense
      fallback={
        <p className="px-6 py-8 text-sm text-muted-foreground">Chargement…</p>
      }
    >
      <MembersList />
    </Suspense>
  );
}
