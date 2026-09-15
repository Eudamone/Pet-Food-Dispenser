import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from '@/entity-model/user.entity.js';
import { TypeOrmUserRepository } from '@/repositories/user.repository.js';
import { USER_REPOSITORY } from '@/repositories/user.repository.interface.js';
import { PetOrmEntity } from '@/entity-model/pet.entity.js';
import { FeederOrmEntity } from '@/entity-model/feeder.entity.js';
import { TypeOrmPetRepository } from '@/repositories/pet.repository.js';
import { PET_REPOSITORY } from '@/repositories/pet.repository.interface.js';
import { TypeOrmFeederRepository } from '@/repositories/feeder.repository.js';
import { FEEDER_REPOSITORY } from '@/repositories/feeder.repository.interface.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity, PetOrmEntity, FeederOrmEntity])],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    {
      provide: PET_REPOSITORY,
      useClass: TypeOrmPetRepository,
    },
    {
      provide: FEEDER_REPOSITORY,
      useClass: TypeOrmFeederRepository,
    },
  ],
  exports: [USER_REPOSITORY, PET_REPOSITORY, FEEDER_REPOSITORY],
})
export class PersistenceModule {}
