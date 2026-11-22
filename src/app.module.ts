import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PersistenceModule } from './infrastructure/persistence/persistence.module.js';
import { PresentationModule } from './presentation/presentation.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PersistenceModule.register({
      driver: process.env.PERSISTENCE_DRIVER === 'memory' ? 'memory' : 'db',
    }),
    PresentationModule,
  ],
})
export class AppModule {}
