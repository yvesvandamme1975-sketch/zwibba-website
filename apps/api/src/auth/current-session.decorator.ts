import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { SessionRecord } from './auth.service';

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionRecord | undefined => {
    const request = context.switchToHttp().getRequest<{
      currentSession?: SessionRecord;
    }>();

    return request.currentSession;
  },
);
