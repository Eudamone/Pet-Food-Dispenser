import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CreateFeederDto,
  UpdateFeederDto,
  FeederResponseDto,
} from '../dto/feeder.dto.js';
import { DeviceService } from '../../services/device.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';

@Controller('feeders')
@UseGuards(AuthGuard)
export class FeedersController {
  constructor(private readonly feeders: DeviceService) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateFeederDto,
  ) {
    return FeederResponseDto.from(await this.feeders.create(request.user, dto));
  }

  @Get()
  async findAll(@Req() request: AuthenticatedRequest) {
    return (await this.feeders.findAll(request.user)).map((item) =>
      FeederResponseDto.from(item),
    );
  }

  @Get(':id')
  async findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return FeederResponseDto.from(
      await this.feeders.getDevice(request.user, id),
    );
  }

  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeederDto,
  ) {
    return FeederResponseDto.from(
      await this.feeders.update(request.user, id, dto),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.feeders.delete(request.user, id);
  }
}
