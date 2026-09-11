export type ToastVariant = 'success' | 'error' | 'warning' | 'default';

export type ToastAction = {
  label: string;
  onClick: () => void;
  /** Style secondaire / danger pour « Annuler la création ». */
  tone?: 'default' | 'danger';
};

export type ToastRecord = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  actions?: ToastAction[];
  /** Fermeture animée en cours */
  leaving?: boolean;
};

export type ShowToastInput = {
  variant: ToastVariant;
  title: string;
  description?: string;
  /** ms — défaut : `NOTIFICATION_DEFAULT_DURATION_MS` */
  duration?: number;
  actions?: ToastAction[];
};
