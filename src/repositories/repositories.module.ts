import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../domain/User.js';
import { Pet } from '../domain/Pet.js';
import { RfidTag } from '../domain/RfidTag.js';
import { FeederDevice } from '../domain/FeederDevice.js';
import { FeedingPlan } from '../domain/FeedingPlan.js';
import { UserRepository } from './user.repository.js';

import { PetRepository } from './pet.repository.js';

import { DeviceRepository } from './device.repository.js';
import { FeedingRepository } from './feeding.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Pet, RfidTag, FeederDevice, FeedingPlan]),
  ],
  providers: [
    UserRepository,
    PetRepository,
    DeviceRepository,
    FeedingRepository,
  ],
  exports: [UserRepository, PetRepository, DeviceRepository, FeedingRepository],
})
export class RepositoriesModule {}
