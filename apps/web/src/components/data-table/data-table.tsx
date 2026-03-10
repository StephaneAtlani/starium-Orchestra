'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
};

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  error?: Error | null;
  getRowId: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  error = null,
  getRowId,
  emptyTitle,
  emptyDescription,
  onRetry,
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState rows={6} className="py-3" />;
  }

  if (error) {
    return (
      <ErrorState
        message={error.message}
        onRetry={onRetry}
        className="my-4"
      />
    );
  }

  if (!data.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className="py-12"
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={getRowId(row)}>
            {columns.map((col) => (
              <TableCell key={col.key} className={col.className}>
                {col.cell
                  ? col.cell(row)
                  : String((row as Record<string, unknown>)[col.key] ?? '—')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
