import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule } from '@nestjs/config'


import { TypeOrmModule } from '@nestjs/typeorm';

// Import propios
import { PresentationModule } from './presentation.module.js';





export const { ObserveModule, ObserveInstrument } = createObserveModule();


@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true, // Carga automáticamente entidades registradas con forFeature
      synchronize: true, // Solo en desarrollo. Nunca en producción 
    }),
    PresentationModule,

    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'back-comedero',
    }),
  ],
  
})
export class AppModule {}
