'use client';

import type { ComponentType, ReactNode } from 'react';
import { LayoutPanelTop } from 'lucide-react';
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
import type { StariumModalAccent } from '@/components/layout/starium-modal-accent';

/** @deprecated Utiliser `StariumModal` ou les primitives `Dialog*` (layout starium par défaut). */
export const STARIUM_MODAL_CONTENT_CLASS = '';
export const FORM_DIALOG_CONTENT_CLASS = '';
export const FORM_DIALOG_HEADER_CLASS = 'starium-modal__header';
export const FORM_DIALOG_BODY_CLASS = 'starium-modal__body';
export const FORM_DIALOG_FOOTER_CLASS = 'starium-modal__footer';
export const FORM_DIALOG_BODY_ENCART_CLASS =
  'rounded-xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-border/40';

export type { StariumModalAccent } from '@/components/layout/starium-modal-accent';

export type StariumModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Sous-titre court (DS Modal `subtitle`). Omis si `headless`. */
  description?: ReactNode;
  /** Icône header ; défaut `LayoutPanelTop` si header standard. */
  icon?: ComponentType<{ className?: string }>;
  /** Teinte header / icône / sections — défaut `gold`. */
  accent?: StariumModalAccent;
  /** Sans header Starium (nav mobile, palette recherche) — `title` reste requis (souvent sr-only). */
  headless?: boolean;
  status?: ReactNode;
  size?: DialogSize;
  showCloseButton?: boolean;
  sidePanel?: boolean;
  chatWidget?: boolean;
  layout?: 'starium' | 'legacy';
  contentClassName?: string;
  overlayClassName?: string;
  bodyClassName?: string;
  id?: string;
  footer?: ReactNode;
  /** Classes additionnelles sur le pied de modale (ex. compact). */
  footerClassName?: string;
  children?: ReactNode;
};

/**
 * Modale Starium complète (icône + titre + sous-titre + corps + pied).
 * Point d'entrée unique pour toutes les modales applicatives.
 */
export function StariumModal({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon = LayoutPanelTop,
  accent = 'gold',
  headless = false,
  status,
  size = 'lg',
  showCloseButton = true,
  sidePanel = false,
  chatWidget = false,
  layout = 'starium',
  contentClassName,
  overlayClassName,
  bodyClassName,
  id,
  footer,
  footerClassName,
  children,
}: StariumModalProps) {
  const withStandardHeader = !headless && !sidePanel && !chatWidget && layout === 'starium';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id={id}
        showCloseButton={showCloseButton}
        hasStariumHeader={withStandardHeader}
        modalAccent={withStandardHeader ? accent : undefined}
        size={size}
        layout={layout}
        sidePanel={sidePanel}
        chatWidget={chatWidget}
        overlayClassName={overlayClassName}
        className={contentClassName}
      >
        {withStandardHeader ? (
          <DialogHeader>
            <DialogHeaderIcon icon={Icon} />
            <div className="starium-modal__titles">
              <DialogTitle>{title}</DialogTitle>
              {description != null && description !== '' ? (
                <DialogDescription>{description}</DialogDescription>
              ) : null}
            </div>
          </DialogHeader>
        ) : (
          <DialogTitle className={headless ? 'sr-only' : undefined}>{title}</DialogTitle>
        )}

        {status ? (
          <div
            data-slot="dialog-status"
            className="starium-modal__status"
            role="status"
            aria-live="polite"
          >
            {status}
          </div>
        ) : null}

        <DialogBody className={bodyClassName}>{children ?? null}</DialogBody>

        {footer ? <DialogFooter className={footerClassName}>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated Préférer `StariumModal`. */
export const FormDialogShell = StariumModal;
