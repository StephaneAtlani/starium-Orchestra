import { computeQuorum, parseQuorumRule } from './meeting-quorum.util';
import type { QuorumAttendee } from './meeting-quorum.util';

const attendee = (
  id: string,
  overrides: Partial<QuorumAttendee> = {},
): QuorumAttendee => ({
  id,
  isRequired: true,
  attendanceStatus: 'EXPECTED',
  delegateOfAttendeeId: null,
  ...overrides,
});

describe('parseQuorumRule', () => {
  it('retourne null quand aucune règle exploitable n’est définie', () => {
    expect(parseQuorumRule(null)).toBeNull();
    expect(parseQuorumRule(undefined)).toBeNull();
    expect(parseQuorumRule('0.5')).toBeNull();
    expect(parseQuorumRule([])).toBeNull();
    expect(parseQuorumRule({})).toBeNull();
  });

  it('ignore les valeurs hors bornes plutôt que d’échouer', () => {
    expect(parseQuorumRule({ requiredRatio: 0 })).toBeNull();
    expect(parseQuorumRule({ requiredRatio: 1.5 })).toBeNull();
    expect(parseQuorumRule({ minimumPresent: 0 })).toBeNull();
    expect(parseQuorumRule({ minimumPresent: 2.5 })).toBeNull();
  });

  it('lit un ratio et un minimum valides', () => {
    expect(parseQuorumRule({ requiredRatio: 0.6 })).toEqual({
      requiredRatio: 0.6,
    });
    expect(parseQuorumRule({ minimumPresent: 3 })).toEqual({
      minimumPresent: 3,
    });
  });
});

describe('computeQuorum', () => {
  it('ne bloque jamais la finalisation en l’absence de règle', () => {
    const result = computeQuorum(
      [attendee('a', { attendanceStatus: 'ABSENT' })],
      null,
    );
    expect(result.isMet).toBeNull();
    expect(result.requiredCount).toBe(1);
    expect(result.presentCount).toBe(0);
  });

  it('ne compte que les convoqués requis', () => {
    const result = computeQuorum(
      [
        attendee('a', { attendanceStatus: 'PRESENT' }),
        attendee('b', { isRequired: false, attendanceStatus: 'PRESENT' }),
        attendee('c', { attendanceStatus: 'ABSENT' }),
      ],
      { requiredRatio: 0.5 },
    );
    expect(result.requiredCount).toBe(2);
    expect(result.presentCount).toBe(1);
    expect(result.isMet).toBe(true);
  });

  it('porte la présence d’un délégué sur le convoqué représenté', () => {
    const result = computeQuorum(
      [
        attendee('titulaire', { attendanceStatus: 'EXCUSED' }),
        attendee('suppleant', {
          isRequired: false,
          attendanceStatus: 'PRESENT',
          delegateOfAttendeeId: 'titulaire',
        }),
      ],
      { requiredRatio: 1 },
    );
    expect(result.requiredCount).toBe(1);
    expect(result.presentCount).toBe(1);
    expect(result.isMet).toBe(true);
  });

  it('ne compte pas deux fois une même voix quand le titulaire est présent', () => {
    const result = computeQuorum(
      [
        attendee('titulaire', { attendanceStatus: 'PRESENT' }),
        attendee('suppleant', {
          attendanceStatus: 'PRESENT',
          delegateOfAttendeeId: 'titulaire',
        }),
      ],
      { requiredRatio: 1 },
    );
    expect(result.requiredCount).toBe(1);
    expect(result.presentCount).toBe(1);
  });

  it('applique le minimum absolu en plus du ratio', () => {
    const attendees = [
      attendee('a', { attendanceStatus: 'PRESENT' }),
      attendee('b', { attendanceStatus: 'PRESENT' }),
    ];
    expect(computeQuorum(attendees, { requiredRatio: 1 }).isMet).toBe(true);
    expect(
      computeQuorum(attendees, { requiredRatio: 1, minimumPresent: 3 }).isMet,
    ).toBe(false);
  });

  it('considère le quorum atteint quand aucun convoqué n’est requis', () => {
    const result = computeQuorum(
      [attendee('a', { isRequired: false, attendanceStatus: 'ABSENT' })],
      { requiredRatio: 1 },
    );
    expect(result.requiredCount).toBe(0);
    expect(result.ratio).toBe(1);
    expect(result.isMet).toBe(true);
  });
});
