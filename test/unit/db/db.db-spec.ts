// db.db-spec.ts
// Pruebas unitarias contra la BD de prueba (DATABASE_URL_TEST). Se omiten si
// la variable no está definida. Ejecutar con: npm run test:db
//
// IMPORTANTE: las tablas del esquema `public` se vacían antes de cada test;
// apunta siempre a una base de datos desechable, nunca a la de desarrollo.

import 'dotenv/config';

import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthModule } from '@/auth.module.js';
import { PersistenceModule } from '@/persistance.module.js';
import { EMAIL_CLIENT } from '@/repositories/email.client.js';
import type { EmailMessage } from '@/repositories/email.client.js';
import { AuthService } from '@/services/auth.service.js';
import { DeviceConnection } from '@/services/device-connection.service.js';
import { DeviceService } from '@/services/device.service.js';
import { FeedingService } from '@/services/feeding.service.js';
import { PetService } from '@/services/pet.service.js';
import type { ContextFactory, TestContext } from '../scenarios.js';
import {
  passwordSuite,
  registerSuite,
  scheduleSuite,
  userFeederPetSuite,
} from '../scenarios.js';

const databaseUrl = process.env.DATABASE_URL_TEST;
const sent: EmailMessage[] = [];
let moduleRef: TestingModule | null = null;

// La conexión se establece una sola vez; las tablas se vacían antes de cada
// test para aislarlos.
const create: ContextFactory = async (): Promise<TestContext> => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL_TEST is not configured.');
  }

  if (!moduleRef) {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: true,
        }),
        PersistenceModule,
        AuthModule,
      ],
      providers: [
        AuthService,
        PetService,
        FeedingService,
        DeviceService,
        DeviceConnection,
      ],
    })
      .overrideProvider(EMAIL_CLIENT)
      .useValue({
        send: async (message: EmailMessage) => {
          sent.push(message);
        },
      })
      .compile();
  }

  sent.length = 0;
  await truncateAll(moduleRef.get(DataSource));

  return {
    auth: moduleRef.get(AuthService),
    pets: moduleRef.get(PetService),
    feeding: moduleRef.get(FeedingService),
    devices: moduleRef.get(DeviceService),
    sent,
  };
};

async function truncateAll(dataSource: DataSource): Promise<void> {
  const rows: { table_name: string }[] = await dataSource.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  if (rows.length === 0) {
    return;
  }
  const tables = rows.map((row) => `"${row.table_name}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tables} CASCADE`);
}

describe.skipIf(!databaseUrl)('unit tests (BD de prueba)', () => {
  afterAll(async () => {
    await moduleRef?.close();
  });

  registerSuite(create);
  userFeederPetSuite(create);
  passwordSuite(create);
  scheduleSuite(create);
});
