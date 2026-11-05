import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AssignTagDto,
  RegisterTagDto,
  RfidTagResponseDto,
} from '../dto/rfid.dto.js';
import { PetService } from '../../services/pet.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';

@Controller('rfid-tags')
@UseGuards(AuthGuard)
export class RfidController {
  constructor(private readonly pets: PetService) {}

  @Post()
  async register(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RegisterTagDto,
  ) {
    return RfidTagResponseDto.from(
      await this.pets.registerTag(request.user, dto.uid),
    );
  }

  @Get()
  async findAll(@Req() request: AuthenticatedRequest) {
    return (await this.pets.listTags(request.user)).map((item) =>
      RfidTagResponseDto.from(item),
    );
  }

  @Get(':uid')
  async findOne(
    @Req() request: AuthenticatedRequest,
    @Param('uid') uid: string,
  ) {
    return RfidTagResponseDto.from(await this.pets.findTag(request.user, uid));
  }

  @Put(':uid/pet')
  async assign(
    @Req() request: AuthenticatedRequest,
    @Param('uid') uid: string,
    @Body() dto: AssignTagDto,
  ) {
    return RfidTagResponseDto.from(
      await this.pets.assignTag(request.user, dto.petId, uid),
    );
  }

  @Delete(':uid/pet')
  async unassign(
    @Req() request: AuthenticatedRequest,
    @Param('uid') uid: string,
  ) {
    return RfidTagResponseDto.from(
      await this.pets.unassignTag(request.user, uid),
    );
  }

  @Patch(':uid/activate')
  async activate(
    @Req() request: AuthenticatedRequest,
    @Param('uid') uid: string,
  ) {
    return RfidTagResponseDto.from(
      await this.pets.setTagActive(request.user, uid, true),
    );
  }

  @Patch(':uid/deactivate')
  async deactivate(
    @Req() request: AuthenticatedRequest,
    @Param('uid') uid: string,
  ) {
    return RfidTagResponseDto.from(
      await this.pets.setTagActive(request.user, uid, false),
    );
  }
}
