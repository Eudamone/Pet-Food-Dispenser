import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ClaimFeederDto,
  CreateFeederDto,
  DiscoveredFeederResponseDto,
  ScannedRfidTagResponseDto,
  UpdateFeederDto,
  FeederResponseDto,
} from '../dtos/feeder.dto.js';
import { DeviceService } from '../services/device.service.js';
import { ServoCommandDto } from '../dtos/feeding.dto.js';
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

  @Post('claim')
  async claim(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ClaimFeederDto,
  ) {
    const claimed = await this.feeders.claimAvailableFeeder(request.user, dto);
    if (!claimed) {
      throw new NotFoundException(
        'No hay ningún alimentador disponible para vincular.',
      );
    }
    return FeederResponseDto.from(claimed);
  }

  @Get()
  async findAll(@Req() request: AuthenticatedRequest) {
    return (await this.feeders.findAll(request.user)).map((item) =>
      FeederResponseDto.from(item),
    );
  }

  @Get('discovered')
  async listDiscovered() {
    return (await this.feeders.listDiscovered()).map((item) =>
      DiscoveredFeederResponseDto.from(item),
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

  @Get(':id/rfid-scanned')
  async listScannedTags(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return (await this.feeders.listScannedTags(request.user, id)).map((item) =>
      ScannedRfidTagResponseDto.from(item),
    );
  }

  @Post(':id/servos')
  @HttpCode(202)
  requestServo(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ServoCommandDto,
  ) {
    return this.feeders.requestServoPosition(request.user, id, input);
  }

  @Get(':id/servos/:requestId')
  getServoRequest(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.feeders.getServoRequest(request.user, id, requestId);
  }

  @Put(':id/pets/:petId')
  async authorizePet(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('petId', ParseUUIDPipe) petId: string,
  ) {
    return FeederResponseDto.from(
      await this.feeders.authorizePet(request.user, id, petId),
    );
  }

  @Delete(':id/pets/:petId')
  async revokePet(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('petId', ParseUUIDPipe) petId: string,
  ) {
    return FeederResponseDto.from(
      await this.feeders.revokePet(request.user, id, petId),
    );
  }
}
