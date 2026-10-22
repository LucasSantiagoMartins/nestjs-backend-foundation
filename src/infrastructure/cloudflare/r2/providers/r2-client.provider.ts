import { S3Client } from '@aws-sdk/client-s3';

export const R2_CLIENT = 'R2_CLIENT';

export const r2ClientProvider = {
  provide: R2_CLIENT,
  useFactory: () => {
    return new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      forcePathStyle: false,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY!,
        secretAccessKey: process.env.R2_SECRET_KEY!,
      },
    });
  },
};
