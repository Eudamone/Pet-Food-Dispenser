import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module.js';
import { UserService } from './user.service.js';
import { PetService } from './pet.service.js';
import { DeviceService } from './device.service.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [RepositoriesModule],
  providers: [UserService, PetService, DeviceService, AuthService],
  exports: [UserService, PetService, DeviceService, AuthService],
})
export class ServicesModule {}
