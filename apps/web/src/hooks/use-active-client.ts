import { useContext } from 'react';
import { ActiveClientContext } from '../context/active-client-context';

export const useActiveClient = () => {
  return useContext(ActiveClientContext);
};

