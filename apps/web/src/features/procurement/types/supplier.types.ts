export interface SupplierOption {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  siret: string | null;
  vatNumber: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

