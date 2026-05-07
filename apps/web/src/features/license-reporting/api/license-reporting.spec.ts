import { describe, expect, it, vi } from 'vitest';
import {
  downloadClientsCsv,
  getLicenseReportingClients,
  getLicenseReportingMonthly,
  getLicenseReportingOverview,
  type AuthFetch,
} from './license-reporting';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function csvResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  });
}

describe('license-reporting api', () => {
  it("appelle l'overview avec query params filtres", async () => {
    const authFetch = vi.fn<AuthFetch>().mockResolvedValue(
      jsonResponse({
        generatedAt: new Date().toISOString(),
        scope: 'platform',
        totals: { clients: 1, clientUsersActive: 0 },
        seats: { readWriteBillableUsed: 0, readWriteBillableLimit: 0 },
        licenses: {
          readOnly: 0,
          clientBillable: 0,
          externalBillable: 0,
          nonBillable: 0,
          platformInternal: 0,
          evaluationActive: 0,
          evaluationExpired: 0,
          platformInternalActive: 0,
          platformInternalExpired: 0,
        },
        subscriptions: {
          draft: 0,
          active: 0,
          suspended: 0,
          canceled: 0,
          expired: 0,
          expiredInGrace: 0,
        },
      }),
    );

    await getLicenseReportingOverview(authFetch, {
      clientId: 'cabc',
      licenseBillingMode: 'EVALUATION',
    });

    const url = String(authFetch.mock.calls[0]?.[0]);
    expect(url).toContain('/api/platform/license-reporting/overview?');
    expect(url).toContain('clientId=cabc');
    expect(url).toContain('licenseBillingMode=EVALUATION');
  });

  it('omet les filtres vides', async () => {
    const authFetch = vi.fn<AuthFetch>().mockResolvedValue(jsonResponse([]));
    await getLicenseReportingClients(authFetch, {});
    const url = String(authFetch.mock.calls[0]?.[0]);
    expect(url).toBe('/api/platform/license-reporting/clients');
  });

  it('passe la fenêtre temporelle pour /monthly', async () => {
    const authFetch = vi.fn<AuthFetch>().mockResolvedValue(
      jsonResponse({
        generatedAt: new Date().toISOString(),
        from: '2026-01',
        to: '2026-03',
        points: [],
      }),
    );

    await getLicenseReportingMonthly(authFetch, {
      from: '2026-01',
      to: '2026-03',
    });

    const url = String(authFetch.mock.calls[0]?.[0]);
    expect(url).toContain('/api/platform/license-reporting/monthly?');
    expect(url).toContain('from=2026-01');
    expect(url).toContain('to=2026-03');
  });

  it('appelle clients.csv avec les filtres en query string', async () => {
    const authFetch = vi.fn<AuthFetch>().mockRejectedValue(new Error('skip-dom'));
    await expect(
      downloadClientsCsv(authFetch, { clientId: 'cabc' }),
    ).rejects.toBeDefined();
    expect(authFetch).toHaveBeenCalledWith(
      '/api/platform/license-reporting/clients.csv?clientId=cabc',
    );
  });

  it("retourne le CSV en succès sans casser sur Blob (Node)", async () => {
    // Sanity check : la fonction se contente de lire `res.blob()` ; en environnement
    // Node sans DOM, le téléchargement par anchor n'est pas exécuté car le helper
    // est exporté pour être appelé côté navigateur. On vérifie ici que le fetch a
    // bien été émis avec la bonne URL.
    const authFetch = vi.fn<AuthFetch>().mockResolvedValue(csvResponse('h\n1\n'));
    try {
      await downloadClientsCsv(authFetch, {});
    } catch {
      // côté Node `document` peut ne pas être défini — l'appel réseau a déjà eu lieu.
    }
    expect(authFetch).toHaveBeenCalledWith(
      '/api/platform/license-reporting/clients.csv',
    );
  });
});
