// persistence.memory.module.ts
// Variante en memoria de la persistencia, útil para pruebas y desarrollo local.
import { Global, Module } from '@nestjs/common';

import { InMemoryUserRepository } from '@/repositories/user.repository.memory.js';
import { USER_REPOSITORY } from '@/repositories/user.repository.interface.js';
import { InMemoryPetRepository } from '@/repositories/pet.repository.memory.js';
import { PET_REPOSITORY } from '@/repositories/pet.repository.interface.js';
import { InMemoryFeedingRepository } from '@/repositories/feeding.repository.memory.js';
import { FEEDING_REPOSITORY } from '@/repositories/feeding.repository.interface.js';
import { InMemoryDeviceRepository } from '@/repositories/device.repository.memory.js';
import { DEVICE_REPOSITORY } from '@/repositories/device.repository.interface.js';
import {
  CONNECTION_CLIENT,
  InMemoryConnectionClient,
} from '@/repositories/connection.client.js';

@Global()
@Module({
  providers: [
    { provide: USER_REPOSITORY, useClass: InMemoryUserRepository },
    { provide: PET_REPOSITORY, useClass: InMemoryPetRepository },
    { provide: FEEDING_REPOSITORY, useClass: InMemoryFeedingRepository },
    { provide: DEVICE_REPOSITORY, useClass: InMemoryDeviceRepository },
    { provide: CONNECTION_CLIENT, useClass: InMemoryConnectionClient },
  ],
  exports: [
    USER_REPOSITORY,
    PET_REPOSITORY,
    FEEDING_REPOSITORY,
    DEVICE_REPOSITORY,
    CONNECTION_CLIENT,
  ],
})
export class PersistenceMemoryModule {}
