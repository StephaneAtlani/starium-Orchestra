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

/** Thème par défaut plateforme (Design System Starium — signature dorée). */
export const DEFAULT_PLATFORM_BRANDING: ClientBranding = {
  primaryColor: '#E8A317',
  primarySoftColor: '#FBEAB5',
  sidebarStyle: 'solid',
  dashboardPreset: 'standard',
};
