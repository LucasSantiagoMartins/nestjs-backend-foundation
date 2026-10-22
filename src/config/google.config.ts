import { registerAs } from '@nestjs/config';

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} is not defined`);
  }

  return value;
}

export default registerAs('google', () => ({
  clientId: getEnv('GOOGLE_CLIENT_ID'),
  clientSecret: getEnv('GOOGLE_CLIENT_SECRET'),
  callbackUrl: getEnv('GOOGLE_CALLBACK_URL'),
  frontendRedirectUrl: getEnv('GOOGLE_FRONTEND_REDIRECT_URL'),
}));
