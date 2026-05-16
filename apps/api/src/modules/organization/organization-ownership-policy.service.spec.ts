import { OrgOwnershipPolicyMode } from '@prisma/client';
import { OrganizationOwnershipPolicyService } from './organization-ownership-policy.service';

describe('OrganizationOwnershipPolicyService', () => {
  const prisma = {
    clientOrgOwnershipPolicy: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };
  const featureFlags = { isEnabled: jest.fn() };

  let service: OrganizationOwnershipPolicyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrganizationOwnershipPolicyService(
      prisma as never,
      featureFlags as never,
    );
  });

  it('getPolicyView defaults ADVISORY and enforcementEnabled false', async () => {
    prisma.clientOrgOwnershipPolicy.findUnique.mockResolvedValue(null);
    featureFlags.isEnabled.mockResolvedValue(false);
    const view = await service.getPolicyView('client-1');
    expect(view).toEqual({
      mode: OrgOwnershipPolicyMode.ADVISORY,
      enforcementEnabled: false,
      flagKey: 'ORG_OWNERSHIP_REQUIRED',
    });
  });

  it('enforcementEnabled true when REQUIRED_ON_CREATE and flag on', async () => {
    prisma.clientOrgOwnershipPolicy.findUnique.mockResolvedValue({
      mode: OrgOwnershipPolicyMode.REQUIRED_ON_CREATE,
    });
    featureFlags.isEnabled.mockResolvedValue(true);
    const view = await service.getPolicyView('client-1');
    expect(view.enforcementEnabled).toBe(true);
  });
});
