import { RolesGuard } from '@backend-foundation/authorization';
import { JwtAuthGuard } from '@backend-foundation/authorization/guards/jwt-auth.guard';
import { UserRole } from '@backend-foundation/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PublisherCompaniesController } from '../../controllers/publisher-companies.controller';
import { JobService } from '../../services/job.service';
import request = require('supertest');

describe('PublisherCompaniesController e2e', () => {
  const jwtSecret = 'job-e2e-secret';
  let app: INestApplication;
  let jwt: JwtService;
  let jobService: Record<string, jest.Mock>;

  const cookieFor = (role = UserRole.PUBLISHER, sub = 10) =>
    `access_token=${jwt.sign({ sub, role })}`;

  beforeAll(async () => {
    jobService = {
      createCompany: jest.fn().mockResolvedValue({ id: 1, name: 'Tech Corp' }),
      findCompanyByPublisher: jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'Tech Corp' }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: jwtSecret })],
      controllers: [PublisherCompaniesController],
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

  it('creates a company successfully with valid dto', async () => {
    await request(app.getHttpServer())
      .post('/job-listings/publishers/companies')
      .set('Cookie', cookieFor())
      .send({
        name: 'Tech Corp',
        email: 'contact@techcorp.com',
        municipality: 'Lisboa',
        addressLine: 'Rua das Flores, 10',
      })
      .expect(201);
    expect(jobService.createCompany).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        municipality: 'Lisboa',
        addressLine: 'Rua das Flores, 10',
      }),
    );
  });

  it('validates create company dto fields', async () => {
    await request(app.getHttpServer())
      .post('/job-listings/publishers/companies')
      .set('Cookie', cookieFor())
      .send({ name: '' })
      .expect(400);
  });

  it('gets publisher company by id', async () => {
    await request(app.getHttpServer())
      .get('/job-listings/publishers/companies/1')
      .set('Cookie', cookieFor())
      .expect(200);
    expect(jobService.findCompanyByPublisher).toHaveBeenCalledWith(10, 1);
  });
});
