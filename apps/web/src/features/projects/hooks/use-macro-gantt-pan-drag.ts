'use client';

import { useCallback, useRef, useState } from 'react';

const DRAG_PX_PER_STEP = 72;

export function useMacroGanttPanDrag(
  panStep: number,
  maxPanStep: number,
  setPanStep: (step: number) => void,
) {
  const dragRef = useRef({ startX: 0, originStep: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      dragRef.current = { startX: e.clientX, originStep: panStep };
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [panStep],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const delta = dragRef.current.startX - e.clientX;
      const steps = Math.round(delta / DRAG_PX_PER_STEP);
      const next = Math.min(maxPanStep, Math.max(0, dragRef.current.originStep + steps));
      setPanStep(next);
    },
    [maxPanStep, setPanStep],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  return {
    isDragging,
    panHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
