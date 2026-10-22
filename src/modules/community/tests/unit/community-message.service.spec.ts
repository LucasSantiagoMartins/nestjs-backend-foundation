import { UserRole } from '@backend-foundation/common';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CommunityMessageType } from '../../enums/community-message-type.enum';
import { CommunityMessageService } from '../../services/community-message.service';

jest.mock('@modules/notification/services/notification.service', () => ({
  NotificationService: class NotificationService {},
}));

describe('CommunityMessageService', () => {
  let service: CommunityMessageService;
  let messages: any;
  let communities: any;
  let members: any;
  let gateway: any;

  beforeEach(() => {
    messages = {
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => ({
        id: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...v,
      })),
      findOne: jest.fn(),
      remove: jest.fn(),
      manager: {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({
              profilePictureUrl: 'https://storage.example/ana.png',
            }),
          }),
        }),
      },
    };

    communities = {
      findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Grupo' }),
    };
    members = {
      exists: jest.fn().mockResolvedValue(true),
      find: jest.fn().mockResolvedValue([]),
    };
    gateway = { emitMessage: jest.fn() };
    service = new CommunityMessageService(
      messages,
      communities,
      members,
      { markAsUsed: jest.fn() } as any,
      { notify: jest.fn() } as any,
      gateway as any,
      { warn: jest.fn(), error: jest.fn(), log: jest.fn() } as any,
    );
  });

  it('allows a member to send a text message', async () => {
    const response = await service.sendMessage(4, 1, {
      type: CommunityMessageType.TEXT,
      content: 'Olá',
    });

    expect(response).toEqual({
      id: 2,
      content: 'Olá',
      mediaUrl: undefined,
      createdAt: expect.any(Date),
      type: CommunityMessageType.TEXT,
    });
    expect(gateway.emitMessage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        id: 2,
        communityId: 1,
        userId: 4,
        senderName: 'Alguém',
        profilePictureUrl: 'https://storage.example/ana.png',
        type: CommunityMessageType.TEXT,
        content: 'Olá',
        createdAt: expect.any(Date),
      }),
    );
  });

  it('allows audio messages and stores their media URL', async () => {
    const response = await service.sendMessage(4, 1, {
      type: CommunityMessageType.AUDIO,
      mediaUrl: 'https://storage.example/audio.mp3',
    });

    expect(response.mediaUrl).toBe('https://storage.example/audio.mp3');
    expect(messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CommunityMessageType.AUDIO,
        mediaUrl: 'https://storage.example/audio.mp3',
        content: undefined,
      }),
    );
  });

  it('rejects messages from non-members', async () => {
    members.exists.mockResolvedValue(false);

    await expect(
      service.sendMessage(4, 1, {
        type: CommunityMessageType.TEXT,
        content: 'Olá',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires content for TEXT and media URL for IMAGE and VIDEO', async () => {
    await expect(
      service.sendMessage(4, 1, { type: CommunityMessageType.TEXT }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.sendMessage(4, 1, { type: CommunityMessageType.IMAGE }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.sendMessage(4, 1, { type: CommunityMessageType.VIDEO }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.sendMessage(4, 1, { type: CommunityMessageType.AUDIO }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows only the author or an admin to delete a message', async () => {
    messages.findOne.mockResolvedValue({ id: 7, communityId: 1, userId: 4 });
    await expect(
      service.deleteMessage(4, UserRole.USER, 1, 7),
    ).resolves.toBeUndefined();
    await expect(
      service.deleteMessage(9, UserRole.USER, 1, 7),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.deleteMessage(9, UserRole.ADMIN, 1, 7),
    ).resolves.toBeUndefined();
  });
});
