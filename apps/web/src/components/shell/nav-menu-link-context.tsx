'use client';

import React from 'react';

export const NavMenuLinkContext = React.createContext<{
  onLinkClick?: () => void;
}>({});

export function useNavMenuLink() {
  return React.useContext(NavMenuLinkContext);
}
