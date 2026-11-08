import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../domain/User.js';
import { UserRepository } from '../repositories/user.repository.js';

@Injectable()
export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async currentUser(token: string): Promise<User> {
    const url = process.env.SUPABASE_URL;
    const apiKey =
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!url || !apiKey) {
      throw new ServiceUnavailableException(
        'Falta configurar la conexión con Supabase Auth.',
      );
    }

    let response: Response;
    try {
      response = await fetch(url.replace(/\/$/, '') + '/auth/v1/user', {
        headers: { apikey: apiKey, Authorization: 'Bearer ' + token },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException('No se pudo verificar la sesión.');
    }

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedException('La sesión no es válida o venció.');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'El proveedor de autenticación no está disponible.',
      );
    }

    let data: { id?: unknown; email?: unknown } | null;
    try {
      data = (await response.json()) as typeof data;
    } catch {
      throw new ServiceUnavailableException(
        'El proveedor devolvió una respuesta inválida.',
      );
    }
    if (
      !data ||
      typeof data.id !== 'string' ||
      !data.id.trim() ||
      typeof data.email !== 'string' ||
      !data.email.trim()
    ) {
      throw new ServiceUnavailableException(
        'El proveedor no devolvió un usuario válido.',
      );
    }

    let identity: User;
    try {
      identity = new User(data.id, data.email, data.email);
    } catch {
      throw new ServiceUnavailableException(
        'El proveedor devolvió datos de usuario inválidos.',
      );
    }
    return (await this.loadProfile(identity)) ?? identity;
  }

  async createProfile(identity: User, name: string): Promise<User> {
    const existing = await this.loadProfile(identity);
    return (
      existing ?? this.users.save(new User(identity.id, name, identity.email))
    );
  }

  async getProfile(identity: User): Promise<User> {
    const profile = await this.loadProfile(identity);
    if (!profile)
      throw new NotFoundException('Primero debes completar tu perfil.');
    return profile;
  }

  async updateProfile(identity: User, name?: string): Promise<User> {
    const profile = await this.getProfile(identity);
    if (name === undefined) return profile;
    profile.rename(name);
    return this.users.save(profile);
  }

  private async loadProfile(identity: User): Promise<User | null> {
    const profile = await this.users.findById(identity.id);
    if (profile && profile.email !== identity.email) {
      profile.applyVerifiedEmail(identity.email);
      return this.users.save(profile);
    }
    return profile;
  }
}
