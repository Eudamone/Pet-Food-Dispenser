import { Controller, Logger } from '@nestjs/common';
import { isUUID } from 'class-validator';
import {
  Ctx,
  EventPattern,
  Payload,
  type MqttContext,
} from '@nestjs/microservices';
import { DeviceService } from '../http/services/device.service.js';

const RESULT_TOPIC = /^feeders\/([\da-f-]{36})\/evt\/result$/i;

@Controller()
export class DeviceEventsConsumer {
  private readonly logger = new Logger(DeviceEventsConsumer.name);

  constructor(private readonly devices: DeviceService) {}
  @EventPattern<string>('feeders/+/evt/result')
  async onResult(
    @Payload() payload: unknown,
    @Ctx() context: MqttContext,
  ): Promise<void> {
    if (context.getPacket().retain) return;
    const match = RESULT_TOPIC.exec(context.getTopic());
    if (!match || !isUUID(match[1])) {
      this.logger.warn('Tópico de resultado MQTT inválido.');
      return;
    }
    await this.devices.synchronize(match[1].toLowerCase(), payload);
  }
}
