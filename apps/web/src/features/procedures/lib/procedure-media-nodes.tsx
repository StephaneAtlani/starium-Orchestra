'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from '@tiptap/react';
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { downloadProcedureAssetBlob } from '../api/procedures.api';
import { displayLabel } from '@/lib/display-label';

export type ProcedureMediaExtensionOptions = {
  procedureId: string;
  authFetch: AuthFetch;
};

function ProcedureImageView({
  node,
  extension,
  selected,
}: ReactNodeViewProps) {
  const assetId = String(node.attrs.assetId ?? '');
  const alt = displayLabel(node.attrs.alt as string | undefined, 'Image');
  const opts = extension.options as ProcedureMediaExtensionOptions;
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    if (!assetId || !opts.procedureId || !opts.authFetch) return;
    void (async () => {
      try {
        const blob = await downloadProcedureAssetBlob(
          opts.authFetch,
          opts.procedureId,
          assetId,
        );
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setSrc(url);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [assetId, opts.authFetch, opts.procedureId]);

  return (
    <NodeViewWrapper
      className={
        selected
          ? 'my-3 rounded-[var(--radius-md)] ring-2 ring-[color-mix(in_srgb,var(--brand-gold)_45%,transparent)]'
          : 'my-3'
      }
      data-drag-handle
    >
      {error ? (
        <p className="text-sm text-muted-foreground" role="status">
          Image indisponible
        </p>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="max-h-80 max-w-full rounded-[var(--radius-md)] border border-border/70"
        />
      ) : (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Chargement de l&apos;image…
        </p>
      )}
    </NodeViewWrapper>
  );
}

function ProcedureFileView({ node, selected }: ReactNodeViewProps) {
  const label = displayLabel(
    node.attrs.label as string | undefined,
    'Pièce jointe',
  );
  return (
    <NodeViewWrapper
      className={
        selected
          ? 'my-2 rounded-[var(--radius-md)] ring-2 ring-[color-mix(in_srgb,var(--brand-gold)_45%,transparent)]'
          : 'my-2'
      }
      data-drag-handle
    >
      <div className="inline-flex min-h-11 items-center gap-2 rounded-[var(--control-radius)] border border-border/70 bg-muted/30 px-3 py-2 text-sm">
        <FileText className="size-4 shrink-0 text-[var(--brand-gold-700)]" aria-hidden />
        <span>{label}</span>
      </div>
    </NodeViewWrapper>
  );
}

export const ProcedureImage = Node.create<ProcedureMediaExtensionOptions>({
  name: 'procedureImage',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      procedureId: '',
      authFetch: (async () => new Response(null, { status: 401 })) as AuthFetch,
    };
  },

  addAttributes() {
    return {
      assetId: { default: null },
      alt: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-procedure-image]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-procedure-image': '' }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProcedureImageView);
  },
});

export const ProcedureFile = Node.create<ProcedureMediaExtensionOptions>({
  name: 'procedureFile',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return {
      procedureId: '',
      authFetch: (async () => new Response(null, { status: 401 })) as AuthFetch,
    };
  },

  addAttributes() {
    return {
      assetId: { default: null },
      label: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-procedure-file]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-procedure-file': '' }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProcedureFileView);
  },
});
