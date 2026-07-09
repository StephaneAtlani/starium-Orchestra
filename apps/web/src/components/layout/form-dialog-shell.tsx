'use client';

import type { ComponentType, ReactNode } from 'react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogHeaderIcon,
  DialogTitle,
  type DialogSize,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** @deprecated Utiliser `StariumModal` ou les primitives `Dialog*` (layout starium par défaut). */
export const STARIUM_MODAL_CONTENT_CLASS = '';
export const FORM_DIALOG_CONTENT_CLASS = '';
export const FORM_DIALOG_HEADER_CLASS = 'starium-modal__header';
export const FORM_DIALOG_BODY_CLASS = 'starium-modal__body';
export const FORM_DIALOG_FOOTER_CLASS = 'starium-modal__footer';
export const FORM_DIALOG_BODY_ENCART_CLASS =
  'rounded-xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-border/40';

export type StariumModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Sous-titre court (DS Modal `subtitle`) */
  description: string;
  icon: ComponentType<{ className?: string }>;
  status?: ReactNode;
  size?: DialogSize;
  contentClassName?: string;
  bodyClassName?: string;
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Modale Starium complète (icône + titre + sous-titre + corps + pied).
 * S’appuie sur `Dialog*` dont le layout Starium est le défaut.
 */
export function StariumModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  status,
  size = 'lg',
  contentClassName,
  bodyClassName,
  footer,
  children,
}: StariumModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton size={size} className={contentClassName}>
        <DialogHeader>
          <DialogHeaderIcon icon={icon} />
          <div className="starium-modal__titles">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
            {status ? (
              <div
                className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                {status}
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <DialogBody className={bodyClassName}>{children}</DialogBody>

        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Préférer `StariumModal`. */
export const FormDialogShell = StariumModal;
