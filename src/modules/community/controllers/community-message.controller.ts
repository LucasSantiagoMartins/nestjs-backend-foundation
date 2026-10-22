import { UserDecorator } from '@backend-foundation/authorization';
import { UserRole } from '@backend-foundation/common';
import { PaginatedDto } from '@backend-foundation/common/dtos/pagination.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CommunityMessageQueryDto } from '../dtos/community-message-query.dto';
import { CommunityMessageResponseDto } from '../dtos/community-message-response.dto';
import { CreateCommunityMessageDto } from '../dtos/create-community-message.dto';
import { SentCommunityMessageDto } from '../dtos/sent-communit-message.dto';
import { CommunityMessageService } from '../services/community-message.service';

@Controller('communities/:communityId/messages')
export class CommunityMessageController {
  constructor(private readonly messageService: CommunityMessageService) {}

  @Get()
  list(
    @UserDecorator('sub') userId: number,
    @Param('communityId', ParseIntPipe) communityId: number,
    @Query() query: CommunityMessageQueryDto,
  ): Promise<PaginatedDto<CommunityMessageResponseDto>> {
    return this.messageService.listMessages(userId, communityId, query);
  }

  @Post()
  send(
    @UserDecorator('sub') userId: number,
    @Param('communityId', ParseIntPipe) communityId: number,
    @Body() dto: CreateCommunityMessageDto,
  ): Promise<SentCommunityMessageDto> {
    return this.messageService.sendMessage(userId, communityId, dto);
  }

  @Delete(':messageId')
  delete(
    @UserDecorator('sub') userId: number,
    @UserDecorator('role') role: UserRole,
    @Param('communityId', ParseIntPipe) communityId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
  ): Promise<void> {
    return this.messageService.deleteMessage(
      userId,
      role,
      communityId,
      messageId,
    );
  }
}
