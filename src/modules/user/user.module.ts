import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { ProfileService } from './services/profile.service';
import { UploadModule } from '@modules/upload/upload.module';
import { ProfileController } from './controllers/profile.controller';
import { HousingModule } from '@modules/housing/housing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile]),
    UploadModule,
    HousingModule,
  ],
  controllers: [UserController, ProfileController],
  providers: [UserService, ProfileService],
  exports: [UserService],
})
export class UserModule {}
