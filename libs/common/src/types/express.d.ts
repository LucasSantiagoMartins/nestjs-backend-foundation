import { UserRole } from '@backend-foundation/common';

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: number;
        role: UserRole;
      };
    }
  }
}

export {};
