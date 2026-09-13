import {
  buildProjectReviewInvitationIcs,
  escapeIcsText,
  formatIcsUtc,
  resolveInvitationDurationMinutes,
} from './project-review-invitation-ics';

describe('project-review-invitation-ics', () => {
  it('formatIcsUtc product YYYYMMDDTHHMMSSZ', () => {
    expect(formatIcsUtc(new Date('2025-06-01T10:30:00.000Z'))).toBe(
      '20250601T103000Z',
    );
  });

  it('escapeIcsText échappe ; , \\ et sauts de ligne', () => {
    expect(escapeIcsText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');
  });

  it('buildProjectReviewInvitationIcs produit un VEVENT REQUEST', () => {
    const ics = buildProjectReviewInvitationIcs({
      reviewId: 'rev-1',
      summary: 'COPIL — Projet X',
      description: 'Ligne 1\nLigne 2',
      location: 'Salle A',
      meetingUrl: 'https://teams.example/join',
      startsAt: new Date('2025-06-01T10:00:00.000Z'),
      durationMinutes: 90,
      organizerEmail: 'orga@example.com',
      organizerName: 'Alice',
    });
    expect(ics).toContain('METHOD:REQUEST');
    expect(ics).toContain('SUMMARY:COPIL — Projet X');
    expect(ics).toContain('DTSTART:20250601T100000Z');
    expect(ics).toContain('DTEND:20250601T113000Z');
    expect(ics).toContain('LOCATION:Salle A');
    expect(ics).toContain('URL:https://teams.example/join');
    expect(ics).toContain('ORGANIZER;CN=Alice:mailto:orga@example.com');
  });

  it('resolveInvitationDurationMinutes priorise durée revue puis ODJ', () => {
    expect(
      resolveInvitationDurationMinutes({ durationMinutes: 30, agendaItems: [] }),
    ).toBe(30);
    expect(
      resolveInvitationDurationMinutes({
        durationMinutes: null,
        agendaItems: [
          { plannedDurationMinutes: 20 },
          { plannedDurationMinutes: 25 },
        ],
      }),
    ).toBe(45);
    expect(resolveInvitationDurationMinutes({})).toBe(60);
  });
});
