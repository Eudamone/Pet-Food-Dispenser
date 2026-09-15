import { Module } from '@nestjs/common';
import { PersistenceModule } from '@/persistance.module.js';
import { UsersService } from '@/services/user.service.js';
import { UsersController } from '@/controllers/user.controller.js';
import { PetsController } from '@/controllers/pet.controller.js';
import { FeedersController } from '@/controllers/feeder.controller.js';
import { PetsService } from '@/services/pet.service.js';
import { FeedersService } from '@/services/feeder.service.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [PersistenceModule],
  controllers: [AppController, UsersController, PetsController, FeedersController],
  providers: [AppService, UsersService, PetsService, FeedersService],
})
export class PresentationModule {}
