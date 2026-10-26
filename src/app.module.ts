import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import propios
import { AuthModule } from './auth.module.js';
import { PresentationModule } from './presentation.module.js';
import { PersistenceModule } from './persistance.module.js';
import { PersistenceMemoryModule } from './persistence.memory.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

// PERSISTENCE=memory permite levantar el backend sin base de datos (datos en memoria).
// Cualquier otro valor (o ausente) usa PostgreSQL/Supabase con TypeORM.
const useMemoryPersistence = process.env.PERSISTENCE === 'memory';

const persistenceImports = useMemoryPersistence
  ? [PersistenceMemoryModule]
  : [
      TypeOrmModule.forRoot({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        autoLoadEntities: true, // Carga automáticamente entidades registradas con forFeature
        synchronize: true, // Solo en desarrollo. Nunca en producción
      }),
      PersistenceModule,
    ];

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
    ...persistenceImports,
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
