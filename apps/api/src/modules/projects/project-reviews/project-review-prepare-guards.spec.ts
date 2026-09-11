import {
  collectPrepareLockIssues,
  formatDurationOverrunMessage,
  PREPARE_LOCK_MSG,
} from './project-review-prepare-guards';

describe('project-review-prepare-guards (CDC P2 lock)', () => {
  it('émet le message dépassement exact', () => {
    expect(formatDurationOverrunMessage(105, 90)).toBe(
      "1 h 45 d'ordre du jour pour 1 h 30 de séance — 15 min de trop.",
    );
  });

  it('bloque décision sans porteur', () => {
    const issues = collectPrepareLockIssues({
      agendaItems: [
        {
          id: 'a1',
          title: 'Go/No Go recette',
          itemType: 'DECISION',
          plannedDurationMinutes: 10,
          ownerUserId: null,
        },
      ],
      participantCount: 1,
      sessionDurationMinutes: 60,
      attachments: [{ agendaItemId: 'a1' }],
    });
    expect(issues[0]?.message).toBe(
      PREPARE_LOCK_MSG.decisionNoOwner('Go/No Go recette'),
    );
  });

  it('bloque sans participant', () => {
    const issues = collectPrepareLockIssues({
      agendaItems: [
        {
          id: 'a1',
          title: 'Ouverture',
          itemType: 'INFORMATION',
          plannedDurationMinutes: 10,
          ownerUserId: null,
        },
      ],
      participantCount: 0,
      sessionDurationMinutes: 45,
      attachments: [],
    });
    expect(issues.some((i) => i.message === PREPARE_LOCK_MSG.noParticipant)).toBe(
      true,
    );
  });
});
