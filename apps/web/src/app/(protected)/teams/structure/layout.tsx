import { StructureLayoutClient } from '@/features/teams/work-teams/components/structure-layout-client';

export default function TeamsStructureLayout({ children }: { children: React.ReactNode }) {
  return <StructureLayoutClient>{children}</StructureLayoutClient>;
}
