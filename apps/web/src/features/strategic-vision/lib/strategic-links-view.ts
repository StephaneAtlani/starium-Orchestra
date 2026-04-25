import type { StrategicObjectiveDto } from '../types/strategic-vision.types';

export type StrategicProjectLinkRow = {
  id: string;
  objectiveTitle: string;
  targetLabelSnapshot: string;
};

export function buildStrategicProjectLinkRows(
  objectives: StrategicObjectiveDto[],
): StrategicProjectLinkRow[] {
  return objectives.flatMap((objective) =>
    objective.links
      .filter((link) => link.linkType === 'PROJECT')
      .map((link) => ({
        id: link.id,
        objectiveTitle: objective.title,
        targetLabelSnapshot: link.targetLabelSnapshot,
      })),
  );
}
