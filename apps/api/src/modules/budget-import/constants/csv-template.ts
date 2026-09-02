/**
 * Modèle CSV téléchargeable — RFC-BUD-043 §4.2
 * UTF-8 BOM + séparateur `;`
 */
export const BUDGET_IMPORT_CSV_TEMPLATE_FILENAME =
  'orchestra-import-lignes-modele.csv';

export const BUDGET_IMPORT_CSV_TEMPLATE_BODY =
  '\uFEFFexternal_id;libelle;code_enveloppe;montant_initial;montant_engage;montant_consomme;devise\n' +
  'ERP-001;Licences Microsoft;RUN-001;120000;45000;38000;EUR\n' +
  'ERP-002;Infogérance;RUN-002;80000;0;12000;EUR\n';
