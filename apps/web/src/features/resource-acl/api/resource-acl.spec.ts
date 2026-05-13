import { describe, expect, it, vi } from 'vitest';
import {
  addResourceAclEntry,
  listResourceAcl,
  removeResourceAclEntry,
  replaceResourceAcl,
  updateResourceAccessPolicy,
  type AuthFetch,
} from './resource-acl';

function okResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

function errorResponse(status: number, message = 'Erreur'): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const emptyListPayload = {
  restricted: false,
  accessPolicy: 'DEFAULT' as const,
  effectiveAccessMode: 'PUBLIC_DEFAULT' as const,
  entries: [],
};

describe('resource-acl api', () => {
  it('encode strictement le resourceType et le resourceId dans l’URL GET', async () => {
    const authFetch = vi
      .fn<AuthFetch>()
      .mockResolvedValue(okResponse(emptyListPayload));

    await listResourceAcl(authFetch, 'PROJECT', 'cabcdefghijklmnopqrstuvw1');

    const url = String(authFetch.mock.calls[0]?.[0] ?? '');
    expect(url).toBe(
      '/api/resource-acl/PROJECT/cabcdefghijklmnopqrstuvw1',
    );
  });

  it('POST entries — body sans clientId, méthode et headers corrects', async () => {
    const authFetch = vi.fn<AuthFetch>().mockResolvedValue(
      okResponse({
        id: 'cnewid000000000000000001',
        subjectType: 'USER',
        subjectId: 'cuser0000000000000000001',
        permission: 'READ',
        subjectLabel: 'Alice (alice@demo)',
        createdAt: '2026-05-08T00:00:00Z',
        updatedAt: '2026-05-08T00:00:00Z',
      }),
    );

    await addResourceAclEntry(
      authFetch,
      'BUDGET',
      'cbudget00000000000000001',
      {
        subjectType: 'USER',
        subjectId: 'cuser0000000000000000001',
        permission: 'READ',
      },
    );

    const [url, init] = authFetch.mock.calls[0]!;
    expect(String(url)).toBe(
      '/api/resource-acl/BUDGET/cbudget00000000000000001/entries',
    );
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    const body = JSON.parse(String(init?.body ?? '{}'));
    expect(body).not.toHaveProperty('clientId');
    expect(body).toEqual({
      subjectType: 'USER',
      subjectId: 'cuser0000000000000000001',
      permission: 'READ',
    });
  });

  it('DELETE entry — encode l’entryId dans l’URL', async () => {
    const authFetch = vi.fn<AuthFetch>().mockResolvedValue(noContentResponse());

    await removeResourceAclEntry(
      authFetch,
      'CONTRACT',
      'ccontract000000000000001',
      'centry000000000000000001',
    );

    const [url, init] = authFetch.mock.calls[0]!;
    expect(String(url)).toBe(
      '/api/resource-acl/CONTRACT/ccontract000000000000001/entries/centry000000000000000001',
    );
    expect(init?.method).toBe('DELETE');
  });

  it('PUT replace — body sans clientId, structure { entries }', async () => {
    const authFetch = vi
      .fn<AuthFetch>()
      .mockResolvedValue(
        okResponse({
          restricted: true,
          accessPolicy: 'DEFAULT',
          effectiveAccessMode: 'ACL_RESTRICTED',
          entries: [],
        }),
      );

    await replaceResourceAcl(
      authFetch,
      'SUPPLIER',
      'csupplier00000000000001x',
      [
        {
          subjectType: 'GROUP',
          subjectId: 'cgroup00000000000000001x',
          permission: 'ADMIN',
        },
      ],
    );

    const [url, init] = authFetch.mock.calls[0]!;
    expect(String(url)).toBe(
      '/api/resource-acl/SUPPLIER/csupplier00000000000001x',
    );
    expect(init?.method).toBe('PUT');
    const body = JSON.parse(String(init?.body ?? '{}'));
    expect(body).not.toHaveProperty('clientId');
    expect(body).toEqual({
      entries: [
        {
          subjectType: 'GROUP',
          subjectId: 'cgroup00000000000000001x',
          permission: 'ADMIN',
        },
      ],
    });
  });

  it('mappe 403 sur un message générique (anti-fuite)', async () => {
    const authFetch = vi
      .fn<AuthFetch>()
      .mockResolvedValue(errorResponse(403, 'Forbidden'));

    await expect(
      listResourceAcl(authFetch, 'PROJECT', 'cabcdefghijklmnopqrstuvw1'),
    ).rejects.toThrow(/autorisation/i);
  });

  it('mappe 404 sur un message générique (anti-fuite)', async () => {
    const authFetch = vi
      .fn<AuthFetch>()
      .mockResolvedValue(errorResponse(404, 'Not Found'));

    await expect(
      listResourceAcl(authFetch, 'PROJECT', 'cabcdefghijklmnopqrstuvw1'),
    ).rejects.toThrow(/introuvable/i);
  });

  it('mappe 400 (validation) en propageant le message backend', async () => {
    const authFetch = vi
      .fn<AuthFetch>()
      .mockResolvedValue(errorResponse(400, 'subjectId invalide'));

    await expect(
      addResourceAclEntry(
        authFetch,
        'PROJECT',
        'cabcdefghijklmnopqrstuvw1',
        {
          subjectType: 'USER',
          subjectId: 'invalid',
          permission: 'READ',
        },
      ),
    ).rejects.toThrow(/subjectId invalide/);
  });

  it('mappe 403 sur DELETE entry', async () => {
    const authFetch = vi
      .fn<AuthFetch>()
      .mockResolvedValue(errorResponse(403, 'Forbidden'));

    await expect(
      removeResourceAclEntry(
        authFetch,
        'PROJECT',
        'cabcdefghijklmnopqrstuvw1',
        'centry000000000000000001',
      ),
    ).rejects.toThrow(/autorisation/i);
  });

  it('PATCH access-policy — URL et body', async () => {
    const authFetch = vi.fn<AuthFetch>().mockResolvedValue(okResponse(emptyListPayload));
    await updateResourceAccessPolicy(
      authFetch,
      'PROJECT',
      'cabcdefghijklmnopqrstuvw1',
      'RESTRICTIVE',
    );
    const [url, init] = authFetch.mock.calls[0]!;
    expect(String(url)).toBe(
      '/api/resource-acl/PROJECT/cabcdefghijklmnopqrstuvw1/access-policy',
    );
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(String(init?.body ?? '{}'))).toEqual({ mode: 'RESTRICTIVE' });
  });
});
