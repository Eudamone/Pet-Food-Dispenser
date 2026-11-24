import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SignJWT } from 'jose';
import { PersistenceModule } from '../dist/infrastructure/persistence/persistence.module.js';
import { PresentationModule } from '../dist/presentation/presentation.module.js';
import { USER_REPOSITORY } from '../dist/domain/repositories/user.repository.js';
import { DEVICE_MESSENGER } from '../dist/domain/ports/device-messenger.port.js';

const secret = 'local-auth-test-secret-with-at-least-32-characters';

describe('Registro y sesión locales', () => {
  let app: INestApplication;
  let users: {
    findLocalCredentials(
      email: string,
    ): Promise<{ passwordHash: string } | null>;
  };
  const previousDriver = process.env.AUTH_DRIVER;
  const previousSecret = process.env.AUTH_SECRET;

  beforeAll(async () => {
    process.env.AUTH_DRIVER = 'local';
    process.env.AUTH_SECRET = secret;
    const fixture = await Test.createTestingModule({
      imports: [
        PersistenceModule.register({ driver: 'memory' }),
        PresentationModule,
      ],
    })
      .overrideProvider(DEVICE_MESSENGER)
      .useValue({ connected: false })
      .compile();
    users = fixture.get(USER_REPOSITORY);
    app = fixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (previousDriver === undefined) delete process.env.AUTH_DRIVER;
    else process.env.AUTH_DRIVER = previousDriver;
    if (previousSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previousSecret;
  });

  it('registra, inicia sesión y verifica el token sin Supabase', async () => {
    const api = request(app.getHttpServer());
    const registered = await api
      .post('/auth/register')
      .send({
        name: 'Ana',
        email: ' ANA@EXAMPLE.COM ',
        password: 'UnaClaveLocal123',
      })
      .expect(201);
    expect(registered.body).toMatchObject({
      tokenType: 'Bearer',
      user: { name: 'Ana', email: 'ana@example.com' },
    });
    expect(registered.body.accessToken).toEqual(expect.any(String));
    expect(registered.body).not.toHaveProperty('passwordHash');
    const credentials = await users.findLocalCredentials('ana@example.com');
    expect(credentials?.passwordHash).not.toContain('UnaClaveLocal123');
    expect(credentials?.passwordHash).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/);
    const loggedIn = await api
      .post('/auth/login')
      .send({
        email: 'ana@example.com',
        password: 'UnaClaveLocal123',
      })
      .expect(200);
    expect(loggedIn.body.user.id).toBe(registered.body.user.id);
    await api
      .get('/auth/session')
      .set('Authorization', 'Bearer ' + loggedIn.body.accessToken)
      .expect(200, registered.body.user);
    await api
      .get('/users/me')
      .set('Authorization', 'Bearer ' + loggedIn.body.accessToken)
      .expect(200, registered.body.user);
    await api
      .post('/auth/login')
      .send({ email: 'ana@example.com', password: 'OtraClave123' })
      .expect(401);
    await api
      .get('/auth/session')
      .set('Authorization', 'Bearer ' + loggedIn.body.accessToken + 'changed')
      .expect(401);
    await api.get('/auth/session').expect(401);
  });

  it('rechaza un token vencido y valida los datos del registro', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('unknown')
      .setIssuer('pet-feeder-local')
      .setAudience('pet-feeder-app')
      .setExpirationTime(1)
      .sign(new TextEncoder().encode(secret));
    await request(app.getHttpServer())
      .get('/auth/session')
      .set('Authorization', 'Bearer ' + token)
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Ana',
        email: 'incorrecto',
        password: 'corta',
      })
      .expect(400);
  });

  it('un registro concurrente conserva una sola cuenta por correo', async () => {
    const payload = {
      name: 'Luis',
      email: 'luis@example.com',
      password: 'ClaveConcurrente123',
    };
    const responses = await Promise.all([
      request(app.getHttpServer()).post('/auth/register').send(payload),
      request(app.getHttpServer()).post('/auth/register').send(payload),
    ]);
    expect(
      responses.map((response) => response.status).sort((a, b) => a - b),
    ).toEqual([201, 409]);
  });
});
