import { MeetingStatus } from '@prisma/client';
import {
  canProduceMeetingReport,
  canTransition,
  isMeetingEditable,
  isMeetingInConduct,
  meetingDeckSource,
  targetStatus,
} from './meeting-status.helpers';

const ALL_STATUSES: MeetingStatus[] = [
  'PREPARING',
  'SCHEDULED',
  'IN_PROGRESS',
  'FINALIZED',
  'CANCELLED',
];

describe('cycle de vie d’une réunion', () => {
  it('permet de planifier depuis la préparation, et de replanifier', () => {
    expect(canTransition('PREPARING', 'schedule')).toBe(true);
    expect(canTransition('SCHEDULED', 'schedule')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'schedule')).toBe(false);
    expect(canTransition('FINALIZED', 'schedule')).toBe(false);
  });

  it('n’ouvre la séance que depuis une réunion planifiée', () => {
    expect(canTransition('SCHEDULED', 'start')).toBe(true);
    expect(canTransition('PREPARING', 'start')).toBe(false);
    expect(canTransition('CANCELLED', 'start')).toBe(false);
  });

  it('ne finalise que depuis une séance en cours', () => {
    expect(canTransition('IN_PROGRESS', 'finalize')).toBe(true);
    expect(
      ALL_STATUSES.filter((s) => s !== 'IN_PROGRESS').every(
        (s) => !canTransition(s, 'finalize'),
      ),
    ).toBe(true);
  });

  it('autorise l’annulation tant que la réunion n’est pas finalisée', () => {
    expect(canTransition('PREPARING', 'cancel')).toBe(true);
    expect(canTransition('SCHEDULED', 'cancel')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'cancel')).toBe(true);
    expect(canTransition('FINALIZED', 'cancel')).toBe(false);
    expect(canTransition('CANCELLED', 'cancel')).toBe(false);
  });

  it('mène chaque transition vers le statut attendu', () => {
    expect(targetStatus('schedule')).toBe('SCHEDULED');
    expect(targetStatus('start')).toBe('IN_PROGRESS');
    expect(targetStatus('finalize')).toBe('FINALIZED');
    expect(targetStatus('cancel')).toBe('CANCELLED');
  });
});

describe('droits d’écriture selon le statut', () => {
  it('gèle le contenu dès la finalisation ou l’annulation', () => {
    expect(isMeetingEditable('PREPARING')).toBe(true);
    expect(isMeetingEditable('SCHEDULED')).toBe(true);
    expect(isMeetingEditable('IN_PROGRESS')).toBe(true);
    expect(isMeetingEditable('FINALIZED')).toBe(false);
    expect(isMeetingEditable('CANCELLED')).toBe(false);
  });

  it('n’ouvre la saisie de séance qu’en conduite', () => {
    expect(isMeetingInConduct('IN_PROGRESS')).toBe(true);
    expect(
      ALL_STATUSES.filter((s) => s !== 'IN_PROGRESS').every(
        (s) => !isMeetingInConduct(s),
      ),
    ).toBe(true);
  });
});

describe('restitution', () => {
  it('ne produit compte rendu et exports que sur une réunion finalisée', () => {
    expect(canProduceMeetingReport('FINALIZED')).toBe(true);
    expect(
      ALL_STATUSES.filter((s) => s !== 'FINALIZED').every(
        (s) => !canProduceMeetingReport(s),
      ),
    ).toBe(true);
  });

  it('sert le snapshot figé dès la finalisation, les données live avant', () => {
    expect(meetingDeckSource('FINALIZED')).toBe('snapshot');
    expect(meetingDeckSource('IN_PROGRESS')).toBe('live');
    expect(meetingDeckSource('PREPARING')).toBe('live');
  });
});
