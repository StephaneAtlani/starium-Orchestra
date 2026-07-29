import { TableToneBadge } from '@/components/portfolio';

export function WorkTeamStatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE';
  return (
    <TableToneBadge tone={isActive ? 'ok' : 'muted'}>
      {isActive ? 'Active' : 'Archivée'}
    </TableToneBadge>
  );
}
