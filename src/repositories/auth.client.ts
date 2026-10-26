// auth.client.ts
// Puerto hacia el proveedor de tokens de autenticación.

import type { Id } from '@/models/types.js';

export interface PasswordResetClaims {
  userId: Id;
  email: string;
  credentialFingerprint: string;
}

export interface AuthClient {
  issueToken(userId: Id): Promise<string>;
  verifyToken(token: string): Promise<Id>;
  issuePasswordResetToken(
    userId: Id,
    email: string,
    credentialFingerprint: string,
  ): Promise<string>;
  verifyPasswordResetToken(token: string): Promise<PasswordResetClaims>;
}

export const AUTH_CLIENT = Symbol('AuthClient');
