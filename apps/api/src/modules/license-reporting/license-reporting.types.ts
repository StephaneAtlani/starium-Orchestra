import type {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
} from '@prisma/client';

/**
 * Dictionnaire KPI canonique RFC-ACL-012.
 * Source unique côté API et côté UI : les composants front réutilisent
 * exactement ces clés pour éviter les divergences de calcul.
 */

export type LicenseDistribution = {
  readOnly: number;
  clientBillable: number;
  externalBillable: number;
  nonBillable: number;
  platformInternal: number;
  evaluationActive: number;
  evaluationExpired: number;
  platformInternalActive: number;
  platformInternalExpired: number;
};

export type SubscriptionDistribution = {
  draft: number;
  active: number;
  suspended: number;
  canceled: number;
  expired: number;
  expiredInGrace: number;
};

export type LicenseReportingOverview = {
  generatedAt: string;
  scope: 'platform';
  totals: {
    clients: number;
    clientUsersActive: number;
  };
  seats: {
    readWriteBillableUsed: number;
    readWriteBillableLimit: number;
  };
  licenses: LicenseDistribution;
  subscriptions: SubscriptionDistribution;
};

export type LicenseReportingClientRow = {
  clientId: string;
  clientName: string;
  clientSlug: string;
  clientUsersActive: number;
  seats: {
    readWriteBillableUsed: number;
    readWriteBillableLimit: number;
  };
  licenses: LicenseDistribution;
  subscriptions: SubscriptionDistribution;
};

export type LicenseReportingMonthlyPoint = {
  /** Mois calendaire UTC `YYYY-MM`. */
  month: string;
  licenses: LicenseDistribution;
  subscriptions: {
    active: number;
    suspended: number;
    expired: number;
  };
};

export type LicenseReportingMonthlySeries = {
  generatedAt: string;
  from: string;
  to: string;
  points: LicenseReportingMonthlyPoint[];
};

export type LicenseReportingFilters = {
  clientId?: string;
  licenseBillingMode?: ClientUserLicenseBillingMode;
  subscriptionStatus?: ClientSubscriptionStatus;
};
