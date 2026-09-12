import * as React from 'react';

export interface ButtonProps {
  /** Button label / content */
  children?: React.ReactNode;
  /** Visual style */
  variant?: 'primary' | 'secondary' | 'modifier' | 'ghost' | 'danger';
  /** Control size */
  size?: 'sm' | 'md' | 'lg';
  /** Optional leading icon node */
  iconLeft?: React.ReactNode;
  /** Optional trailing icon node */
  iconRight?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/** Starium primary action control. */
export function Button(props: ButtonProps): JSX.Element;
