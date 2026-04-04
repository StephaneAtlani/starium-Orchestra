export type ToastVariant = 'success' | 'error' | 'warning' | 'default';

export type ToastRecord = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  /** Fermeture animée en cours */
  leaving?: boolean;
};

export type ShowToastInput = {
  variant: ToastVariant;
  title: string;
  description?: string;
  /** ms — défaut : `NOTIFICATION_DEFAULT_DURATION_MS` */
  duration?: number;
};
