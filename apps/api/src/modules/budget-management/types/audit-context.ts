export interface AuditContext {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
}

export interface ListResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
