import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const ActiveClientId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const activeClient = (request as unknown as { activeClient?: { id: string } })
      .activeClient;
    return activeClient?.id;
  },
);
