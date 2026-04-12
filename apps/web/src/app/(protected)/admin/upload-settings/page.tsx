'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { PlatformUploadSettingsForm } from '@/features/platform/components/platform-upload-settings-form';

const FALLBACK_HREF = '/admin/clients';

export default function AdminUploadSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user?.platformRole !== 'PLATFORM_ADMIN') {
      router.replace(FALLBACK_HREF);
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return null;
  }

  if (user?.platformRole !== 'PLATFORM_ADMIN') {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">Redirection…</p>
    );
  }

  return <PlatformUploadSettingsForm />;
}
