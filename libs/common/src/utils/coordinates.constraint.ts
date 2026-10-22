import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

type Coordinates = {
  latitude?: number | null;
  longitude?: number | null;
};

@ValidatorConstraint({ name: 'isCoordinatePair', async: false })
export class CoordinatesPairConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as Coordinates;

    const hasLatitude = dto.latitude !== undefined;
    const hasLongitude = dto.longitude !== undefined;

    if (hasLatitude !== hasLongitude) {
      return false;
    }

    if (!hasLatitude) {
      return true;
    }

    return (dto.latitude === null) === (dto.longitude === null);
  }

  defaultMessage(): string {
    return 'Latitude e longitude devem ser fornecidas em conjunto.';
  }
}

@ValidatorConstraint({ name: 'isCoordinateRange', async: false })
export class CoordinateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null) {
      return true;
    }

    const [min, max] = args.constraints as [number, number];

    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const [min, max] = args.constraints as [number, number];
    return `A ${args.property} deve ser um número entre ${min} e ${max}.`;
  }
}
