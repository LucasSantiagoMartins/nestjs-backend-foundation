import { Public, UserDecorator } from '@backend-foundation/authorization';
import { PaginatedDto } from '@backend-foundation/common/dtos/pagination.dto';
import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CommunityMemberResponseDto } from '../dtos/community-member-response.dto';
import { CommunityResponseDto } from '../dtos/community-response.dto';
import { CommunityService } from '../services/community.service';

@Controller('communities')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Public()
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
  ): Promise<PaginatedDto<CommunityResponseDto>> {
    return this.communityService.findAll(page);
  }

  @Public()
  @Get(':id')
  findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CommunityResponseDto> {
    return this.communityService.findById(id);
  }

  @Public()
  @Get(':id/members')
  listMembers(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
  ): Promise<PaginatedDto<CommunityMemberResponseDto>> {
    return this.communityService.listMembers(id, page);
  }

  @Public()
  @Post(':id/join')
  join(
    @UserDecorator('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CommunityMemberResponseDto> {
    return this.communityService.joinCommunity(userId, id);
  }

  @Public()
  @Delete(':id/leave')
  leave(
    @UserDecorator('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.communityService.leaveCommunity(userId, id);
  }

  @Public()
  @Get(':id/membership')
  membership(
    @UserDecorator('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ isMember: boolean }> {
    return this.communityService.isMember(userId, id);
  }
}
