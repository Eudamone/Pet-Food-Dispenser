// auth.module.ts
// Módulo de autenticación: registra JwtModule y el emisor/verificador de tokens.

import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AUTH_CLIENT } from '@/repositories/auth.client.js';
import { JwtAuthClient } from '@/repositories/auth.client.jwt.js';
import { EMAIL_CLIENT } from '@/repositories/email.client.js';
import { NodemailerEmailClient } from '@/repositories/email.client.nodemailer.js';

// Convierte "1d", "12h", "30m", "3600s" a segundos. Por defecto 1 día.
function expiresInSeconds(value: string | undefined): number {
  const match = /^(\d+)([smhd])?$/.exec((value ?? '1d').trim());
  if (!match) {
    return 86400;
  }
  const amount = Number(match[1]);
  const factors: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * (factors[match[2] ?? 's'] ?? 1);
}

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret && process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET is required in production');
        }
        return {
          secret: secret ?? 'dev-insecure-secret',
          signOptions: { expiresIn: expiresInSeconds(process.env.JWT_EXPIRES_IN) },
        };
      },
    }),
  ],
  providers: [
    { provide: AUTH_CLIENT, useClass: JwtAuthClient },
    { provide: EMAIL_CLIENT, useClass: NodemailerEmailClient },
  ],
  exports: [AUTH_CLIENT, EMAIL_CLIENT, JwtModule],
})
export class AuthModule {}
