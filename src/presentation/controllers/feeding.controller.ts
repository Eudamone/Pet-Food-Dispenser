import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FeedingService } from '../../services/feeding.service.js';
import { SaveFeedingPlanDto } from '../dto/feeding.dto.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';

@Controller('feeders/:id/plan')
@UseGuards(AuthGuard)
export class FeedingController {
  constructor(private readonly feeding: FeedingService) {}

  @Get()
  getPlan(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) deviceId: string,
  ) {
    return this.feeding.getPlan(request.user, deviceId);
  }

  @Put()
  savePlan(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) deviceId: string,
    @Body() input: SaveFeedingPlanDto,
  ) {
    return this.feeding.savePlan(request.user, deviceId, input);
  }
}
