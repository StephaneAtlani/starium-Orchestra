import React from 'react';

import { cn } from '@/lib/utils';

export type FilterBarFieldA11yProps = {
  controlId: string;
  labelId: string;
  descriptionId?: string;
};

export type FilterBarFieldProps = {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children:
    | React.ReactNode
    | ((props: FilterBarFieldA11yProps) => React.ReactNode);
};

export function FilterBarField({
  id,
  label,
  description,
  className,
  children,
}: FilterBarFieldProps) {
  const controlId = id;
  const labelId = `${id}-label`;
  const descriptionId = description ? `${id}-description` : undefined;

  const a11yProps: FilterBarFieldA11yProps = {
    controlId,
    labelId,
    descriptionId,
  };

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <label
        id={labelId}
        htmlFor={controlId}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>

      {description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}

      <div className="w-full min-w-0">
        {typeof children === 'function' ? children(a11yProps) : children}
      </div>
    </div>
  );
}
