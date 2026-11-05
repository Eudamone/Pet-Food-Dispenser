import { ServicesModule } from '../services/services.module.js';
import { Module } from '@nestjs/common';
import { AuthGuard } from './http/auth.guard.js';
import { UsersController } from './http/user.controller.js';
import { PetsController } from './http/pet.controller.js';
import { RfidController } from './http/rfid.controller.js';
import { FeedersController } from './http/feeder.controller.js';
import { HealthController } from './http/health.controller.js';

@Module({
  imports: [ServicesModule],
  controllers: [
    HealthController,
    UsersController,
    PetsController,
    RfidController,
    FeedersController,
  ],
  providers: [AuthGuard],
})
export class PresentationModule {}
