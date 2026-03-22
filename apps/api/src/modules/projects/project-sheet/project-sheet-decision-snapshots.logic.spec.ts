import { ProjectArbitrationLevelStatus } from '@prisma/client';
import { detectArbitrationTransitionsForSnapshot } from './project-sheet-decision-snapshots.logic';

describe('detectArbitrationTransitionsForSnapshot', () => {
  it('retourne METIER quand métier passe à VALIDE', () => {
    expect(
      detectArbitrationTransitionsForSnapshot(
        {
          arbitrationMetierStatus: ProjectArbitrationLevelStatus.EN_COURS,
          arbitrationComiteStatus: null,
          arbitrationCodirStatus: null,
        },
        {
          arbitrationMetierStatus: ProjectArbitrationLevelStatus.VALIDE,
          arbitrationComiteStatus: null,
          arbitrationCodirStatus: null,
        },
      ),
    ).toEqual(['METIER']);
  });

  it('retourne METIER quand métier passe à REFUSE', () => {
    expect(
      detectArbitrationTransitionsForSnapshot(
        {
          arbitrationMetierStatus: ProjectArbitrationLevelStatus.EN_COURS,
          arbitrationComiteStatus: null,
          arbitrationCodirStatus: null,
        },
        {
          arbitrationMetierStatus: ProjectArbitrationLevelStatus.REFUSE,
          arbitrationComiteStatus: null,
          arbitrationCodirStatus: null,
        },
      ),
    ).toEqual(['METIER']);
  });

  it('ne retourne rien si déjà VALIDE', () => {
    expect(
      detectArbitrationTransitionsForSnapshot(
        {
          arbitrationMetierStatus: ProjectArbitrationLevelStatus.VALIDE,
          arbitrationComiteStatus: null,
          arbitrationCodirStatus: null,
        },
        {
          arbitrationMetierStatus: ProjectArbitrationLevelStatus.VALIDE,
          arbitrationComiteStatus: null,
          arbitrationCodirStatus: null,
        },
      ),
    ).toEqual([]);
  });

  it('ne retourne rien si déjà REFUSE', () => {
    expect(
      detectArbitrationTransitionsForSnapshot(
        {
          arbitrationMetierStatus: ProjectArbitrationLevelStatus.REFUSE,
          arbitrationComiteStatus: null,
          arbitrationCodirStatus: null,
        },
        {
          arbitrationMetierStatus: ProjectArbitrationLevelStatus.REFUSE,
          arbitrationComiteStatus: null,
          arbitrationCodirStatus: null,
        },
      ),
    ).toEqual([]);
  });

  it('retourne METIER, COMITE, CODIR si les trois passent à VALIDE dans le même état', () => {
    expect(
      detectArbitrationTransitionsForSnapshot(
        {
          arbitrationMetierStatus: ProjectArbitrationLevelStatus.EN_COURS,
          arbitrationComiteStatus: ProjectArbitrationLevelStatus.EN_COURS,
          arbitrationCodirStatus: ProjectArbitrationLevelStatus.EN_COURS,
        },
        {
          arbitrationMetierStatus: ProjectArbitrationLevelStatus.VALIDE,
          arbitrationComiteStatus: ProjectArbitrationLevelStatus.VALIDE,
          arbitrationCodirStatus: ProjectArbitrationLevelStatus.VALIDE,
        },
      ),
    ).toEqual(['METIER', 'COMITE', 'CODIR']);
  });
});
