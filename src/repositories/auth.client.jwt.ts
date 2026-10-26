// auth.client.jwt.ts
// Implementación de AuthClient basada en JWT (@nestjs/jwt).

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthClient } from '@/repositories/auth.client.js';
import type { PasswordResetClaims } from '@/repositories/auth.client.js';
import { DomainError } from '@/helpers/domain.error.js';
import { passwordResetExpiresInSeconds } from '@/helpers/password-reset.config.js';
import type { Id } from '@/models/types.js';

interface AccessTokenPayload {
  sub: Id;
  type?: 'access';
}

interface PasswordResetPayload {
  sub: Id;
  type: 'password-reset';
  email: string;
  credential: string;
}

@Injectable()
export class JwtAuthClient implements AuthClient {
  constructor(private readonly jwt: JwtService) {}

  async issueToken(userId: Id): Promise<string> {
    return this.jwt.signAsync({ sub: userId, type: 'access' });
  }

  async verifyToken(token: string): Promise<Id> {
    const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    if (!payload?.sub || (payload.type && payload.type !== 'access')) {
      throw new DomainError('Invalid access token');
    }
    return payload.sub;
  }

  async issuePasswordResetToken(
    userId: Id,
    email: string,
    credentialFingerprint: string,
  ): Promise<string> {
    const payload: PasswordResetPayload = {
      sub: userId,
      type: 'password-reset',
      email,
      credential: credentialFingerprint,
    };
    return this.jwt.signAsync(payload, {
      secret: this.passwordResetSecret(),
      expiresIn: passwordResetExpiresInSeconds(),
    });
  }

  async verifyPasswordResetToken(token: string): Promise<PasswordResetClaims> {
    try {
      const payload = await this.jwt.verifyAsync<PasswordResetPayload>(token, {
        secret: this.passwordResetSecret(),
      });
      if (
        payload?.type !== 'password-reset' ||
        !payload.sub ||
        !payload.email ||
        !payload.credential
      ) {
        throw new DomainError('Invalid password reset token');
      }
      return {
        userId: payload.sub,
        email: payload.email,
        credentialFingerprint: payload.credential,
      };
    } catch {
      throw new DomainError('Invalid or expired password reset token');
    }
  }

  private passwordResetSecret(): string {
    return (
      process.env.PASSWORD_RESET_SECRET ??
      process.env.JWT_SECRET ??
      'dev-insecure-secret'
    );
  }
}
