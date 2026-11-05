import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from './entities/user.entity.js';
import { PetOrmEntity } from './entities/pet.entity.js';
import { RfidTagOrmEntity } from './entities/rfid-tag.entity.js';
import { FeederOrmEntity } from './entities/feeder.entity.js';
import { UserRepository } from '../repositories/user.repository.js';

import { PetRepository } from '../repositories/pet.repository.js';

import { DeviceRepository } from '../repositories/device.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserOrmEntity,
      PetOrmEntity,
      RfidTagOrmEntity,
      FeederOrmEntity,
    ]),
  ],
  providers: [UserRepository, PetRepository, DeviceRepository],
  exports: [UserRepository, PetRepository, DeviceRepository],
})
export class PersistenceModule {}
