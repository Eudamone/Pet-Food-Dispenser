// jwt-auth.guard.ts
// Guard que exige un token Bearer válido y adjunta el usuario a la request.

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '@/services/auth.service.js';
import type { User } from '@/models/user.model.js';

export type AuthenticatedRequest = Request & { user?: User };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = JwtAuthGuard.extractBearer(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const user = await this.auth.authenticate(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = user;
    return true;
  }

  private static extractBearer(header?: string): string | null {
    if (!header) {
      return null;
    }
    const [scheme, value] = header.split(' ');
    if (!value || scheme.toLowerCase() !== 'bearer') {
      return null;
    }
    return value;
  }
}
