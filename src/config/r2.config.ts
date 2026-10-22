import { registerAs } from '@nestjs/config';

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} is not defined`);
  }

  return value;
}

export default registerAs('r2', () => ({
  accessKey: getEnv('R2_ACCESS_KEY'),
  secretKey: getEnv('R2_SECRET_KEY'),
  publicUrl: getEnv('R2_PUBLIC_URL').replace(/\/+$/, ''),
  bucket: getEnv('R2_BUCKET'),
  endpoint: getEnv('R2_ENDPOINT'),
}));
