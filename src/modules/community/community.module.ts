import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Community } from './entities/community.entity';
import { CommunityMember } from './entities/community-member.entity';
import { CommunityMessage } from './entities/community-message.entity';
import { CommunityService } from './services/community.service';
import { CommunityMessageService } from './services/community-message.service';
import { CommunityController } from './controllers/community.controller';
import { AdminCommunityController } from './controllers/admin-community.controller';
import { CommunityMessageController } from './controllers/community-message.controller';
import { CommunitySeed } from './seeds/community.seed';
import { CommunityGateway } from './gateways/community.gateway';
import { UploadModule } from '@modules/upload/upload.module';
import { NotificationModule } from '@modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Community, CommunityMember, CommunityMessage]),
    UploadModule,
    NotificationModule,
  ],
  controllers: [
    CommunityController,
    AdminCommunityController,
    CommunityMessageController,
  ],
  providers: [
    CommunityService,
    CommunityMessageService,
    CommunitySeed,
    CommunityGateway,
  ],
  exports: [CommunityService, CommunityMessageService],
})
export class CommunityModule {}
