// auth.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '@/services/auth.service.js';
import type { AuthResult } from '@/services/auth.service.js';
import { JwtAuthGuard } from '@/controllers/jwt-auth.guard.js';
import { CurrentUser } from '@/controllers/current-user.decorator.js';
import {
  ChangePasswordDto,
  ConfirmPasswordResetDto,
  EmailChangeDto,
  PasswordResetDto,
  RegisterDto,
  SignInDto,
} from '@/dto/auth.dto.js';
import { User } from '@/models/user.model.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<AuthResult> {
    const result = await this.auth.register(dto.name, dto.email, dto.password);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
    return result.value;
  }

  @Post('sign-in')
  async signIn(@Body() dto: SignInDto): Promise<AuthResult> {
    const result = await this.auth.signIn(dto.email, dto.password);
    if (result.isFailure) {
      throw new UnauthorizedException(result.error);
    }
    return result.value;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User): User {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('email-change')
  @HttpCode(HttpStatus.NO_CONTENT)
  async emailChange(
    @CurrentUser() user: User,
    @Body() dto: EmailChangeDto,
  ): Promise<void> {
    const result = await this.auth.requestEmailChange(user.id, dto.newEmail);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async passwordReset(@Body() dto: PasswordResetDto): Promise<void> {
    const result = await this.auth.requestPasswordReset(dto.email);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmPasswordReset(
    @Body() dto: ConfirmPasswordResetDto,
  ): Promise<void> {
    const result = await this.auth.confirmPasswordReset(
      dto.token,
      dto.newPassword,
    );
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    const result = await this.auth.changePassword(user.id, dto.newPassword);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  signOut(): void {
    this.auth.signOut();
  }
}
