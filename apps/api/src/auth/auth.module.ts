import { Global, Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import {
  SupabaseJwtVerifier,
  supabaseJwksProvider,
} from './supabase-jwt.verifier.js';

/** 어느 모듈에서든 @Auth()를 쓸 수 있게 전역 모듈로 둔다. */
@Global()
@Module({
  providers: [supabaseJwksProvider, SupabaseJwtVerifier, AuthGuard],
  exports: [SupabaseJwtVerifier, AuthGuard],
})
export class AuthModule {}
