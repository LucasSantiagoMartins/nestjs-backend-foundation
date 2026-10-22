import { RolesGuard } from '@backend-foundation/authorization';
import { JwtAuthGuard } from '@backend-foundation/authorization/guards/jwt-auth.guard';
import { UserRole } from '@backend-foundation/common';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PublisherHousingController } from '../../controllers/publisher-housing.controller';
import { HousingListingStatus } from '../../enums/housing-listing-status.enum';
import { HousingQueryService } from '../../services/housing-query.service';
import { HousingService } from '../../services/housing.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');

describe('PublisherHousingController e2e', () => {
  const jwtSecret = 'housing-e2e-secret';
  let app: INestApplication;
  let jwt: JwtService;
  let housingService: Record<string, jest.Mock>;
  let housingQueryService: Record<string, jest.Mock>;

  const cookieFor = (role = UserRole.PUBLISHER, sub = 10) =>
    `access_token=${jwt.sign({ sub, role })}`;

  const validPayload = {
    title: 'Apartamento em Lisboa',
    description: 'Um apartamento confortável no centro.',
    expiresAt: '2099-01-01T00:00:00.000Z',
    municipality: 'Lisboa',
    addressLine: 'Rua das Flores 10',
    latitude: 38.7223,
    longitude: -9.1393,
    price: 80,
    imageUrls: ['img-1.jpg', 'img-2.jpg', 'img-3.jpg'],
    rooms: [{ imageUrls: ['room-1.jpg'] }],
  };

  beforeAll(async () => {
    housingService = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      update: jest.fn().mockResolvedValue({ id: 1 }),
      remove: jest.fn().mockResolvedValue(undefined),
      changeStatus: jest.fn().mockResolvedValue({ id: 1 }),
    };
    housingQueryService = {
      findAllByPublisher: jest.fn().mockResolvedValue({
        items: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: jwtSecret })],
      controllers: [PublisherHousingController],
      providers: [
        { provide: HousingService, useValue: housingService },
        { provide: HousingQueryService, useValue: housingQueryService },
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
      .post('/publishers/housing-listings')
      .send(validPayload)
      .expect(401);
    expect(housingService.create).not.toHaveBeenCalled();
  });

  it('rejects requests from non-publisher roles', async () => {
    await request(app.getHttpServer())
      .post('/publishers/housing-listings')
      .set('Cookie', cookieFor(UserRole.USER))
      .send(validPayload)
      .expect(403);
    expect(housingService.create).not.toHaveBeenCalled();
  });

  it('creates a listing with the simplified payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/publishers/housing-listings')
      .set('Cookie', cookieFor())
      .send(validPayload)
      .expect(201);

    expect(res.body).toEqual({ id: 1 });
    expect(housingService.create).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        title: validPayload.title,
        municipality: 'Lisboa',
        addressLine: 'Rua das Flores 10',
        latitude: 38.7223,
        longitude: -9.1393,
      }),
    );
  });

  it('strips legacy fields and accepts the price currency', async () => {
    await request(app.getHttpServer())
      .post('/publishers/housing-listings')
      .set('Cookie', cookieFor())
      .send({
        ...validPayload,
        city: 'Lisboa',
        country: 'Portugal',
        priceCurrency: 'EUR',
        beds: 2,
        maxGuests: 4,
        rooms: [{ roomNumber: 1, imageUrls: ['room-1.jpg'] }],
      })
      .expect(201);

    const [, dto] = housingService.create.mock.calls[0] as [
      number,
      Record<string, unknown>,
    ];
    expect(dto).not.toHaveProperty('city');
    expect(dto).not.toHaveProperty('country');
    expect(dto).toHaveProperty('priceCurrency', 'EUR');
    expect(dto).not.toHaveProperty('beds');
    expect(dto).not.toHaveProperty('maxGuests');
    expect((dto.rooms as Record<string, unknown>[])[0]).not.toHaveProperty(
      'roomNumber',
    );
  });

  it('rejects a create payload with only one coordinate', async () => {
    await request(app.getHttpServer())
      .post('/publishers/housing-listings')
      .set('Cookie', cookieFor())
      .send({ ...validPayload, longitude: undefined })
      .expect(400);
    expect(housingService.create).not.toHaveBeenCalled();
  });

  it('rejects a create payload with a room without images', async () => {
    await request(app.getHttpServer())
      .post('/publishers/housing-listings')
      .set('Cookie', cookieFor())
      .send({ ...validPayload, rooms: [{}] })
      .expect(400);
    expect(housingService.create).not.toHaveBeenCalled();
  });

  it('lists the publisher listings', async () => {
    await request(app.getHttpServer())
      .get('/publishers/housing-listings')
      .set('Cookie', cookieFor())
      .expect(200);
    expect(housingQueryService.findAllByPublisher).toHaveBeenCalledWith(10, 1);
  });

  it('updates a listing', async () => {
    await request(app.getHttpServer())
      .patch('/publishers/housing-listings/5')
      .set('Cookie', cookieFor())
      .send({ title: 'Novo título' })
      .expect(200);
    expect(housingService.update).toHaveBeenCalledWith(
      10,
      5,
      expect.objectContaining({ title: 'Novo título' }),
    );
  });

  it('removes a listing', async () => {
    await request(app.getHttpServer())
      .delete('/publishers/housing-listings/5')
      .set('Cookie', cookieFor())
      .expect(200);
    expect(housingService.remove).toHaveBeenCalledWith(10, 5);
  });

  it('does not expose a separate publish route', async () => {
    await request(app.getHttpServer())
      .patch('/publishers/housing-listings/5/publish')
      .set('Cookie', cookieFor())
      .expect(404);
  });

  it('changes the listing status through the unified endpoint', async () => {
    await request(app.getHttpServer())
      .patch('/publishers/housing-listings/5/status')
      .set('Cookie', cookieFor())
      .send({ status: HousingListingStatus.PAUSED })
      .expect(200);
    expect(housingService.changeStatus).toHaveBeenCalledWith(
      10,
      5,
      HousingListingStatus.PAUSED,
    );
  });

  it('rejects an unknown status on the unified endpoint', async () => {
    await request(app.getHttpServer())
      .patch('/publishers/housing-listings/5/status')
      .set('Cookie', cookieFor())
      .send({ status: 'ARCHIVED' })
      .expect(400);
    expect(housingService.changeStatus).not.toHaveBeenCalled();
  });

  it('no longer exposes the legacy pause and close routes', async () => {
    await request(app.getHttpServer())
      .patch('/publishers/housing-listings/5/pause')
      .set('Cookie', cookieFor())
      .expect(404);
    await request(app.getHttpServer())
      .patch('/publishers/housing-listings/5/close')
      .set('Cookie', cookieFor())
      .expect(404);
    expect(housingService.changeStatus).not.toHaveBeenCalled();
  });
});
