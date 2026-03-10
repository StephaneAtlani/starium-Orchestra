import type { ActiveClient } from '../context/active-client-context';
import { useContext } from 'react';
import { ActiveClientContext } from '../context/active-client-context';

export interface UseActiveClientValue {
  activeClient: ActiveClient | null;
  setActiveClient: (client: ActiveClient | null) => void;
  initialized: boolean;
}

export const useActiveClient = (): UseActiveClientValue => {
  return useContext(ActiveClientContext);
};

