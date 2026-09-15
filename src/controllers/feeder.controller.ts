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
import { Feeder } from '@/entity-model/feeder.model.js';
import { CreateFeederDto, UpdateFeederDto } from '@/dto/feeder.dto.js';
import { FeedersService } from '@/services/feeder.service.js';

@Controller('feeders')
export class FeedersController {
  constructor(private readonly feedersService: FeedersService) {}

  @Post()
  create(@Body() dto: CreateFeederDto): Promise<Feeder> {
    return this.feedersService.create(dto);
  }

  @Get()
  findAll(): Promise<Feeder[]> {
    return this.feedersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Feeder> {
    return this.feedersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFeederDto): Promise<Feeder> {
    return this.feedersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.feedersService.delete(id);
  }
}
