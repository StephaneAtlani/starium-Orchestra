import type { Dispatch, SetStateAction } from 'react';
import type { ShowToastInput, ToastRecord } from './types';
import { NOTIFICATION_DEFAULT_DURATION_MS } from './constants';

type Setter = Dispatch<SetStateAction<ToastRecord[]>>;

let setToasts: Setter | null = null;
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function registerToastSetter(setter: Setter | null) {
  setToasts = setter;
}

function clearDismissTimer(id: string) {
  const t = dismissTimers.get(id);
  if (t) {
    clearTimeout(t);
    dismissTimers.delete(id);
  }
}

export function enqueueToast(input: ShowToastInput): string {
  const id = crypto.randomUUID();
  const duration = input.duration ?? NOTIFICATION_DEFAULT_DURATION_MS;

  setToasts?.((prev) => [
    ...prev,
    {
      id,
      variant: input.variant,
      title: input.title,
      description: input.description,
    },
  ]);

  const tid = setTimeout(() => {
    dismissTimers.delete(id);
    requestCloseAnimated(id);
  }, duration);
  dismissTimers.set(id, tid);

  return id;
}

/** Lance l’animation de sortie puis retire la carte. */
export function requestCloseAnimated(id: string) {
  clearDismissTimer(id);
  setToasts?.((prev) =>
    prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
  );
  window.setTimeout(() => {
    removeToastNow(id);
  }, 280);
}

function removeToastNow(id: string) {
  clearDismissTimer(id);
  setToasts?.((prev) => prev.filter((t) => t.id !== id));
}
