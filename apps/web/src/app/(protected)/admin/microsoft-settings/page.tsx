'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { PlatformMicrosoftSettingsForm } from '@/features/microsoft-365/components/platform-microsoft-settings-form';

const CLIENT_MICROSOFT_365_HREF = '/client/administration/microsoft-365';

export default function AdminMicrosoftSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user?.platformRole !== 'PLATFORM_ADMIN') {
      router.replace(CLIENT_MICROSOFT_365_HREF);
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return null;
  }

  if (user?.platformRole !== 'PLATFORM_ADMIN') {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        Redirection vers Microsoft 365 (administration client)…
      </p>
    );
  }

  return <PlatformMicrosoftSettingsForm />;
}
