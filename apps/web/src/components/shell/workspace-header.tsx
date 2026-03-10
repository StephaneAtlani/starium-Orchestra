"use client";

import React from 'react';

export function WorkspaceHeader() {
  return (
    <header
      className="h-14 sticky top-0 z-10 flex items-center justify-between shrink-0 px-6 shadow-sm"
      style={{
        background: 'var(--color-bg-card)',
        color: 'var(--color-text-primary)',
        borderBottom: '1px solid var(--color-border-default)',
      }}
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          Cockpit Starium Orchestra
        </span>
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Pilotage multi-clients
        </span>
      </div>
      <div
        className="flex items-center gap-3 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Client actif
      </div>
    </header>
  );
}

