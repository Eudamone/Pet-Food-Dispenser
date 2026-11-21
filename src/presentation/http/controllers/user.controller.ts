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
  CreateUserResponseDto,
  UpdateUserDto,
  UserResponseDto,
} from '../dtos/user.dto.js';
import { AuthService } from '../services/auth.service.js';
import { OnboardingService } from '../services/onboarding.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private readonly auth: AuthService,
    private readonly onboarding: OnboardingService,
  ) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateUserDto,
  ) {
    const result = await this.onboarding.createProfileWithAutoLink(
      request.user,
      dto,
    );
    return CreateUserResponseDto.fromSetup(result.user, result.linkedFeeder);
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
