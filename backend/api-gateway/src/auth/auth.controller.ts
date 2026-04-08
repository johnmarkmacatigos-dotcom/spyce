import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsString, IsNotEmpty } from 'class-validator';
import { Throttle } from '@nestjs/throttler';

class PiAuthDto {
  @IsString()
  @IsNotEmpty()
  pi_access_token: string;

  @IsString()
  @IsNotEmpty()
  pi_uid: string;
}

class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

// Rate limit: 100 auth attempts per 15 minutes per IP
@Throttle({ short: { limit: 20, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('pi')
  @HttpCode(HttpStatus.OK)
  async authenticateWithPi(@Body() dto: PiAuthDto) {
    return this.authService.authenticateWithPi(dto.pi_access_token, dto.pi_uid);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }
}
