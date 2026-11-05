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
import { UserService } from '../../services/user.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UserService) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateUserDto,
  ) {
    return UserResponseDto.from(await this.users.create(request.user, dto));
  }

  @Get('me')
  async findOne(@Req() request: AuthenticatedRequest) {
    return UserResponseDto.from(await this.users.findOne(request.user));
  }

  @Patch('me')
  async update(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateUserDto,
  ) {
    return UserResponseDto.from(await this.users.update(request.user, dto));
  }
}
