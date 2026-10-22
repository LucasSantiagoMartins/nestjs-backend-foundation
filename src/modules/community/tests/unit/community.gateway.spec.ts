import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { CommunityGateway } from '../../gateways/community.gateway';
import { CommunityMember } from '../../entities/community-member.entity';

describe('CommunityGateway', () => {
  let gateway: CommunityGateway;
  let jwt: jest.Mocked<Pick<JwtService, 'verify'>>;
  let members: jest.Mocked<Pick<Repository<CommunityMember>, 'exists'>>;
  let socket: any;
  let server: any;

  beforeEach(() => {
    jwt = { verify: jest.fn().mockReturnValue({ sub: 8, role: 'USER' }) };
    members = { exists: jest.fn().mockResolvedValue(true) };
    gateway = new CommunityGateway(
      jwt as unknown as JwtService,
      members as any,
    );
    socket = {
      handshake: {
        auth: {},
        headers: { cookie: 'refresh_token=other; access_token=valid-token' },
      },
      data: {},
      disconnect: jest.fn(),
      join: jest.fn(),
    };
    server = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    gateway.server = server;
  });

  it('verifies the JWT at connection and disconnects invalid sessions', async () => {
    await gateway.handleConnection(socket);
    expect(socket.data.user.sub).toBe(8);
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });
    await gateway.handleConnection(socket);
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejects bearer-only authentication because the app uses an access cookie', async () => {
    socket.handshake.headers = { authorization: 'Bearer valid-token' };
    await gateway.handleConnection(socket);
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejects a validly signed token without a subject', async () => {
    jwt.verify.mockReturnValue({ role: 'USER' } as any);
    await gateway.handleConnection(socket);
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('checks membership before joining the Socket.IO room', async () => {
    await gateway.handleConnection(socket);
    await expect(gateway.join(socket, { communityId: 2 })).resolves.toEqual({
      event: 'community:joined',
      data: { communityId: 2 },
    });
    expect(members.exists).toHaveBeenCalledWith({
      where: { communityId: 2, userId: 8 },
    });
    expect(socket.join).toHaveBeenCalledWith('community:2');
  });

  it('rejects invalid IDs and non-member room access', async () => {
    await gateway.handleConnection(socket);
    await expect(
      gateway.join(socket, { communityId: 0 }),
    ).rejects.toBeInstanceOf(WsException);
    members.exists.mockResolvedValue(false);
    await expect(
      gateway.join(socket, { communityId: 2 }),
    ).rejects.toBeInstanceOf(WsException);
  });

  it('broadcasts messages to the community room', () => {
    gateway.emitMessage(2, { id: 3 });
    expect(server.to).toHaveBeenCalledWith('community:2');
    expect(server.emit).toHaveBeenCalledWith('community:message', { id: 3 });
  });
});
