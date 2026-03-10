import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Param decorator : extrait des métadonnées de requête utiles à l’audit.
 * - ip: req.ip (dépend de trust proxy)
 * - userAgent: header user-agent
 * - requestId: header x-request-id (et/ou req.requestId si middleware)
 */
export const RequestMeta = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestMeta => {
    const req = ctx.switchToHttp().getRequest<Request & { requestId?: string }>();
    const ua = req.headers['user-agent'];
    const headerRid = req.headers['x-request-id'];

    return {
      ipAddress: typeof req.ip === 'string' ? req.ip : undefined,
      userAgent: typeof ua === 'string' ? ua : undefined,
      requestId:
        (typeof headerRid === 'string' && headerRid.length > 0
          ? headerRid
          : undefined) ?? req.requestId,
    };
  },
);

