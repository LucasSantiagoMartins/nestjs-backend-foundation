import { RolesGuard } from '@backend-foundation/authorization';
import { JwtAuthGuard } from '@backend-foundation/authorization/guards/jwt-auth.guard';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../../../../libs/common/src/enums/user-role.enum';
import { AdminCommunityController } from '../../controllers/admin-community.controller';
import { CommunityMessageController } from '../../controllers/community-message.controller';
import { CommunityController } from '../../controllers/community.controller';
import { CommunityMessageType } from '../../enums/community-message-type.enum';
import { CommunityMessageService } from '../../services/community-message.service';
import { CommunityService } from '../../services/community.service';
import request = require('supertest');

describe('Community HTTP e2e', () => {
  const jwtSecret = 'community-e2e-secret';
  let app: INestApplication;
  let jwt: JwtService;
  let communityService: Record<string, jest.Mock>;
  let messageService: Record<string, jest.Mock>;

  const cookieFor = (role: UserRole, sub = 21) =>
    `access_token=${jwt.sign({ sub, role })}`;

  beforeAll(async () => {
    communityService = {
      findAll: jest.fn().mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      }),
      findById: jest.fn().mockResolvedValue({ id: 5, slug: 'portugal' }),
      listMembers: jest.fn().mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      }),
      joinCommunity: jest
        .fn()
        .mockResolvedValue({ id: 10, communityId: 5, userId: 21 }),
      leaveCommunity: jest.fn().mockResolvedValue(undefined),
      isMember: jest.fn().mockResolvedValue({ isMember: true }),
      create: jest.fn().mockResolvedValue({ id: 6, slug: 'franca' }),
      update: jest.fn().mockResolvedValue({ id: 6, name: 'Nova França' }),
      remove: jest.fn().mockResolvedValue(undefined),
      activate: jest.fn().mockResolvedValue({ id: 6, isActive: true }),
      deactivate: jest.fn().mockResolvedValue({ id: 6, isActive: false }),
    };
    messageService = {
      listMessages: jest.fn().mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      }),
      sendMessage: jest.fn().mockResolvedValue({
        id: 15,
        communityId: 5,
        userId: 21,
        type: CommunityMessageType.TEXT,
        content: 'Olá',
      }),
      deleteMessage: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: jwtSecret })],
      controllers: [
        CommunityController,
        AdminCommunityController,
        CommunityMessageController,
      ],
      providers: [
        { provide: CommunityService, useValue: communityService },
        { provide: CommunityMessageService, useValue: messageService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    const reflector = app.get(Reflector);
    app.useGlobalGuards(
      new JwtAuthGuard(app.get(JwtService), reflector),
      new RolesGuard(reflector),
    );
    jwt = app.get(JwtService);
    await app.init();
  });

  afterAll(async () => app.close());

  it('serves public community listing without a session', async () => {
    await request(app.getHttpServer()).get('/communities').expect(200);
    expect(communityService.findAll).toHaveBeenCalledWith(1);
  });

  it('requires a valid JWT for membership operations and uses the JWT subject', async () => {
    await request(app.getHttpServer()).post('/communities/5/join').expect(401);
    await request(app.getHttpServer())
      .post('/communities/5/join')
      .set('Cookie', cookieFor(UserRole.USER, 21))
      .expect(201);
    expect(communityService.joinCommunity).toHaveBeenCalledWith(21, 5);
  });

  it('validates route IDs and message query DTOs', async () => {
    await request(app.getHttpServer())
      .get('/communities/not-a-number')
      .expect(400);
    await request(app.getHttpServer())
      .get('/communities/5/messages?page=0')
      .set('Cookie', cookieFor(UserRole.USER))
      .expect(400);
  });

  it('allows an authenticated member to send a message through the route', async () => {
    await request(app.getHttpServer())
      .post('/communities/5/messages')
      .set('Cookie', cookieFor(UserRole.USER, 21))
      .send({ type: CommunityMessageType.TEXT, content: 'Olá' })
      .expect(201);
    expect(messageService.sendMessage).toHaveBeenCalledWith(
      21,
      5,
      expect.objectContaining({
        type: CommunityMessageType.TEXT,
        content: 'Olá',
      }),
    );
  });

  it('restricts community administration to ADMIN and validates its DTO', async () => {
    await request(app.getHttpServer())
      .post('/communities')
      .set('Cookie', cookieFor(UserRole.USER))
      .send({ name: 'França' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/communities')
      .set('Cookie', cookieFor(UserRole.ADMIN))
      .send({ name: 'França' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/communities')
      .set('Cookie', cookieFor(UserRole.ADMIN))
      .send({
        name: 'Comunidade França',
        slug: 'franca',
        countryCode: 'FR',
        countryName: 'França',
      })
      .expect(201);
    expect(communityService.create).toHaveBeenCalledWith(
      21,
      expect.objectContaining({ slug: 'franca' }),
    );
  });
});
