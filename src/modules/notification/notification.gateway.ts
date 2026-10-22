import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import * as cookie from 'cookie';
import { corsConfig } from '@config/cors.config';

@WebSocketGateway({
  cors: {
    ...corsConfig,
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private activeUsers = new Map<number, string>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const cookies = client.handshake.headers.cookie;

      if (!cookies) {
        client.disconnect();
        return;
      }

      const parsed = (cookie as any).parse(cookies);
      const token = parsed.access_token;

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;

      if (userId) {
        this.activeUsers.set(userId, client.id);
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.activeUsers.entries()) {
      if (socketId === client.id) {
        this.activeUsers.delete(userId);
        break;
      }
    }
  }

  sendToUser(userId: number, data: any) {
    const socketId = this.activeUsers.get(Number(userId));

    if (socketId) {
      const { userId: _, ...payload } = data;
      this.server.to(socketId).emit('notification', payload);
    }
  }
}
