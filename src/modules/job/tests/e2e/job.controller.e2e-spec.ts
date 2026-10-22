import { RolesGuard } from '@backend-foundation/authorization';
import { JwtAuthGuard } from '@backend-foundation/authorization/guards/jwt-auth.guard';
import { UserRole } from '@backend-foundation/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { JobsController } from '../../controllers/job.controller';
import { JobService } from '../../services/job.service';
import request = require('supertest');

describe('JobsController e2e', () => {
  const jwtSecret = 'job-e2e-secret';
  let app: INestApplication;
  let jwt: JwtService;
  let jobService: Record<string, jest.Mock>;

  const cookieFor = (role = UserRole.PUBLISHER, sub = 10) =>
    `access_token=${jwt.sign({ sub, role })}`;

  beforeAll(async () => {
    jobService = {
      findAll: jest.fn().mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      }),
      findById: jest.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Dev',
      }),
      getJobListingCompany: jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'Tech Corp' }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: jwtSecret })],
      controllers: [JobsController],
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

  it('gets public job listings with pagination', async () => {
    await request(app.getHttpServer()).get('/job-listings?page=1').expect(200);
    expect(jobService.findAll).toHaveBeenCalledWith(1);
  });

  it('gets job listing company details', async () => {
    await request(app.getHttpServer())
      .get('/job-listings/123/company')
      .expect(200);
    expect(jobService.getJobListingCompany).toHaveBeenCalledWith('123');
  });

  it('gets job listing by id', async () => {
    await request(app.getHttpServer()).get('/job-listings/123').expect(200);
    expect(jobService.findById).toHaveBeenCalledWith('123');
  });
});
