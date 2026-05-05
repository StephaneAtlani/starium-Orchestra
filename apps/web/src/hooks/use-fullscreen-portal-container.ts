'use client';

import { useEffect, useState } from 'react';

/**
 * Retourne l'élément actuellement en plein écran (Fullscreen API), s'il existe.
 *
 * Utile pour le `container` des Portals (Select, Tooltip, Dialog, …) :
 * sans ça, base-ui monte le popup dans `document.body` qui est *en dehors*
 * du sous-arbre rendu par le navigateur en mode plein écran → menus invisibles.
 *
 * Hors plein écran, retourne `undefined` (= comportement par défaut, body).
 */
export function useFullscreenPortalContainer(): HTMLElement | undefined {
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined);

  useEffect(() => {
    const sync = () => {
      const el = document.fullscreenElement as HTMLElement | null;
      setContainer(el ?? undefined);
    };
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync as EventListener);
    };
  }, []);

  return container;
}
