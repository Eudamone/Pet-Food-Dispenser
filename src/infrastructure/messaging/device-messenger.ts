import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { connect, type MqttClient } from 'mqtt';
import type {
  DeviceMessenger,
  FeedingPlanCommand,
  ManualDispenseCommand,
} from '../../domain/ports/device-messenger.port.js';
import { resolveMqttConfig } from './mqtt.config.js';

/**
 * Adaptador de salida hacia el firmware: publica comandos en
 * `feeders/{deviceId}/cmd/{configuration|dispense|confirmations}` (QoS 0).
 * Solo abre conexión si MQTT_URL está definida (comportamiento heredado).
 * La recepción de eventos la hace el microservicio MQTT de Nest
 * (`@EventPattern` en presentation/events).
 */
@Injectable()
export class MqttDeviceMessenger implements DeviceMessenger, OnModuleDestroy {
  private readonly logger = new Logger(MqttDeviceMessenger.name);
  private client?: MqttClient;

  constructor() {
    if (!process.env.MQTT_URL) return;
    const config = resolveMqttConfig();
    this.client = connect(config.url, {
      username: config.username,
      password: config.password,
      ca: config.ca,
      rejectUnauthorized: config.rejectUnauthorized,
      queueQoSZero: false,
    });
    this.client.on('error', (error) => this.logger.warn(error.message));
  }

  get connected(): boolean {
    return this.client?.connected ?? false;
  }

  sendConfiguration(deviceId: string, command: FeedingPlanCommand): void {
    this.publish(deviceId, 'cmd/configuration', command);
  }

  sendManualDispense(deviceId: string, command: ManualDispenseCommand): void {
    this.publish(deviceId, 'cmd/dispense', command);
  }

  confirmResults(deviceId: string, eventIds: readonly string[]): void {
    this.publish(deviceId, 'cmd/confirmations', { eventIds });
  }

  private publish(deviceId: string, channel: string, data: object): void {
    if (!this.client?.connected) return;
    this.client.publish(
      `feeders/${deviceId}/${channel}`,
      JSON.stringify(data),
      { qos: 0, retain: false },
      (error) => {
        if (error) this.logger.warn(error.message);
      },
    );
  }

  onModuleDestroy(): void {
    this.client?.end(true);
  }
}
