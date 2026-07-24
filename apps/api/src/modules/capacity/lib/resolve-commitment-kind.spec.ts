import {
  ActionPlanStatus,
  CapacityAllocationSourceType,
  ProjectRiskStatus,
  ProjectStatus,
} from '@prisma/client';
import { resolveCommitmentKind } from './resolve-commitment-kind';

describe('resolveCommitmentKind exhaustive', () => {
  it.each(Object.values(ProjectStatus))(
    'ProjectStatus.%s',
    (status) => {
      const kind = resolveCommitmentKind(
        CapacityAllocationSourceType.PROJECT,
        status,
      );
      expect(['FORECAST', 'COMMITTED', 'EXCLUDED']).toContain(kind);
    },
  );

  it.each(Object.values(ProjectRiskStatus))(
    'ProjectRiskStatus.%s',
    (status) => {
      const kind = resolveCommitmentKind(
        CapacityAllocationSourceType.PROJECT_RISK,
        status,
      );
      expect(['FORECAST', 'COMMITTED', 'EXCLUDED']).toContain(kind);
    },
  );

  it.each(Object.values(ActionPlanStatus))(
    'ActionPlanStatus.%s',
    (status) => {
      const kind = resolveCommitmentKind(
        CapacityAllocationSourceType.ACTION_PLAN,
        status,
      );
      expect(['FORECAST', 'COMMITTED', 'EXCLUDED']).toContain(kind);
    },
  );

  it('MANUAL → FORECAST', () => {
    expect(
      resolveCommitmentKind(CapacityAllocationSourceType.MANUAL, null),
    ).toBe('FORECAST');
  });
});
