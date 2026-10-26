// feeding.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FeedingService } from '@/services/feeding.service.js';
import { JwtAuthGuard } from '@/controllers/jwt-auth.guard.js';
import { CurrentUser } from '@/controllers/current-user.decorator.js';
import {
  ConsumptionQueryDto,
  CreatePlanDto,
  HistoryQueryDto,
  SaveSlotDto,
  SetMaxDailyDto,
  SetPlanEnabledDto,
} from '@/dto/feeding.dto.js';
import { FeedingPlan } from '@/models/feeding-plan.model.js';
import { FeedingSlot } from '@/models/feeding-slot.model.js';
import { DispensingRecord } from '@/models/dispensing-record.model.js';
import { AccessSession } from '@/models/access-session.model.js';
import { DailyConsumption } from '@/models/daily-consumption.model.js';
import { User } from '@/models/user.model.js';
import { LocalTime } from '@/helpers/local-time.vo.js';
import { LocalDate } from '@/helpers/local-date.vo.js';
import type { BudgetQueryResult } from '@/models/types.js';

@UseGuards(JwtAuthGuard)
@Controller('feeding/devices/:deviceId')
export class FeedingController {
  constructor(private readonly feeding: FeedingService) {}

  @Post('plans')
  createPlan(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Body() dto: CreatePlanDto,
  ): Promise<FeedingPlan> {
    return this.feeding.createPlan(user, deviceId, dto.maxDailyDispensedGrams);
  }

  @Post('slots')
  async saveSlot(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Body() dto: SaveSlotDto,
  ): Promise<{ revision: number }> {
    const slot = FeedingSlot.create({
      id: dto.id ?? randomUUID(),
      time: LocalTime.parse(dto.time),
      days: dto.days,
      targetGrams: dto.targetGrams,
      enabled: dto.enabled,
    });
    return { revision: await this.feeding.saveSlot(user, deviceId, slot) };
  }

  @Delete('slots/:slotId')
  async removeSlot(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Param('slotId') slotId: string,
  ): Promise<{ revision: number }> {
    return { revision: await this.feeding.removeSlot(user, deviceId, slotId) };
  }

  @Patch('max-daily')
  async setMaxDaily(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Body() dto: SetMaxDailyDto,
  ): Promise<{ revision: number }> {
    return {
      revision: await this.feeding.setMaxDailyDispensed(user, deviceId, dto.grams),
    };
  }

  @Patch('enabled')
  async setEnabled(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Body() dto: SetPlanEnabledDto,
  ): Promise<{ revision: number }> {
    return {
      revision: await this.feeding.setPlanEnabled(user, deviceId, dto.enabled),
    };
  }

  @Get('plan')
  plan(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
  ): Promise<FeedingPlan | null> {
    return this.feeding.getPlan(user, deviceId);
  }

  @Get('dispensing')
  dispensing(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Query() query: HistoryQueryDto,
  ): Promise<DispensingRecord[]> {
    return this.feeding.getDispensingHistory(
      user,
      deviceId,
      this.date(query.from),
      this.date(query.to),
    );
  }

  @Get('access')
  access(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Query() query: HistoryQueryDto,
  ): Promise<AccessSession[]> {
    return this.feeding.getAccessHistory(
      user,
      deviceId,
      this.date(query.from),
      this.date(query.to),
    );
  }

  @Get('consumption/:petId')
  consumption(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Param('petId') petId: string,
    @Query() query: ConsumptionQueryDto,
  ): Promise<DailyConsumption> {
    const day = query.day ? LocalDate.parse(query.day) : LocalDate.today();
    return this.feeding.getDailyConsumption(user, deviceId, petId, day);
  }

  @Get('budget/:petId')
  budget(
    @CurrentUser() user: User,
    @Param('deviceId') deviceId: string,
    @Param('petId') petId: string,
  ): Promise<BudgetQueryResult> {
    return this.feeding.getDailyBudget(user, deviceId, petId);
  }

  private date(value?: string): Date | null {
    return value ? new Date(value) : null;
  }
}
