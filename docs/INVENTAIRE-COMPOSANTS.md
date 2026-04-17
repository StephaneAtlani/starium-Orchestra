# Inventaire des composants frontend

Document genere a partir des composants React trouves dans `apps/web/src` (`.tsx`, hors routes `app/` et hors tests).

Total inventorie : **291 composants**.

## Lecture rapide

Chaque entree contient : `NomDuComposant` - chemin - role principal dans l'interface.

## Composants partages (3)

- `ClientSwitcher` - `components/ClientSwitcher.tsx` - permet de changer client.
- `PermissionGate` - `components/PermissionGate.tsx` - controle l'acces a permission.
- `RequireActiveClient` - `components/RequireActiveClient.tsx` - gere l'interface de require active client.

## UI partagee (16)

- `alert` - `components/ui/alert.tsx` - gere l'interface de alerte.
- `badge` - `components/ui/badge.tsx` - affiche un badge ou un etat pour badge.
- `button` - `components/ui/button.tsx` - gere l'interface de button.
- `card` - `components/ui/card.tsx` - affiche une carte de synthese pour carte.
- `dialog` - `components/ui/dialog.tsx` - ouvre un dialogue pour dialogue.
- `input` - `components/ui/input.tsx` - gere l'interface de input.
- `kpi-card` - `components/ui/kpi-card.tsx` - affiche une carte de synthese pour kpi.
- `label` - `components/ui/label.tsx` - gere l'interface de label.
- `phone-input` - `components/ui/phone-input.tsx` - gere l'interface de phone.
- `select` - `components/ui/select.tsx` - gere l'interface de select.
- `skeleton` - `components/ui/skeleton.tsx` - affiche l'etat de chargement pour skeleton.
- `switch` - `components/ui/switch.tsx` - gere l'interface de switch.
- `table` - `components/ui/table.tsx` - affiche un tableau pour tableau.
- `tabs` - `components/ui/tabs.tsx` - organise les onglets pour onglets.
- `tooltip` - `components/ui/tooltip.tsx` - affiche une infobulle pour infobulle.
- `client-badges-admin-panel` - `features/ui/components/client-badges-admin-panel.tsx` - affiche un panneau pour client badges admin.

## Feedback UI (3)

- `empty-state` - `components/feedback/empty-state.tsx` - affiche l'etat vide pour vide.
- `error-state` - `components/feedback/error-state.tsx` - affiche l'etat d'erreur pour erreur.
- `loading-state` - `components/feedback/loading-state.tsx` - affiche l'etat de chargement pour chargement.

## Layout (3)

- `page-container` - `components/layout/page-container.tsx` - compose la page pour container.
- `page-header` - `components/layout/page-header.tsx` - compose la page pour page en-tete.
- `table-toolbar` - `components/layout/table-toolbar.tsx` - affiche un tableau pour tableau barre.

## Shell applicatif (7)

- `app-shell` - `components/shell/app-shell.tsx` - structure le shell de app.
- `sidebar-dropdown` - `components/shell/sidebar-dropdown.tsx` - gere l'interface de sidebar dropdown.
- `sidebar-item` - `components/shell/sidebar-item.tsx` - gere l'interface de sidebar item.
- `sidebar-nav-context` - `components/shell/sidebar-nav-context.tsx` - expose le contexte React pour sidebar nav.
- `sidebar-section` - `components/shell/sidebar-section.tsx` - regroupe une section dediee a sidebar.
- `sidebar` - `components/shell/sidebar.tsx` - gere l'interface de sidebar.
- `workspace-header` - `components/shell/workspace-header.tsx` - affiche l'en-tete pour espace.

## Tableaux (1)

- `data-table` - `components/data-table/data-table.tsx` - affiche un tableau pour data.

## Notifications (1)

- `app-notifications` - `components/notifications/app-notifications.tsx` - gere l'interface de app notifications.

## Finance (1)

- `tax-display-mode-toggle` - `components/finance/tax-display-mode-toggle.tsx` - permet d'activer ou basculer tax display mode.

## Contextes (3)

- `active-client-context` - `context/active-client-context.tsx` - expose le contexte React pour active client.
- `auth-context` - `context/auth-context.tsx` - expose le contexte React pour auth.
- `branding-context` - `context/branding-context.tsx` - expose le contexte React pour branding.

## Providers (1)

- `query-provider` - `providers/query-provider.tsx` - fournit le contexte React pour query.

## Lib partagee (1)

- `registry-badge` - `lib/ui/registry-badge.tsx` - affiche un badge ou un etat pour registre.

## Achats (12)

- `create-standalone-invoice-dialog` - `features/procurement/components/create-standalone-invoice-dialog.tsx` - ouvre un dialogue pour creation standalone facture.
- `create-standalone-purchase-order-dialog` - `features/procurement/components/create-standalone-purchase-order-dialog.tsx` - ouvre un dialogue pour creation standalone achat commande.
- `image-upload-dropzone` - `features/procurement/components/image-upload-dropzone.tsx` - gere l'interface de image televersement dropzone.
- `invoice-detail-page` - `features/procurement/components/invoice-detail-page.tsx` - compose la page pour facture detail.
- `invoices-list-page` - `features/procurement/components/invoices-list-page.tsx` - affiche la liste de factures.
- `platform-procurement-storage-settings-form` - `features/procurement/components/platform-procurement-storage-settings-form.tsx` - gere le formulaire de plateforme procurement stockage settings.
- `procurement-attachments-panel` - `features/procurement/components/procurement-attachments-panel.tsx` - affiche un panneau pour procurement pieces jointes.
- `procurement-po-pending-documents-section` - `features/procurement/components/procurement-po-pending-documents-section.tsx` - regroupe une section dediee a procurement bon de commande en attente documents.
- `purchase-order-detail-page` - `features/procurement/components/purchase-order-detail-page.tsx` - compose la page pour achat commande detail.
- `purchase-orders-list-page` - `features/procurement/components/purchase-orders-list-page.tsx` - affiche la liste de achat commandes.
- `supplier-search-combobox` - `features/procurement/components/supplier-search-combobox.tsx` - propose une recherche-selection pour fournisseur search.
- `suppliers-dashboard-page` - `features/procurement/components/suppliers-dashboard-page.tsx` - compose la page pour fournisseurs dashboard.

## Achats / Suppliers (4)

- `new-supplier-dialog` - `features/procurement/components/suppliers/new-supplier-dialog.tsx` - ouvre un dialogue pour creation fournisseur.
- `supplier-contact-modal` - `features/procurement/components/suppliers/supplier-contact-modal.tsx` - affiche une modale pour fournisseur contact.
- `supplier-contact-visualization-modal` - `features/procurement/components/suppliers/supplier-contact-visualization-modal.tsx` - affiche une modale pour fournisseur contact visualisation.
- `supplier-visualization-modal` - `features/procurement/components/suppliers/supplier-visualization-modal.tsx` - affiche une modale pour fournisseur visualisation.

## Admin Studio (6)

- `change-user-password-dialog` - `features/admin-studio/components/change-user-password-dialog.tsx` - ouvre un dialogue pour changement user password.
- `create-client-dialog` - `features/admin-studio/components/create-client-dialog.tsx` - ouvre un dialogue pour creation client.
- `edit-client-dialog` - `features/admin-studio/components/edit-client-dialog.tsx` - ouvre un dialogue pour edition client.
- `manage-user-clients-dialog` - `features/admin-studio/components/manage-user-clients-dialog.tsx` - ouvre un dialogue pour manage user clients.
- `platform-usage-charts` - `features/admin-studio/components/platform-usage-charts.tsx` - affiche des graphiques pour plateforme usage.
- `reset-user-mfa-dialog` - `features/admin-studio/components/reset-user-mfa-dialog.tsx` - ouvre un dialogue pour reinitialisation user mfa.

## Budgets (37)

- `budget-bulk-line-status-dialog` - `features/budgets/components/budget-bulk-line-status-dialog.tsx` - ouvre un dialogue pour budget bulk ligne statut.
- `budget-decision-timeline` - `features/budgets/components/budget-decision-timeline.tsx` - gere l'interface de budget decision timeline.
- `budget-density-toggle` - `features/budgets/components/budget-density-toggle.tsx` - permet d'activer ou basculer budget densite.
- `budget-detail-dashboard` - `features/budgets/components/budget-detail-dashboard.tsx` - gere l'interface de budget detail dashboard.
- `budget-empty-state` - `features/budgets/components/budget-empty-state.tsx` - affiche l'etat vide pour budget vide.
- `budget-envelope-context-card` - `features/budgets/components/budget-envelope-context-card.tsx` - expose le contexte React pour budget enveloppe.
- `budget-envelope-header` - `features/budgets/components/budget-envelope-header.tsx` - affiche l'en-tete pour budget enveloppe.
- `budget-envelope-identity-card` - `features/budgets/components/budget-envelope-identity-card.tsx` - affiche une carte de synthese pour budget enveloppe identite.
- `budget-envelope-lines-table` - `features/budgets/components/budget-envelope-lines-table.tsx` - affiche un tableau pour budget enveloppe lignes.
- `budget-envelope-status-badge` - `features/budgets/components/budget-envelope-status-badge.tsx` - affiche un badge ou un etat pour budget enveloppe statut.
- `budget-envelope-summary-cards` - `features/budgets/components/budget-envelope-summary-cards.tsx` - gere l'interface de budget enveloppe synthese cards.
- `budget-envelope-workflow-card` - `features/budgets/components/budget-envelope-workflow-card.tsx` - affiche une carte de synthese pour budget enveloppe workflow.
- `budget-error-state` - `features/budgets/components/budget-error-state.tsx` - affiche l'etat d'erreur pour budget erreur.
- `budget-exercises-table` - `features/budgets/components/budget-exercises-table.tsx` - affiche un tableau pour budget exercices.
- `budget-exercises-toolbar` - `features/budgets/components/budget-exercises-toolbar.tsx` - centralise les actions et filtres pour budget exercices.
- `budget-explorer-pilotage-cells` - `features/budgets/components/budget-explorer-pilotage-cells.tsx` - gere l'interface de budget explorateur pilotage cellules.
- `budget-explorer-row` - `features/budgets/components/budget-explorer-row.tsx` - gere l'interface de budget explorateur row.
- `budget-explorer-table` - `features/budgets/components/budget-explorer-table.tsx` - affiche un tableau pour budget explorateur.
- `budget-explorer-toolbar` - `features/budgets/components/budget-explorer-toolbar.tsx` - centralise les actions et filtres pour budget explorateur.
- `budget-kpi-cards` - `features/budgets/components/budget-kpi-cards.tsx` - gere l'interface de budget kpi cards.
- `budget-line-status-badge` - `features/budgets/components/budget-line-status-badge.tsx` - affiche un badge ou un etat pour budget ligne statut.
- `budget-line-workflow-block` - `features/budgets/components/budget-line-workflow-block.tsx` - gere l'interface de budget ligne workflow block.
- `budget-lines-progress` - `features/budgets/components/budget-lines-progress.tsx` - gere l'interface de budget lignes progression.
- `budget-list-table` - `features/budgets/components/budget-list-table.tsx` - affiche un tableau pour budget.
- `budget-page-header` - `features/budgets/components/budget-page-header.tsx` - compose la page pour budget.
- `budget-planning-month-cell` - `features/budgets/components/budget-planning-month-cell.tsx` - gere l'interface de budget planning mois cell.
- `budget-planning-quick-calculator-dialog` - `features/budgets/components/budget-planning-quick-calculator-dialog.tsx` - ouvre un dialogue pour budget planning rapide calculateur.
- `budget-scenario-select` - `features/budgets/components/budget-scenario-select.tsx` - gere l'interface de budget scenario select.
- `budget-snapshot-kpi-strip` - `features/budgets/components/budget-snapshot-kpi-strip.tsx` - gere l'interface de budget snapshot kpi strip.
- `budget-status-badge` - `features/budgets/components/budget-status-badge.tsx` - affiche un badge ou un etat pour budget statut.
- `budget-toolbar` - `features/budgets/components/budget-toolbar.tsx` - centralise les actions et filtres pour budget.
- `budget-view-tabs` - `features/budgets/components/budget-view-tabs.tsx` - organise les onglets pour budget.
- `budgets-table` - `features/budgets/components/budgets-table.tsx` - affiche un tableau pour budgets.
- `budgets-toolbar` - `features/budgets/components/budgets-toolbar.tsx` - centralise les actions et filtres pour budgets.
- `create-budget-snapshot-dialog` - `features/budgets/components/create-budget-snapshot-dialog.tsx` - ouvre un dialogue pour creation budget snapshot.
- `new-budget-line-dialog` - `features/budgets/components/new-budget-line-dialog.tsx` - ouvre un dialogue pour creation budget ligne.
- `pagination-summary` - `features/budgets/components/pagination-summary.tsx` - gere l'interface de pagination synthese.

## Budgets / Budget Envelope Drawer (1)

- `budget-envelope-intelligence-drawer` - `features/budgets/components/budget-envelope-drawer/budget-envelope-intelligence-drawer.tsx` - gere l'interface de budget enveloppe intelligence volet.

## Budgets / Budget Line Drawer (17)

- `budget-line-allocations-tab` - `features/budgets/components/budget-line-drawer/budget-line-allocations-tab.tsx` - organise les onglets pour budget ligne allocations.
- `budget-line-commitments-tab` - `features/budgets/components/budget-line-drawer/budget-line-commitments-tab.tsx` - organise les onglets pour budget ligne commitments.
- `budget-line-drawer-header` - `features/budgets/components/budget-line-drawer/budget-line-drawer-header.tsx` - affiche l'en-tete pour budget ligne volet.
- `budget-line-dsi-info-tab` - `features/budgets/components/budget-line-drawer/budget-line-dsi-info-tab.tsx` - organise les onglets pour budget ligne dsi info.
- `budget-line-events-table` - `features/budgets/components/budget-line-drawer/budget-line-events-table.tsx` - affiche un tableau pour budget ligne evenements.
- `budget-line-intelligence-drawer` - `features/budgets/components/budget-line-drawer/budget-line-intelligence-drawer.tsx` - gere l'interface de budget ligne intelligence volet.
- `budget-line-invoices-tab` - `features/budgets/components/budget-line-drawer/budget-line-invoices-tab.tsx` - organise les onglets pour budget ligne factures.
- `budget-line-kpi-strip` - `features/budgets/components/budget-line-drawer/budget-line-kpi-strip.tsx` - gere l'interface de budget ligne kpi strip.
- `budget-line-overview-tab` - `features/budgets/components/budget-line-drawer/budget-line-overview-tab.tsx` - organise les onglets pour budget ligne vue d'ensemble.
- `budget-line-planning-tab` - `features/budgets/components/budget-line-drawer/budget-line-planning-tab.tsx` - organise les onglets pour budget ligne planning.
- `budget-line-timeline-tab` - `features/budgets/components/budget-line-drawer/budget-line-timeline-tab.tsx` - organise les onglets pour budget ligne timeline.
- `create-financial-event-dialog` - `features/budgets/components/budget-line-drawer/create-financial-event-dialog.tsx` - ouvre un dialogue pour creation financial evenement.
- `create-invoice-dialog` - `features/budgets/components/budget-line-drawer/create-invoice-dialog.tsx` - ouvre un dialogue pour creation facture.
- `create-order-dialog` - `features/budgets/components/budget-line-drawer/create-order-dialog.tsx` - ouvre un dialogue pour creation commande.
- `edit-procurement-event-dialog` - `features/budgets/components/budget-line-drawer/edit-procurement-event-dialog.tsx` - ouvre un dialogue pour edition procurement evenement.
- `timeline-event-item` - `features/budgets/components/budget-line-drawer/timeline-event-item.tsx` - gere l'interface de timeline evenement item.
- `timeline-filters` - `features/budgets/components/budget-line-drawer/timeline-filters.tsx` - gere l'interface de timeline.

## Budgets / Cockpit Settings (2)

- `budget-cockpit-settings-page` - `features/budgets/cockpit-settings/budget-cockpit-settings-page.tsx` - compose la page pour budget cockpit settings.
- `budget-cockpit-user-settings-dialog` - `features/budgets/cockpit-settings/budget-cockpit-user-settings-dialog.tsx` - ouvre un dialogue pour budget cockpit user settings.

## Budgets / Dashboard (19)

- `budget-dashboard-page` - `features/budgets/dashboard/budget-dashboard-page.tsx` - compose la page pour budget dashboard.
- `budget-alerts-panel` - `features/budgets/dashboard/components/budget-alerts-panel.tsx` - affiche un panneau pour budget alertes.
- `budget-capex-opex-card` - `features/budgets/dashboard/components/budget-capex-opex-card.tsx` - affiche une carte de synthese pour budget capex opex.
- `budget-cockpit-primitives` - `features/budgets/dashboard/components/budget-cockpit-primitives.tsx` - gere l'interface de budget cockpit primitives.
- `budget-cockpit-status-labels` - `features/budgets/dashboard/components/budget-cockpit-status-labels.tsx` - gere l'interface de budget cockpit statut labels.
- `budget-cockpit-widget-renderer` - `features/budgets/dashboard/components/budget-cockpit-widget-renderer.tsx` - affiche un widget pour budget cockpit rendu.
- `budget-dashboard-empty-state` - `features/budgets/dashboard/components/budget-dashboard-empty-state.tsx` - affiche l'etat vide pour budget dashboard vide.
- `budget-dashboard-error-state` - `features/budgets/dashboard/components/budget-dashboard-error-state.tsx` - affiche l'etat d'erreur pour budget dashboard erreur.
- `budget-dashboard-header` - `features/budgets/dashboard/components/budget-dashboard-header.tsx` - affiche l'en-tete pour budget dashboard.
- `budget-dashboard-shell` - `features/budgets/dashboard/components/budget-dashboard-shell.tsx` - structure le shell de budget dashboard.
- `budget-dashboard-skeleton` - `features/budgets/dashboard/components/budget-dashboard-skeleton.tsx` - affiche l'etat de chargement pour budget dashboard skeleton.
- `budget-envelopes-table` - `features/budgets/dashboard/components/budget-envelopes-table.tsx` - affiche un tableau pour budget enveloppes.
- `budget-kpi-card` - `features/budgets/dashboard/components/budget-kpi-card.tsx` - affiche une carte de synthese pour budget kpi.
- `budget-kpi-grid` - `features/budgets/dashboard/components/budget-kpi-grid.tsx` - gere l'interface de budget kpi grille.
- `budget-lines-critique-table` - `features/budgets/dashboard/components/budget-lines-critique-table.tsx` - affiche un tableau pour budget lignes critique.
- `budget-monthly-trend-card` - `features/budgets/dashboard/components/budget-monthly-trend-card.tsx` - affiche une carte de synthese pour budget mensuel tendance.
- `budget-run-build-card` - `features/budgets/dashboard/components/budget-run-build-card.tsx` - affiche une carte de synthese pour budget execution build.
- `budget-top-budget-lines-card` - `features/budgets/dashboard/components/budget-top-budget-lines-card.tsx` - affiche une carte de synthese pour budget top budget lignes.
- `budget-top-envelopes-card` - `features/budgets/dashboard/components/budget-top-envelopes-card.tsx` - affiche une carte de synthese pour budget top enveloppes.

## Budgets / Forecast (12)

- `budget-reporting-forecast-page` - `features/budgets/forecast/budget-reporting-forecast-page.tsx` - compose la page pour budget reporting forecast.
- `budget-comparison-kpi-charts` - `features/budgets/forecast/components/budget-comparison-kpi-charts.tsx` - affiche des graphiques pour budget comparaison kpi.
- `budget-comparison-multi-kpi-charts` - `features/budgets/forecast/components/budget-comparison-multi-kpi-charts.tsx` - affiche des graphiques pour budget comparaison multi kpi.
- `budget-comparison-selector` - `features/budgets/forecast/components/budget-comparison-selector.tsx` - permet de selectionner budget comparaison.
- `comparison-charts-svg` - `features/budgets/forecast/components/comparison-charts-svg.tsx` - affiche des graphiques pour comparaison svg.
- `comparison-table` - `features/budgets/forecast/components/comparison-table.tsx` - affiche un tableau pour comparaison.
- `forecast-comparison-panel` - `features/budgets/forecast/components/forecast-comparison-panel.tsx` - affiche un panneau pour forecast comparaison.
- `forecast-kpi-cards` - `features/budgets/forecast/components/forecast-kpi-cards.tsx` - gere l'interface de forecast kpi cards.
- `forecast-kpi-skeleton` - `features/budgets/forecast/components/forecast-kpi-skeleton.tsx` - affiche l'etat de chargement pour forecast kpi skeleton.
- `forecast-status-badge` - `features/budgets/forecast/components/forecast-status-badge.tsx` - affiche un badge ou un etat pour forecast statut.
- `forecast-table` - `features/budgets/forecast/components/forecast-table.tsx` - affiche un tableau pour forecast.
- `multi-live-vs-snapshots-table` - `features/budgets/forecast/components/multi-live-vs-snapshots-table.tsx` - affiche un tableau pour multi live vs snapshots.

## Budgets / Forms (7)

- `budget-envelope-form` - `features/budgets/components/forms/budget-envelope-form.tsx` - gere le formulaire de budget enveloppe.
- `budget-exercise-form` - `features/budgets/components/forms/budget-exercise-form.tsx` - gere le formulaire de budget exercice.
- `budget-form-actions` - `features/budgets/components/forms/budget-form-actions.tsx` - gere le formulaire de budget actions.
- `budget-form` - `features/budgets/components/forms/budget-form.tsx` - gere le formulaire de budget.
- `budget-line-form` - `features/budgets/components/forms/budget-line-form.tsx` - gere le formulaire de budget ligne.
- `budget-status-change-dialog` - `features/budgets/components/forms/budget-status-change-dialog.tsx` - ouvre un dialogue pour budget statut changement.
- `budget-validation-workflow-strip` - `features/budgets/components/forms/budget-validation-workflow-strip.tsx` - gere l'interface de budget validation workflow strip.

## Budgets / Import budget (12)

- `budget-import-column-selects` - `features/budgets/budget-import/budget-import-column-selects.tsx` - gere l'interface de budget import colonne selects.
- `budget-import-config-budget-line-block` - `features/budgets/budget-import/budget-import-config-budget-line-block.tsx` - gere l'interface de budget import configuration budget ligne block.
- `budget-import-config-envelope-block` - `features/budgets/budget-import/budget-import-config-envelope-block.tsx` - gere l'interface de budget import configuration enveloppe block.
- `budget-import-config-file-sheet-block` - `features/budgets/budget-import/budget-import-config-file-sheet-block.tsx` - gere l'interface de budget import configuration fichier fiche block.
- `budget-import-config-invoices-block` - `features/budgets/budget-import/budget-import-config-invoices-block.tsx` - gere l'interface de budget import configuration factures block.
- `budget-import-config-options-block` - `features/budgets/budget-import/budget-import-config-options-block.tsx` - gere l'interface de budget import configuration options block.
- `budget-import-config-orders-block` - `features/budgets/budget-import/budget-import-config-orders-block.tsx` - gere l'interface de budget import configuration commandes block.
- `budget-import-execute-step` - `features/budgets/budget-import/budget-import-execute-step.tsx` - gere l'interface de budget import execute step.
- `budget-import-mapping-step` - `features/budgets/budget-import/budget-import-mapping-step.tsx` - gere l'interface de budget import mapping step.
- `budget-import-preview-step` - `features/budgets/budget-import/budget-import-preview-step.tsx` - gere l'interface de budget import apercu step.
- `budget-import-upload-step` - `features/budgets/budget-import/budget-import-upload-step.tsx` - gere l'interface de budget import televersement step.
- `budget-import-wizard` - `features/budgets/budget-import/budget-import-wizard.tsx` - gere l'interface de budget import assistant.

## Budgets / Pages (4)

- `budget-envelope-form-page` - `features/budgets/components/pages/budget-envelope-form-page.tsx` - gere le formulaire de budget enveloppe.
- `budget-exercise-form-page` - `features/budgets/components/pages/budget-exercise-form-page.tsx` - gere le formulaire de budget exercice.
- `budget-form-page` - `features/budgets/components/pages/budget-form-page.tsx` - gere le formulaire de budget.
- `budget-line-form-page` - `features/budgets/components/pages/budget-line-form-page.tsx` - gere le formulaire de budget ligne.

## Budgets / Workflow Settings (1)

- `budget-workflow-settings-page` - `features/budgets/workflow-settings/budget-workflow-settings-page.tsx` - compose la page pour budget workflow settings.

## Compte (4)

- `account-client-default-email-section` - `features/account/components/account-client-default-email-section.tsx` - regroupe une section dediee a account client par defaut email.
- `account-email-identities-section` - `features/account/components/account-email-identities-section.tsx` - regroupe une section dediee a account email identities.
- `account-profile-section` - `features/account/components/account-profile-section.tsx` - regroupe une section dediee a account profil.
- `account-security-section` - `features/account/components/account-security-section.tsx` - regroupe une section dediee a account securite.

## Contrats (6)

- `contract-attachment-file-picker` - `features/contracts/components/contract-attachment-file-picker.tsx` - permet de selectionner contrat piece jointe fichier.
- `contract-attachments-panel` - `features/contracts/components/contract-attachments-panel.tsx` - affiche un panneau pour contrat pieces jointes.
- `contract-detail-page` - `features/contracts/components/contract-detail-page.tsx` - compose la page pour contrat detail.
- `contract-form-dialog` - `features/contracts/components/contract-form-dialog.tsx` - ouvre un dialogue pour contrat.
- `contracts-list-page` - `features/contracts/components/contracts-list-page.tsx` - affiche la liste de contrats.
- `supplier-contracts-preview-card` - `features/contracts/components/supplier-contracts-preview-card.tsx` - affiche une carte de synthese pour fournisseur contrats apercu.

## Dashboard (3)

- `dashboard-budget-kpi-widget` - `features/dashboard/components/dashboard-budget-kpi-widget.tsx` - affiche un widget pour dashboard budget kpi.
- `dashboard-projects-kpi-widget` - `features/dashboard/components/dashboard-projects-kpi-widget.tsx` - affiche un widget pour dashboard projets kpi.
- `dashboard-suppliers-kpi-widget` - `features/dashboard/components/dashboard-suppliers-kpi-widget.tsx` - affiche un widget pour dashboard fournisseurs kpi.

## Equipes / Collaborateurs (7)

- `collaborator-detail-header` - `features/teams/collaborators/components/collaborator-detail-header.tsx` - affiche l'en-tete pour collaborateur detail.
- `collaborator-edit-form` - `features/teams/collaborators/components/collaborator-edit-form.tsx` - gere le formulaire de collaborateur edition.
- `collaborator-filters-bar` - `features/teams/collaborators/components/collaborator-filters-bar.tsx` - centralise les actions et filtres pour collaborateur.
- `collaborator-manager-combobox` - `features/teams/collaborators/components/collaborator-manager-combobox.tsx` - propose une recherche-selection pour collaborateur manager.
- `collaborator-source-badge` - `features/teams/collaborators/components/collaborator-source-badge.tsx` - affiche un badge ou un etat pour collaborateur source.
- `collaborator-status-badge` - `features/teams/collaborators/components/collaborator-status-badge.tsx` - affiche un badge ou un etat pour collaborateur statut.
- `collaborators-list-table` - `features/teams/collaborators/components/collaborators-list-table.tsx` - affiche un tableau pour collaborateurs.

## Equipes / Competences (9)

- `skill-categories-table` - `features/teams/skills/components/skill-categories-table.tsx` - affiche un tableau pour competence categories.
- `skill-category-form-dialog` - `features/teams/skills/components/skill-category-form-dialog.tsx` - ouvre un dialogue pour competence category.
- `skill-collaborators-dialog` - `features/teams/skills/components/skill-collaborators-dialog.tsx` - ouvre un dialogue pour competence collaborateurs.
- `skill-filters-bar` - `features/teams/skills/components/skill-filters-bar.tsx` - centralise les actions et filtres pour competence.
- `skill-form-dialog` - `features/teams/skills/components/skill-form-dialog.tsx` - ouvre un dialogue pour competence.
- `skill-reference-level-badge` - `features/teams/skills/components/skill-reference-level-badge.tsx` - affiche un badge ou un etat pour competence reference niveau.
- `skill-status-badge` - `features/teams/skills/components/skill-status-badge.tsx` - affiche un badge ou un etat pour competence statut.
- `skills-catalog` - `features/teams/skills/components/skills-catalog.tsx` - gere l'interface de competences catalogue.
- `skills-list-table` - `features/teams/skills/components/skills-list-table.tsx` - affiche un tableau pour competences.

## Equipes / Equipes de travail (10)

- `human-resource-combobox` - `features/teams/work-teams/components/human-resource-combobox.tsx` - propose une recherche-selection pour humain ressource.
- `structure-layout-client` - `features/teams/work-teams/components/structure-layout-client.tsx` - gere l'interface de structure layout client.
- `structure-sub-nav` - `features/teams/work-teams/components/structure-sub-nav.tsx` - gere l'interface de structure sub nav.
- `work-team-add-member-dialog` - `features/teams/work-teams/components/work-team-add-member-dialog.tsx` - ouvre un dialogue pour travail equipe add membre.
- `work-team-form-dialog` - `features/teams/work-teams/components/work-team-form-dialog.tsx` - ouvre un dialogue pour travail equipe.
- `work-team-lead-combobox` - `features/teams/work-teams/components/work-team-lead-combobox.tsx` - propose une recherche-selection pour travail equipe responsable.
- `work-team-members-card` - `features/teams/work-teams/components/work-team-members-card.tsx` - affiche une carte de synthese pour travail equipe membres.
- `work-team-status-badge` - `features/teams/work-teams/components/work-team-status-badge.tsx` - affiche un badge ou un etat pour travail equipe statut.
- `work-teams-table` - `features/teams/work-teams/components/work-teams-table.tsx` - affiche un tableau pour travail equipes.
- `work-teams-tree` - `features/teams/work-teams/components/work-teams-tree.tsx` - affiche l'arborescence de travail equipes.

## Microsoft 365 (3)

- `client-azure-app-credentials` - `features/microsoft-365/components/client-azure-app-credentials.tsx` - gere l'interface de client azure app credentials.
- `microsoft-365-settings` - `features/microsoft-365/components/microsoft-365-settings.tsx` - gere l'interface de microsoft 365 settings.
- `platform-microsoft-settings-form` - `features/microsoft-365/components/platform-microsoft-settings-form.tsx` - gere le formulaire de plateforme microsoft settings.

## Plateforme (1)

- `platform-upload-settings-form` - `features/platform/components/platform-upload-settings-form.tsx` - gere le formulaire de plateforme televersement settings.

## Projets (40)

- `action-plan-task-create-dialog` - `features/projects/components/action-plan-task-create-dialog.tsx` - ouvre un dialogue pour action plan tache creation.
- `action-plan-task-edit-dialog` - `features/projects/components/action-plan-task-edit-dialog.tsx` - ouvre un dialogue pour action plan tache edition.
- `action-plan-tasks-table` - `features/projects/components/action-plan-tasks-table.tsx` - affiche un tableau pour action plan taches.
- `gantt-bar-color-legend` - `features/projects/components/gantt-bar-color-legend.tsx` - gere l'interface de gantt color legend.
- `milestone-form-dialog-fields` - `features/projects/components/milestone-form-dialog-fields.tsx` - ouvre un dialogue pour milestone fields.
- `person-catalog-picker-dialog` - `features/projects/components/person-catalog-picker-dialog.tsx` - ouvre un dialogue pour person catalogue.
- `portfolio-gantt-chart` - `features/projects/components/portfolio-gantt-chart.tsx` - affiche des graphiques pour portefeuille gantt.
- `portfolio-gantt-legend` - `features/projects/components/portfolio-gantt-legend.tsx` - gere l'interface de portefeuille gantt legend.
- `portfolio-gantt-page` - `features/projects/components/portfolio-gantt-page.tsx` - compose la page pour portefeuille gantt.
- `portfolio-gantt-project-tooltip` - `features/projects/components/portfolio-gantt-project-tooltip.tsx` - affiche une infobulle pour portefeuille gantt projet.
- `portfolio-gantt-sidebar-tooltip` - `features/projects/components/portfolio-gantt-sidebar-tooltip.tsx` - affiche une infobulle pour portefeuille gantt sidebar.
- `post-mortem-indicators-block` - `features/projects/components/post-mortem-indicators-block.tsx` - gere l'interface de post mortem indicators block.
- `project-badges` - `features/projects/components/project-badges.tsx` - gere l'interface de projet badges.
- `project-budget-hierarchy-combobox` - `features/projects/components/project-budget-hierarchy-combobox.tsx` - propose une recherche-selection pour projet budget hierarchy.
- `project-budget-link-edit-dialog` - `features/projects/components/project-budget-link-edit-dialog.tsx` - ouvre un dialogue pour projet budget link edition.
- `project-budget-section` - `features/projects/components/project-budget-section.tsx` - regroupe une section dediee a projet budget.
- `project-create-form` - `features/projects/components/project-create-form.tsx` - gere le formulaire de projet creation.
- `project-detail-view` - `features/projects/components/project-detail-view.tsx` - affiche la vue de projet detail.
- `project-documents-section` - `features/projects/components/project-documents-section.tsx` - regroupe une section dediee a projet documents.
- `project-gantt-entity-tooltip` - `features/projects/components/project-gantt-entity-tooltip.tsx` - affiche une infobulle pour projet gantt entity.
- `project-gantt-panel` - `features/projects/components/project-gantt-panel.tsx` - affiche un panneau pour projet gantt.
- `project-gantt-task-bar` - `features/projects/components/project-gantt-task-bar.tsx` - gere l'interface de projet gantt tache.
- `project-planning-kanban-tab` - `features/projects/components/project-planning-kanban-tab.tsx` - organise les onglets pour projet planning kanban.
- `project-planning-milestones-tab` - `features/projects/components/project-planning-milestones-tab.tsx` - organise les onglets pour projet planning milestones.
- `project-planning-tasks-tab` - `features/projects/components/project-planning-tasks-tab.tsx` - organise les onglets pour projet planning taches.
- `project-planning-view` - `features/projects/components/project-planning-view.tsx` - affiche la vue de projet planning.
- `project-retroplan-macro-dialog` - `features/projects/components/project-retroplan-macro-dialog.tsx` - ouvre un dialogue pour projet retroplan macro.
- `project-review-editor-dialog` - `features/projects/components/project-review-editor-dialog.tsx` - ouvre un dialogue pour projet revue editor.
- `project-reviews-tab` - `features/projects/components/project-reviews-tab.tsx` - organise les onglets pour projet revues.
- `project-risk-ebios-dialog` - `features/projects/components/project-risk-ebios-dialog.tsx` - ouvre un dialogue pour projet risque ebios.
- `project-risks-view` - `features/projects/components/project-risks-view.tsx` - affiche la vue de projet risques.
- `project-sheet-view` - `features/projects/components/project-sheet-view.tsx` - affiche la vue de projet fiche.
- `project-task-planning-section` - `features/projects/components/project-task-planning-section.tsx` - regroupe une section dediee a projet tache planning.
- `project-team-matrix` - `features/projects/components/project-team-matrix.tsx` - gere l'interface de projet equipe matrice.
- `project-workspace-tabs` - `features/projects/components/project-workspace-tabs.tsx` - organise les onglets pour projet espace.
- `projects-list-table` - `features/projects/components/projects-list-table.tsx` - affiche un tableau pour projets.
- `projects-portfolio-filters-bar` - `features/projects/components/projects-portfolio-filters-bar.tsx` - centralise les actions et filtres pour projets portefeuille.
- `projects-portfolio-kpi` - `features/projects/components/projects-portfolio-kpi.tsx` - gere l'interface de projets portefeuille kpi.
- `projects-toolbar` - `features/projects/components/projects-toolbar.tsx` - centralise les actions et filtres pour projets.
- `task-form-dialog-fields` - `features/projects/components/task-form-dialog-fields.tsx` - ouvre un dialogue pour tache fields.

## Projets / Scénarios cockpit — RFC-FE-PROJ-SC-002 (8)

- `scenario-cockpit-page` - `features/projects/scenario-cockpit/ScenarioCockpitPage.tsx` - compose le cockpit comparaison deux scénarios (queries liste + détail).
- `scenario-comparison-selector` - `features/projects/scenario-cockpit/ScenarioComparisonSelector.tsx` - sélection baseline / comparé (libellés métier).
- `scenario-variance-cards` - `features/projects/scenario-cockpit/ScenarioVarianceCards.tsx` - cartes d’écarts par summary.
- `scenario-capacity-alert-panel` - `features/projects/scenario-cockpit/ScenarioCapacityAlertPanel.tsx` - alertes capacité + lien liste scénarios.
- `scenario-risk-panel` - `features/projects/scenario-cockpit/ScenarioRiskPanel.tsx` - synthèse risque + lien registre risques.
- `sort-scenarios-cockpit` - `features/projects/scenario-cockpit/sort-scenarios-cockpit.ts` - tri canonique non archivés + résolution comparé par défaut.
- `scenario-delta-utils` - `features/projects/scenario-cockpit/scenario-delta-utils.ts` - parsing numérique et deltas comparé − baseline.
- `project-scenario-cockpit-route-page` - `app/(protected)/projects/[projectId]/scenarios/cockpit/page.tsx` - route Next.js du cockpit.

## Projets / Scénarios workspace — RFC-FE-PROJ-SC-003 (12)

- `scenario-workspace-page` - `features/projects/scenario-workspace/ScenarioWorkspacePage.tsx` - page édition scénario (queries projet + détail scénario, header, onglets internes).
- `scenario-workspace-tabs` - `features/projects/scenario-workspace/ScenarioWorkspaceTabs.tsx` - onglets locaux (Vue d’ensemble, Budget, Ressources, Planning, Capacité, Risques).
- `scenario-overview-panel` - `features/projects/scenario-workspace/ScenarioOverviewPanel.tsx` - formulaire PATCH métadonnées (quatre champs).
- `scenario-budget-panel` / `scenario-resource-panel` / `scenario-timeline-panel` / `scenario-capacity-panel` - `features/projects/scenario-workspace/` - panneaux lecture seule sur `*Summary` du détail API.
- `scenario-risk-panel` (workspace) - `features/projects/scenario-workspace/ScenarioRiskPanel.tsx` - synthèse risque scénario + lien registre risques projet (distinct du panneau cockpit).
- `scenario-summary-panel` - `features/projects/scenario-workspace/ScenarioSummaryPanel.tsx` - rendu homogène d’un bloc summary JSON.
- `scenario-patch-payload` - `features/projects/scenario-workspace/scenario-patch-payload.ts` - construction du payload PATCH (champs modifiés uniquement).
- `invalidate-after-scenario-update` - `features/projects/scenario-workspace/invalidate-after-scenario-update.ts` - invalidations React Query après mise à jour.
- `scenario-workspace-readonly` - `features/projects/scenario-workspace/scenario-workspace-readonly.ts` - règle lecture seule si `ARCHIVED`.
- `project-scenario-workspace-route-page` - `app/(protected)/projects/[projectId]/scenarios/[scenarioId]/page.tsx` - route Next.js du workspace.

## Projets / Gantt (1)

- `project-gantt-view` - `features/projects/gantt/components/project-gantt-view.tsx` - affiche la vue de projet gantt.

## Projets / Options (11)

- `microsoft-connection-status-card` - `features/projects/options/components/microsoft-connection-status-card.tsx` - affiche une carte de synthese pour microsoft connection statut.
- `microsoft-documents-card` - `features/projects/options/components/microsoft-documents-card.tsx` - affiche une carte de synthese pour microsoft documents.
- `microsoft-link-configure-dialog` - `features/projects/options/components/microsoft-link-configure-dialog.tsx` - ouvre un dialogue pour microsoft link configure.
- `microsoft-planner-card` - `features/projects/options/components/microsoft-planner-card.tsx` - affiche une carte de synthese pour microsoft planner.
- `microsoft-teams-card` - `features/projects/options/components/microsoft-teams-card.tsx` - affiche une carte de synthese pour microsoft equipes.
- `project-microsoft-settings` - `features/projects/options/components/project-microsoft-settings.tsx` - gere l'interface de projet microsoft settings.
- `project-options-tabs` - `features/projects/options/components/project-options-tabs.tsx` - organise les onglets pour projet options.
- `project-options-view` - `features/projects/options/components/project-options-view.tsx` - affiche la vue de projet options.
- `project-planning-buckets-settings` - `features/projects/options/components/project-planning-buckets-settings.tsx` - gere l'interface de projet planning buckets settings.
- `project-sync-settings` - `features/projects/options/components/project-sync-settings.tsx` - gere l'interface de projet synchronisation settings.
- `sync-status-card` - `features/projects/options/components/sync-status-card.tsx` - affiche une carte de synthese pour synchronisation statut.

## Projets / Risques (8)

- `new-risk-redirect-dialog` - `features/projects/risks/components/new-risk-redirect-dialog.tsx` - ouvre un dialogue pour creation risque redirect.
- `risk-filters` - `features/projects/risks/components/risk-filters.tsx` - gere l'interface de risque.
- `risk-level-badge` - `features/projects/risks/components/risk-level-badge.tsx` - affiche un badge ou un etat pour risque niveau.
- `risk-status-badge` - `features/projects/risks/components/risk-status-badge.tsx` - affiche un badge ou un etat pour risque statut.
- `risk-taxonomy-admin-panel` - `features/projects/risks/components/risk-taxonomy-admin-panel.tsx` - affiche un panneau pour risque taxonomie admin.
- `risks-list` - `features/projects/risks/components/risks-list.tsx` - affiche la liste de risques.
- `risks-registry-kpi` - `features/projects/risks/components/risks-registry-kpi.tsx` - gere l'interface de risques registre kpi.
- `risks-registry-page` - `features/projects/risks/components/risks-registry-page.tsx` - compose la page pour risques registre.

## RBAC client (10)

- `add-member-dialog` - `features/client-rbac/components/add-member-dialog.tsx` - ouvre un dialogue pour add membre.
- `edit-member-dialog` - `features/client-rbac/components/edit-member-dialog.tsx` - ouvre un dialogue pour edition membre.
- `members-list` - `features/client-rbac/components/members-list.tsx` - affiche la liste de membres.
- `members-sync-dialog` - `features/client-rbac/components/members-sync-dialog.tsx` - ouvre un dialogue pour membres synchronisation.
- `role-create-page` - `features/client-rbac/components/role-create-page.tsx` - compose la page pour role creation.
- `role-detail-page` - `features/client-rbac/components/role-detail-page.tsx` - compose la page pour role detail.
- `role-form` - `features/client-rbac/components/role-form.tsx` - gere le formulaire de role.
- `role-permissions-editor` - `features/client-rbac/components/role-permissions-editor.tsx` - gere l'interface de role permissions editor.
- `roles-list` - `features/client-rbac/components/roles-list.tsx` - affiche la liste de roles.
- `user-roles-dialog` - `features/client-rbac/components/user-roles-dialog.tsx` - ouvre un dialogue pour user roles.

## Synchronisation equipe (4)

- `team-sync-history` - `features/team-sync/components/team-sync-history.tsx` - affiche l'historique de equipe synchronisation.
- `team-sync-preview-table` - `features/team-sync/components/team-sync-preview-table.tsx` - affiche un tableau pour equipe synchronisation apercu.
- `team-sync-run-panel` - `features/team-sync/components/team-sync-run-panel.tsx` - affiche un panneau pour equipe synchronisation execution.
- `team-sync-settings` - `features/team-sync/components/team-sync-settings.tsx` - gere l'interface de equipe synchronisation settings.
