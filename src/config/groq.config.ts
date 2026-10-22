import { registerAs } from '@nestjs/config';

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} is not defined`);
  }

  return value;
}

export default registerAs('groq', () => ({
  apiKey: getEnv('GROQ_API_KEY'),
  model: getEnv('GROQ_MODEL'),
}));
