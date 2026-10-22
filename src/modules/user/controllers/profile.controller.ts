import { UserDecorator } from '@backend-foundation/authorization';
import { SuccessMessage } from '@backend-foundation/common/decorators/success-message.decorator';
import { Body, Controller, Patch } from '@nestjs/common';
import { UpdateProfilePictureDto } from '../dtos/update-profile-picture.dto';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import { UserService } from '../services/user.service';

@Controller('users/profile')
export class ProfileController {
  constructor(private readonly userService: UserService) {}

  @Patch()
  @SuccessMessage('Perfil atualizado com sucesso.')
  updateProfile(
    @UserDecorator('sub') userId: number,
    @Body() body: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(Number(userId), body);
  }

  @Patch('picture')
  @SuccessMessage('Fotografia de perfil atualizada com sucesso.')
  updateProfilePicture(
    @UserDecorator('sub') userId: number,
    @Body() body: UpdateProfilePictureDto,
  ) {
    return this.userService.updateProfilePicture(
      Number(userId),
      body.profilePictureUrl,
    );
  }
}
