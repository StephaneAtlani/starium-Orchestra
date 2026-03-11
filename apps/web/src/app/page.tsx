'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <p className="text-sm text-muted-foreground">Chargement…</p>
    </main>
  );
}
