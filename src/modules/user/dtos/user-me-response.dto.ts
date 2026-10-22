import { UserRole } from '@backend-foundation/common';
import { User } from '../entities/user.entity';

export class UserMeResponseDto {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  role: UserRole;
  fullName: string | null;
  profilePictureUrl: string | null;

  static fromEntity(user: User): UserMeResponseDto {
    return Object.assign(new UserMeResponseDto(), {
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role,
      fullName: user.profile?.fullName ?? null,
      profilePictureUrl: user.profile?.profilePicture ?? null,
    });
  }
}
