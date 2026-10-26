// connection.client.ts
// Puerto de comunicación con el hardware (ESP32) del comedero.

import { randomUUID } from 'crypto';
import { FeederDevice } from '@/models/feeder-device.model.js';
import type { ConfigurationData } from '@/models/configuration.model.js';
import type { DispenseRequest } from '@/models/dispense-request.model.js';
import type { DeviceEvent } from '@/models/device-event.model.js';
import type { Id } from '@/models/types.js';

export interface ConnectionClient {
  bind(userId: Id, code: string): Promise<FeederDevice>;
  sendConfiguration(deviceId: Id, data: ConfigurationData): Promise<void>;
  sendDispenseRequest(data: DispenseRequest): Promise<void>;
  readResults(deviceId: Id, limit: number): Promise<DeviceEvent[]>;
  confirmResults(deviceId: Id, eventIds: Id[]): Promise<void>;
}

export const CONNECTION_CLIENT = Symbol('ConnectionClient');

// Implementación en memoria que simula el vínculo con el dispositivo.
export class InMemoryConnectionClient implements ConnectionClient {
  private readonly devices = new Map<string, FeederDevice>();
  private readonly configurations = new Map<Id, ConfigurationData>();
  private readonly requests = new Map<Id, DispenseRequest>();
  private readonly events = new Map<Id, DeviceEvent[]>();

  async bind(userId: Id, code: string): Promise<FeederDevice> {
    const existing = this.devices.get(code);
    if (existing) {
      return existing;
    }
    const device = FeederDevice.create({
      id: randomUUID(),
      ownerId: userId,
      name: `Comedero ${code}`,
      maxBowlGrams: 500,
    });
    this.devices.set(code, device);
    return device;
  }

  async sendConfiguration(deviceId: Id, data: ConfigurationData): Promise<void> {
    this.configurations.set(deviceId, data);
  }

  async sendDispenseRequest(data: DispenseRequest): Promise<void> {
    this.requests.set(data.id, data);
  }

  async readResults(deviceId: Id, limit: number): Promise<DeviceEvent[]> {
    return (this.events.get(deviceId) ?? []).slice(0, limit);
  }

  async confirmResults(deviceId: Id, eventIds: Id[]): Promise<void> {
    const pending = this.events.get(deviceId) ?? [];
    this.events.set(
      deviceId,
      pending.filter((event) => !eventIds.includes(event.id)),
    );
  }

  // Utilidades solo disponibles en la implementación en memoria.
  pushEvent(event: DeviceEvent): void {
    const pending = this.events.get(event.deviceId) ?? [];
    pending.push(event);
    this.events.set(event.deviceId, pending);
  }

  lastConfiguration(deviceId: Id): ConfigurationData | null {
    return this.configurations.get(deviceId) ?? null;
  }
}
