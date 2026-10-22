import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { getAuthCookieOptions } from '../utils/auth-cookie.util';

@Injectable()
export class AuthCookieService {
  private readonly COOKIE_NAME = 'access_token';
  private readonly SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  setAuthCookie(res: Response, token: string): void {
    res.cookie(this.COOKIE_NAME, token, {
      ...getAuthCookieOptions(),
      maxAge: this.SEVEN_DAYS_MS,
    });
  }

  clearAuthCookie(res: Response): void {
    res.clearCookie(this.COOKIE_NAME, getAuthCookieOptions());
  }
}
