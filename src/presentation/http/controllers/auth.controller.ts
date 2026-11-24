import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from '../dtos/auth.dto.js';
import { LocalAuthService } from '../services/local-auth.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';
import { UserResponseDto } from '../dtos/user.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: LocalAuthService) {}

  @Post('register')
  register(@Body() input: RegisterDto) {
    return this.auth.register(input);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() input: LoginDto) {
    return this.auth.login(input);
  }

  @Get('session')
  @UseGuards(AuthGuard)
  session(@Req() request: AuthenticatedRequest) {
    return UserResponseDto.from(request.user);
  }
}
