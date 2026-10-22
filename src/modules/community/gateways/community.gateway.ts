import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { CommunityMember } from '../entities/community-member.entity';

@WebSocketGateway({
  namespace: '/communities',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class CommunityGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(CommunityMember)
    private readonly memberRepo: Repository<CommunityMember>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('Missing authentication token');

      const payload = this.jwtService.verify(token);
      if (!payload?.sub) throw new Error('Invalid token payload');

      client.data.user = payload;
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('community:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { communityId: number },
  ): Promise<{ event: string; data: { communityId: number } }> {
    const communityId = Number(body?.communityId);
    const userId = Number(client.data.user?.sub);

    if (!Number.isInteger(communityId) || communityId < 1 || !userId) {
      throw new WsException('Pedido inválido.');
    }

    const isMember = await this.memberRepo.exists({
      where: { communityId, userId },
    });
    if (!isMember) {
      throw new WsException('Tens de ser membro para entrar na sala.');
    }

    await client.join(this.room(communityId));

    return { event: 'community:joined', data: { communityId } };
  }

  emitMessage(communityId: number, payload: unknown): void {
    this.server.to(this.room(communityId)).emit('community:message', payload);
  }

  private extractToken(client: Socket): string | undefined {
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return undefined;

    const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  private room(communityId: number): string {
    return `community:${communityId}`;
  }
}
