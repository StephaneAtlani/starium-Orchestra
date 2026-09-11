import { describe, expect, it } from 'vitest';
import {
  canFreezePrepare,
  collectPrepareLockIssues,
  formatDurationMinutesFr,
  formatDurationOverrunMessage,
  PREPARE_LOCK_MSG,
  sumAgendaPlannedMinutes,
} from './project-review-prepare-guards';

describe('project-review-prepare-guards (CDC P2)', () => {
  it('formate les durées FR', () => {
    expect(formatDurationMinutesFr(15)).toBe('15 min');
    expect(formatDurationMinutesFr(60)).toBe('1 h');
    expect(formatDurationMinutesFr(105)).toBe('1 h 45');
  });

  it('message dépassement CDC', () => {
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
      participantCount: 2,
      sessionDurationMinutes: 60,
      attachments: [{ agendaItemId: 'a1' }],
    });
    expect(issues.some((i) => i.message.includes('portez') || i.message.includes('porteur'))).toBe(
      true,
    );
    expect(issues[0]?.message).toBe(
      PREPARE_LOCK_MSG.decisionNoOwner('Go/No Go recette'),
    );
    expect(canFreezePrepare({
      agendaItems: [
        {
          id: 'a1',
          title: 'Go/No Go recette',
          itemType: 'DECISION',
          plannedDurationMinutes: 10,
          ownerUserId: null,
        },
      ],
      participantCount: 2,
      sessionDurationMinutes: 60,
      attachments: [{ agendaItemId: 'a1' }],
    })).toBe(false);
  });

  it('bloque sans participant et ligne vide', () => {
    const issues = collectPrepareLockIssues({
      agendaItems: [
        {
          id: 'a1',
          title: '   ',
          itemType: 'INFORMATION',
          plannedDurationMinutes: 5,
          ownerUserId: null,
        },
      ],
      participantCount: 0,
      sessionDurationMinutes: 45,
      attachments: [],
    });
    expect(issues.map((i) => i.message)).toContain(PREPARE_LOCK_MSG.emptyTitle);
    expect(issues.map((i) => i.message)).toContain(PREPARE_LOCK_MSG.noParticipant);
  });

  it('autorise un ODJ valide', () => {
    const input = {
      agendaItems: [
        {
          id: 'a1',
          title: 'Ouverture',
          itemType: 'INFORMATION',
          plannedDurationMinutes: 10,
          ownerUserId: null,
        },
        {
          id: 'a2',
          title: 'Arbitrage budget',
          itemType: 'ARBITRATION',
          plannedDurationMinutes: 20,
          ownerUserId: 'u1',
        },
      ],
      participantCount: 3,
      sessionDurationMinutes: 45,
      attachments: [{ agendaItemId: 'a2' }],
    };
    expect(sumAgendaPlannedMinutes(input.agendaItems)).toBe(30);
    expect(canFreezePrepare(input)).toBe(true);
  });
});
