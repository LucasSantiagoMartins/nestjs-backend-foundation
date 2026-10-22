import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request>();

    if (!request.cookies && request.headers.cookie) {
      const rawCookies = request.headers.cookie;
      const parsedCookies = Object.fromEntries(
        rawCookies.split('; ').map((v) => {
          const parts = v.split('=');
          return [parts[0], parts.slice(1).join('=')];
        }),
      );
      request.cookies = parsedCookies;
    }

    const token = request.cookies?.access_token;

    if (isPublic) {
      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          request['user'] = payload;
        } catch {}
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException(
        'Você precisa estar logado para acessar esta área',
      );
    }

    try {
      const payload = this.jwtService.verify(token);
      request['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente');
    }
  }
}
