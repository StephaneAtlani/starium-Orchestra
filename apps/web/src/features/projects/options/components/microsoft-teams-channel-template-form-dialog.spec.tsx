import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM,
  MicrosoftTeamsChannelTemplateFormDialog,
} from './microsoft-teams-channel-template-form-dialog';

vi.mock('@/components/layout/form-dialog-shell', () => ({
  StariumModal: ({
    open,
    title,
    children,
    footer,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={typeof title === 'string' ? title : 'dialog'}>
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    ) : null,
}));

describe('MicrosoftTeamsChannelTemplateFormDialog', () => {
  it('charge les valeurs initiales à l’ouverture en mode édition', () => {
    render(
      <MicrosoftTeamsChannelTemplateFormDialog
        open
        onOpenChange={vi.fn()}
        mode="edit"
        initialValues={{
          displayName: 'Pilotage',
          description: 'Desc',
          isPrimary: true,
        }}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        isPending={false}
        canEdit
      />,
    );

    expect(screen.getByLabelText('Nom du canal')).toHaveValue('Pilotage');
    expect(screen.getByLabelText('Description')).toHaveValue('Desc');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('réinitialise les champs en mode création', () => {
    const { rerender } = render(
      <MicrosoftTeamsChannelTemplateFormDialog
        open={false}
        onOpenChange={vi.fn()}
        mode="create"
        initialValues={EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        isPending={false}
        canEdit
      />,
    );

    rerender(
      <MicrosoftTeamsChannelTemplateFormDialog
        open
        onOpenChange={vi.fn()}
        mode="create"
        initialValues={EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        isPending={false}
        canEdit
      />,
    );

    expect(screen.getByLabelText('Nom du canal')).toHaveValue('');
  });

  it('envoie displayName trimé et ferme après succès', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <MicrosoftTeamsChannelTemplateFormDialog
        open
        onOpenChange={onOpenChange}
        mode="create"
        initialValues={EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM}
        onSubmit={onSubmit}
        isPending={false}
        canEdit
      />,
    );

    await user.type(screen.getByLabelText('Nom du canal'), '  Pilotage  ');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        displayName: 'Pilotage',
        description: '',
        isPrimary: false,
      });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reste ouvert et affiche l’erreur si onSubmit échoue', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn().mockRejectedValue(new Error('Échec API'));

    render(
      <MicrosoftTeamsChannelTemplateFormDialog
        open
        onOpenChange={onOpenChange}
        mode="create"
        initialValues={EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM}
        onSubmit={onSubmit}
        isPending={false}
        canEdit
        errorMessage="Échec API"
      />,
    );

    await user.type(screen.getByLabelText('Nom du canal'), 'Pilotage');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('alert')).toHaveTextContent('Échec API');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('désactive le submit si canEdit=false, isPending=true ou displayName vide', () => {
    const { rerender } = render(
      <MicrosoftTeamsChannelTemplateFormDialog
        open
        onOpenChange={vi.fn()}
        mode="create"
        initialValues={EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM}
        onSubmit={vi.fn()}
        isPending={false}
        canEdit={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeDisabled();

    rerender(
      <MicrosoftTeamsChannelTemplateFormDialog
        open
        onOpenChange={vi.fn()}
        mode="create"
        initialValues={EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM}
        onSubmit={vi.fn()}
        isPending
        canEdit
      />,
    );

    expect(screen.getByRole('button', { name: 'Enregistrement…' })).toBeDisabled();
  });
});
