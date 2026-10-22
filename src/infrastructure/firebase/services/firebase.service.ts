import { Injectable } from '@nestjs/common';
import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseService {
  private readonly app: App;
  private readonly messaging: Messaging;

  constructor() {
    if (getApps().length === 0) {
      this.app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      this.app = getApp();
    }

    this.messaging = getMessaging(this.app);
  }

  async sendPush(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string> {
    return this.messaging.send({
      token,
      notification: {
        title,
        body,
      },
      data,
    });
  }
}
