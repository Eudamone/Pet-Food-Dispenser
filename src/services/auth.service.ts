import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../domain/User.js';

@Injectable()
export class AuthService {
  async currentUser(token: string): Promise<User> {
    const url = process.env.SUPABASE_URL;
    const apiKey = process.env.SUPABASE_ANON_KEY;

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

    try {
      return new User(data.id, data.email, data.email);
    } catch {
      throw new ServiceUnavailableException(
        'El proveedor devolvió datos de usuario inválidos.',
      );
    }
  }
}
