import { RolesGuard } from '@backend-foundation/authorization';
import { JwtAuthGuard } from '@backend-foundation/authorization/guards/jwt-auth.guard';
import { UserRole } from '@backend-foundation/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PublisherJobsController } from '../../controllers/publisher-jobs.controller';
import { JobService } from '../../services/job.service';
import request = require('supertest');

describe('PublisherJobsController e2e', () => {
  const jwtSecret = 'job-e2e-secret';
  let app: INestApplication;
  let jwt: JwtService;
  let jobService: Record<string, jest.Mock>;

  const cookieFor = (role = UserRole.PUBLISHER, sub = 10) =>
    `access_token=${jwt.sign({ sub, role })}`;

  beforeAll(async () => {
    jobService = {
      create: jest.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Dev',
      }),
      update: jest.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Updated',
      }),
      remove: jest.fn().mockResolvedValue(undefined),
      updateStatus: jest
        .fn()
        .mockImplementation(async (_userId, _id, status) => ({
          id: '123e4567-e89b-12d3-a456-426614174000',
          status,
        })),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: jwtSecret })],
      controllers: [PublisherJobsController],
      providers: [{ provide: JobService, useValue: jobService }],
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

  it('creates a job successfully with valid dto', async () => {
    await request(app.getHttpServer())
      .post('/job-listings/publishers')
      .set('Cookie', cookieFor())
      .send({
        title: 'Backend Developer',
        description: 'Node.js developer needed',
        expiresAt: '2099-01-01T00:00:00.000Z',
        applicationEmail: 'hr@techcorp.com',
        city: 'Lisboa',
        country: 'Portugal',
      })
      .expect(201);
    expect(jobService.create).toHaveBeenCalledWith(
      10,
      expect.not.objectContaining({
        city: expect.anything(),
        country: expect.anything(),
      }),
    );
  });

  it('validates create job dto fields', async () => {
    await request(app.getHttpServer())
      .post('/job-listings/publishers')
      .set('Cookie', cookieFor())
      .send({ title: '' })
      .expect(400);
  });

  it('updates a job successfully', async () => {
    await request(app.getHttpServer())
      .patch('/job-listings/publishers/123')
      .set('Cookie', cookieFor())
      .send({ title: 'Senior Backend' })
      .expect(200);
    expect(jobService.update).toHaveBeenCalledWith(
      10,
      '123',
      expect.any(Object),
    );
  });

  it('removes a job successfully', async () => {
    await request(app.getHttpServer())
      .delete('/job-listings/publishers/123')
      .set('Cookie', cookieFor())
      .expect(200);
    expect(jobService.remove).toHaveBeenCalledWith(10, '123');
  });

  it('does not expose a separate publish route', async () => {
    await request(app.getHttpServer())
      .patch('/job-listings/publishers/123/publish')
      .set('Cookie', cookieFor())
      .expect(404);
  });

  it('pauses a job successfully', async () => {
    await request(app.getHttpServer())
      .patch('/job-listings/publishers/123/pause')
      .set('Cookie', cookieFor())
      .expect(200);
    expect(jobService.updateStatus).toHaveBeenCalledWith(10, '123', 'PAUSED');
  });

  it('closes a job successfully', async () => {
    await request(app.getHttpServer())
      .patch('/job-listings/publishers/123/close')
      .set('Cookie', cookieFor())
      .expect(200);
    expect(jobService.updateStatus).toHaveBeenCalledWith(10, '123', 'CLOSED');
  });
});
