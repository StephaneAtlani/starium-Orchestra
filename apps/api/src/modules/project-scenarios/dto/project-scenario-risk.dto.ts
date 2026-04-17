export type ProjectScenarioRiskDto = {
  id: string;
  clientId: string;
  scenarioId: string;
  riskTypeId: string | null;
  title: string;
  description: string | null;
  probability: number;
  impact: number;
  criticalityScore: number;
  mitigationPlan: string | null;
  ownerLabel: string | null;
  createdAt: string;
  updatedAt: string;
  riskType: {
    id: string;
    code: string;
    label: string;
  } | null;
};
