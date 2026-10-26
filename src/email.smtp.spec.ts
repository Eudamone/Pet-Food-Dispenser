// email.smtp.spec.ts
// Prueba de humo manual: registra un usuario usando el cliente SMTP real
// (Gmail) para verificar la integración de correo de punta a punta.
//
// Se omite por defecto para no enviar correos en cada `npm test`. Ejecutar con:
//   SMOKE_SMTP=true npx vitest run src/email.smtp.spec.ts

// Mismo cargador de variables que usa el servidor (main.ts).
import 'dotenv/config';

import { Test } from '@nestjs/testing';
import { AuthModule } from '@/auth.module.js';
import { PersistenceMemoryModule } from '@/persistence.memory.module.js';
import { AuthService } from '@/services/auth.service.js';
import { EMAIL_CLIENT } from '@/repositories/email.client.js';
import type { EmailClient } from '@/repositories/email.client.js';

const enabled = process.env.SMOKE_SMTP === 'true';

describe.skipIf(!enabled)('smoke SMTP (in-memory, cliente real)', () => {
  it('registra un usuario y envía la confirmación a través de Gmail', async () => {
    const to = process.env.MAIL_USER;
    if (!to) {
      throw new Error('MAIL_USER is not configured.');
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, PersistenceMemoryModule],
      providers: [AuthService],
    }).compile();

    try {
      const auth = moduleRef.get(AuthService);
      const emails = moduleRef.get<EmailClient>(EMAIL_CLIENT);

      // El servicio traga los errores de envío y solo los registra en el log,
      // así que espiamos el método real: sin esto un fallo SMTP pasaría
      // desapercibido.
      const send = vi.spyOn(emails, 'send');

      const registered = await auth.register('Smoke', to, 'secret1');
      expect(registered.isOk).toBe(true);
      expect(send).toHaveBeenCalledTimes(1);

      // Reesperamos la promesa real del transporte; si Gmail rechaza el
      // envío, la expectativa siguiente revienta con el error original.
      await send.mock.results[0]?.value;

      const [message] = send.mock.calls[0];
      expect(message.to).toBe(to);
      expect(message.subject).toContain('Bienvenido');
    } finally {
      await moduleRef.close();
    }
  }, 30000);
});
