import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateHousingDto } from '../dtos/create-housing.dto';
import { UpdateHousingDto } from '../dtos/update-housing.dto';
import { CreateHousingRoomDto } from '../dtos/create-housing-room.dto';
import { UpdateHousingStatusDto } from '../dtos/update-housing-status.dto';
import { UpdateHousingBookingRequestStatusDto } from '../dtos/update-housing-booking-request-status.dto';
import { PropertyType } from '../enums/property-type.enum';
import { HousingListingStatus } from '../enums/housing-listing-status.enum';
import { HousingBookingRequestStatus } from '../enums/housing-booking-request-status.enum';

const validateCreate = (payload: Record<string, unknown>) =>
  validate(plainToInstance(CreateHousingDto, payload), { whitelist: true });

const constraintMessages = (errors: ValidationError[]): string[] =>
  errors.flatMap(function walk(error): string[] {
    return [
      ...Object.values(error.constraints ?? {}),
      ...(error.children ?? []).flatMap(walk),
    ];
  });

const validPayload = {
  title: 'Apartamento em Lisboa',
  description: 'Um apartamento confortável no centro.',
  expiresAt: '2099-01-01T00:00:00.000Z',
  propertyType: PropertyType.APARTMENT,
  municipality: 'Lisboa',
  addressLine: 'Rua das Flores 10',
  latitude: 38.7223,
  longitude: -9.1393,
  price: 80,
  imageUrls: [
    'https://img.test/1.jpg',
    'https://img.test/2.jpg',
    'https://img.test/3.jpg',
  ],
  rooms: [{ imageUrls: ['https://img.test/room-1.jpg'] }],
};

const omitFields = <T extends object, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Omit<T, K> => {
  const copy: Partial<T> = { ...obj };
  keys.forEach((key) => delete copy[key]);
  return copy as Omit<T, K>;
};

describe('Housing DTOs', () => {
  describe('CreateHousingDto', () => {
    it('accepts a valid payload', async () => {
      expect(await validateCreate(validPayload)).toHaveLength(0);
    });

    it('accepts a payload without coordinates', async () => {
      const withoutCoords = omitFields(validPayload, 'latitude', 'longitude');

      expect(await validateCreate(withoutCoords)).toHaveLength(0);
    });

    it('rejects only one coordinate of the pair', async () => {
      const errors = await validateCreate({
        ...validPayload,
        longitude: undefined,
      });

      expect(constraintMessages(errors)).toEqual(
        expect.arrayContaining([
          'Latitude e longitude devem ser fornecidas em conjunto.',
        ]),
      );
    });

    it('rejects a latitude out of range', async () => {
      const errors = await validateCreate({
        ...validPayload,
        latitude: 91,
        longitude: -9.1,
      });

      expect(constraintMessages(errors)).toEqual([
        'A latitude deve ser um número entre -90 e 90.',
      ]);
    });

    it('rejects a longitude out of range', async () => {
      const errors = await validateCreate({
        ...validPayload,
        latitude: 38.7,
        longitude: 181,
      });

      expect(constraintMessages(errors)).toEqual([
        'A longitude deve ser um número entre -180 e 180.',
      ]);
    });

    it('accepts both coordinates explicitly null', async () => {
      expect(
        await validateCreate({
          ...validPayload,
          latitude: null,
          longitude: null,
        }),
      ).toHaveLength(0);
    });

    it('rejects one coordinate explicitly null and the other with a value', async () => {
      const errors = await validateCreate({
        ...validPayload,
        latitude: null,
        longitude: -9.1,
      });

      expect(constraintMessages(errors)).toEqual(
        expect.arrayContaining([
          'Latitude e longitude devem ser fornecidas em conjunto.',
        ]),
      );
    });

    it('rejects non-numeric coordinates', async () => {
      const errors = await validateCreate({
        ...validPayload,
        latitude: '38.7',
        longitude: '-9.1',
      });

      expect(constraintMessages(errors)).toEqual([
        'A latitude deve ser um número entre -90 e 90.',
        'A longitude deve ser um número entre -180 e 180.',
      ]);
    });

    it('ignores legacy location and pricing fields', async () => {
      const errors = await validateCreate({
        ...validPayload,
        city: 'Lisboa',
        district: 'Lisboa',
        address: 'Rua das Flores 10',
        country: 'Portugal',
        priceCurrency: 'EUR',
      });

      expect(errors).toHaveLength(0);
    });

    it('ignores legacy capacity fields', async () => {
      const errors = await validateCreate({
        ...validPayload,
        beds: 2,
        maxGuests: 4,
      });

      expect(errors).toHaveLength(0);
    });

    it('rejects an invalid property type', async () => {
      const errors = await validateCreate({
        ...validPayload,
        propertyType: 'VILLA',
      });

      expect(constraintMessages(errors)).toEqual([
        'Tipo de propriedade inválido.',
      ]);
    });

    it('rejects fewer than 3 listing images', async () => {
      const errors = await validateCreate({
        ...validPayload,
        imageUrls: ['https://img.test/1.jpg'],
      });

      expect(constraintMessages(errors)).toEqual([
        'O imóvel deve ter pelo menos 3 imagens.',
      ]);
    });

    it('rejects a room without images', async () => {
      const errors = await validateCreate({
        ...validPayload,
        rooms: [{}],
      });

      expect(constraintMessages(errors)).toEqual(
        expect.arrayContaining([
          'Cada quarto deve ter pelo menos 1 imagem.',
          'As imagens do quarto devem ser enviadas em uma lista.',
        ]),
      );
    });

    it('rejects a room with more than 4 images', async () => {
      const errors = await validateCreate({
        ...validPayload,
        rooms: [{ imageUrls: ['1', '2', '3', '4', '5'] }],
      });

      expect(constraintMessages(errors)).toEqual([
        'Cada quarto pode ter no máximo 4 imagens.',
      ]);
    });

    it('rejects a room with empty image urls', async () => {
      const errors = await validateCreate({
        ...validPayload,
        rooms: [{ imageUrls: [''] }],
      });

      expect(constraintMessages(errors)).toEqual([
        'Cada imagem deve ser uma URL válida.',
      ]);
    });

    it('accepts rooms with 1 to 4 images', async () => {
      expect(
        await validateCreate({
          ...validPayload,
          rooms: [
            { imageUrls: ['a.jpg'] },
            { imageUrls: ['a.jpg', 'b.jpg'] },
            { imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'] },
            { imageUrls: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'] },
          ],
        }),
      ).toHaveLength(0);
    });
  });

  describe('UpdateHousingDto', () => {
    it('accepts a partial payload', async () => {
      const errors = await validate(
        plainToInstance(UpdateHousingDto, { title: 'Novo título' }),
        { whitelist: true },
      );

      expect(errors).toHaveLength(0);
    });

    it('accepts coordinates explicitly null to clear them', async () => {
      const errors = await validate(
        plainToInstance(UpdateHousingDto, {
          latitude: null,
          longitude: null,
        }),
        { whitelist: true },
      );

      expect(errors).toHaveLength(0);
    });

    it('still rejects only one coordinate of the pair', async () => {
      const errors = await validate(
        plainToInstance(UpdateHousingDto, { longitude: -9.1 }),
        { whitelist: true },
      );

      expect(constraintMessages(errors)).toEqual(
        expect.arrayContaining([
          'Latitude e longitude devem ser fornecidas em conjunto.',
        ]),
      );
    });

    it('still validates rooms when provided', async () => {
      const errors = await validate(
        plainToInstance(UpdateHousingDto, { rooms: [{ imageUrls: [] }] }),
        { whitelist: true },
      );

      expect(constraintMessages(errors)).toEqual([
        'Cada quarto deve ter pelo menos 1 imagem.',
      ]);
    });
  });

  describe('CreateHousingRoomDto', () => {
    it('accepts a room with a single image', async () => {
      const errors = await validate(
        plainToInstance(CreateHousingRoomDto, { imageUrls: ['a.jpg'] }),
        { whitelist: true },
      );

      expect(errors).toHaveLength(0);
    });

    it('strips roomNumber when provided', async () => {
      const dto = plainToInstance(CreateHousingRoomDto, {
        roomNumber: 3,
        imageUrls: ['a.jpg'],
      });
      const errors = await validate(dto, { whitelist: true });

      expect(errors).toHaveLength(0);
      expect(dto).not.toHaveProperty('roomNumber');
    });
  });

  describe('UpdateHousingStatusDto', () => {
    it.each([HousingListingStatus.PAUSED, HousingListingStatus.CLOSED])(
      'accepts %s',
      async (status) => {
        const errors = await validate(
          plainToInstance(UpdateHousingStatusDto, { status }),
        );

        expect(errors).toHaveLength(0);
      },
    );

    it('rejects an unknown status', async () => {
      const errors = await validate(
        plainToInstance(UpdateHousingStatusDto, { status: 'ARCHIVED' }),
      );

      expect(constraintMessages(errors)).toEqual([
        'Estado do alojamento inválido.',
      ]);
    });

    it('rejects PUBLISHED because listings are published during creation', async () => {
      const errors = await validate(
        plainToInstance(UpdateHousingStatusDto, {
          status: HousingListingStatus.PUBLISHED,
        }),
      );

      expect(constraintMessages(errors)).toEqual([
        'Estado do alojamento inválido.',
      ]);
    });
  });

  describe('UpdateHousingBookingRequestStatusDto', () => {
    it.each(Object.values(HousingBookingRequestStatus))(
      'accepts %s',
      async (status) => {
        const errors = await validate(
          plainToInstance(UpdateHousingBookingRequestStatusDto, { status }),
        );

        expect(errors).toHaveLength(0);
      },
    );

    it('rejects an unknown status', async () => {
      const errors = await validate(
        plainToInstance(UpdateHousingBookingRequestStatusDto, {
          status: 'PENDING_REVIEW',
        }),
      );

      expect(constraintMessages(errors)).toEqual([
        'Estado do pedido de reserva inválido.',
      ]);
    });
  });
});
