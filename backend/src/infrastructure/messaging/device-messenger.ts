import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { connect, type MqttClient } from 'mqtt';
import type {
  DeviceMessenger,
  FeedingPlanCommand,
  ManualDispenseCommand,
} from '../../domain/ports/device-messenger.port.js';
import { resolveMqttConfig } from './mqtt.config.js';

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
      { qos: 1, retain: false },
      (error) => {
        if (error) this.logger.warn(error.message);
      },
    );
  }

  onModuleDestroy(): void {
    this.client?.end(true);
  }
}
