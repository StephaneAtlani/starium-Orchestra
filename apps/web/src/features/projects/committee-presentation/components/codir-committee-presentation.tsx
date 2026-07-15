'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { useCodirPageSettings, type CodirPageSettings } from '../hooks/use-codir-page-settings';
import { useCommitteeCodirDeckQuery } from '../hooks/use-committee-codir-deck-query';
import { sortDeckProjects } from '../lib/codir-deck-metrics';
import { CodirPrepView } from './codir-prep-view';
import { CodirPresentationOverlay } from './codir-presentation-overlay';
import { CodirPresentationLaunchDialog } from './codir-presentation-launch-dialog';

export function CodirCommitteePresentation() {
  const { has, isSuccess: permsSuccess } = usePermissions();
  const canRead = has('projects.read');
  const { settings, saveSettings } = useCodirPageSettings();
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [presentationStartSlide, setPresentationStartSlide] = useState(0);
  const [presentationSettings, setPresentationSettings] = useState(settings);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [configProjectId, setConfigProjectId] = useState<string | null>(null);

  const deckQ = useCommitteeCodirDeckQuery({ enabled: permsSuccess && canRead });
  const sortedProjects = useMemo(
    () => sortDeckProjects(deckQ.data ?? []),
    [deckQ.data],
  );

  const handleOpenConfigure = useCallback((projectId: string | null = null) => {
    setConfigProjectId(projectId);
    setConfigOpen(true);
  }, []);

  const handleConfigOpenChange = useCallback((open: boolean) => {
    setConfigOpen(open);
    if (!open) setConfigProjectId(null);
  }, []);

  const handleOpenPresentationLaunch = useCallback(() => {
    setLaunchOpen(true);
  }, []);

  const handleLaunchPresentation = useCallback(
    (slideIndex = 0, launchSettings?: CodirPageSettings) => {
      setPresentationSettings(launchSettings ?? settings);
      setPresentationStartSlide(slideIndex);
      setPresentationOpen(true);
    },
    [settings],
  );

  const handleStartPresentation = useCallback(
    (slideIndex = 0, launchSettings?: CodirPageSettings) => {
      setPresentationSettings(launchSettings ?? settings);
      setPresentationStartSlide(slideIndex);
      setPresentationOpen(true);
    },
    [settings],
  );

  if (!permsSuccess) {
    return <p className="text-sm text-muted-foreground">Chargement des permissions…</p>;
  }

  if (!canRead) {
    return (
      <p className="text-sm text-destructive">
        Permission <code className="rounded bg-muted px-1">projects.read</code> requise.
      </p>
    );
  }

  return (
    <>
      <CodirPrepView
        settings={settings}
        onSaveSettings={saveSettings}
        configOpen={configOpen}
        onConfigOpenChange={handleConfigOpenChange}
        configProjectId={configProjectId}
        onOpenConfigure={handleOpenConfigure}
        onOpenPresentationLaunch={handleOpenPresentationLaunch}
        onStartPresentation={handleStartPresentation}
      />
      <CodirPresentationLaunchDialog
        open={launchOpen}
        onOpenChange={setLaunchOpen}
        projects={sortedProjects}
        settings={settings}
        onSaveSettings={saveSettings}
        onLaunch={handleLaunchPresentation}
      />
      <CodirPresentationOverlay
        open={presentationOpen}
        initialSlide={presentationStartSlide}
        settings={presentationSettings}
        onClose={() => setPresentationOpen(false)}
      />
    </>
  );
}
