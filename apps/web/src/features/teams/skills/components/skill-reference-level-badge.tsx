import { Badge } from '@/components/ui/badge';
import type { SkillReferenceLevel } from '../types/skill.types';
import { skillReferenceLevelLabel } from '../lib/skill-label-mappers';

type SkillReferenceLevelBadgeProps = {
  level: SkillReferenceLevel;
};

export function SkillReferenceLevelBadge({ level }: SkillReferenceLevelBadgeProps) {
  return (
    <Badge variant="outline" className="font-normal">
      {skillReferenceLevelLabel(level)}
    </Badge>
  );
}
