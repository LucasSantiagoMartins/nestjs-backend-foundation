import { CookieOptions } from 'express';

export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    domain: undefined,
    sameSite: 'none',
    path: '/',
  };
}
