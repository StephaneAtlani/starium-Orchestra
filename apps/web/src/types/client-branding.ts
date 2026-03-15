/**
 * Branding par client — permet de surcharger le thème plateforme par client actif.
 * Application via CSS variables sur le wrapper fourni par BrandingProvider.
 */
export type ClientBranding = {
  primaryColor?: string;
  primarySoftColor?: string;
  logoUrl?: string;
  sidebarStyle?: 'solid' | 'light';
  dashboardPreset?: 'standard' | 'executive' | 'dense';
};

/** Thème par défaut plateforme (tokens Starium Orchestra). */
export const DEFAULT_PLATFORM_BRANDING: ClientBranding = {
  primaryColor: '#6F4BB8',
  primarySoftColor: '#EFE7FB',
  sidebarStyle: 'solid',
  dashboardPreset: 'standard',
};
