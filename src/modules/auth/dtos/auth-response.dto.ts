export class AuthResponseDto {
  token?: string;

  static fromData(data: { token?: string }): AuthResponseDto {
    const dto = new AuthResponseDto();
    dto.token = data.token;
    return dto;
  }
}
