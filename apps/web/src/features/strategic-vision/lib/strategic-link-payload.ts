/** Payload lien stratégique PROJECT — libellé métier obligatoire côté API. */
export function buildAddProjectLinkBody(project: {
  id: string;
  label: string;
}): {
  linkType: 'PROJECT';
  targetId: string;
  targetLabelSnapshot: string;
} {
  const label = project.label.trim();
  return {
    linkType: 'PROJECT',
    targetId: project.id,
    targetLabelSnapshot: label,
  };
}

export function buildAddManualLinkBody(label: string): {
  linkType: 'MANUAL';
  targetLabelSnapshot: string;
} {
  return {
    linkType: 'MANUAL',
    targetLabelSnapshot: label.trim(),
  };
}
