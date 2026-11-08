import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '../dto/user.dto.js';
import { AuthService } from '../../services/auth.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateUserDto,
  ) {
    return UserResponseDto.from(
      await this.auth.createProfile(request.user, dto.name),
    );
  }

  @Get('me')
  async findOne(@Req() request: AuthenticatedRequest) {
    return UserResponseDto.from(await this.auth.getProfile(request.user));
  }

  @Patch('me')
  async update(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateUserDto,
  ) {
    return UserResponseDto.from(
      await this.auth.updateProfile(request.user, dto.name),
    );
  }
}
