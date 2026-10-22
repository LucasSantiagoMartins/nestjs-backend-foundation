jest.mock('@nestjs/bullmq', () => ({ InjectQueue: () => () => undefined }));

import { JwtAuthGuard } from '@backend-foundation/authorization/guards/jwt-auth.guard';
import { UserRole } from '@backend-foundation/common';
import googleConfig from '@config/google.config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { AuthController } from '../../controllers/auth.controller';
import { LoginDto } from '../../dtos/login.dto';
import { AuthService } from '../../services/auth.service';
import request = require('supertest');

describe('Auth HTTP e2e', () => {
  const jwtSecret = 'auth-e2e-secret';
  let app: INestApplication;
  let jwt: JwtService;
  let authService: Record<string, jest.Mock>;
  let configService: ConfigService;

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_CALLBACK_URL =
      'http://localhost:3000/auth/google/callback';
    process.env.GOOGLE_FRONTEND_REDIRECT_URL = 'http://localhost:3000/';

    authService = {
      login: jest.fn().mockImplementation(async (data: LoginDto, res: any) => {
        if (data.identifier === 'wrong@email.com') {
          throw new (class extends Error {
            status = 401;
          })();
        }
        res.cookie('access_token', jwt.sign({ sub: 1, role: UserRole.USER }));
      }),
      loginWithGoogle: jest
        .fn()
        .mockImplementation(async (user: any, res: any) => {
          const userId = user?.id || 1;
          res.cookie(
            'access_token',
            jwt.sign({ sub: userId, role: UserRole.USER }),
          );
        }),
      logout: jest.fn().mockImplementation(async (res: any) => {
        res.clearCookie('access_token');
      }),
      changePassword: jest.fn().mockResolvedValue(undefined),
      forgotPassword: jest.fn().mockResolvedValue(undefined),
      resetPassword: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: jwtSecret }),
        ConfigModule.forRoot({
          isGlobal: true,
          load: [googleConfig],
        }),
      ],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(AuthGuard('google'))
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const res = context.switchToHttp().getResponse();
          if (req.url === '/auth/google') {
            res.redirect(302, 'https://accounts.google.com/o/oauth2/v2/auth');
            return false;
          }
          req.user = { id: 1, email: 'google@test.com' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(app.get(JwtService), reflector));
    jwt = app.get(JwtService);
    configService = app.get(ConfigService);
    await app.init();
  });

  afterAll(async () => app.close());

  it('performs login successfully and sets access_token cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'test@example.com', password: 'Password123!' })
      .expect(201);

    expect(response.get('Set-Cookie')).toBeDefined();
    const cookies = response.get('Set-Cookie') as unknown as string[];
    const cookieString = Array.isArray(cookies)
      ? cookies.join(';')
      : String(cookies);
    expect(cookieString).toContain('access_token=');
    expect(authService.login).toHaveBeenCalled();
  });

  it('clears access_token cookie on logout', async () => {
    const token = jwt.sign({ sub: 1, role: UserRole.USER });

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', [`access_token=${token}`])
      .expect(200);

    const cookies = response.get('Set-Cookie') as unknown as string[];
    const cookieString = Array.isArray(cookies)
      ? cookies.join(';')
      : String(cookies);
    expect(cookieString).toContain('access_token=;');
    expect(authService.logout).toHaveBeenCalled();
  });

  it('requires authentication for change-password and takes the user id from the JWT', async () => {
    const body = {
      currentPassword: 'CurrentPassword1',
      newPassword: 'NewPassword123',
      confirmPassword: 'NewPassword123',
    };

    await request(app.getHttpServer())
      .patch('/auth/change-password')
      .send(body)
      .expect(401);

    await request(app.getHttpServer())
      .patch('/auth/change-password')
      .set('Cookie', [
        `access_token=${jwt.sign({ sub: 23, role: UserRole.USER })}`,
      ])
      .send(body)
      .expect(200);

    expect(authService.changePassword).toHaveBeenCalledWith(23, body);
  });

  it('exposes public forgot-password and reset-password endpoints', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'person@example.com' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        email: 'person@example.com',
        code: '01234',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      })
      .expect(200);

    expect(authService.forgotPassword).toHaveBeenCalledWith({
      email: 'person@example.com',
    });
    expect(authService.resetPassword).toHaveBeenCalledWith({
      email: 'person@example.com',
      code: '01234',
      newPassword: 'NewPassword123',
      confirmPassword: 'NewPassword123',
    });
  });

  it('redirects user on Google OAuth start and callback routes', async () => {
    await request(app.getHttpServer()).get('/auth/google').expect(302);

    const callbackResponse = await request(app.getHttpServer())
      .get('/auth/google/callback')
      .expect(302);

    const expectedRedirectUrl = configService.get<string>(
      'google.frontendRedirectUrl',
    );

    expect(callbackResponse.get('Location')).toBe(expectedRedirectUrl);
    const cookies = callbackResponse.get('Set-Cookie') as unknown as string[];
    const cookieString = Array.isArray(cookies)
      ? cookies.join(';')
      : String(cookies);
    expect(cookieString).toContain('access_token=');
  });
});
