import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  ActiveClientContext,
  RequestWithClient,
} from '../types/request-with-client';

/** Param decorator : extrait request.activeClient.id (à utiliser après ActiveClientGuard). */
export const ActiveClientId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithClient>();
    return request.activeClient?.id;
  },
);

/** Param decorator : injecte l’objet ActiveClientContext complet. */
export const ActiveClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActiveClientContext | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithClient>();
    return request.activeClient;
  },
);

/** Param decorator : injecte uniquement le rôle client actif. */
export const ActiveClientRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActiveClientContext['role'] | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithClient>();
    return request.activeClient?.role;
  },
);
