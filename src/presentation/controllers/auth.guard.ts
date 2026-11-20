import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../../domain/User.js';
import { AuthService } from '../../services/auth.service.js';

export type AuthenticatedRequest = Request & { user: User };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match =
      typeof authorization === 'string'
        ? /^Bearer\s+(\S+)$/i.exec(authorization)
        : null;

    if (!match) throw new UnauthorizedException('Debes iniciar sesión.');

    request.user = await this.auth.currentUser(match[1]);
    return true;
  }
}
