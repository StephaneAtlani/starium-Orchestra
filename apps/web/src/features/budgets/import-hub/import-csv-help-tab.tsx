'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { downloadBudgetImportTemplate } from '../api/budget-imports.api';

export function ImportCsvHelpTab() {
  const authFetch = useAuthenticatedFetch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadBudgetImportTemplate(authFetch);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Téléchargement impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="space-y-3 rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <FileSpreadsheet className="size-5 text-[color:var(--brand-gold)]" aria-hidden />
          Modèle CSV
        </h2>
        <p className="text-sm text-muted-foreground">
          Téléchargez un fichier d’exemple UTF-8 (séparateur <code>;</code>) pour préparer un
          export ERP ou Excel compatible Orchestra.
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 sm:min-h-9"
          disabled={busy}
          onClick={() => void handleDownload()}
        >
          <Download className="size-4" aria-hidden />
          {busy ? 'Téléchargement…' : 'Télécharger le modèle CSV'}
        </Button>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Règles CSV</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li>Encodage UTF-8 (BOM UTF-8 accepté).</li>
          <li>Séparateur <code>,</code> ou <code>;</code> — détection automatique.</li>
          <li>Ligne d’en-tête obligatoire.</li>
          <li>
            Colonnes recommandées : <code>external_id</code>, <code>libelle</code>,{' '}
            <code>code_enveloppe</code>, montants, <code>devise</code>.
          </li>
          <li>
            Clé anti-doublon : <code>external_id</code> (ou clé composite configurée dans le
            mapping).
          </li>
          <li>Limites : 20&nbsp;000 lignes, taille max plateforme (souvent 10&nbsp;Mo).</li>
        </ul>
      </section>

      <Alert>
        <AlertTitle>Ce que l’import ne fait pas</AlertTitle>
        <AlertDescription>
          Pas de planning 12 mois, pas de création de commandes/factures procurement, pas
          d’événements financiers unitaires, pas d’activation de prévision d’atterrissage (PA).
          L’import alimente les lignes budgétaires live ; la PA reste un rituel de gouvernance
          séparé.
        </AlertDescription>
      </Alert>

      <p className="text-sm text-muted-foreground">
        L’automatisation (cron, SFTP, file d’attente) est prévue dans une RFC dédiée
        (RFC-BUD-044) — hors périmètre de ce centre de gestion.
      </p>
    </div>
  );
}
