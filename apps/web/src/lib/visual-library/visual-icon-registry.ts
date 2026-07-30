import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  Cloud,
  Database,
  FolderKanban,
  GitBranch,
  KeyRound,
  Layers,
  Megaphone,
  Monitor,
  Network,
  Server,
  Shield,
  Smartphone,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react';
import type { EntityVisual, VisualIconKey } from '@starium-orchestra/types';

export const VISUAL_ICON_REGISTRY: Record<VisualIconKey, LucideIcon> = {
  activity: Activity,
  briefcase: BriefcaseBusiness,
  building: Building2,
  cloud: Cloud,
  database: Database,
  folder: FolderKanban,
  gitBranch: GitBranch,
  key: KeyRound,
  layers: Layers,
  megaphone: Megaphone,
  monitor: Monitor,
  network: Network,
  server: Server,
  shield: Shield,
  smartphone: Smartphone,
  users: Users,
  wallet: Wallet,
  workflow: Workflow,
};

export function iconForVisual(visual: EntityVisual | null | undefined): LucideIcon {
  if (visual?.iconKey && VISUAL_ICON_REGISTRY[visual.iconKey]) {
    return VISUAL_ICON_REGISTRY[visual.iconKey];
  }
  return FolderKanban;
}
