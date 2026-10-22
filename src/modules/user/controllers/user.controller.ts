import { UserDecorator } from '@backend-foundation/authorization';
import { SuccessMessage } from '@backend-foundation/common/decorators/success-message.decorator';
import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { Public } from 'libs/authorization/src/decorators/public.decorator';
import { RegisterUserDto } from '../dtos/register-user.dto';
import { UserService } from '../services/user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Public()
  @SuccessMessage('Conta criada com sucesso.')
  async register(@Body() body: RegisterUserDto): Promise<void> {
    await this.userService.register(body);
  }

  @Get('me')
  @SuccessMessage('Informações carregadas com sucesso.')
  getMe(@UserDecorator('sub') userId: number) {
    return this.userService.getMe(Number(userId));
  }

  @Delete('me')
  @SuccessMessage('Conta apagada com sucesso.')
  deleteAccount(@UserDecorator('sub') userId: number): Promise<void> {
    return this.userService.deleteAccount(Number(userId));
  }
}
