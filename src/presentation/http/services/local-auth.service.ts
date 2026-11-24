import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { User } from '../../../domain/entities/User.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../../domain/repositories/user.repository.js';
import type { LoginDto, RegisterDto } from '../dtos/auth.dto.js';

@Injectable()
export class LocalAuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async register(input: RegisterDto) {
    this.signingKey();
    const salt = randomBytes(16).toString('hex');
    const key = await this.derivePassword(input.password, salt);
    const user = new User(
      randomUUID(),
      input.name,
      input.email.trim().toLowerCase(),
    );
    await this.users.createLocalUser(user, salt + ':' + key.toString('hex'));
    return this.session(user);
  }

  async login(input: LoginDto) {
    this.signingKey();
    const credentials = await this.users.findLocalCredentials(
      input.email.trim().toLowerCase(),
    );
    const [salt, saved] = credentials?.passwordHash.split(':') ?? [
      '00000000000000000000000000000000',
      '',
    ];
    const key = await this.derivePassword(input.password, salt);
    const expected = Buffer.from(saved, 'hex');
    if (
      !credentials ||
      key.length !== expected.length ||
      !timingSafeEqual(key, expected)
    )
      throw new UnauthorizedException(
        'El correo o la contraseña son incorrectos.',
      );
    const user = await this.users.findById(credentials.userId);
    if (!user) throw new UnauthorizedException('La cuenta no está disponible.');
    return this.session(user);
  }

  async currentUser(token: string): Promise<User> {
    const key = this.signingKey();
    let userId: string;
    try {
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['HS256'],
        issuer: 'pet-feeder-local',
        audience: 'pet-feeder-app',
      });
      if (typeof payload.sub !== 'string')
        throw new Error('Sesión sin usuario.');
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('La sesión no es válida o venció.');
    }
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('La cuenta no está disponible.');
    return user;
  }

  private signingKey(): Uint8Array {
    if (process.env.AUTH_DRIVER !== 'local')
      throw new ServiceUnavailableException(
        'El acceso con contraseña local no está habilitado.',
      );
    const secret = process.env.AUTH_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32)
      throw new ServiceUnavailableException(
        'Configura AUTH_SECRET con al menos 32 caracteres.',
      );
    return new TextEncoder().encode(secret);
  }

  private derivePassword(password: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(
        password,
        salt,
        64,
        { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
        (error, key) => {
          if (error) reject(error);
          else resolve(key);
        },
      );
    });
  }

  private async session(user: User) {
    const accessToken = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer('pet-feeder-local')
      .setAudience('pet-feeder-app')
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.signingKey());
    return {
      accessToken,
      tokenType: 'Bearer',
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}
