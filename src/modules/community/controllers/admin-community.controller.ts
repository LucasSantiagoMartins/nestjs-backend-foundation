import { Roles, UserDecorator } from '@backend-foundation/authorization';
import { UserRole } from '@backend-foundation/common';
import { PaginatedDto } from '@backend-foundation/common/dtos/pagination.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommunityResponseDto } from '../dtos/community-response.dto';
import { CreateCommunityDto } from '../dtos/create-community.dto';
import { UpdateCommunityDto } from '../dtos/update-community.dto';
import { CommunityService } from '../services/community.service';

@Controller('communities')
@Roles(UserRole.ADMIN)
export class AdminCommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post()
  create(
    @UserDecorator('sub') userId: number,
    @Body() dto: CreateCommunityDto,
  ): Promise<CommunityResponseDto> {
    return this.communityService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @UserDecorator('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommunityDto,
  ): Promise<CommunityResponseDto> {
    return this.communityService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.communityService.remove(id);
  }

  @Patch(':id/activate')
  activate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CommunityResponseDto> {
    return this.communityService.activate(id);
  }

  @Patch(':id/deactivate')
  deactivate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CommunityResponseDto> {
    return this.communityService.deactivate(id);
  }

  @Get('management/list')
  list(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
  ): Promise<PaginatedDto<CommunityResponseDto>> {
    return this.communityService.findAll(page, 20, true);
  }
}
