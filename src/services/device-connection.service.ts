// device-connection.service.ts
import { Inject, Injectable, Optional } from '@nestjs/common';
import { CONNECTION_CLIENT } from '@/repositories/connection.client.js';
import type { ConnectionClient } from '@/repositories/connection.client.js';
import { FeederDevice } from '@/models/feeder-device.model.js';
import { Result } from '@/helpers/result.js';
import type { ConfigurationData } from '@/models/configuration.model.js';
import type { DispenseRequest } from '@/models/dispense-request.model.js';
import type { DeviceEvent } from '@/models/device-event.model.js';
import type { Id } from '@/models/types.js';

// DeviceConnection: puente entre los servicios y el hardware del comedero.
@Injectable()
export class DeviceConnection {
  constructor(
    @Inject(CONNECTION_CLIENT)
    private readonly client: ConnectionClient,
    @Optional()
    private readonly timeoutMs: number = 5000,
  ) {}

  async bind(userId: Id, code: string): Promise<Result<FeederDevice>> {
    try {
      const device = await this.client.bind(userId, code);
      return Result.ok(device);
    } catch (error) {
      return Result.fail(DeviceConnection.message(error));
    }
  }

  async sendConfiguration(
    deviceId: Id,
    data: ConfigurationData,
  ): Promise<Result<void>> {
    try {
      await this.client.sendConfiguration(deviceId, data);
      return Result.ok<void>(undefined);
    } catch (error) {
      return Result.fail(DeviceConnection.message(error));
    }
  }

  async sendDispenseRequest(data: DispenseRequest): Promise<Result<void>> {
    try {
      await this.client.sendDispenseRequest(data);
      return Result.ok<void>(undefined);
    } catch (error) {
      return Result.fail(DeviceConnection.message(error));
    }
  }

  readResults(deviceId: Id, limit: number): Promise<DeviceEvent[]> {
    return this.client.readResults(deviceId, limit);
  }

  confirmResults(deviceId: Id, eventIds: Id[]): Promise<void> {
    return this.client.confirmResults(deviceId, eventIds);
  }

  get timeout(): number {
    return this.timeoutMs;
  }

  private static message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
