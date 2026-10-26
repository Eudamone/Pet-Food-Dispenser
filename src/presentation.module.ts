// presentation.module.ts
import { Module } from '@nestjs/common';

import { AppController } from '@/app.controller.js';
import { AppService } from '@/app.service.js';

import { AuthService } from '@/services/auth.service.js';
import { PetService } from '@/services/pet.service.js';
import { FeedingService } from '@/services/feeding.service.js';
import { DeviceService } from '@/services/device.service.js';
import { DeviceConnection } from '@/services/device-connection.service.js';

import { AuthController } from '@/controllers/auth.controller.js';
import { PetsController } from '@/controllers/pet.controller.js';
import { FeedingController } from '@/controllers/feeding.controller.js';
import { DevicesController } from '@/controllers/device.controller.js';
import { JwtAuthGuard } from '@/controllers/jwt-auth.guard.js';

@Module({
  controllers: [
    AppController,
    AuthController,
    PetsController,
    FeedingController,
    DevicesController,
  ],
  providers: [
    AppService,
    AuthService,
    PetService,
    FeedingService,
    DeviceService,
    DeviceConnection,
    JwtAuthGuard,
  ],
})
export class PresentationModule {}
