import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { isISO8601 } from 'class-validator';
import { FeedingService } from '../../services/feeding.service.js';
import { SaveFeedingPlanDto } from '../dto/feeding.dto.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';

@Controller('feeders/:id')
@UseGuards(AuthGuard)
export class FeedingController {
  constructor(private readonly feeding: FeedingService) {}

  @Get('plan')
  getPlan(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) deviceId: string,
  ) {
    return this.feeding.getPlan(request.user, deviceId);
  }

  @Put('plan')
  savePlan(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) deviceId: string,
    @Body() input: SaveFeedingPlanDto,
  ) {
    return this.feeding.savePlan(request.user, deviceId, input);
  }

  @Get('access')
  getAccessHistory(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) deviceId: string,
  ) {
    return this.feeding.getAccessHistory(request.user, deviceId);
  }

  @Get('dispensing')
  getDispensingHistory(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) deviceId: string,
  ) {
    return this.feeding.getDispensingHistory(request.user, deviceId);
  }

  @Get('pets/:petId/consumption')
  getDailyConsumption(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) deviceId: string,
    @Param('petId', ParseUUIDPipe) petId: string,
    @Query('day') day: string,
  ) {
    if (
      typeof day !== 'string' ||
      day.length !== 10 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      day.startsWith('0000') ||
      !isISO8601(day, { strict: true })
    )
      throw new BadRequestException(
        'Indica un día válido con formato YYYY-MM-DD.',
      );
    return this.feeding.getDailyConsumption(request.user, deviceId, petId, day);
  }
}
