import { BadRequestException, ConflictException } from '@nestjs/common';

import { CommunityService } from '../../services/community.service';

describe('CommunityService', () => {
  let service: CommunityService;
  let communities: any;
  let members: any;

  beforeEach(() => {
    communities = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...value,
      })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
    };

    members = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({
        id: 5,
        joinedAt: new Date(),
        ...value,
      })),
      findOne: jest.fn(),
      remove: jest.fn(),
      findAndCount: jest.fn(),
    };

    service = new CommunityService(communities, members, {
      markAsUsed: jest.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('creates a community and maps it to a response DTO', async () => {
    const response = await service.create(7, {
      name: 'Comunidade Portugal',
      slug: 'portugal',
      countryCode: 'PT',
      countryName: 'Portugal',
    });

    expect(response.id).toBe(1);

    expect(communities.save).toHaveBeenCalledWith(
      expect.objectContaining({
        countryCode: 'PT',
      }),
    );
  });

  it('rejects a duplicate slug or country', async () => {
    communities.exists.mockResolvedValue(true);

    await expect(
      service.create(7, {
        name: 'Portugal',
        slug: 'portugal',
        countryCode: 'PT',
        countryName: 'Portugal',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('finds a community by id and reports missing records', async () => {
    communities.findOne.mockResolvedValue({
      id: 1,
      name: 'Portugal',
      slug: 'portugal',
      countryCode: 'PT',
      countryName: 'Portugal',
      isActive: true,
    });

    expect((await service.findById(1)).slug).toBe('portugal');

    communities.findOne.mockResolvedValue(null);

    await expect(service.findById(99)).rejects.toThrow(
      'Comunidade não encontrada.',
    );
  });

  it('updates a community', async () => {
    communities.findOne.mockResolvedValue({
      id: 1,
      name: 'Old',
      slug: 'portugal',
      countryCode: 'PT',
      countryName: 'Portugal',
      isActive: true,
    });

    expect((await service.update(7, 1, { name: 'New' })).name).toBe('New');
  });

  it('prevents duplicate membership', async () => {
    communities.findOne.mockResolvedValue({
      id: 1,
      isActive: true,
    });

    members.exists.mockResolvedValue(true);

    await expect(service.joinCommunity(3, 1)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(members.exists).toHaveBeenCalledWith({
      where: {
        communityId: 1,
        userId: 3,
      },
    });
  });

  it('allows a user to join an active community', async () => {
    communities.findOne.mockResolvedValue({
      id: 1,
      isActive: true,
    });

    members.exists.mockResolvedValue(false);

    const response = await service.joinCommunity(3, 1);

    expect(response.id).toBe(5);

    expect(members.create).toHaveBeenCalledWith({
      communityId: 1,
      userId: 3,
    });

    expect(members.save).toHaveBeenCalled();
  });

  it('blocks joining an inactive community', async () => {
    communities.findOne.mockResolvedValue({
      id: 1,
      isActive: false,
    });

    await expect(service.joinCommunity(3, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(members.exists).not.toHaveBeenCalled();
  });

  it('allows a member to leave a community', async () => {
    communities.findOne.mockResolvedValue({
      id: 1,
      isActive: true,
    });

    members.findOne.mockResolvedValue({
      id: 5,
      communityId: 1,
      userId: 3,
    });

    await expect(service.leaveCommunity(3, 1)).resolves.toBeUndefined();

    expect(members.remove).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 5,
      }),
    );
  });
});
