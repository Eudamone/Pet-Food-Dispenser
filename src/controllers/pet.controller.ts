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
} from '@nestjs/common';
import { Pet } from '@/entity-model/pet.model.js';
import { CreatePetDto, UpdatePetDto } from '@/dto/pet.dto.js';
import { PetsService } from '@/services/pet.service.js';

@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  create(@Body() dto: CreatePetDto): Promise<Pet> {
    return this.petsService.create(dto);
  }

  @Get()
  findAll(): Promise<Pet[]> {
    return this.petsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Pet> {
    return this.petsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePetDto): Promise<Pet> {
    return this.petsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.petsService.delete(id);
  }
}
