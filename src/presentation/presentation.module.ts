import { AuthController } from './http/controllers/auth.controller.js';
import { LocalAuthService } from './http/services/local-auth.service.js';
import { Module } from '@nestjs/common';
import { DEVICE_MESSENGER } from '../domain/ports/device-messenger.port.js';
import { MqttDeviceMessenger } from '../infrastructure/messaging/device-messenger.js';
import { AuthGuard } from './http/controllers/auth.guard.js';
import { FeedingController } from './http/controllers/feeding.controller.js';
import { FeedersController } from './http/controllers/feeder.controller.js';
import { HealthController } from './http/controllers/health.controller.js';
import { OnboardingController } from './http/controllers/onboarding.controller.js';
import { PetsController } from './http/controllers/pet.controller.js';
import { RfidController } from './http/controllers/rfid.controller.js';
import { UsersController } from './http/controllers/user.controller.js';
import { AuthService } from './http/services/auth.service.js';
import { DeviceService } from './http/services/device.service.js';
import { FeedingService } from './http/services/feeding.service.js';
import { OnboardingService } from './http/services/onboarding.service.js';
import { PetService } from './http/services/pet.service.js';
import { DeviceEventsConsumer } from './events/device-events.consumer.js';

@Module({
  controllers: [
    AuthController,
    HealthController,
    UsersController,
    OnboardingController,
    PetsController,
    RfidController,
    FeedersController,
    FeedingController,
    DeviceEventsConsumer,
  ],
  providers: [
    LocalAuthService,
    AuthService,
    PetService,
    DeviceService,
    FeedingService,
    OnboardingService,
    AuthGuard,
    { provide: DEVICE_MESSENGER, useClass: MqttDeviceMessenger },
  ],
  exports: [
    AuthService,
    PetService,
    DeviceService,
    FeedingService,
    OnboardingService,
  ],
})
export class PresentationModule {}
