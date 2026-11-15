import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { readFileSync } from 'node:fs';
import { connect, type MqttClient } from 'mqtt';

@Injectable()
export class DeviceConnection implements OnModuleDestroy {
  private readonly logger = new Logger(DeviceConnection.name);
  private client?: MqttClient;

  get connected(): boolean {
    return this.client?.connected ?? false;
  }

  readResults(
    handler: (deviceId: string, payload: unknown) => Promise<void>,
  ): void {
    const address = process.env.MQTT_URL;
    if (!address || this.client) return;
    const url = new URL(address);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'mqtts:' && !(local && url.protocol === 'mqtt:'))
      throw new Error('MQTT_URL debe usar MQTT sobre TLS.');
    if (!local && (!process.env.MQTT_USERNAME || !process.env.MQTT_PASSWORD))
      throw new Error('Configura las credenciales del broker MQTT.');

    this.client = connect(url.toString(), {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      ca: process.env.MQTT_CA_FILE
        ? readFileSync(process.env.MQTT_CA_FILE)
        : undefined,
      rejectUnauthorized: true,
      queueQoSZero: false,
    });
    this.client.on('error', (error) => this.logger.warn(error.message));
    this.client.on('connect', () => {
      this.client?.subscribe('feeders/+/events', { qos: 1 }, (error) => {
        if (error) this.logger.warn(error.message);
      });
    });
    this.client.on('message', (topic, body, packet) => {
      const match = /^feeders\/([\da-f-]{36})\/events$/i.exec(topic);
      if (!match || !isUUID(match[1]) || packet.retain || body.length > 4096)
        return;
      let data: unknown;
      try {
        data = JSON.parse(body.toString('utf8'));
      } catch {
        this.logger.warn('Evento MQTT con formato inválido.');
        return;
      }
      void handler(match[1].toLowerCase(), data).catch((error: unknown) => {
        this.logger.warn(
          error instanceof Error ? error.message : 'No se guardó el evento.',
        );
      });
    });
  }

  sendConfiguration(deviceId: string, plan: object): void {
    this.publish(deviceId, 'configuration', plan, false);
  }

  confirmResults(deviceId: string, eventIds: readonly string[]): void {
    this.publish(deviceId, 'confirmations', { eventIds }, false);
  }

  private publish(
    deviceId: string,
    channel: string,
    data: object,
    retain: boolean,
  ): void {
    if (!this.client?.connected) return;
    this.client.publish(
      `feeders/${deviceId}/${channel}`,
      JSON.stringify(data),
      {
        qos: 0,
        retain,
      },
      (error) => {
        if (error) this.logger.warn(error.message);
      },
    );
  }

  onModuleDestroy(): void {
    this.client?.end(true);
  }
}
