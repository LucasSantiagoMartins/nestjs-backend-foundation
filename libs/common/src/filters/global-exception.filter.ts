import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';
import { AppLogger } from '../logger/logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: any, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        const res = exceptionResponse as any;

        if (Array.isArray(res.message)) {
          message = res.message[0];
        } else {
          message = res.message;
        }
      }
    }

    if (exception instanceof QueryFailedError) {
      const raw = exception.message;

      if (raw.includes('invalid input syntax for type uuid')) {
        status = HttpStatus.BAD_REQUEST;
        message =
          'O ID informado não está no formato UUID válido. Verifique os IDs que informaste';
      } else if (raw.includes('duplicate key')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Este registro já existe no sistema';
      } else if (raw.includes('violates not-null constraint')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Faltam informações obrigatórias';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'Ocorreu um erro inesperado no sistema';
      }
    }

    this.logger.error({
      msg: 'Erro capturado pelo filtro global',
      action: 'HTTP_EXCEPTION',
      service: 'GlobalExceptionFilter',
      status,
      error: exception,
    });

    return response.status(status).json({
      success: false,
      message,
      data: null,
    });
  }
}
