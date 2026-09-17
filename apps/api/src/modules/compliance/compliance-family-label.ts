/**
 * Famille métier affichée au catalogue (jamais un ID technique).
 * Dérivée du nom, du provider et du chemin source CISO.
 */
export function deriveComplianceFamilyLabel(input: {
  name: string;
  provider?: string | null;
  sourceLibraryPath?: string | null;
}): string {
  const hay = [
    input.name,
    input.provider ?? '',
    input.sourceLibraryPath ?? '',
  ]
    .join(' ')
    .toLowerCase();

  if (/\bnis[\s_-]?2\b/.test(hay) || hay.includes('nis2')) return 'NIS2';
  if (
    /\biso(?:\/iec)?[\s._-]*27001\b/.test(hay) ||
    hay.includes('iso27001')
  ) {
    return 'ISO 27001';
  }
  if (
    /\biso(?:\/iec)?[\s._-]*27002\b/.test(hay) ||
    hay.includes('iso27002')
  ) {
    return 'ISO 27002';
  }
  if (/\brgpd\b/.test(hay) || /\bgdpr\b/.test(hay)) return 'RGPD';
  if (/\banssi\b/.test(hay)) return 'ANSSI';
  if (/\bdora\b/.test(hay)) return 'DORA';
  if (/\bsoc[\s_-]?2\b/.test(hay) || hay.includes('soc2')) return 'SOC 2';
  if (/\bnist\b/.test(hay)) return 'NIST';
  if (/\bcis\b/.test(hay) && hay.includes('control')) return 'CIS';
  if (/\bhds\b/.test(hay)) return 'HDS';
  if (/\bpci/.test(hay)) return 'PCI-DSS';

  return 'Référentiel';
}
