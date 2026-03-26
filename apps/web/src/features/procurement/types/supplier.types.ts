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
  supplierCategoryId: string | null;
  supplierCategory: SupplierCategory | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierCategory {
  id: string;
  clientId: string;
  name: string;
  code: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

