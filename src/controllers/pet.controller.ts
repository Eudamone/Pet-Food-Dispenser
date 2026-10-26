// pet.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PetService } from '@/services/pet.service.js';
import { JwtAuthGuard } from '@/controllers/jwt-auth.guard.js';
import { CurrentUser } from '@/controllers/current-user.decorator.js';
import {
  AssignTagDto,
  RegisterPetDto,
  RegisterTagDto,
  SetDailyLimitDto,
  UpdatePetDto,
} from '@/dto/pet.dto.js';
import { Pet } from '@/models/pet.model.js';
import { RfidTag } from '@/models/rfid-tag.model.js';
import { User } from '@/models/user.model.js';

@UseGuards(JwtAuthGuard)
@Controller('pets')
export class PetsController {
  constructor(private readonly pets: PetService) {}

  @Post()
  register(
    @CurrentUser() user: User,
    @Body() dto: RegisterPetDto,
  ): Promise<Pet> {
    return this.pets.registerPet(user, dto.name, dto.species ?? null, dto.toBirthDate());
  }

  @Get('count')
  async count(@CurrentUser() user: User): Promise<{ count: number }> {
    return { count: await this.pets.countPets(user) };
  }

  @Get()
  list(@CurrentUser() user: User): Promise<Pet[]> {
    return this.pets.listPets(user);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePetDto,
  ): Promise<void> {
    await this.pets.updatePet(user, id, dto.name, dto.species ?? null, dto.toBirthDate());
  }

  @Patch(':id/daily-limit')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setDailyLimit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: SetDailyLimitDto,
  ): Promise<void> {
    await this.pets.setDailyLimit(user, id, dto.grams);
  }

  @Post('tags')
  registerTag(
    @CurrentUser() user: User,
    @Body() dto: RegisterTagDto,
  ): Promise<RfidTag> {
    return this.pets.registerTag(user, dto.uid);
  }

  @Post(':id/tags')
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignTag(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AssignTagDto,
  ): Promise<void> {
    await this.pets.assignTag(user, id, dto.uid);
  }

  @Delete('tags/:uid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassignTag(
    @CurrentUser() user: User,
    @Param('uid') uid: string,
  ): Promise<void> {
    await this.pets.unassignTag(user, uid);
  }

  @Delete(':id/tags')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeTag(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    await this.pets.revokeTag(user, id);
  }
}
