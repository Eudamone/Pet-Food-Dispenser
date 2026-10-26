// current-user.decorator.ts
// Extrae el usuario autenticado que el JwtAuthGuard dejó en la request.

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@/models/user.model.js';
import type { AuthenticatedRequest } from '@/controllers/jwt-auth.guard.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user as User,
);
