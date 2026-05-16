import {
  ClientUserMemberInput,
  HumanResourceCandidate,
  matchClientUserToHumanResource,
  MatcherOptions,
  normalizeEmail,
  normalizePersonKey,
} from './client-user-human-resource.matcher';

const baseOptions = (overrides?: Partial<MatcherOptions>): MatcherOptions => ({
  strategy: 'pipeline',
  enableNameStrict: false,
  linkedResourceIds: new Set(),
  ...overrides,
});

const human = (
  id: string,
  email: string | null,
  firstName: string | null,
  name: string,
): HumanResourceCandidate => ({ id, email, firstName, name });

const member = (overrides?: Partial<ClientUserMemberInput>): ClientUserMemberInput => ({
  clientUserId: 'cu-1',
  resourceId: null,
  userEmail: 'alice@client.test',
  userFirstName: 'Alice',
  userLastName: 'Martin',
  defaultEmailIdentityEmail: null,
  ...overrides,
});

describe('client-user-human-resource.matcher', () => {
  describe('normalizeEmail / normalizePersonKey', () => {
    it('normalise email insensible à la casse', () => {
      expect(normalizeEmail('  Alice@Client.TEST ')).toBe('alice@client.test');
    });

    it('normalise prénom nom', () => {
      expect(normalizePersonKey(' Alice ', ' Martin ')).toBe('alice martin');
    });
  });

  describe('garde already_linked', () => {
    it('SKIP already_linked si resourceId déjà set', () => {
      const result = matchClientUserToHumanResource(
        member({ resourceId: 'res-existing' }),
        [human('res-1', 'alice@client.test', 'Alice', 'Martin')],
        baseOptions(),
      );
      expect(result.action).toBe('SKIP');
      expect(result.reason).toBe('already_linked');
    });
  });

  describe('pipeline email-default', () => {
    const resources = [
      human('res-1', 'alice@client.test', 'Alice', 'Martin'),
      human('res-2', 'bob@client.test', 'Bob', 'Durand'),
    ];

    it('LINKED sur email-default unique sans tester email-identity', () => {
      const result = matchClientUserToHumanResource(
        member({
          userEmail: 'alice@client.test',
          defaultEmailIdentityEmail: 'other@client.test',
        }),
        resources,
        baseOptions(),
      );
      expect(result.action).toBe('LINKED');
      expect(result.resourceId).toBe('res-1');
      expect(result.matchedBy).toBe('email-default');
    });

    it('AMBIGUOUS sur email-default sans fallback email-identity', () => {
      const dupes = [
        human('res-a', 'alice@client.test', null, 'A'),
        human('res-b', 'alice@client.test', null, 'B'),
      ];
      const result = matchClientUserToHumanResource(
        member({ defaultEmailIdentityEmail: 'unique-other@client.test' }),
        dupes,
        baseOptions(),
      );
      expect(result.action).toBe('AMBIGUOUS');
      expect(result.reason).toContain('multiple_candidates');
    });

    it('fallback email-identity si email-default sans candidat', () => {
      const result = matchClientUserToHumanResource(
        member({
          userEmail: 'no-match@client.test',
          defaultEmailIdentityEmail: 'bob@client.test',
        }),
        resources,
        baseOptions(),
      );
      expect(result.action).toBe('LINKED');
      expect(result.resourceId).toBe('res-2');
      expect(result.matchedBy).toBe('email-identity');
    });

    it('membre annuaire (simulation) — LINKED sur email unique', () => {
      const result = matchClientUserToHumanResource(
        member({ userEmail: 'synced@client.test' }),
        [human('res-sync', 'synced@client.test', 'Sync', 'User')],
        baseOptions(),
      );
      expect(result.action).toBe('LINKED');
    });
  });

  describe('resource_already_linked', () => {
    it('SKIP resource_already_linked si candidat unique déjà lié', () => {
      const result = matchClientUserToHumanResource(
        member(),
        [human('res-taken', 'alice@client.test', 'Alice', 'Martin')],
        baseOptions({ linkedResourceIds: new Set(['res-taken']) }),
      );
      expect(result.action).toBe('SKIP');
      expect(result.reason).toBe('resource_already_linked');
      expect(result.candidateCount).toBe(1);
    });
  });

  describe('strategy=all', () => {
    it('LINKED matchedBy=multiple si même Resource par deux stratégies', () => {
      const resources = [human('res-1', 'alice@client.test', 'Alice', 'Martin')];
      const result = matchClientUserToHumanResource(
        member({
          userEmail: 'alice@client.test',
          defaultEmailIdentityEmail: 'alice@client.test',
        }),
        resources,
        baseOptions({ strategy: 'all' }),
      );
      expect(result.action).toBe('LINKED');
      expect(result.resourceId).toBe('res-1');
      expect(result.matchedBy).toBe('multiple');
      expect(result.candidateCount).toBe(1);
    });

    it('AMBIGUOUS si deux Resource distinctes', () => {
      const resources = [
        human('res-a', 'alice@client.test', null, 'A'),
        human('res-b', 'bob@client.test', null, 'B'),
      ];
      const result = matchClientUserToHumanResource(
        member({
          userEmail: 'alice@client.test',
          defaultEmailIdentityEmail: 'bob@client.test',
        }),
        resources,
        baseOptions({ strategy: 'all' }),
      );
      expect(result.action).toBe('AMBIGUOUS');
      expect(result.candidateCount).toBe(2);
    });

    it('SKIP resource_already_linked si seul candidat déjà lié ailleurs (pas NO_CANDIDATE)', () => {
      const resources = [human('res-taken', 'alice@client.test', 'Alice', 'Martin')];
      const result = matchClientUserToHumanResource(
        member({ userEmail: 'alice@client.test' }),
        resources,
        baseOptions({
          strategy: 'all',
          linkedResourceIds: new Set(['res-taken']),
        }),
      );
      expect(result.action).toBe('SKIP');
      expect(result.reason).toBe('resource_already_linked');
      expect(result.candidateCount).toBe(1);
    });
  });

  describe('name-strict', () => {
    const resources = [
      human('res-1', null, 'Alice', 'Martin'),
      human('res-2', null, 'Bob', 'Durand'),
    ];

    it('0 candidat', () => {
      const result = matchClientUserToHumanResource(
        member({ userFirstName: 'Zoe', userLastName: 'Inconnue', userEmail: 'z@t.test' }),
        resources,
        baseOptions({ strategy: 'name-strict', enableNameStrict: true }),
      );
      expect(result.action).toBe('NO_CANDIDATE');
    });

    it('1 candidat LINKED', () => {
      const result = matchClientUserToHumanResource(
        member(),
        resources,
        baseOptions({ strategy: 'name-strict', enableNameStrict: true }),
      );
      expect(result.action).toBe('LINKED');
      expect(result.resourceId).toBe('res-1');
    });

    it('N candidats AMBIGUOUS', () => {
      const twins = [
        human('res-a', null, 'Alice', 'Martin'),
        human('res-b', null, 'Alice', 'Martin'),
      ];
      const result = matchClientUserToHumanResource(
        member(),
        twins,
        baseOptions({ strategy: 'name-strict', enableNameStrict: true }),
      );
      expect(result.action).toBe('AMBIGUOUS');
    });
  });
});
