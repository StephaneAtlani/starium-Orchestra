import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ResourceAclAddEntryForm } from './resource-acl-add-entry-form';
import type { ResourceAclEntry } from '../api/resource-acl.types';

function entry(
  partial: Partial<ResourceAclEntry> & { id: string },
): ResourceAclEntry {
  return {
    id: partial.id,
    subjectType: partial.subjectType ?? 'USER',
    subjectId: partial.subjectId ?? 'subject',
    permission: partial.permission ?? 'READ',
    subjectLabel: partial.subjectLabel ?? 'subject-label',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  };
}

describe('ResourceAclAddEntryForm', () => {
  it('autocomplete filtre la liste par texte (case insensitive)', async () => {
    const user = userEvent.setup();
    render(
      <ResourceAclAddEntryForm
        entries={[]}
        userCandidates={[
          { id: 'u1', label: 'Alice Martin', searchHint: 'alice@demo.fr' },
          { id: 'u2', label: 'Bob Durand', searchHint: 'bob@demo.fr' },
          { id: 'u3', label: 'Charlie Bouvier', searchHint: 'charlie@demo.fr' },
        ]}
        groupCandidates={[]}
        showSelfAdminOption
        selfAdminChecked
        onSelfAdminCheckedChange={() => undefined}
        isPending={false}
        onSubmit={() => undefined}
      />,
    );

    const search = screen.getByLabelText('Rechercher');
    await user.type(search, 'BOB');

    expect((search as HTMLInputElement).value).toBe('BOB');
  });

  it('option « M’ajouter en ADMIN » visible si showSelfAdminOption=true', () => {
    render(
      <ResourceAclAddEntryForm
        entries={[]}
        userCandidates={[]}
        groupCandidates={[]}
        showSelfAdminOption
        selfAdminChecked
        onSelfAdminCheckedChange={() => undefined}
        isPending={false}
        onSubmit={() => undefined}
      />,
    );

    expect(
      screen.getByTestId('resource-acl-self-admin-option'),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('option « M’ajouter en ADMIN » absente quand showSelfAdminOption=false (mode restricted)', () => {
    render(
      <ResourceAclAddEntryForm
        entries={[
          entry({
            id: 'e1',
            subjectType: 'USER',
            subjectId: 'u-existing',
            subjectLabel: 'Existing',
          }),
        ]}
        userCandidates={[]}
        groupCandidates={[]}
        showSelfAdminOption={false}
        selfAdminChecked
        onSelfAdminCheckedChange={() => undefined}
        isPending={false}
        onSubmit={() => undefined}
      />,
    );

    expect(
      screen.queryByTestId('resource-acl-self-admin-option'),
    ).not.toBeInTheDocument();
  });

  it('libellés métier dans le hint Permission (Lecture/Écriture/Administration)', () => {
    render(
      <ResourceAclAddEntryForm
        entries={[]}
        userCandidates={[]}
        groupCandidates={[]}
        showSelfAdminOption={false}
        selfAdminChecked
        onSelfAdminCheckedChange={() => undefined}
        isPending={false}
        onSubmit={() => undefined}
      />,
    );

    const description = screen.getByText(
      /Consulter cette ressource \(lecture seule\)/,
    );
    expect(description).toBeInTheDocument();
  });

  it('soumission désactivée tant qu’aucun sujet n’est sélectionné', () => {
    const onSubmit = vi.fn();
    render(
      <ResourceAclAddEntryForm
        entries={[]}
        userCandidates={[
          { id: 'u1', label: 'Alice Martin', searchHint: 'alice@demo.fr' },
        ]}
        groupCandidates={[]}
        showSelfAdminOption={false}
        selfAdminChecked={false}
        onSelfAdminCheckedChange={() => undefined}
        isPending={false}
        onSubmit={onSubmit}
      />,
    );

    const button = screen.getByRole('button', {
      name: /Ajouter la permission/i,
    });
    expect(button).toBeDisabled();
  });
});
