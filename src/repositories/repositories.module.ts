import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../domain/User.js';
import { Pet } from '../domain/Pet.js';
import { RfidTag } from '../domain/RfidTag.js';
import { FeederDevice } from '../domain/FeederDevice.js';
import { UserRepository } from './user.repository.js';

import { PetRepository } from './pet.repository.js';

import { DeviceRepository } from './device.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Pet, RfidTag, FeederDevice])],
  providers: [UserRepository, PetRepository, DeviceRepository],
  exports: [UserRepository, PetRepository, DeviceRepository],
})
export class RepositoriesModule {}
