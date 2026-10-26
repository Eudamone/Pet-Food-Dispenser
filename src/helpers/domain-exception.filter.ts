// domain-exception.filter.ts
// Convierte los DomainError (reglas de negocio) en respuestas HTTP 400.
// Las HttpException de Nest y los errores inesperados se delegan al manejador por defecto.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '@/helpers/domain.error.js';

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);

  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    this.logger.warn(`Domain error: ${exception.message}`);
    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: exception.message,
    });
  }
}
