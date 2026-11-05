import { ServicesModule } from '../services/services.module.js';
import { Module } from '@nestjs/common';
import { AuthGuard } from './controllers/auth.guard.js';
import { UsersController } from './controllers/user.controller.js';
import { PetsController } from './controllers/pet.controller.js';
import { RfidController } from './controllers/rfid.controller.js';
import { FeedersController } from './controllers/feeder.controller.js';
import { HealthController } from './controllers/health.controller.js';

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
