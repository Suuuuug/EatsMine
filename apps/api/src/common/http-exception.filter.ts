import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppException, type ErrorCode } from './app-exception.js';

export type ErrorBody = { error: { code: ErrorCode; message: string } };

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.BAD_GATEWAY]: 'EATPL_UNAVAILABLE',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_MISCONFIGURED',
};

const DEFAULT_MESSAGE: Partial<Record<ErrorCode, string>> = {
  RATE_LIMITED: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
  INTERNAL_ERROR: '서버 오류가 발생했어요.',
};

/** 모든 에러를 { error: { code, message } } 형식으로 통일한다. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const { status, body } = toErrorResponse(exception);
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : String(exception),
      );
    }
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }
}

export function toErrorResponse(exception: unknown): {
  status: number;
  body: ErrorBody;
} {
  if (exception instanceof AppException) {
    return {
      status: exception.getStatus(),
      body: { error: { code: exception.code, message: exception.message } },
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code =
      CODE_BY_STATUS[status] ??
      (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
    const message =
      status >= 500 && !CODE_BY_STATUS[status]
        ? DEFAULT_MESSAGE.INTERNAL_ERROR!
        : extractMessage(exception, code);
    return { status, body: { error: { code, message } } };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: DEFAULT_MESSAGE.INTERNAL_ERROR!,
      },
    },
  };
}

function extractMessage(exception: HttpException, code: ErrorCode): string {
  if (DEFAULT_MESSAGE[code]) return DEFAULT_MESSAGE[code];
  const response = exception.getResponse();
  if (typeof response === 'string') return response;
  const message = (response as { message?: unknown }).message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return exception.message;
}
