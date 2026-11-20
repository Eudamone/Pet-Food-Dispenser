import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module.js';
import { PetService } from './pet.service.js';
import { DeviceService } from './device.service.js';
import { AuthService } from './auth.service.js';
import { FeedingService } from './feeding.service.js';
import { DeviceConnection } from './device-connection.js';

@Module({
  imports: [RepositoriesModule],
  providers: [
    PetService,
    DeviceService,
    AuthService,
    FeedingService,
    DeviceConnection,
  ],
  exports: [PetService, DeviceService, AuthService, FeedingService],
})
export class ServicesModule {}
