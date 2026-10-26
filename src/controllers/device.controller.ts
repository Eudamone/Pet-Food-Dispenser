// device.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DeviceService } from '@/services/device.service.js';
import { JwtAuthGuard } from '@/controllers/jwt-auth.guard.js';
import { CurrentUser } from '@/controllers/current-user.decorator.js';
import { RegisterDeviceDto, RequestDispenseDto } from '@/dto/device.dto.js';
import { FeederDevice } from '@/models/feeder-device.model.js';
import { User } from '@/models/user.model.js';
import type { ConfigurationData } from '@/models/configuration.model.js';

@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DeviceService) {}

  @Post()
  register(
    @CurrentUser() user: User,
    @Body() dto: RegisterDeviceDto,
  ): Promise<FeederDevice> {
    return this.devices.registerDevice(user, dto.bindingCode);
  }

  @Get()
  list(@CurrentUser() user: User): Promise<FeederDevice[]> {
    return this.devices.listDevices(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<FeederDevice> {
    return this.devices.getDevice(user, id);
  }

  @Get(':id/configuration')
  configuration(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ConfigurationData | null> {
    return this.devices.getAppliedConfiguration(user, id);
  }

  @Post(':id/access/:petId')
  async grantAccess(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('petId') petId: string,
  ): Promise<{ revision: number }> {
    return { revision: await this.devices.grantAccess(user, id, petId) };
  }

  @Delete(':id/access/:petId')
  async revokeAccess(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('petId') petId: string,
  ): Promise<{ revision: number }> {
    return { revision: await this.devices.revokeAccess(user, id, petId) };
  }

  @Post(':id/apply')
  async applyConfiguration(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<{ revision: number }> {
    return { revision: await this.devices.applyConfiguration(user, id) };
  }

  @Post(':id/dispense')
  async dispense(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RequestDispenseDto,
  ): Promise<{ requestId: string }> {
    const requestId = dto.requestId ?? randomUUID();
    await this.devices.requestDispense(user, id, requestId, dto.targetGrams);
    return { requestId };
  }

  @Post(':id/synchronize')
  @HttpCode(HttpStatus.NO_CONTENT)
  async synchronize(@Param('id') id: string): Promise<void> {
    await this.devices.synchronize(id);
  }
}
