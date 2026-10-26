// auth.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AUTH_CLIENT } from '@/repositories/auth.client.js';
import type { AuthClient } from '@/repositories/auth.client.js';
import { EMAIL_CLIENT } from '@/repositories/email.client.js';
import type { EmailClient } from '@/repositories/email.client.js';
import { USER_REPOSITORY } from '@/repositories/user.repository.interface.js';
import type { UserRepository } from '@/repositories/user.repository.interface.js';
import { User } from '@/models/user.model.js';
import { Credential } from '@/helpers/credential.vo.js';
import {
  buildPasswordResetLink,
  passwordResetTtlMinutes,
} from '@/helpers/password-reset.config.js';
import { Result } from '@/helpers/result.js';
import type { Id } from '@/models/types.js';

// Resultado del registro/inicio de sesión: usuario + token JWT para el front.
export interface AuthResult {
  accessToken: string;
  user: User;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AUTH_CLIENT)
    private readonly authClient: AuthClient,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(EMAIL_CLIENT)
    private readonly emails: EmailClient,
  ) {}

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<Result<AuthResult>> {
    try {
      if (await this.users.findByEmail(email)) {
        return Result.fail('Email is already registered');
      }
      const user = User.create({
        id: randomUUID(),
        name,
        email,
        password: Credential.create(password),
      });
      await this.users.save(user);
      await this.sendRegistrationConfirmation(user);
      const accessToken = await this.authClient.issueToken(user.id);
      return Result.ok({ accessToken, user });
    } catch (error) {
      return Result.fail(AuthService.message(error));
    }
  }

  async signIn(email: string, password: string): Promise<Result<AuthResult>> {
    try {
      const user = await this.users.findByEmail(email);
      if (!user || !user.password || !user.password.matches(password)) {
        return Result.fail('Invalid email or password');
      }
      const accessToken = await this.authClient.issueToken(user.id);
      return Result.ok({ accessToken, user });
    } catch (error) {
      return Result.fail(AuthService.message(error));
    }
  }

  // Valida el token y devuelve el usuario dueño. Usado por el guard.
  async authenticate(token: string): Promise<User | null> {
    try {
      const userId = await this.authClient.verifyToken(token);
      return this.users.findById(userId);
    } catch {
      return null;
    }
  }

  async currentUser(userId: Id): Promise<User | null> {
    return this.users.findById(userId);
  }

  async requestEmailChange(userId: Id, newEmail: string): Promise<Result<void>> {
    const user = await this.users.findById(userId);
    if (!user) {
      return Result.fail('User not found');
    }
    if (await this.users.findByEmail(newEmail)) {
      return Result.fail('Email is already registered');
    }
    user.applyVerifiedEmail(newEmail);
    await this.users.save(user);
    return Result.ok<void>(undefined);
  }

  async requestPasswordReset(email: string): Promise<Result<void>> {
    try {
      const user = await this.users.findByEmail(email);

      // No se revela si el correo está registrado. Si no existe, no se envía nada.
      if (!user?.password) {
        return Result.ok<void>(undefined);
      }

      const token = await this.authClient.issuePasswordResetToken(
        user.id,
        user.email.value,
        user.password.fingerprint(),
      );
      const link = buildPasswordResetLink(token);
      const minutes = passwordResetTtlMinutes();
      const safeName = AuthService.escapeHtml(user.name);

      await this.emails.send({
        to: user.email.value,
        subject: 'Restablece tu contraseña — Pet Foodie Dispenser',
        text: [
          `Hola ${user.name},`,
          '',
          'Recibimos una solicitud para restablecer la contraseña de tu cuenta.',
          '',
          `Abre este enlace para crear una nueva contraseña: ${link}`,
          '',
          `El enlace vence en ${minutes} minutos y solo puede usarse una vez.`,
          'Si no solicitaste este cambio, ignora este correo.',
        ].join('\n'),
        html: [
          `<p>Hola ${safeName},</p>`,
          '<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>',
          `<p><a href="${link}">Crear una nueva contraseña</a></p>`,
          `<p>El enlace vence en ${minutes} minutos y solo puede usarse una vez.</p>`,
          '<p>Si no solicitaste este cambio, ignora este correo.</p>',
        ].join(''),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de recuperación a ${email}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    // Siempre responde igual para no filtrar qué correos están registrados.
    return Result.ok<void>(undefined);
  }

  async confirmPasswordReset(
    token: string,
    newPassword: string,
  ): Promise<Result<void>> {
    try {
      const claims = await this.authClient.verifyPasswordResetToken(token);
      const user = await this.users.findById(claims.userId);

      if (
        !user?.password ||
        user.email.value !== claims.email ||
        user.password.fingerprint() !== claims.credentialFingerprint
      ) {
        return Result.fail('Invalid or expired password reset token');
      }

      user.password = Credential.create(newPassword);
      await this.users.save(user);
      return Result.ok<void>(undefined);
    } catch (error) {
      return Result.fail(AuthService.message(error));
    }
  }

  async changePassword(userId: Id, newPassword: string): Promise<Result<void>> {
    const user = await this.users.findById(userId);
    if (!user) {
      return Result.fail('User not found');
    }
    user.password = Credential.create(newPassword);
    await this.users.save(user);
    return Result.ok<void>(undefined);
  }

  signOut(): void {
    // El token es stateless: el front solo debe descartarlo.
  }

  private static message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private async sendRegistrationConfirmation(user: User): Promise<void> {
    const safeName = AuthService.escapeHtml(user.name);
    try {
      await this.emails.send({
        to: user.email.value,
        subject: 'Confirma tu registro — Pet Foodie Dispenser',
        text: [
          `Hola ${user.name},`,
          '',
          'Tu cuenta de Pet Foodie Dispenser se creó correctamente.',
          'Ya puedes iniciar sesión y configurar el dispensador de tu mascota.',
        ].join('\n'),
        html: [
          `<p>Hola ${safeName},</p>`,
          '<p>Tu cuenta de Pet Foodie Dispenser se creó correctamente.</p>',
          '<p>Ya puedes iniciar sesión y configurar el dispensador de tu mascota.</p>',
        ].join(''),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar la confirmación de registro a ${user.email.value}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private static escapeHtml(value: string): string {
    const characters: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return value.replace(/[&<>"']/g, (character) => characters[character] ?? character);
  }
}
