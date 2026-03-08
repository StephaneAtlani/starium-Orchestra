import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/** Param decorator : extrait request.user.userId (à utiliser après JwtAuthGuard). */
export const RequestUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as unknown as { user?: { userId: string } }).user;
    return user?.userId;
  },
);
