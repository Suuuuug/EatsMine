import {
  applyDecorators,
  createParamDecorator,
  type ExecutionContext,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from './auth-user.js';
import {
  AuthGuard,
  type AuthenticatedRequest,
  OptionalAuthGuard,
} from './auth.guard.js';

/** 로그인이 필요한 라우트(또는 컨트롤러)에 붙인다. 토큰이 없거나 틀리면 401. */
export const Auth = () => applyDecorators(UseGuards(AuthGuard));

/** @Auth()가 붙은 라우트에서 로그인 사용자를 꺼낸다. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

/** 로그인이 선택인 라우트에 붙인다. 토큰이 없거나 틀리면 비로그인으로 처리. */
export const OptionalAuth = () => applyDecorators(UseGuards(OptionalAuthGuard));

/** @OptionalAuth() 라우트에서 로그인 사용자(없으면 null)를 꺼낸다. */
export const OptionalUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | null =>
    context.switchToHttp().getRequest<{ user?: AuthUser }>().user ?? null,
);
