import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateHousingBookingRequestDto {
  @IsNumber({}, { message: 'O ID do alojamento é um número válido.' })
  @IsNotEmpty({ message: 'O ID do alojamento é obrigatório.' })
  housingListingId: number;

  @IsNumber({}, { message: 'O ID do quarto deve ser um número válido.' })
  @IsNotEmpty({ message: 'O ID do quarto é obrigatório.' })
  housingRoomId: number;

  @IsNumber({}, { message: 'A quantidade deve ser um número válido.' })
  @IsPositive({ message: 'A quantidade deve ser maior que zero.' })
  quantity: number;
}
