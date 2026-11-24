import { HttpException, HttpStatus } from '@nestjs/common';

/** API 에러 코드. 응답 형식: { error: { code, message } } */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'EATPL_UNAVAILABLE'
  | 'SERVICE_MISCONFIGURED'
  | 'INTERNAL_ERROR';

/** 에러 코드를 직접 지정해서 던지는 예외. 예: throw new AppException('EATPL_UNAVAILABLE', '...', HttpStatus.BAD_GATEWAY) */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status);
  }
}
