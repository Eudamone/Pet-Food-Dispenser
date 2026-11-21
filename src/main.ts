import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, type MqttOptions } from '@nestjs/microservices';
import { AppModule } from './app.module.js';
import { resolveMqttConfig } from './infrastructure/messaging/mqtt.config.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  app.enableCors(
    corsOrigin
      ? {
          origin: corsOrigin
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
        }
      : undefined,
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Aplicación híbrida: HTTP + microservicio MQTT (solo si MQTT_URL está definida).
  if (process.env.MQTT_URL) {
    app.connectMicroservice<MqttOptions>({
      transport: Transport.MQTT,
      options: {
        ...resolveMqttConfig(),
        subscribeOptions: { qos: 1 },
      },
    });
    await app.startAllMicroservices();
  }

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
