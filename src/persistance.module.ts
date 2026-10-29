// persistance.module.ts
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserOrmEntity } from '@/database/user.entity.js';
import { PetOrmEntity } from '@/database/pet.entity.js';
import { RfidTagOrmEntity } from '@/database/rfid-tag.entity.js';
import { FeedingPlanOrmEntity } from '@/database/feeding-plan.entity.js';
import { FeedingSlotOrmEntity } from '@/database/feeding-slot.entity.js';
import { DispensingRecordOrmEntity } from '@/database/dispensing-record.entity.js';
import { AccessSessionOrmEntity } from '@/database/access-session.entity.js';
import { FeederDeviceOrmEntity } from '@/database/feeder-device.entity.js';
import { DispenseRequestOrmEntity } from '@/database/dispense-request.entity.js';

import { TypeOrmUserRepository } from '@/repositories/user.repository.js';
import { USER_REPOSITORY } from '@/repositories/user.repository.interface.js';
import { TypeOrmPetRepository } from '@/repositories/pet.repository.js';
import { PET_REPOSITORY } from '@/repositories/pet.repository.interface.js';
import { TypeOrmFeedingRepository } from '@/repositories/feeding.repository.js';
import { FEEDING_REPOSITORY } from '@/repositories/feeding.repository.interface.js';
import { TypeOrmDeviceRepository } from '@/repositories/device.repository.js';
import { DEVICE_REPOSITORY } from '@/repositories/device.repository.interface.js';
import {
  CONNECTION_CLIENT,
  InMemoryConnectionClient,
} from '@/repositories/connection.client.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserOrmEntity,
      PetOrmEntity,
      RfidTagOrmEntity,
      FeedingPlanOrmEntity,
      FeedingSlotOrmEntity,
      DispensingRecordOrmEntity,
      AccessSessionOrmEntity,
      FeederDeviceOrmEntity,
      DispenseRequestOrmEntity,
    ]),
  ],
  providers: [
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
    { provide: PET_REPOSITORY, useClass: TypeOrmPetRepository },
    { provide: FEEDING_REPOSITORY, useClass: TypeOrmFeedingRepository },
    { provide: DEVICE_REPOSITORY, useClass: TypeOrmDeviceRepository },
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
export class PersistenceModule {}
