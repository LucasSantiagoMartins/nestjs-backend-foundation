import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { LogPayload } from './types/logger.types';

@Injectable()
export class AppLogger {
  constructor(private readonly logger: PinoLogger) {}

  private format(payload: LogPayload) {
    return {
      timestamp: new Date().toISOString(),
      ...payload,
    };
  }

  info(payload: LogPayload) {
    this.logger.info(this.format(payload));
  }

  debug(payload: LogPayload) {
    this.logger.debug(this.format(payload));
  }

  warn(payload: LogPayload) {
    this.logger.warn(this.format(payload));
  }

  error(payload: LogPayload) {
    this.logger.error(this.format(payload));
  }
}
