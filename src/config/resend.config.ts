import { registerAs } from '@nestjs/config';

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} is not defined`);
  }

  return value;
}

export default registerAs('resend', () => ({
  apiKey: getEnv('RESEND_API_KEY'),
  fromEmail: getEnv('RESEND_FROM_EMAIL'),
}));
