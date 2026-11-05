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
  CreatePetDto,
  UpdatePetDto,
  SetDailyLimitDto,
  PetResponseDto,
} from '../dto/pet.dto.js';
import { PetService } from '../../services/pet.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';

@Controller('pets')
@UseGuards(AuthGuard)
export class PetsController {
  constructor(private readonly pets: PetService) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePetDto,
  ) {
    return PetResponseDto.from(await this.pets.create(request.user, dto));
  }

  @Get()
  async findAll(@Req() request: AuthenticatedRequest) {
    return (await this.pets.findAll(request.user)).map((item) =>
      PetResponseDto.from(item),
    );
  }

  @Get('count')
  async count(@Req() request: AuthenticatedRequest) {
    return { count: await this.pets.countPets(request.user) };
  }

  @Get(':id')
  async findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return PetResponseDto.from(await this.pets.findOne(request.user, id));
  }

  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePetDto,
  ) {
    return PetResponseDto.from(await this.pets.update(request.user, id, dto));
  }

  @Patch(':id/daily-limit')
  async setDailyLimit(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetDailyLimitDto,
  ) {
    return PetResponseDto.from(
      await this.pets.setDailyLimit(request.user, id, dto.grams),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.pets.delete(request.user, id);
  }
}
