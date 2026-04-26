import type { InternalSearchHit } from './search.types';

export type SearchAdapterContext = {
  userId: string;
  clientId: string;
  normalizedQuery: string;
  permissionCodes: Set<string>;
};

export interface SearchAdapter {
  search(ctx: SearchAdapterContext): Promise<InternalSearchHit[]>;
}
