'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  PROJECT_DATETIME_LOCAL_HOUR_OPTIONS,
  PROJECT_DATETIME_LOCAL_MINUTE_OPTIONS,
  buildProjectDatetimeLocal,
  parseProjectDatetimeLocal,
} from '../lib/project-datetime-local';

type ProjectDatetimeLocalInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export function ProjectDatetimeLocalInput({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  className,
}: ProjectDatetimeLocalInputProps) {
  const parsed = useMemo(() => parseProjectDatetimeLocal(value), [value]);

  const emit = (date: string, hour: string, minute: string) => {
    onChange(buildProjectDatetimeLocal(date, hour, minute));
  };

  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-2', className)}>
      <Input
        id={id}
        type="date"
        className="starium-form-input min-h-11 min-w-0 flex-1"
        value={parsed.date}
        disabled={disabled}
        required={required}
        onChange={(e) => emit(e.target.value, parsed.hour, parsed.minute)}
      />
      <div className="flex shrink-0 items-center gap-1.5">
        <select
          id={`${id}-hour`}
          aria-label="Heure"
          className="starium-form-select min-h-11 w-[4.5rem]"
          value={parsed.hour}
          disabled={disabled || !parsed.date}
          onChange={(e) => emit(parsed.date, e.target.value, parsed.minute)}
        >
          {PROJECT_DATETIME_LOCAL_HOUR_OPTIONS.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground" aria-hidden>
          :
        </span>
        <select
          id={`${id}-minute`}
          aria-label="Minutes"
          className="starium-form-select min-h-11 w-[4.5rem]"
          value={parsed.minute}
          disabled={disabled || !parsed.date}
          onChange={(e) => emit(parsed.date, parsed.hour, e.target.value)}
        >
          {PROJECT_DATETIME_LOCAL_MINUTE_OPTIONS.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
