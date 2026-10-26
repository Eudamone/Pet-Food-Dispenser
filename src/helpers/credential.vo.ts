// credential.vo.ts
// Credencial de acceso. La contraseña se guarda como hash bcrypt con sal.

import { compareSync, hashSync } from 'bcryptjs';
import { createHash } from 'crypto';
import { DomainError } from '@/helpers/domain.error.js';

const SALT_ROUNDS = 10;

export class Credential {
  private constructor(public readonly hash: string) {}

  static fromHash(hash: string): Credential {
    return new Credential(hash);
  }

  static create(rawPassword: string): Credential {
    if (!rawPassword || rawPassword.length < 6) {
      throw new DomainError('Password must have at least 6 characters');
    }
    return new Credential(hashSync(rawPassword, SALT_ROUNDS));
  }

  matches(rawPassword: string): boolean {
    if (!this.hash) {
      return false;
    }
    return compareSync(rawPassword, this.hash);
  }

  // Identifica la contraseña actual sin exponer el hash en un token.
  fingerprint(): string {
    return createHash('sha256').update(this.hash).digest('hex');
  }

  toJSON(): string {
    return '[REDACTED]';
  }
}
