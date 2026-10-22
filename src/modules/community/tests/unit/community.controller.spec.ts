import { CommunityController } from '../../controllers/community.controller';
import { CommunityService } from '../../services/community.service';

describe('CommunityController', () => {
  let controller: CommunityController;
  let service: jest.Mocked<
    Pick<
      CommunityService,
      | 'findAll'
      | 'findById'
      | 'listMembers'
      | 'joinCommunity'
      | 'leaveCommunity'
      | 'isMember'
    >
  >;

  beforeEach(() => {
    service = {
      findAll: jest.fn(),
      findById: jest.fn(),
      listMembers: jest.fn(),
      joinCommunity: jest.fn(),
      leaveCommunity: jest.fn(),
      isMember: jest.fn(),
    };
    controller = new CommunityController(
      service as unknown as CommunityService,
    );
  });

  it('delegates community and membership operations without business logic', async () => {
    service.findAll.mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 2, limit: 20, totalPages: 0 },
    });
    service.findById.mockResolvedValue({ id: 4 } as any);
    service.listMembers.mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    service.joinCommunity.mockResolvedValue({ id: 7 } as any);
    service.leaveCommunity.mockResolvedValue(undefined);
    service.isMember.mockResolvedValue({ isMember: true });

    await expect(controller.findAll(2)).resolves.toEqual(
      expect.objectContaining({
        pagination: expect.objectContaining({ page: 2 }),
      }),
    );
    await expect(controller.findById(4)).resolves.toEqual({ id: 4 });
    await expect(controller.listMembers(4, 1)).resolves.toEqual(
      expect.objectContaining({ items: [] }),
    );
    await expect(controller.join(12, 4)).resolves.toEqual({ id: 7 });
    await expect(controller.leave(12, 4)).resolves.toBeUndefined();
    await expect(controller.membership(12, 4)).resolves.toEqual({
      isMember: true,
    });
    expect(service.joinCommunity).toHaveBeenCalledWith(12, 4);
    expect(service.leaveCommunity).toHaveBeenCalledWith(12, 4);
    expect(service.isMember).toHaveBeenCalledWith(12, 4);
  });
});
