import { Test } from '@nestjs/testing';
import { AuthModule } from '@/auth.module.js';
import { PersistenceMemoryModule } from '@/persistence.memory.module.js';
import { AuthService } from '@/services/auth.service.js';
import { EMAIL_CLIENT } from '@/repositories/email.client.js';
import type { EmailMessage } from '@/repositories/email.client.js';

describe('password reset (in-memory)', () => {
  let auth: AuthService;
  let sent: EmailMessage[];
  let send: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    process.env.PASSWORD_RESET_URL = 'dispensador://reset-password';
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES = '15';

    sent = [];
    send = vi.fn(async (message: EmailMessage) => {
      sent.push(message);
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, PersistenceMemoryModule],
      providers: [AuthService],
    })
      .overrideProvider(EMAIL_CLIENT)
      .useValue({ send })
      .compile();

    auth = moduleRef.get(AuthService);
    await auth.register('Ana', 'ana@mail.com', 'secret1');

    // register envía un correo de confirmación; cada test debe contar solo
    // sus propios envíos.
    send.mockClear();
    sent.length = 0;
  });

  it('sends a reset link and changes the password only once', async () => {
    const requested = await auth.requestPasswordReset('ana@mail.com');
    expect(requested.isOk).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(sent[0].to).toBe('ana@mail.com');
    expect(sent[0].text).toContain('dispensador://reset-password?token=');

    const match = /[?&]token=([^\s]+)/.exec(sent[0].text);
    expect(match).not.toBeNull();
    const token = decodeURIComponent(match![1]);

    // El token de recuperación no sirve como token de acceso.
    expect(await auth.authenticate(token)).toBeNull();

    const confirmed = await auth.confirmPasswordReset(token, 'newsecret');
    expect(confirmed.isOk).toBe(true);

    expect((await auth.signIn('ana@mail.com', 'secret1')).isFailure).toBe(true);
    expect((await auth.signIn('ana@mail.com', 'newsecret')).isOk).toBe(true);

    // El token queda invalidado al cambiar la contraseña.
    expect((await auth.confirmPasswordReset(token, 'again123')).isFailure).toBe(
      true,
    );
  });

  it('does not reveal whether an email is registered', async () => {
    const requested = await auth.requestPasswordReset('nobody@mail.com');
    expect(requested.isOk).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects invalid reset tokens', async () => {
    const confirmed = await auth.confirmPasswordReset('not-a-token', 'newsecret');
    expect(confirmed.isFailure).toBe(true);
  });
});
