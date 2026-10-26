import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { DomainErrorFilter } from './helpers/domain-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // El front (web/móvil) y el firmware consumen la API desde otros orígenes.
  app.enableCors({ origin: true, credentials: true });

  // Valida y transforma los DTO de entrada; descarta propiedades no declaradas.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Traduce las reglas de negocio incumplidas a HTTP 400 en vez de 500.
  app.useGlobalFilters(new DomainErrorFilter());

  const port = Number(process.env.PORT ?? 3000);
  const ip = '0.0.0.0';
  await app.listen(port, ip);
  console.log(`Backend escuchando en http://${ip}:${port}`);
}

await bootstrap();
