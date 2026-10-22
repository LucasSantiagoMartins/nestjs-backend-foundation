import { Public, UserDecorator } from '@backend-foundation/authorization';
import { SuccessMessage } from '@backend-foundation/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { LoginDto } from '../dtos/login.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @Public()
  @SuccessMessage('Inicio de sessão feito com sucesso')
  async login(
    @Body() data: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.login(data, res);
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any) {}

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.loginWithGoogle(req.user, res);

    const frontendRedirectUrl = this.configService.getOrThrow<string>(
      'google.frontendRedirectUrl',
    );

    res.redirect(frontendRedirectUrl);
  }

  @Post('logout')
  @SuccessMessage('Sessão terminada com sucesso')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.logout(res);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Senha alterada com sucesso')
  async changePassword(
    @UserDecorator('sub') userId: number,
    @Body() data: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(userId, data);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Se a conta existir, receberás um código de recuperação')
  async forgotPassword(@Body() data: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(data);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @SuccessMessage('Senha redefinida com sucesso')
  async resetPassword(@Body() data: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(data);
  }
}
