import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import type { Env } from './config/env.js';

// Vercel NestJS 문서의 형태를 따른다: bootstrap()에서 app.listen(PORT), top-level await 없음.
// (PORT는 Vercel이 주면 그 값, 없으면 3000 — config/env.ts. 로컬은 .env의 PORT=4000)
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // sendBeacon(text/plain JSON 문자열) 수신용 — POST /events/outbound
  app.useBodyParser('text', { type: 'text/plain', limit: '2kb' });

  app.enableCors({
    origin: config
      .get('WEB_ORIGIN', { infer: true })
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  });
  // @Body({ schema }) / @Query({ schema }) 로 선언한 파라미터만 검증
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(config.get('PORT', { infer: true }));
}

bootstrap().catch((e: unknown) => {
  console.error('서버 시작 실패:', e);
  process.exit(1);
});
