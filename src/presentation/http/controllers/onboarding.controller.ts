import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  OnboardingDto,
  OnboardingResponseDto,
} from '../dtos/onboarding.dto.js';
import { OnboardingService } from '../services/onboarding.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';

@Controller('onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post()
  async setup(
    @Req() request: AuthenticatedRequest,
    @Body() dto: OnboardingDto,
  ) {
    return OnboardingResponseDto.from(
      await this.onboarding.setup(request.user, dto),
    );
  }
}
