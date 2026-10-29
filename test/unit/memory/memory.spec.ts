// memory.spec.ts
// Pruebas unitarias con persistencia en memoria. Corren dentro de `npm test`.

import { Test } from '@nestjs/testing';
import { AuthModule } from '@/auth.module.js';
import { PersistenceMemoryModule } from '@/persistence.memory.module.js';
import { EMAIL_CLIENT } from '@/repositories/email.client.js';
import type { EmailMessage } from '@/repositories/email.client.js';
import { AuthService } from '@/services/auth.service.js';
import { DeviceConnection } from '@/services/device-connection.service.js';
import { DeviceService } from '@/services/device.service.js';
import { FeedingService } from '@/services/feeding.service.js';
import { PetService } from '@/services/pet.service.js';
import type { ContextFactory, TestContext } from '../scenarios.js';
import {
  passwordSuite,
  registerSuite,
  scheduleSuite,
  userFeederPetSuite,
} from '../scenarios.js';

const sent: EmailMessage[] = [];

// Un módulo nuevo por test: los repositorios en memoria arrancan vacíos.
const create: ContextFactory = async (): Promise<TestContext> => {
  sent.length = 0;

  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule, PersistenceMemoryModule],
    providers: [
      AuthService,
      PetService,
      FeedingService,
      DeviceService,
      DeviceConnection,
    ],
  })
    .overrideProvider(EMAIL_CLIENT)
    .useValue({
      send: async (message: EmailMessage) => {
        sent.push(message);
      },
    })
    .compile();

  return {
    auth: moduleRef.get(AuthService),
    pets: moduleRef.get(PetService),
    feeding: moduleRef.get(FeedingService),
    devices: moduleRef.get(DeviceService),
    sent,
  };
};

registerSuite(create);
userFeederPetSuite(create);
passwordSuite(create);
scheduleSuite(create);
