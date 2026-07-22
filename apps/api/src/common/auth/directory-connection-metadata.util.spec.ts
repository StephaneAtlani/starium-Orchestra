import {
  isEmailDomainAllowedForProvisioning,
  isAutoProvisionUsersEnabled,
  readDirectoryProvisioningThresholds,
} from './directory-connection-metadata.util';

describe('directory-connection-metadata.util', () => {
  it('autoProvisionUsers false par défaut', () => {
    expect(isAutoProvisionUsersEnabled({ metadata: null })).toBe(false);
    expect(isAutoProvisionUsersEnabled({ metadata: {} })).toBe(false);
    expect(isAutoProvisionUsersEnabled({ metadata: { autoProvisionUsers: 'true' } })).toBe(
      false,
    );
  });

  it('lit les seuils de provisioning', () => {
    const thresholds = readDirectoryProvisioningThresholds({
      metadata: {
        maxUsersCreatedPerRun: 10,
        allowedEmailDomains: ['client.fr'],
        stopOnThresholdExceeded: false,
      },
    });
    expect(thresholds.maxUsersCreatedPerRun).toBe(10);
    expect(thresholds.allowedEmailDomains).toEqual(['client.fr']);
    expect(thresholds.stopOnThresholdExceeded).toBe(false);
  });

  it('filtre les domaines e-mail autorisés', () => {
    expect(
      isEmailDomainAllowedForProvisioning('a@client.fr', ['client.fr']),
    ).toBe(true);
    expect(
      isEmailDomainAllowedForProvisioning('a@other.fr', ['client.fr']),
    ).toBe(false);
  });
});
