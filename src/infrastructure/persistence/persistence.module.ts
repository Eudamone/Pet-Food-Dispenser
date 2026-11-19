import { Module, type DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.js';
import { PET_REPOSITORY } from '../../domain/repositories/pet.repository.js';
import { DEVICE_REPOSITORY } from '../../domain/repositories/device.repository.js';
import { FEEDING_REPOSITORY } from '../../domain/repositories/feeding.repository.js';
import { DatabaseUserRepository } from './database/user.repository.js';
import { DatabasePetRepository } from './database/pet.repository.js';
import { DatabaseDeviceRepository } from './database/device.repository.js';
import { DatabaseFeedingRepository } from './database/feeding.repository.js';
import { UserModel } from './database/models/user.model.js';
import { PetModel } from './database/models/pet.model.js';
import { RfidTagModel } from './database/models/rfid-tag.model.js';
import { FeederDeviceModel } from './database/models/feeder-device.model.js';
import { FeedingPlanModel } from './database/models/feeding-plan.model.js';
import { AccessSessionModel } from './database/models/access-session.model.js';
import { DispensingRecordModel } from './database/models/dispensing-record.model.js';
import { MemoryDatabase } from './memory/memory.database.js';
import { MemoryUserRepository } from './memory/memory-user.repository.js';
import { MemoryPetRepository } from './memory/memory-pet.repository.js';
import { MemoryDeviceRepository } from './memory/memory-device.repository.js';
import { MemoryFeedingRepository } from './memory/memory-feeding.repository.js';

export type PersistenceDriver = 'memory' | 'db';

const REPOSITORY_TOKENS = [
  USER_REPOSITORY,
  PET_REPOSITORY,
  DEVICE_REPOSITORY,
  FEEDING_REPOSITORY,
];

/**
 * Módulo dinámico de persistencia. Registrarlo una sola vez desde el
 * módulo raíz: `PersistenceModule.register({ driver: 'memory' | 'db' })`.
 * Es global para que los servicios reciban los tokens de
 * `domain/repositories` sin importarlo explícitamente.
 */
@Module({})
export class PersistenceModule {
  static register(options: { driver: PersistenceDriver }): DynamicModule {
    return options.driver === 'db'
      ? PersistenceModule.database()
      : PersistenceModule.memory();
  }

  private static database(): DynamicModule {
    return {
      module: PersistenceModule,
      global: true,
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL,
          schema: process.env.DB_SCHEMA,
          autoLoadEntities: true,
          synchronize: process.env.DB_SYNCHRONIZE === 'true',
        }),
        TypeOrmModule.forFeature([
          UserModel,
          PetModel,
          RfidTagModel,
          FeederDeviceModel,
          FeedingPlanModel,
          AccessSessionModel,
          DispensingRecordModel,
        ]),
      ],
      providers: [
        { provide: USER_REPOSITORY, useClass: DatabaseUserRepository },
        { provide: PET_REPOSITORY, useClass: DatabasePetRepository },
        { provide: DEVICE_REPOSITORY, useClass: DatabaseDeviceRepository },
        { provide: FEEDING_REPOSITORY, useClass: DatabaseFeedingRepository },
      ],
      exports: REPOSITORY_TOKENS,
    };
  }

  private static memory(): DynamicModule {
    return {
      module: PersistenceModule,
      global: true,
      providers: [
        MemoryDatabase,
        MemoryUserRepository,
        MemoryPetRepository,
        MemoryDeviceRepository,
        MemoryFeedingRepository,
        { provide: USER_REPOSITORY, useExisting: MemoryUserRepository },
        { provide: PET_REPOSITORY, useExisting: MemoryPetRepository },
        { provide: DEVICE_REPOSITORY, useExisting: MemoryDeviceRepository },
        { provide: FEEDING_REPOSITORY, useExisting: MemoryFeedingRepository },
      ],
      exports: [...REPOSITORY_TOKENS, MemoryDatabase],
    };
  }
}
