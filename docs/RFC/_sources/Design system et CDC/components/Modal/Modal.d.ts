import * as React from 'react';

export interface ModalProps {
  /** Whether the modal is visible */
  open?: boolean;
  /** Called when the user clicks the backdrop or the close button */
  onClose?: () => void;
  /** Modal title */
  title?: React.ReactNode;
  /** Small text under the title */
  subtitle?: React.ReactNode;
  /** Icon shown in the gold-tinted circle next to the title */
  icon?: React.ReactNode;
  /** Footer content, typically action buttons, right-aligned */
  footer?: React.ReactNode;
  /** Modal width in px */
  width?: number;
  /** Body content */
  children?: React.ReactNode;
}

/** Starium dialog surface — header (icon + title/subtitle + close), scrollable body, footer actions. */
export function Modal(props: ModalProps): JSX.Element;
