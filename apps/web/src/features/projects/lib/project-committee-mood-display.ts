import { CloudRain, CloudSun, Sun, type LucideIcon } from 'lucide-react';

export type CommitteeMoodKey = 'GREEN' | 'ORANGE' | 'RED';

export const COMMITTEE_MOOD_DISPLAY: Record<
  CommitteeMoodKey,
  {
    label: string;
    iconWrap: string;
    valueClassName: string;
    Icon: LucideIcon;
  }
> = {
  GREEN: {
    label: 'Ensoleillé',
    iconWrap: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    valueClassName: 'text-emerald-700 dark:text-emerald-400',
    Icon: Sun,
  },
  ORANGE: {
    label: 'Mitigé',
    iconWrap: 'bg-amber-500/15 text-amber-900 dark:text-amber-300',
    valueClassName: 'text-amber-900 dark:text-amber-300',
    Icon: CloudSun,
  },
  RED: {
    label: 'Difficile',
    iconWrap: 'bg-destructive/15 text-destructive',
    valueClassName: 'text-destructive',
    Icon: CloudRain,
  },
};

export function committeeMoodDisplay(mood: CommitteeMoodKey | null | undefined) {
  if (!mood || !(mood in COMMITTEE_MOOD_DISPLAY)) return null;
  return COMMITTEE_MOOD_DISPLAY[mood];
}
