'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ChatDrawerContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  closeDrawer: () => void;
  /** Ouvre le drawer (ex. FAB desktop — comportement inchangé si enregistré par le host). */
  openDrawerFresh: () => void;
  toggleDrawer: () => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  registerOpenFresh: (handler: () => void) => () => void;
};

const ChatDrawerContext = createContext<ChatDrawerContextValue | null>(null);

export function ChatDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const openFreshRef = useRef<(() => void) | null>(null);

  const registerOpenFresh = useCallback((handler: () => void) => {
    openFreshRef.current = handler;
    return () => {
      if (openFreshRef.current === handler) openFreshRef.current = null;
    };
  }, []);

  const openDrawerFresh = useCallback(() => {
    if (openFreshRef.current) {
      openFreshRef.current();
      return;
    }
    setOpen(true);
  }, []);

  const closeDrawer = useCallback(() => setOpen(false), []);
  const toggleDrawer = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    openDrawerFresh();
  }, [open, openDrawerFresh]);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      closeDrawer,
      openDrawerFresh,
      toggleDrawer,
      unreadCount,
      setUnreadCount,
      registerOpenFresh,
    }),
    [open, closeDrawer, openDrawerFresh, toggleDrawer, unreadCount, registerOpenFresh],
  );

  return <ChatDrawerContext.Provider value={value}>{children}</ChatDrawerContext.Provider>;
}

export function useChatDrawer(): ChatDrawerContextValue {
  const ctx = useContext(ChatDrawerContext);
  if (!ctx) {
    throw new Error('useChatDrawer must be used within ChatDrawerProvider');
  }
  return ctx;
}
