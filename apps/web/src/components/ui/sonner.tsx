'use client';

/**
 * Toaster Sonner — aligné shadcn, version minimale (pas d’icônes Lucide custom) pour éviter tout échec de résolution au build.
 * @see https://ui.shadcn.com/docs/components/radix/sonner
 */
import { Toaster as Sonner } from 'sonner';

function Toaster() {
  return (
    <Sonner
      theme="light"
      position="top-right"
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        closeButtonAriaLabel: 'Fermer la notification',
      }}
    />
  );
}

export { Toaster };
