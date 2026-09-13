import {
  buildProjectReviewInvitationEmailHtml,
  buildProjectReviewInvitationEmailText,
} from './project-review-invitation-email.builder';

describe('project-review-invitation-email.builder', () => {
  it('produit une carte branded avec ODJ, PJ et RSVP', () => {
    const html = buildProjectReviewInvitationEmailHtml({
      kickLabel: 'Revue jalon · convocation',
      meetingTitle: 'Go-live — Projet X',
      whenLine: 'mardi 22 septembre 2026 à 10:00 · 60 min',
      message: 'Bonjour,\n\nVous êtes convié.',
      agendaItems: [{ title: 'Décision', durationMinutes: 20 }],
      attachments: [{ filename: 'invitation-revue-jalon.ics', hint: 'Invitation calendrier' }],
      includeRsvp: true,
      actionUrl: 'http://localhost:3002/projects/p1?openReview=r1',
      meetingJoinUrl: 'https://teams.example/join',
    });
    expect(html).toContain('Revue jalon · convocation');
    expect(html).toContain('Go-live — Projet X');
    expect(html).toContain('Ordre du jour');
    expect(html).toContain('Décision');
    expect(html).toContain('invitation-revue-jalon.ics');
    expect(html).toContain('Je serai présent');
    expect(html).toContain('Je décline');
    expect(html).toContain('Rejoindre la réunion');
    expect(html).toContain('Ouvrir dans Starium');
  });

  it('texte brut contient message et liens', () => {
    const text = buildProjectReviewInvitationEmailText({
      meetingTitle: 'Titre',
      whenLine: 'quand',
      message: 'Corps',
      actionUrl: 'http://app/x',
      meetingJoinUrl: 'http://meet',
    });
    expect(text).toContain('Corps');
    expect(text).toContain('http://app/x');
    expect(text).toContain('http://meet');
  });
});
