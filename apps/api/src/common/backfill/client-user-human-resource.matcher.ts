import { humanResourceCatalogLabelForApi } from '../utils/human-resource-catalog-label';

export type BackfillAction = 'LINKED' | 'SKIP' | 'AMBIGUOUS' | 'NO_CANDIDATE' | 'ERROR';

export type BackfillStrategy =
  | 'email-default'
  | 'email-identity'
  | 'name-strict'
  | 'all'
  | 'pipeline';

export type MatchedBy = 'email-default' | 'email-identity' | 'name-strict' | 'multiple' | 'none';

export type HumanResourceCandidate = {
  id: string;
  name: string;
  firstName: string | null;
  email: string | null;
};

export type ClientUserMemberInput = {
  clientUserId: string;
  resourceId: string | null;
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
  defaultEmailIdentityEmail: string | null;
};

export type MatchResult = {
  action: BackfillAction;
  resourceId: string | null;
  resourceLabel: string | null;
  matchedBy: MatchedBy;
  candidateCount: number;
  reason: string;
};

export type MatcherOptions = {
  strategy: BackfillStrategy;
  enableNameStrict: boolean;
  linkedResourceIds: ReadonlySet<string>;
};

export function normalizeEmail(email: string | null | undefined): string | null {
  const t = email?.trim();
  if (!t) return null;
  return t.toLowerCase();
}

/** Aligné seed `n()` — clé nom/prénom pour name-strict. */
export function normalizePersonKey(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  return [firstName?.trim(), lastName?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function humanResourcePersonKey(resource: HumanResourceCandidate): string {
  return normalizePersonKey(resource.firstName, resource.name);
}

export function clientUserLabel(member: ClientUserMemberInput): string {
  const name = [member.userFirstName, member.userLastName].filter(Boolean).join(' ').trim();
  if (name) return `${name} — ${member.userEmail}`;
  return member.userEmail;
}

function resourceLabel(resource: HumanResourceCandidate): string {
  return humanResourceCatalogLabelForApi(resource);
}

function findByEmail(
  resources: HumanResourceCandidate[],
  email: string | null,
): HumanResourceCandidate[] {
  const norm = normalizeEmail(email);
  if (!norm) return [];
  return resources.filter((r) => normalizeEmail(r.email) === norm);
}

function findByNameStrict(
  resources: HumanResourceCandidate[],
  member: ClientUserMemberInput,
): HumanResourceCandidate[] {
  const userKey = normalizePersonKey(member.userFirstName, member.userLastName);
  if (!userKey) return [];
  return resources.filter((r) => humanResourcePersonKey(r) === userKey);
}

function distinctById(candidates: HumanResourceCandidate[]): HumanResourceCandidate[] {
  const seen = new Set<string>();
  const out: HumanResourceCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

type StrategyHit = { strategy: Exclude<MatchedBy, 'multiple' | 'none'>; resource: HumanResourceCandidate };

function collectStrategyHits(
  member: ClientUserMemberInput,
  resources: HumanResourceCandidate[],
  strategies: Array<Exclude<MatchedBy, 'multiple' | 'none'>>,
): StrategyHit[] {
  const hits: StrategyHit[] = [];
  for (const strategy of strategies) {
    let found: HumanResourceCandidate[] = [];
    if (strategy === 'email-default') {
      found = findByEmail(resources, member.userEmail);
    } else if (strategy === 'email-identity') {
      found = findByEmail(resources, member.defaultEmailIdentityEmail);
    } else if (strategy === 'name-strict') {
      found = findByNameStrict(resources, member);
    }
    for (const resource of found) {
      hits.push({ strategy, resource });
    }
  }
  return hits;
}

function partitionFreeAndBlocked(
  candidates: HumanResourceCandidate[],
  linkedResourceIds: ReadonlySet<string>,
): { free: HumanResourceCandidate[]; blocked: HumanResourceCandidate[] } {
  const free: HumanResourceCandidate[] = [];
  const blocked: HumanResourceCandidate[] = [];
  for (const c of candidates) {
    if (linkedResourceIds.has(c.id)) {
      blocked.push(c);
    } else {
      free.push(c);
    }
  }
  return { free, blocked };
}

function resolveFromCandidateSets(params: {
  allCandidates: HumanResourceCandidate[];
  free: HumanResourceCandidate[];
  blocked: HumanResourceCandidate[];
  matchedBy: MatchedBy;
  contributingStrategies?: string[];
}): MatchResult {
  const { allCandidates, free, blocked, matchedBy } = params;
  const candidateCount = allCandidates.length;

  if (candidateCount === 0) {
    return {
      action: 'NO_CANDIDATE',
      resourceId: null,
      resourceLabel: null,
      matchedBy: 'none',
      candidateCount: 0,
      reason: 'no_candidate',
    };
  }

  if (free.length === 0 && blocked.length >= 1) {
    return {
      action: 'SKIP',
      resourceId: null,
      resourceLabel: null,
      matchedBy: 'none',
      candidateCount,
      reason: 'resource_already_linked',
    };
  }

  if (free.length === 1) {
    const resource = free[0]!;
    let reason = blocked.length > 0 ? `linked;blocked:${blocked.length}` : '';
    if (params.contributingStrategies?.length) {
      const prefix = params.contributingStrategies.join(',');
      reason = reason ? `${prefix};${reason}` : prefix;
    }
    return {
      action: 'LINKED',
      resourceId: resource.id,
      resourceLabel: resourceLabel(resource),
      matchedBy,
      candidateCount,
      reason: reason || matchedBy,
    };
  }

  const blockedNote =
    blocked.length > 0 ? `;blocked:${blocked.map((b) => b.id).join(',')}` : '';
  const freeNote = `free:${free.map((f) => f.id).join(',')}`;
  return {
    action: 'AMBIGUOUS',
    resourceId: null,
    resourceLabel: null,
    matchedBy: 'none',
    candidateCount,
    reason: `distinct_candidates:${free.length}${blockedNote};${freeNote}`,
  };
}

function resolvePipelineStep(
  candidates: HumanResourceCandidate[],
  linkedResourceIds: ReadonlySet<string>,
  matchedBy: MatchedBy,
): MatchResult | 'continue' {
  const distinct = distinctById(candidates);
  const candidateCount = distinct.length;

  if (candidateCount === 0) {
    return 'continue';
  }

  if (candidateCount > 1) {
    return {
      action: 'AMBIGUOUS',
      resourceId: null,
      resourceLabel: null,
      matchedBy: 'none',
      candidateCount,
      reason: `multiple_candidates:${candidateCount}`,
    };
  }

  const only = distinct[0]!;
  if (linkedResourceIds.has(only.id)) {
    return {
      action: 'SKIP',
      resourceId: null,
      resourceLabel: null,
      matchedBy: 'none',
      candidateCount: 1,
      reason: 'resource_already_linked',
    };
  }

  return {
    action: 'LINKED',
    resourceId: only.id,
    resourceLabel: resourceLabel(only),
    matchedBy,
    candidateCount: 1,
    reason: matchedBy,
  };
}

function enabledStrategies(options: MatcherOptions): Array<Exclude<MatchedBy, 'multiple' | 'none'>> {
  if (options.strategy === 'all' || options.strategy === 'pipeline') {
    const list: Array<Exclude<MatchedBy, 'multiple' | 'none'>> = [
      'email-default',
      'email-identity',
    ];
    if (options.enableNameStrict) {
      list.push('name-strict');
    }
    return list;
  }
  if (options.strategy === 'name-strict') {
    return ['name-strict'];
  }
  if (options.strategy === 'email-identity') {
    return ['email-identity'];
  }
  return ['email-default'];
}

function resolveStrategyAll(
  member: ClientUserMemberInput,
  resources: HumanResourceCandidate[],
  options: MatcherOptions,
): MatchResult {
  const strategies = enabledStrategies(options);
  const hits = collectStrategyHits(member, resources, strategies);

  const byId = new Map<string, { resource: HumanResourceCandidate; strategies: Set<string> }>();
  for (const hit of hits) {
    const existing = byId.get(hit.resource.id);
    if (existing) {
      existing.strategies.add(hit.strategy);
    } else {
      byId.set(hit.resource.id, {
        resource: hit.resource,
        strategies: new Set([hit.strategy]),
      });
    }
  }

  const allCandidates = [...byId.values()].map((v) => v.resource);
  const { free, blocked } = partitionFreeAndBlocked(allCandidates, options.linkedResourceIds);

  let matchedBy: MatchedBy = 'none';
  if (free.length === 1) {
    const entry = byId.get(free[0]!.id)!;
    matchedBy = entry.strategies.size >= 2 ? 'multiple' : (entry.strategies.values().next().value as MatchedBy);
  }

  const contributing = [...new Set(hits.map((h) => h.strategy))];
  return resolveFromCandidateSets({
    allCandidates,
    free,
    blocked,
    matchedBy,
    contributingStrategies: contributing,
  });
}

function resolvePipeline(
  member: ClientUserMemberInput,
  resources: HumanResourceCandidate[],
  options: MatcherOptions,
): MatchResult {
  const steps: Array<{
    strategy: Exclude<MatchedBy, 'multiple' | 'none'>;
    candidates: HumanResourceCandidate[];
  }> = [
    {
      strategy: 'email-default',
      candidates: findByEmail(resources, member.userEmail),
    },
    {
      strategy: 'email-identity',
      candidates: findByEmail(resources, member.defaultEmailIdentityEmail),
    },
  ];
  if (options.enableNameStrict) {
    steps.push({
      strategy: 'name-strict',
      candidates: findByNameStrict(resources, member),
    });
  }

  for (const step of steps) {
    const result = resolvePipelineStep(
      step.candidates,
      options.linkedResourceIds,
      step.strategy,
    );
    if (result !== 'continue') {
      return result;
    }
  }

  return {
    action: 'NO_CANDIDATE',
    resourceId: null,
    resourceLabel: null,
    matchedBy: 'none',
    candidateCount: 0,
    reason: 'no_candidate',
  };
}

function resolveSingleStrategy(
  member: ClientUserMemberInput,
  resources: HumanResourceCandidate[],
  options: MatcherOptions,
): MatchResult {
  const strategy = options.strategy as Exclude<MatchedBy, 'multiple' | 'none'>;
  let candidates: HumanResourceCandidate[] = [];
  if (strategy === 'email-default') {
    candidates = findByEmail(resources, member.userEmail);
  } else if (strategy === 'email-identity') {
    candidates = findByEmail(resources, member.defaultEmailIdentityEmail);
  } else {
    candidates = findByNameStrict(resources, member);
  }

  const distinct = distinctById(candidates);
  const candidateCount = distinct.length;

  if (candidateCount === 0) {
    return {
      action: 'NO_CANDIDATE',
      resourceId: null,
      resourceLabel: null,
      matchedBy: 'none',
      candidateCount: 0,
      reason: 'no_candidate',
    };
  }

  if (candidateCount > 1) {
    return {
      action: 'AMBIGUOUS',
      resourceId: null,
      resourceLabel: null,
      matchedBy: 'none',
      candidateCount,
      reason: `multiple_candidates:${candidateCount}`,
    };
  }

  const only = distinct[0]!;
  if (options.linkedResourceIds.has(only.id)) {
    return {
      action: 'SKIP',
      resourceId: null,
      resourceLabel: null,
      matchedBy: 'none',
      candidateCount: 1,
      reason: 'resource_already_linked',
    };
  }

  return {
    action: 'LINKED',
    resourceId: only.id,
    resourceLabel: resourceLabel(only),
    matchedBy: strategy,
    candidateCount: 1,
    reason: strategy,
  };
}

/**
 * Résout la décision de liaison ClientUser → Resource HUMAN (pur, sans I/O).
 */
export function matchClientUserToHumanResource(
  member: ClientUserMemberInput,
  resources: HumanResourceCandidate[],
  options: MatcherOptions,
): MatchResult {
  if (member.resourceId) {
    return {
      action: 'SKIP',
      resourceId: null,
      resourceLabel: null,
      matchedBy: 'none',
      candidateCount: 0,
      reason: 'already_linked',
    };
  }

  if (options.strategy === 'all') {
    return resolveStrategyAll(member, resources, options);
  }

  if (options.strategy === 'pipeline') {
    return resolvePipeline(member, resources, options);
  }

  return resolveSingleStrategy(member, resources, options);
}

export function parseBackfillStrategyFlag(
  raw: string | undefined,
  enableNameStrict: boolean,
): BackfillStrategy {
  if (!raw || raw === 'pipeline') {
    return 'pipeline';
  }
  const allowed = ['email-default', 'email-identity', 'name-strict', 'all'] as const;
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new Error(
      `--strategy invalide : ${raw} (attendu : email-default | email-identity | name-strict | all)`,
    );
  }
  if (raw === 'name-strict' && !enableNameStrict) {
    return 'name-strict';
  }
  return raw;
}
