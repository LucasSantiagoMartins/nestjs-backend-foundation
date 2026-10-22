import { RolesGuard } from '@backend-foundation/authorization';
import { JwtAuthGuard } from '@backend-foundation/authorization/guards/jwt-auth.guard';
import { UserRole } from '@backend-foundation/common';
import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PublisherHousingBookingRequestController } from '../../controllers/publisher-housing-booking-request.controller';
import { HousingBookingRequestStatus } from '../../enums/housing-booking-request-status.enum';
import { HousingBookingRequestQueryService } from '../../services/housing-booking-request-query.service';
import { HousingBookingRequestService } from '../../services/housing-booking-request.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');

describe('PublisherHousingBookingRequestController e2e', () => {
  const jwtSecret = 'housing-booking-request-e2e-secret';
  let app: INestApplication;
  let jwt: JwtService;
  let bookingRequestService: Record<string, jest.Mock>;
  let queryService: Record<string, jest.Mock>;

  const cookieFor = (role = UserRole.PUBLISHER, sub = 10) =>
    `access_token=${jwt.sign({ sub, role })}`;

  beforeAll(async () => {
    bookingRequestService = {
      transition: jest.fn().mockResolvedValue({ id: 1 }),
    };
    queryService = {
      listForPublisher: jest.fn().mockResolvedValue([]),
      findForPublisher: jest.fn().mockResolvedValue({ id: 1 }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: jwtSecret })],
      controllers: [PublisherHousingBookingRequestController],
      providers: [
        {
          provide: HousingBookingRequestService,
          useValue: bookingRequestService,
        },
        {
          provide: HousingBookingRequestQueryService,
          useValue: queryService,
        },
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

  beforeEach(() => jest.clearAllMocks());

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer())
      .patch('/publishers/housing-booking-requests/1/status')
      .send({ status: HousingBookingRequestStatus.ACCEPTED })
      .expect(401);
    expect(bookingRequestService.transition).not.toHaveBeenCalled();
  });

  it('rejects requests from non-publisher roles', async () => {
    await request(app.getHttpServer())
      .patch('/publishers/housing-booking-requests/1/status')
      .set('Cookie', cookieFor(UserRole.USER))
      .send({ status: HousingBookingRequestStatus.ACCEPTED })
      .expect(403);
    expect(bookingRequestService.transition).not.toHaveBeenCalled();
  });

  it('lists the publisher booking requests', async () => {
    await request(app.getHttpServer())
      .get('/publishers/housing-booking-requests')
      .set('Cookie', cookieFor())
      .expect(200);
    expect(queryService.listForPublisher).toHaveBeenCalledWith(10);
  });

  it('gets a booking request by id', async () => {
    await request(app.getHttpServer())
      .get('/publishers/housing-booking-requests/1')
      .set('Cookie', cookieFor())
      .expect(200);
    expect(queryService.findForPublisher).toHaveBeenCalledWith(10, 1);
  });

  it.each([
    HousingBookingRequestStatus.ACCEPTED,
    HousingBookingRequestStatus.REJECTED,
    HousingBookingRequestStatus.RELEASED,
  ])('changes the booking request status to %s', async (status) => {
    await request(app.getHttpServer())
      .patch('/publishers/housing-booking-requests/1/status')
      .set('Cookie', cookieFor())
      .send({ status })
      .expect(200);
    expect(bookingRequestService.transition).toHaveBeenCalledWith(
      10,
      1,
      status,
    );
  });

  it('rejects an unknown status', async () => {
    await request(app.getHttpServer())
      .patch('/publishers/housing-booking-requests/1/status')
      .set('Cookie', cookieFor())
      .send({ status: 'PENDING_REVIEW' })
      .expect(400);
    expect(bookingRequestService.transition).not.toHaveBeenCalled();
  });

  it('rejects a status transition that is not allowed', async () => {
    bookingRequestService.transition.mockRejectedValueOnce(
      new BadRequestException('Este pedido já foi processado.'),
    );

    await request(app.getHttpServer())
      .patch('/publishers/housing-booking-requests/1/status')
      .set('Cookie', cookieFor())
      .send({ status: HousingBookingRequestStatus.ACCEPTED })
      .expect(400);
  });

  it('no longer exposes the legacy accept, reject and release routes', async () => {
    await request(app.getHttpServer())
      .patch('/publishers/housing-booking-requests/1/accept')
      .set('Cookie', cookieFor())
      .expect(404);
    await request(app.getHttpServer())
      .patch('/publishers/housing-booking-requests/1/reject')
      .set('Cookie', cookieFor())
      .expect(404);
    await request(app.getHttpServer())
      .patch('/publishers/housing-booking-requests/1/release')
      .set('Cookie', cookieFor())
      .expect(404);
    expect(bookingRequestService.transition).not.toHaveBeenCalled();
  });
});
