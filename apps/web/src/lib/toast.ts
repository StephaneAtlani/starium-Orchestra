import { enqueueToast } from '@/components/notifications/bridge';
import type { ShowToastInput } from '@/components/notifications/types';

export { NOTIFICATION_DEFAULT_DURATION_MS } from '../components/notifications/constants';

type ToastOptions = Pick<ShowToastInput, 'description' | 'duration' | 'actions'>;

function show(variant: ShowToastInput['variant'], title: string, options?: ToastOptions) {
  enqueueToast({
    variant,
    title,
    description: options?.description,
    duration: options?.duration,
    actions: options?.actions,
  });
}

type ToastCallable = (title: string, options?: ToastOptions) => void;

type ToastModule = ToastCallable & {
  success: (title: string, options?: ToastOptions) => void;
  error: (title: string, options?: ToastOptions) => void;
  warning: (title: string, options?: ToastOptions) => void;
  message: (title: string, options?: ToastOptions) => void;
};

/**
 * Notifications non bloquantes (pile en haut à droite, durée + animations CSS).
 * @example toast.success('Enregistré'); toast.error('Échec', { description: detail, duration: 6000 });
 * @example toast.success('Créé.', { duration: 6000, actions: [{ label: 'Préparer', onClick }] });
 */
export const toast: ToastModule = Object.assign(
  ((title: string, options?: ToastOptions) => show('default', title, options)) as ToastCallable,
  {
    success: (title: string, options?: ToastOptions) => show('success', title, options),
    error: (title: string, options?: ToastOptions) => show('error', title, options),
    warning: (title: string, options?: ToastOptions) => show('warning', title, options),
    message: (title: string, options?: ToastOptions) => show('default', title, options),
  },
);
