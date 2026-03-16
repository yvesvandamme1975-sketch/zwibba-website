import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';

import type { SessionRecord } from './auth.service';
import { AuthService } from './auth.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      currentSession?: SessionRecord;
      headers: {
        authorization?: string;
      };
    }>();
    const sessionToken = request.headers.authorization
      ?.replace(/^Bearer\s+/i, '')
      .trim();
    const session = await this.authService.requireSessionToken(sessionToken);

    request.currentSession = session;
    return true;
  }
}
