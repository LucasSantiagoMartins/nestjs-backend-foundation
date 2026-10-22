import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { UserModule } from '../user/user.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { AuthCookieService } from './services/auth-cookie.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordRecoveryCode } from './entities/password-recovery-code.entity';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    TypeOrmModule.forFeature([PasswordRecoveryCode]),
  ],

  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, AuthCookieService],

  exports: [AuthService],
})
export class AuthModule {}
